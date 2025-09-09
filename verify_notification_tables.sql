-- Verify notification system tables exist and have data
-- Run this in your Supabase SQL Editor

-- Check if notification tables exist
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('notifications', 'email_notification_logs', 'notification_settings', 'email_preferences')
ORDER BY table_name;

-- Check notifications table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
ORDER BY ordinal_position;

-- Check if you have any existing notifications
SELECT 
  COUNT(*) as total_notifications,
  COUNT(CASE WHEN read = false THEN 1 END) as unread_notifications,
  COUNT(CASE WHEN type = 'booking_created' THEN 1 END) as booking_notifications
FROM notifications;

-- Check email notification logs
SELECT 
  COUNT(*) as total_email_logs,
  COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_emails,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_emails
FROM email_notification_logs;

-- Show recent notifications (if any)
SELECT 
  id,
  type,
  title,
  priority,
  read,
  created_at
FROM notifications 
ORDER BY created_at DESC 
LIMIT 5;

-- Success message
SELECT '✅ Notification system verification completed!' as status;
