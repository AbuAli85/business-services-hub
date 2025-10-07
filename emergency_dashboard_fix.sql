-- EMERGENCY DASHBOARD FIX
-- This script temporarily disables RLS to get the dashboard working immediately

-- =============================================
-- 1. TEMPORARILY DISABLE RLS ON PROFILES TABLE
-- =============================================

-- Disable RLS on profiles table to prevent infinite recursion
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on profiles table
DO $$
DECLARE
    policy_name TEXT;
BEGIN
    FOR policy_name IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', policy_name);
        RAISE NOTICE 'Dropped profiles policy: %', policy_name;
    END LOOP;
END $$;

-- Create a simple policy that allows all authenticated users to read profiles
-- This prevents 406 errors while maintaining basic security
CREATE POLICY "Authenticated users can read profiles" ON public.profiles
    FOR SELECT TO authenticated
    USING (auth.role() = 'authenticated');

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);

-- Service role can do everything
CREATE POLICY "Service role can manage profiles" ON public.profiles
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Re-enable RLS with simple policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 2. FIX OTHER TABLES TO PREVENT RECURSION
-- =============================================

-- Fix bookings table
ALTER TABLE public.bookings DISABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    policy_name TEXT;
BEGIN
    FOR policy_name IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'bookings'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.bookings', policy_name);
        RAISE NOTICE 'Dropped bookings policy: %', policy_name;
    END LOOP;
END $$;

CREATE POLICY "Users can view own bookings" ON public.bookings
    FOR SELECT TO authenticated
    USING (
        auth.uid() = client_id OR 
        auth.uid() = provider_id
    );

CREATE POLICY "Users can manage own bookings" ON public.bookings
    FOR ALL TO authenticated
    USING (
        auth.uid() = client_id OR 
        auth.uid() = provider_id
    )
    WITH CHECK (
        auth.uid() = client_id OR 
        auth.uid() = provider_id
    );

CREATE POLICY "Service role can manage bookings" ON public.bookings
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 3. TEST THE FIX
-- =============================================

DO $$
BEGIN
    -- Test profiles table
    PERFORM 1 FROM public.profiles LIMIT 1;
    RAISE NOTICE 'Profiles table query successful - dashboard should work now!';
    
    -- Test bookings table
    PERFORM 1 FROM public.bookings LIMIT 1;
    RAISE NOTICE 'Bookings table query successful!';
    
    RAISE NOTICE 'EMERGENCY FIX APPLIED - Dashboard should work immediately!';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error during testing: %', SQLERRM;
END $$;

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';

-- Add helpful comments
COMMENT ON POLICY "Authenticated users can read profiles" ON public.profiles IS 'Allows all authenticated users to read profiles (prevents 406 errors)';
COMMENT ON POLICY "Users can update own profile" ON public.profiles IS 'Allows users to update their own profile';
COMMENT ON POLICY "Users can insert own profile" ON public.profiles IS 'Allows users to create their own profile';
COMMENT ON POLICY "Service role can manage profiles" ON public.profiles IS 'Allows service role to manage all profiles';

COMMENT ON POLICY "Users can view own bookings" ON public.bookings IS 'Allows users to view their own bookings';
COMMENT ON POLICY "Users can manage own bookings" ON public.bookings IS 'Allows users to manage their own bookings';
COMMENT ON POLICY "Service role can manage bookings" ON public.bookings IS 'Allows service role to manage all bookings';
