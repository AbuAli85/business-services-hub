-- Phase 3 Smart Features Implementation (Fixed)
-- Date: January 2025
-- Description: Add overdue detection, notifications system, and export functionality
-- Fixed to handle status column type issues

-- 1. Create notifications table for smart notifications (if not exists)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('booking', 'task', 'milestone', 'approval', 'overdue', 'payment', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  data JSONB DEFAULT '{}',
  status TEXT DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  archived_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Enable RLS for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;

-- RLS policies for notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- 2. Add overdue detection columns to booking_tasks (if table exists)
DO $$
BEGIN
  -- Check if booking_tasks table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'booking_tasks') THEN
    -- Add overdue columns if they don't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'booking_tasks' AND column_name = 'is_overdue') THEN
      ALTER TABLE booking_tasks ADD COLUMN is_overdue BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'booking_tasks' AND column_name = 'overdue_since') THEN
      ALTER TABLE booking_tasks ADD COLUMN overdue_since TIMESTAMP WITH TIME ZONE;
    END IF;
  END IF;
END $$;

-- 3. Create function to check and update overdue status
CREATE OR REPLACE FUNCTION update_overdue_tasks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if booking_tasks table exists and has required columns
  IF EXISTS (
    SELECT FROM information_schema.tables t
    JOIN information_schema.columns c ON t.table_name = c.table_name
    WHERE t.table_name = 'booking_tasks' 
    AND c.column_name = 'due_date'
    AND c.column_name = 'status'
  ) THEN
    -- Update overdue status for tasks
    UPDATE booking_tasks 
    SET 
      is_overdue = TRUE,
      overdue_since = COALESCE(overdue_since, NOW())
    WHERE 
      due_date < NOW() 
      AND status NOT IN ('completed', 'cancelled')
      AND is_overdue = FALSE;

    -- Reset overdue status for completed tasks
    UPDATE booking_tasks 
    SET 
      is_overdue = FALSE,
      overdue_since = NULL
    WHERE 
      status IN ('completed', 'cancelled')
      AND is_overdue = TRUE;
  END IF;
END;
$$;

-- 4. Create function to send overdue notifications
CREATE OR REPLACE FUNCTION send_overdue_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  task_record RECORD;
  booking_record RECORD;
BEGIN
  -- Check if required tables exist
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'booking_tasks') THEN
    RETURN;
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'bookings') THEN
    RETURN;
  END IF;

  -- Get all overdue tasks that haven't been notified today
  FOR task_record IN 
    SELECT bt.*, b.client_id, b.provider_id
    FROM booking_tasks bt
    JOIN bookings b ON bt.booking_id = b.id
    WHERE bt.is_overdue = TRUE
    AND bt.due_date < NOW() - INTERVAL '1 day'
    AND NOT EXISTS (
      SELECT 1 FROM notifications n 
      WHERE n.user_id = b.provider_id 
      AND n.type = 'overdue' 
      AND n.data->>'task_id' = bt.id::text
      AND n.created_at > NOW() - INTERVAL '1 day'
    )
  LOOP
    -- Notify provider about overdue task
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      task_record.provider_id,
      'overdue',
      'Task Overdue: ' || task_record.title,
      'Task "' || task_record.title || '" is overdue by ' || 
      EXTRACT(DAYS FROM NOW() - task_record.due_date) || ' days',
      jsonb_build_object(
        'task_id', task_record.id,
        'booking_id', task_record.booking_id,
        'due_date', task_record.due_date,
        'overdue_days', EXTRACT(DAYS FROM NOW() - task_record.due_date)
      )
    );

    -- Notify client about overdue task (if different from provider)
    IF task_record.client_id != task_record.provider_id THEN
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES (
        task_record.client_id,
        'overdue',
        'Task Overdue: ' || task_record.title,
        'Task "' || task_record.title || '" is overdue by ' || 
        EXTRACT(DAYS FROM NOW() - task_record.due_date) || ' days',
        jsonb_build_object(
          'task_id', task_record.id,
          'booking_id', task_record.booking_id,
          'due_date', task_record.due_date,
          'overdue_days', EXTRACT(DAYS FROM NOW() - task_record.due_date)
        )
      );
    END IF;
  END LOOP;
END;
$$;

-- 5. Create function to send approval notifications
CREATE OR REPLACE FUNCTION send_approval_notification(
  p_booking_id UUID,
  p_task_id UUID,
  p_requester_id UUID,
  p_approver_id UUID,
  p_action TEXT -- 'request' or 'approve'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  task_record RECORD;
  booking_record RECORD;
BEGIN
  -- Check if required tables exist
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'booking_tasks') THEN
    RETURN;
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'bookings') THEN
    RETURN;
  END IF;

  -- Get task and booking details
  SELECT bt.*, b.client_id, b.provider_id
  INTO task_record, booking_record
  FROM booking_tasks bt
  JOIN bookings b ON bt.booking_id = b.id
  WHERE bt.id = p_task_id AND b.id = p_booking_id;

  IF p_action = 'request' THEN
    -- Notify approver about approval request
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      p_approver_id,
      'approval',
      'Approval Request: ' || task_record.title,
      'Task "' || task_record.title || '" requires your approval',
      jsonb_build_object(
        'task_id', task_record.id,
        'booking_id', task_record.booking_id,
        'requester_id', p_requester_id,
        'action', 'request'
      )
    );
  ELSIF p_action = 'approve' THEN
    -- Notify requester about approval
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      p_requester_id,
      'approval',
      'Task Approved: ' || task_record.title,
      'Task "' || task_record.title || '" has been approved',
      jsonb_build_object(
        'task_id', task_record.id,
        'booking_id', task_record.booking_id,
        'approver_id', p_approver_id,
        'action', 'approve'
      )
    );
  END IF;
