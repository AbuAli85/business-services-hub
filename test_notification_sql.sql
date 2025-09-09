-- Test notification system with proper SQL syntax
-- Run this in your Supabase SQL Editor

-- Test 1: Insert a notification
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
  (SELECT id FROM auth.users LIMIT 1), -- Use actual user ID
  'booking_created', 
  'New Booking: Website Development Package',
  'A new booking has been created for service "Web Development Service" on 2024-01-15.',
  'high', 
  '/dashboard/bookings/123', 
  'View Booking',
  '{"booking_id": "123", "service_name": "Web Development Service", "scheduled_date": "2024-01-15"}'::jsonb
) RETURNING id, title, priority, created_at;

-- Test 2: Insert email notification log (if the notification was created successfully)
-- Note: Replace 'notification-id-here' with the actual ID from the first query
INSERT INTO email_notification_logs (
  notification_id, 
  email, 
  notification_type,
  status, 
  sent_at
) VALUES (
  (SELECT id FROM notifications WHERE title = 'New Booking: Website Development Package' ORDER BY created_at DESC LIMIT 1),
  (SELECT email FROM auth.users LIMIT 1),
  'booking_created',
  'sent', 
  NOW()
) RETURNING id, notification_id, email, notification_type, status, sent_at;

-- Test 3: Query the created notification
SELECT 
  n.id,
  n.title,
  n.message,
  n.priority,
  n.action_url,
  n.action_label,
  n.data,
  n.created_at,
  el.email,
  el.status as email_status,
  el.sent_at
FROM notifications n
LEFT JOIN email_notification_logs el ON n.id = el.notification_id
WHERE n.title = 'New Booking: Website Development Package'
ORDER BY n.created_at DESC;

-- Test 4: Clean up test data (optional)
-- DELETE FROM email_notification_logs WHERE notification_id IN (
--   SELECT id FROM notifications WHERE title = 'New Booking: Website Development Package'
-- );
-- DELETE FROM notifications WHERE title = 'New Booking: Website Development Package';

-- Success message
SELECT '✅ Notification system test completed successfully!' as status;
