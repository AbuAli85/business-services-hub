-- Find the correct user ID for your email preferences
-- Run this in your Supabase SQL Editor

-- 1. Check what user IDs exist in auth.users
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 10;

-- 2. Check what user IDs exist in profiles table
SELECT 
  id,
  email,
  full_name,
  role,
  created_at
FROM profiles 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Check what user IDs exist in notifications table
SELECT 
  user_id,
  COUNT(*) as notification_count,
  MAX(created_at) as latest_notification
FROM notifications 
GROUP BY user_id 
ORDER BY latest_notification DESC;

-- 4. Find the user who has the notification we're working with
SELECT 
  n.user_id,
  n.title,
  n.message,
  n.created_at,
  p.email,
  p.full_name
FROM notifications n
LEFT JOIN profiles p ON n.user_id = p.id
WHERE n.id = 'afd6ae15-28e8-494f-9d79-cbc2f0b04ae0';

-- 5. Check if there's a mismatch between auth.users and profiles
SELECT 
  'auth.users' as table_name,
  COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
  'profiles' as table_name,
  COUNT(*) as count
FROM profiles
UNION ALL
SELECT 
  'notifications' as table_name,
  COUNT(DISTINCT user_id) as count
FROM notifications;
