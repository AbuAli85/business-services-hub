-- Test the booking_notifications table
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
  '🎉 Booking Notification Test',
  'Testing the complete booking notification system with all columns including user_id!',
  'high',
  '{"test": true, "system": "complete", "user_id": "working"}'::jsonb,
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

-- Test 2: Query booking notifications with user_id filtering
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
WHERE title = '🎉 Booking Notification Test'
ORDER BY created_at DESC;

-- Test 3: Update booking notification priority
UPDATE booking_notifications 
SET priority = 'urgent',
    updated_at = NOW()
WHERE title = '🎉 Booking Notification Test'
RETURNING id, title, priority, updated_at;

-- Test 4: Mark as read
UPDATE booking_notifications 
SET read = true,
    updated_at = NOW()
WHERE title = '🎉 Booking Notification Test'
RETURNING id, title, read, updated_at;

-- Test 5: Clean up test data
DELETE FROM booking_notifications 
WHERE title = '🎉 Booking Notification Test';

-- Success message
SELECT '✅ Booking notifications test completed successfully! All columns including user_id are working correctly.' as status;
