-- =============================================
-- FIX SUPABASE 500 ERROR - RLS POLICY ISSUE
-- =============================================
-- Run this script in your Supabase SQL Editor
-- This will fix the infinite recursion causing 500 errors

-- Step 1: Temporarily disable RLS on profiles table
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies (clean slate)
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- Step 3: Create simple, non-recursive policies
-- These policies are carefully designed to avoid infinite recursion

-- Policy 1: Users can view their own profile
CREATE POLICY "users_view_own_profile" 
ON public.profiles
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

-- Policy 2: Users can insert their own profile
CREATE POLICY "users_insert_own_profile" 
ON public.profiles
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

-- Policy 3: Users can update their own profile
CREATE POLICY "users_update_own_profile" 
ON public.profiles
FOR UPDATE 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy 4: Service role has full access (for admin operations)
CREATE POLICY "service_role_all_access" 
ON public.profiles
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Policy 5: Authenticated users can view approved providers (for browsing)
CREATE POLICY "users_view_approved_providers" 
ON public.profiles
FOR SELECT 
TO authenticated
USING (
    role = 'provider' 
    AND verification_status = 'approved'
);

-- Step 4: Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 5: Verify policies are working
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles';
    
    RAISE NOTICE 'Total policies on profiles table: %', policy_count;
    
    IF policy_count >= 4 THEN
        RAISE NOTICE '✅ RLS policies successfully created!';
    ELSE
        RAISE WARNING '⚠️ Expected at least 4 policies, but found %', policy_count;
    END IF;
    
    RAISE NOTICE '✅ RLS Policy fix completed! Please test your application now.';
END $$;

-- Step 6: Test query (optional - uncomment to test)
-- SELECT COUNT(*) FROM public.profiles;

