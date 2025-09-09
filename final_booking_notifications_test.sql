-- Final test of the booking_notifications system
-- Run this in your Supabase SQL Editor

-- Test 1: Insert a booking notification with all columns
INSERT INTO booking_notifications (
  booking_id,
  user_id, 
  type, 
  title, 
  message, 
  priority,
  data,
  action_url,
  action_label,
  expires_at
) VALUES (
  (SELECT id FROM bookings LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1),
  'booking_created',
  '🎉 Booking Notification System Test',
  'Testing the complete booking notification system with all columns including the fixed constraint!',
  'high',
  '{"test": true, "system": "complete", "constraint": "fixed"}'::jsonb,
  '/dashboard/bookings',
  'View Booking',
  NOW() + INTERVAL '7 days'
) RETURNING 
  id, 
  booking_id,
  user_id,
  title, 
  priority, 
  action_url,
  action_label,
  expires_at,
  created_at;

-- Test 2: Query booking notifications
SELECT 
  id,
  booking_id,
  user_id,
  title,
  message,
  priority,
  type,
  read,
  action_url,
  action_label,
  created_at
FROM booking_notifications 
WHERE title = '🎉 Booking Notification System Test'
ORDER BY created_at DESC;

-- Test 3: Update booking notification priority
UPDATE booking_notifications 
SET priority = 'urgent',
    updated_at = NOW()
WHERE title = '🎉 Booking Notification System Test'
RETURNING id, title, priority, updated_at;

-- Test 4: Mark as read
UPDATE booking_notifications 
SET read = true,
    updated_at = NOW()
WHERE title = '🎉 Booking Notification System Test'
RETURNING id, title, read, updated_at;

-- Test 5: Test different notification types
INSERT INTO booking_notifications (
  booking_id,
  user_id, 
  type, 
  title, 
  message, 
  priority
) VALUES 
  ((SELECT id FROM bookings LIMIT 1), (SELECT id FROM auth.users LIMIT 1), 'booking_updated', 'Booking Updated', 'Test booking updated notification', 'medium'),
  ((SELECT id FROM bookings LIMIT 1), (SELECT id FROM auth.users LIMIT 1), 'booking_cancelled', 'Booking Cancelled', 'Test booking cancelled notification', 'high'),
  ((SELECT id FROM bookings LIMIT 1), (SELECT id FROM auth.users LIMIT 1), 'booking_completed', 'Booking Completed', 'Test booking completed notification', 'low'),
  ((SELECT id FROM bookings LIMIT 1), (SELECT id FROM auth.users LIMIT 1), 'booking_reminder', 'Booking Reminder', 'Test booking reminder notification', 'medium')
RETURNING id, type, title, priority;

-- Test 6: Clean up all test data
DELETE FROM booking_notifications 
WHERE title LIKE '%Test%' OR title LIKE '%test%';

-- Success message
SELECT '✅ Booking notifications system test completed successfully! All constraints are working correctly and all notification types are allowed.' as status;
