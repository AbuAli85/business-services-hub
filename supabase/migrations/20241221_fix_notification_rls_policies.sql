-- Fix Notification RLS Policies
-- This migration fixes RLS policies for notification tables to allow proper access

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
DROP POLICY IF EXISTS "Service role can manage all notifications" ON notifications;

DROP POLICY IF EXISTS "Users can view their own notification settings" ON notification_settings;
DROP POLICY IF EXISTS "Users can insert their own notification settings" ON notification_settings;
DROP POLICY IF EXISTS "Users can update their own notification settings" ON notification_settings;
DROP POLICY IF EXISTS "Users can delete their own notification settings" ON notification_settings;
DROP POLICY IF EXISTS "Service role can manage all notification settings" ON notification_settings;

DROP POLICY IF EXISTS "Users can view their own email logs" ON email_notification_logs;
DROP POLICY IF EXISTS "Service role can manage email logs" ON email_notification_logs;
DROP POLICY IF EXISTS "Service role can manage all email logs" ON email_notification_logs;

-- Create new notification table policies
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications_insert_own" ON notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "notifications_delete_own" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "notifications_service_role_all" ON notifications
  FOR ALL USING (auth.role() = 'service_role');

-- Create new notification_settings table policies
CREATE POLICY "notification_settings_select_own" ON notification_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notification_settings_insert_own" ON notification_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notification_settings_update_own" ON notification_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "notification_settings_delete_own" ON notification_settings
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "notification_settings_service_role_all" ON notification_settings
  FOR ALL USING (auth.role() = 'service_role');

-- Create new email_notification_logs table policies
CREATE POLICY "email_logs_select_own" ON email_notification_logs
  FOR SELECT USING (
    notification_id IN (
      SELECT id FROM notifications WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "email_logs_service_role_all" ON email_notification_logs
  FOR ALL USING (auth.role() = 'service_role');

-- Enable real-time for notification tables
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE notification_settings;

-- Grant additional permissions for real-time
GRANT SELECT ON notifications TO authenticated;
GRANT SELECT ON notification_settings TO authenticated;

-- Create function to test notification creation
CREATE OR REPLACE FUNCTION test_notification_creation()
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  notification_id UUID
) AS $$
DECLARE
  test_user_id UUID;
  new_notification_id UUID;
BEGIN
  -- Get a test user ID
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'No users found in auth.users'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  -- Create a test notification
  INSERT INTO notifications (user_id, type, title, message, priority)
  VALUES (test_user_id, 'test', 'RLS Policy Test', 'Testing RLS policies', 'medium')
  RETURNING id INTO new_notification_id;
  
  RETURN QUERY SELECT TRUE, 'Test notification created successfully'::TEXT, new_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get notification stats for a user
CREATE OR REPLACE FUNCTION get_user_notification_stats(user_uuid UUID)
RETURNS TABLE (
  total_notifications BIGINT,
  unread_notifications BIGINT,
  recent_notifications BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_notifications,
    COUNT(*) FILTER (WHERE read = FALSE) as unread_notifications,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as recent_notifications
  FROM notifications
  WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to cleanup old notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM notifications 
  WHERE created_at < NOW() - INTERVAL '90 days'
    AND read = TRUE;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
SELECT '✅ Notification RLS policies fixed successfully!' as status;