END;
$$;

-- 6. Create function to generate weekly digest data
CREATE OR REPLACE FUNCTION get_weekly_digest_data(p_user_id UUID, p_week_start DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  week_end DATE := p_week_start + INTERVAL '7 days';
  result JSONB;
BEGIN
  -- Check if required tables exist
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'bookings') THEN
    RETURN jsonb_build_object('error', 'bookings table not found');
  END IF;

  WITH user_bookings AS (
    SELECT b.id, b.client_id, b.provider_id
    FROM bookings b
    WHERE b.client_id = p_user_id OR b.provider_id = p_user_id
  ),
  task_stats AS (
    SELECT 
      COUNT(*) as total_tasks,
      COUNT(*) FILTER (WHERE status = 'completed' AND completed_at >= p_week_start AND completed_at < week_end) as completed_this_week,
      COUNT(*) FILTER (WHERE is_overdue = TRUE) as overdue_tasks,
      COUNT(*) FILTER (WHERE status = 'pending' AND due_date < week_end) as pending_approval
    FROM booking_tasks bt
    JOIN user_bookings ub ON bt.booking_id = ub.id
    WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'booking_tasks')
  ),
  progress_stats AS (
    SELECT 
      AVG(COALESCE(progress_percentage, 0)) as avg_progress,
      COUNT(*) as active_bookings
    FROM bookings b
    JOIN user_bookings ub ON b.id = ub.id
    WHERE b.status IN ('in_progress', 'confirmed', 'pending')
  )
  SELECT jsonb_build_object(
    'week_start', p_week_start,
    'week_end', week_end,
    'tasks', (
      SELECT jsonb_build_object(
        'total', COALESCE(total_tasks, 0),
        'completed_this_week', COALESCE(completed_this_week, 0),
        'overdue', COALESCE(overdue_tasks, 0),
        'pending_approval', COALESCE(pending_approval, 0)
      )
      FROM task_stats
    ),
    'progress', (
      SELECT jsonb_build_object(
        'average', ROUND(COALESCE(avg_progress, 0)::numeric, 1),
        'active_bookings', COALESCE(active_bookings, 0)
      )
      FROM progress_stats
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- 7. Create function to send weekly digest
CREATE OR REPLACE FUNCTION send_weekly_digest(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  week_start DATE := CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER;
  digest_data JSONB;
  user_profile RECORD;
BEGIN
  -- Get user profile
  SELECT * INTO user_profile FROM profiles WHERE id = p_user_id;
  
  -- Get digest data
  SELECT get_weekly_digest_data(p_user_id, week_start) INTO digest_data;
  
  -- Create digest notification
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    p_user_id,
    'system',
    'Weekly Progress Digest',
    'Your weekly progress summary is ready. Check your dashboard for details.',
    jsonb_build_object(
      'digest_data', digest_data,
      'week_start', week_start,
      'type', 'weekly_digest'
    )
  );
END;
$$;

-- 8. Create indexes for better performance (if tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'booking_tasks') THEN
    CREATE INDEX IF NOT EXISTS idx_booking_tasks_overdue ON booking_tasks(is_overdue) WHERE is_overdue = TRUE;
    CREATE INDEX IF NOT EXISTS idx_booking_tasks_due_date_status ON booking_tasks(due_date, status) WHERE status NOT IN ('completed', 'cancelled');
  END IF;
END $$;

-- 9. Grant permissions
GRANT EXECUTE ON FUNCTION update_overdue_tasks() TO authenticated;
GRANT EXECUTE ON FUNCTION send_overdue_notifications() TO authenticated;
GRANT EXECUTE ON FUNCTION send_approval_notification(UUID, UUID, UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_weekly_digest_data(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION send_weekly_digest(UUID) TO authenticated;

-- 10. Add comments for documentation
COMMENT ON TABLE notifications IS 'Smart notifications system for overdue tasks, approvals, and weekly digests';
COMMENT ON FUNCTION update_overdue_tasks() IS 'Updates overdue status for tasks based on due_date';
COMMENT ON FUNCTION send_overdue_notifications() IS 'Sends daily notifications for overdue tasks';
COMMENT ON FUNCTION send_approval_notification(UUID, UUID, UUID, UUID, TEXT) IS 'Sends notifications for task approval requests and responses';
COMMENT ON FUNCTION get_weekly_digest_data(UUID, DATE) IS 'Generates weekly progress digest data for a user';
COMMENT ON FUNCTION send_weekly_digest(UUID) IS 'Sends weekly progress digest notification to user';
