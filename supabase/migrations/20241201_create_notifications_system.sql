-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT FALSE,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  action_url TEXT,
  action_label VARCHAR(100)
);

-- Create notification_settings table
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  sms_notifications BOOLEAN DEFAULT FALSE,
  notification_types JSONB DEFAULT '{}',
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  digest_frequency VARCHAR(20) DEFAULT 'immediate' CHECK (digest_frequency IN ('immediate', 'hourly', 'daily', 'weekly')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON notifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_type ON notifications(user_id, type);

-- Create RLS policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notifications" ON notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

-- Notification settings policies
CREATE POLICY "Users can view their own notification settings" ON notification_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification settings" ON notification_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification settings" ON notification_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notification settings" ON notification_settings
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_notifications_updated_at 
  BEFORE UPDATE ON notifications 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_settings_updated_at 
  BEFORE UPDATE ON notification_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to clean up expired notifications
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM notifications 
  WHERE expires_at IS NOT NULL 
  AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create function to get notification statistics
CREATE OR REPLACE FUNCTION get_notification_stats(p_user_id UUID)
RETURNS TABLE(
  total BIGINT,
  unread BIGINT,
  by_type JSONB,
  by_priority JSONB,
  recent_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE read = FALSE) as unread,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as recent_count
    FROM notifications 
    WHERE user_id = p_user_id
  ),
  type_stats AS (
    SELECT jsonb_object_agg(type, count) as by_type
    FROM (
      SELECT type, COUNT(*) as count
      FROM notifications 
      WHERE user_id = p_user_id
      GROUP BY type
    ) t
  ),
  priority_stats AS (
    SELECT jsonb_object_agg(priority, count) as by_priority
    FROM (
      SELECT priority, COUNT(*) as count
      FROM notifications 
      WHERE user_id = p_user_id
      GROUP BY priority
    ) p
  )
  SELECT 
    s.total,
    s.unread,
    COALESCE(ts.by_type, '{}'::jsonb) as by_type,
    COALESCE(ps.by_priority, '{}'::jsonb) as by_priority,
    s.recent_count
  FROM stats s
  CROSS JOIN type_stats ts
  CROSS JOIN priority_stats ps;
END;
$$ LANGUAGE plpgsql;

-- Create function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE notifications 
  SET read = TRUE, updated_at = NOW()
  WHERE user_id = p_user_id AND read = FALSE;
END;
$$ LANGUAGE plpgsql;

-- Create function to bulk update notifications
CREATE OR REPLACE FUNCTION bulk_update_notifications(
  p_user_id UUID,
  p_notification_ids UUID[],
  p_action VARCHAR(20)
)
RETURNS void AS $$
BEGIN
  IF p_action = 'mark_read' THEN
    UPDATE notifications 
    SET read = TRUE, updated_at = NOW()
    WHERE user_id = p_user_id AND id = ANY(p_notification_ids);
  ELSIF p_action = 'mark_unread' THEN
    UPDATE notifications 
    SET read = FALSE, updated_at = NOW()
    WHERE user_id = p_user_id AND id = ANY(p_notification_ids);
  ELSIF p_action = 'delete' THEN
    DELETE FROM notifications 
    WHERE user_id = p_user_id AND id = ANY(p_notification_ids);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Insert default notification settings for existing users
INSERT INTO notification_settings (user_id, email_notifications, push_notifications, sms_notifications, notification_types)
SELECT 
  id,
  TRUE,
  TRUE,
  FALSE,
  '{
    "task_created": true,
    "task_updated": true,
    "task_completed": true,
    "task_overdue": true,
    "task_assigned": true,
    "task_comment": true,
    "milestone_created": true,
    "milestone_updated": true,
    "milestone_completed": true,
    "milestone_overdue": true,
    "milestone_approved": true,
    "milestone_rejected": true,
    "booking_created": true,
    "booking_updated": true,
    "booking_cancelled": true,
    "booking_completed": true,
    "payment_received": true,
    "payment_failed": true,
    "invoice_created": true,
    "invoice_overdue": true,
    "invoice_paid": true,
    "request_created": true,
    "request_updated": true,
    "request_approved": true,
    "request_rejected": true,
    "message_received": true,
    "document_uploaded": true,
    "document_approved": true,
    "document_rejected": true,
    "system_announcement": true,
    "maintenance_scheduled": true,
    "deadline_approaching": true,
    "project_delayed": true,
    "client_feedback": true,
    "team_mention": true
  }'::jsonb
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM notification_settings)
ON CONFLICT (user_id) DO NOTHING;

-- Create a view for notification analytics
CREATE OR REPLACE VIEW notification_analytics AS
SELECT 
  DATE_TRUNC('day', created_at) as date,
  type,
  priority,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE read = TRUE) as read_count,
  COUNT(*) FILTER (WHERE read = FALSE) as unread_count
FROM notifications
GROUP BY DATE_TRUNC('day', created_at), type, priority
ORDER BY date DESC;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_settings TO authenticated;
GRANT SELECT ON notification_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_notification_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_update_notifications(UUID, UUID[], VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_notifications() TO authenticated;
