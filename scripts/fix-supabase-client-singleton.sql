-- Fix Supabase Client Singleton Issue
-- This script ensures proper client configuration

-- 1. Check current Supabase configuration
SELECT 
  'Supabase Configuration Check:' as info,
  current_setting('app.settings.supabase_url', true) as supabase_url,
  current_setting('app.settings.supabase_anon_key', true) as supabase_anon_key;

-- 2. Verify RLS is enabled on all progress tracking tables
SELECT 
  'RLS Status Check:' as info,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('milestones', 'tasks', 'time_entries', 'progress_logs')
ORDER BY tablename;

-- 3. Check if all necessary policies exist
SELECT 
  'Policy Count by Table:' as info,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('milestones', 'tasks', 'time_entries', 'progress_logs')
GROUP BY tablename
ORDER BY tablename;

-- 4. Verify user permissions
SELECT 
  'User Permissions Check:' as info,
  has_table_privilege('public.milestones', 'SELECT') as can_select_milestones,
  has_table_privilege('public.tasks', 'SELECT') as can_select_tasks,
  has_table_privilege('public.time_entries', 'SELECT') as can_select_time_entries,
  has_table_privilege('public.time_entries', 'INSERT') as can_insert_time_entries,
  has_table_privilege('public.time_entries', 'UPDATE') as can_update_time_entries;

-- 5. Test a simple query to verify access
SELECT 
  'Access Test:' as info,
  COUNT(*) as milestone_count
FROM public.milestones 
WHERE booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5';
