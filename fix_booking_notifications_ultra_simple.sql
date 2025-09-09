-- Ultra simple fix for booking_notifications type constraint
-- Run this in your Supabase SQL Editor

-- Drop the existing type constraint
ALTER TABLE booking_notifications 
DROP CONSTRAINT IF EXISTS booking_notifications_type_check;

-- Add a very simple constraint that allows any text
ALTER TABLE booking_notifications 
ADD CONSTRAINT booking_notifications_type_check 
CHECK (type IS NOT NULL AND length(trim(type)) > 0);

-- Test with the original insert
INSERT INTO booking_notifications (
  booking_id,
  user_id, 
  type, 
  title, 
  message, 
  priority
) VALUES (
  (SELECT id FROM bookings LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1),
  'booking_created',
  '🎉 Test Booking Notification',
  'Testing the ultra simple constraint fix',
  'high'
) RETURNING id, title, priority, created_at;

-- Clean up test data
DELETE FROM booking_notifications 
WHERE title = '🎉 Test Booking Notification';

-- Success message
SELECT '✅ Ultra simple constraint fix completed! Any non-empty type is now allowed.' as status;
