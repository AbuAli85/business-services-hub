-- Fix Notification RLS Policies - Direct SQL
-- Run this in Supabase SQL Editor

-- First, let's check what policies currently exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename IN ('notifications', 'notification_settings', 'email_notification_logs')
ORDER BY tablename, policyname;

-- Drop existing policies for notifications table
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_own" ON notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;
DROP POLICY IF EXISTS "notifications_service_role_all" ON notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
DROP POLICY IF EXISTS "Service role can manage all notifications" ON notifications;

-- Drop existing policies for notification_settings table
DROP POLICY IF EXISTS "notification_settings_select_own" ON notification_settings;
DROP POLICY IF EXISTS "notification_settings_insert_own" ON notification_settings;
DROP POLICY IF EXISTS "notification_settings_update_own" ON notification_settings;
DROP POLICY IF EXISTS "notification_settings_delete_own" ON notification_settings;
DROP POLICY IF EXISTS "notification_settings_service_role_all" ON notification_settings;
DROP POLICY IF EXISTS "Users can view their own notification settings" ON notification_settings;
DROP POLICY IF EXISTS "Users can insert their own notification settings" ON notification_settings;
DROP POLICY IF EXISTS "Users can update their own notification settings" ON notification_settings;
DROP POLICY IF EXISTS "Users can delete their own notification settings" ON notification_settings;
DROP POLICY IF EXISTS "Service role can manage all notification settings" ON notification_settings;

-- Drop existing policies for email_notification_logs table
DROP POLICY IF EXISTS "email_logs_select_own" ON email_notification_logs;
DROP POLICY IF EXISTS "email_logs_service_role_all" ON email_notification_logs;
DROP POLICY IF EXISTS "Users can view their own email logs" ON email_notification_logs;
DROP POLICY IF EXISTS "Service role can manage email logs" ON email_notification_logs;
DROP POLICY IF EXISTS "Service role can manage all email logs" ON email_notification_logs;

-- Create new policies for notifications table
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

-- Create new policies for notification_settings table
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

-- Create new policies for email_notification_logs table
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

-- Grant additional permissions
GRANT SELECT ON notifications TO authenticated;
GRANT SELECT ON notification_settings TO authenticated;

-- Test the policies by creating a test notification
DO $$
DECLARE
  test_user_id UUID;
  new_notification_id UUID;
BEGIN
  -- Get a test user ID
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    -- Create a test notification
    INSERT INTO notifications (user_id, type, title, message, priority)
    VALUES (test_user_id, 'rls_test', 'RLS Policy Test', 'Testing RLS policies after fix', 'medium')
    RETURNING id INTO new_notification_id;
    
    RAISE NOTICE 'Test notification created with ID: %', new_notification_id;
  ELSE
    RAISE NOTICE 'No users found in auth.users table';
  END IF;
END $$;

-- Verify the policies are working
SELECT 'RLS policies have been updated successfully!' as status;
