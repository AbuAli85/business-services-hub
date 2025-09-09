-- Test inserting a notification to verify the priority column works
-- Run this in your Supabase SQL Editor

-- Test 1: Insert a notification with priority
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
  'Test Priority Column',
  'Testing if priority column works correctly',
  'high',
  '{"test": true}'::jsonb
) RETURNING id, title, priority, created_at;

-- Test 2: Query notifications with priority
SELECT 
  id,
  title,
  message,
  priority,
  type,
  read,
  created_at
FROM notifications 
WHERE title = 'Test Priority Column'
ORDER BY created_at DESC;

-- Test 3: Update notification priority
UPDATE notifications 
SET priority = 'urgent'
WHERE title = 'Test Priority Column'
RETURNING id, title, priority;

-- Test 4: Clean up
DELETE FROM notifications 
WHERE title = 'Test Priority Column';
