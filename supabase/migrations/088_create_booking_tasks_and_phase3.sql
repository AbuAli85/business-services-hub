-- Create booking_tasks table and Phase 3 Smart Features
-- Date: January 2025
-- Description: Create booking_tasks table with status column and add Phase 3 features

-- 0. First, ensure the status column exists in bookings table
DO $$
BEGIN
  -- Check if status column exists in bookings table
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'bookings' 
    AND column_name = 'status'
  ) THEN
    -- Add status column as TEXT with default value
    ALTER TABLE public.bookings 
    ADD COLUMN status TEXT DEFAULT 'pending';
    
    RAISE NOTICE 'Added status column to bookings table';
  ELSE
    RAISE NOTICE 'status column already exists in bookings table';
  END IF;
END $$;

-- Add check constraint for valid status values (with error handling)
DO $$
BEGIN
  -- Check if constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'bookings_status_check' 
    AND table_name = 'bookings'
  ) THEN
    ALTER TABLE public.bookings 
    ADD CONSTRAINT bookings_status_check 
    CHECK (status IN ('draft', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'on_hold', 'rescheduled'));
    
    RAISE NOTICE 'Added status constraint to bookings table';
  ELSE
    RAISE NOTICE 'status constraint already exists in bookings table';
  END IF;
END $$;

-- Update any existing NULL values with default
UPDATE public.bookings 
SET status = 'pending' 
WHERE status IS NULL;

-- Add comment to the column for documentation
COMMENT ON COLUMN public.bookings.status IS 'Status of the booking (draft, pending, confirmed, in_progress, completed, cancelled, on_hold, rescheduled)';

-- 1. Create booking_tasks table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.booking_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    assigned_to UUID,
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2),
    is_overdue BOOLEAN DEFAULT FALSE,
    overdue_since TIMESTAMPTZ
);

-- Create basic indexes for booking_tasks
CREATE INDEX IF NOT EXISTS idx_booking_tasks_booking_id ON public.booking_tasks(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_tasks_status ON public.booking_tasks(status);
CREATE INDEX IF NOT EXISTS idx_booking_tasks_due_date ON public.booking_tasks(due_date);

-- Enable RLS for booking_tasks
ALTER TABLE public.booking_tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view tasks for their bookings" ON public.booking_tasks;
DROP POLICY IF EXISTS "Users can create tasks for their bookings" ON public.booking_tasks;
DROP POLICY IF EXISTS "Users can update tasks for their bookings" ON public.booking_tasks;
DROP POLICY IF EXISTS "Users can delete tasks for their bookings" ON public.booking_tasks;

-- RLS policies for booking_tasks
CREATE POLICY "Users can view tasks for their bookings" ON public.booking_tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings b 
      WHERE b.id = booking_tasks.booking_id 
      AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

CREATE POLICY "Users can create tasks for their bookings" ON public.booking_tasks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b 
      WHERE b.id = booking_tasks.booking_id 
      AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

CREATE POLICY "Users can update tasks for their bookings" ON public.booking_tasks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.bookings b 
      WHERE b.id = booking_tasks.booking_id 
      AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete tasks for their bookings" ON public.booking_tasks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.bookings b 
      WHERE b.id = booking_tasks.booking_id 
      AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

-- 2. Create notifications table for smart notifications
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

-- Create additional indexes after tables are fully created
CREATE INDEX IF NOT EXISTS idx_booking_tasks_overdue ON public.booking_tasks(is_overdue) WHERE is_overdue = TRUE;

-- 3. Create function to check and update overdue status
CREATE OR REPLACE FUNCTION update_overdue_tasks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
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
BEGIN
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
  ),
  progress_stats AS (
    SELECT 
      AVG(COALESCE(progress_percentage, 0)) as avg_progress,
      COUNT(*) as active_bookings
    FROM bookings b
    JOIN user_bookings ub ON b.id = ub.id
    WHERE b.status::text IN ('in_progress', 'confirmed', 'pending', 'draft', 'pending_payment', 'paid')
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

-- 8. Grant permissions
GRANT ALL ON public.booking_tasks TO authenticated;
GRANT SELECT ON public.booking_tasks TO anon;
GRANT EXECUTE ON FUNCTION update_overdue_tasks() TO authenticated;
GRANT EXECUTE ON FUNCTION send_overdue_notifications() TO authenticated;
GRANT EXECUTE ON FUNCTION send_approval_notification(UUID, UUID, UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_weekly_digest_data(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION send_weekly_digest(UUID) TO authenticated;

-- 9. Add comments for documentation
COMMENT ON TABLE public.booking_tasks IS 'Tasks and milestones for booking progress tracking';
COMMENT ON TABLE notifications IS 'Smart notifications system for overdue tasks, approvals, and weekly digests';
COMMENT ON FUNCTION update_overdue_tasks() IS 'Updates overdue status for tasks based on due_date';
COMMENT ON FUNCTION send_overdue_notifications() IS 'Sends daily notifications for overdue tasks';
COMMENT ON FUNCTION send_approval_notification(UUID, UUID, UUID, UUID, TEXT) IS 'Sends notifications for task approval requests and responses';
COMMENT ON FUNCTION get_weekly_digest_data(UUID, DATE) IS 'Generates weekly progress digest data for a user';
COMMENT ON FUNCTION send_weekly_digest(UUID) IS 'Sends weekly progress digest notification to user';
