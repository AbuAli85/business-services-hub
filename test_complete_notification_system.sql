-- Test the complete notification system
-- Run this in your Supabase SQL Editor

-- Test 1: Insert a notification into the main notifications table
INSERT INTO notifications (
  user_id, 
  type, 
  title, 
  message, 
  priority,
  data
) VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  'task_created',
  'Test Notification System',
  'Testing the complete notification system after database fixes',
  'high',
  '{"test": true, "system": "complete"}'::jsonb
) RETURNING id, title, priority, created_at;

-- Test 2: Insert a booking notification
INSERT INTO booking_notifications (
  booking_id,
  user_id, 
  type, 
  title, 
  message, 
  priority,
  data
) VALUES (
  (SELECT id FROM bookings LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1),
  'booking_created',
  'Test Booking Notification',
  'Testing booking notification with priority',
  'urgent',
  '{"booking_test": true}'::jsonb
) RETURNING id, title, priority, created_at;

-- Test 3: Insert a progress notification
INSERT INTO progress_notifications (
  booking_id,
  user_id, 
  type, 
  title, 
  message, 
  priority,
  data
) VALUES (
  (SELECT id FROM bookings LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1),
  'milestone_completed',
  'Test Progress Notification',
  'Testing progress notification with priority',
  'medium',
  '{"progress_test": true}'::jsonb
) RETURNING id, title, priority, created_at;

-- Test 4: Query all notifications to verify they work
SELECT 
  'notifications' as table_name,
  id,
  title,
  priority,
  type,
  read,
  created_at
FROM notifications 
WHERE title LIKE 'Test%'
UNION ALL
SELECT 
  'booking_notifications' as table_name,
  id,
  title,
  priority,
  type,
  read,
  created_at
FROM booking_notifications 
WHERE title LIKE 'Test%'
UNION ALL
SELECT 
  'progress_notifications' as table_name,
  id,
  title,
  priority,
  type,
  read,
  created_at
FROM progress_notifications 
WHERE title LIKE 'Test%'
ORDER BY created_at DESC;

-- Test 5: Clean up test data
DELETE FROM notifications WHERE title LIKE 'Test%';
DELETE FROM booking_notifications WHERE title LIKE 'Test%';
DELETE FROM progress_notifications WHERE title LIKE 'Test%';
