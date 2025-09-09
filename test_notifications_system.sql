-- Test the notifications system
-- Run this in your Supabase SQL Editor to verify everything works

-- Test 1: Check if we can insert a notification
INSERT INTO notifications (
  user_id, 
  type, 
  title, 
  message, 
  priority, 
  data
) VALUES (
  (SELECT id FROM auth.users LIMIT 1), -- Use first user as test
  'task_created',
  'Test Notification',
  'This is a test notification to verify the system works',
  'medium',
  '{"test": true}'::jsonb
) RETURNING *;

-- Test 2: Check if we can read notifications
SELECT 
  id,
  user_id,
  type,
  title,
  message,
  priority,
  read,
  created_at
FROM notifications 
ORDER BY created_at DESC 
LIMIT 5;

-- Test 3: Check notification settings table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'notification_settings';

-- Test 4: If notification_settings doesn't exist, create it
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  sms_notifications BOOLEAN DEFAULT FALSE,
  notification_types JSONB DEFAULT '{}',
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  digest_frequency VARCHAR(20) DEFAULT 'immediate' CHECK (digest_frequency IN ('immediate', 'hourly', 'daily', 'weekly')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Test 5: Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'notifications';

-- Test 6: Clean up test notification
DELETE FROM notifications 
WHERE title = 'Test Notification' 
AND message = 'This is a test notification to verify the system works';
