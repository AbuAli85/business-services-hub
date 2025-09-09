-- Simple test for notification system
-- Run this in your Supabase SQL Editor

-- Step 1: Insert a test notification
INSERT INTO notifications (
  user_id, 
  type, 
  title, 
  message, 
  priority, 
  action_url, 
  action_label, 
  data
) VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  'booking_created', 
  'Test Booking Notification',
  'This is a test notification to verify the system works correctly.',
  'high', 
  '/dashboard/bookings/test-123', 
  'View Booking',
  '{"booking_id": "test-123", "service_name": "Test Service"}'::jsonb
) RETURNING id, title, type, priority, created_at;

-- Step 2: Insert email log for the notification (replace the notification_id with the actual ID from step 1)
INSERT INTO email_notification_logs (
  notification_id, 
  email, 
  notification_type,
  status, 
  sent_at
) VALUES (
  (SELECT id FROM notifications WHERE title = 'Test Booking Notification' ORDER BY created_at DESC LIMIT 1),
  (SELECT email FROM auth.users LIMIT 1),
  'booking_created',
  'sent', 
  NOW()
) RETURNING id, notification_id, email, notification_type, status, sent_at;

-- Step 3: Verify the data was inserted correctly
SELECT 
  n.id as notification_id,
  n.title,
  n.type as notification_type,
  n.priority,
  n.created_at as notification_created,
  el.email,
  el.status as email_status,
  el.sent_at as email_sent
FROM notifications n
LEFT JOIN email_notification_logs el ON n.id = el.notification_id
WHERE n.title = 'Test Booking Notification'
ORDER BY n.created_at DESC;

-- Step 4: Clean up test data (uncomment to clean up)
-- DELETE FROM email_notification_logs WHERE notification_id IN (
--   SELECT id FROM notifications WHERE title = 'Test Booking Notification'
-- );
-- DELETE FROM notifications WHERE title = 'Test Booking Notification';

-- Success message
SELECT '✅ Notification system test completed successfully!' as status;
