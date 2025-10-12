-- Debug User Role and Permissions
-- Run these queries in Supabase SQL Editor to check your current user's role

-- 1. Check your current user ID and role
SELECT 
  auth.uid() as current_user_id,
  p.id as profile_id,
  p.role,
  p.full_name,
  p.email
FROM profiles p 
WHERE p.id = auth.uid();

-- 2. Check if your user exists in the profiles table
SELECT 
  id,
  role,
  full_name,
  email,
  created_at
FROM profiles 
WHERE id = auth.uid();

-- 3. List all admin/manager users
SELECT 
  id,
  role,
  full_name,
  email
FROM profiles 
WHERE role IN ('admin', 'manager')
ORDER BY role, full_name;

-- 4. Test the exact condition used in the RLS policy
SELECT 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'manager')
  ) as can_insert_notifications;

-- 5. Check if notifications were created from your app (this is the real test!)
SELECT 
  id,
  user_id,
  type,
  title,
  created_at
FROM notifications 
WHERE type = 'service'
ORDER BY created_at DESC 
LIMIT 5;

-- 6. Check if audit logs were created from your app (this is the real test!)
SELECT 
  id,
  service_id,
  event,
  actor_name,
  created_at
FROM service_audit_logs 
ORDER BY created_at DESC 
LIMIT 5;

-- 7. If you see data in the above queries, your system is working perfectly!
-- The SQL editor tests fail because auth.uid() is null in the SQL editor,
-- but your app works because you're authenticated when using it.
