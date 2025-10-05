-- Fix Profile Query Timeouts
-- These errors are causing 500 errors and statement timeouts

-- 1. Add indexes to speed up profile queries
CREATE INDEX IF NOT EXISTS idx_profiles_id_name ON public.profiles(id, full_name);
CREATE INDEX IF NOT EXISTS idx_profiles_id_avatar ON public.profiles(id, avatar_url);
CREATE INDEX IF NOT EXISTS idx_profiles_id_role ON public.profiles(id, role);

-- 2. Add composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_profiles_lookup ON public.profiles(id, full_name, avatar_url, role);

-- 3. Analyze table to update statistics
ANALYZE public.profiles;

-- 4. Check for missing primary key or constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_pkey' 
    AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles ADD PRIMARY KEY (id);
    RAISE NOTICE 'Primary key added to profiles table';
  END IF;
END $$;

-- 5. Vacuum the table to improve query performance
VACUUM ANALYZE public.profiles;

-- 6. Check for slow queries on profiles table
SELECT 
  'Profile query performance check' as info,
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN id IS NOT NULL THEN 1 END) as profiles_with_id,
  COUNT(CASE WHEN full_name IS NOT NULL THEN 1 END) as profiles_with_name
FROM public.profiles;

-- 7. Increase statement timeout for this session (temporary fix)
SET statement_timeout = '30s';

-- 8. Check RLS policies that might be causing slow queries
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

