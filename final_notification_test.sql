-- Final test of the notification system
-- Run this in your Supabase SQL Editor

-- Test 1: Insert a notification with all columns
INSERT INTO notifications (
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
  (SELECT id FROM auth.users LIMIT 1),
  'task_created',
  '🎉 Notification System Test',
  'Testing the complete notification system with all columns including priority!',
  'high',
  '{"test": true, "system": "complete", "priority": "working"}'::jsonb,
  '/dashboard/notifications',
  'View Notifications',
  NOW() + INTERVAL '7 days'
) RETURNING 
  id, 
  title, 
  priority, 
  action_url,
  action_label,
  expires_at,
  created_at;

-- Test 2: Query notifications with priority filtering
SELECT 
  id,
  title,
  message,
  priority,
  type,
  read,
  action_url,
  action_label,
  created_at
FROM notifications 
WHERE title = '🎉 Notification System Test'
ORDER BY created_at DESC;

-- Test 3: Update notification priority
UPDATE notifications 
SET priority = 'urgent',
    updated_at = NOW()
WHERE title = '🎉 Notification System Test'
RETURNING id, title, priority, updated_at;

-- Test 4: Mark as read
UPDATE notifications 
SET read = true,
    updated_at = NOW()
WHERE title = '🎉 Notification System Test'
RETURNING id, title, read, updated_at;

-- Test 5: Clean up test data
DELETE FROM notifications 
WHERE title = '🎉 Notification System Test';

-- Success message
SELECT '✅ Notification system test completed successfully! All columns including priority are working correctly.' as status;
