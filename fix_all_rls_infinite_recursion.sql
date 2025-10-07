-- Fix All RLS Infinite Recursion Issues
-- This script removes all circular references and creates simple, non-recursive policies

-- =============================================
-- 1. Fix Bookings Table RLS Policies
-- =============================================

-- Disable RLS temporarily to avoid issues
ALTER TABLE public.bookings DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on bookings table
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

-- Create simple, non-recursive RLS policies for bookings table
CREATE POLICY "Users can view own bookings" ON public.bookings
    FOR SELECT TO authenticated
    USING (
        auth.uid() = client_id OR 
        auth.uid() = provider_id
    );

CREATE POLICY "Users can update own bookings" ON public.bookings
    FOR UPDATE TO authenticated
    USING (
        auth.uid() = client_id OR 
        auth.uid() = provider_id
    );

CREATE POLICY "Users can insert own bookings" ON public.bookings
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Users can delete own bookings" ON public.bookings
    FOR DELETE TO authenticated
    USING (
        auth.uid() = client_id OR 
        auth.uid() = provider_id
    );

CREATE POLICY "Service role can manage bookings" ON public.bookings
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Re-enable RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 2. Fix Services Table RLS Policies
-- =============================================

-- Disable RLS temporarily
ALTER TABLE public.services DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on services table
DO $$
DECLARE
    policy_name TEXT;
BEGIN
    FOR policy_name IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'services'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.services', policy_name);
        RAISE NOTICE 'Dropped services policy: %', policy_name;
    END LOOP;
END $$;

-- Create simple, non-recursive RLS policies for services table
CREATE POLICY "Users can view active services" ON public.services
    FOR SELECT TO authenticated
    USING (status = 'active');

CREATE POLICY "Providers can view own services" ON public.services
    FOR SELECT TO authenticated
    USING (auth.uid() = provider_id);

CREATE POLICY "Providers can manage own services" ON public.services
    FOR ALL TO authenticated
    USING (auth.uid() = provider_id)
    WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Service role can manage services" ON public.services
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Re-enable RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 3. Fix Profiles Table RLS Policies
-- =============================================

-- Disable RLS temporarily
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

-- Create simple, non-recursive RLS policies for profiles table
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Authenticated users can view verified providers" ON public.profiles
    FOR SELECT TO authenticated
    USING (
        auth.role() = 'authenticated' AND 
        role = 'provider' AND 
        is_verified = true
    );

CREATE POLICY "Service role can manage profiles" ON public.profiles
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 4. Fix Milestone Approvals Table RLS Policies
-- =============================================

-- Disable RLS temporarily
ALTER TABLE public.milestone_approvals DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on milestone_approvals table
DO $$
DECLARE
    policy_name TEXT;
BEGIN
    FOR policy_name IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'milestone_approvals'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.milestone_approvals', policy_name);
        RAISE NOTICE 'Dropped milestone_approvals policy: %', policy_name;
    END LOOP;
END $$;

-- Create simple, non-recursive RLS policies for milestone_approvals table
CREATE POLICY "Users can view own approvals" ON public.milestone_approvals
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own approvals" ON public.milestone_approvals
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own approvals" ON public.milestone_approvals
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own approvals" ON public.milestone_approvals
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage approvals" ON public.milestone_approvals
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Re-enable RLS
ALTER TABLE public.milestone_approvals ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 5. Test All Tables
-- =============================================

DO $$
BEGIN
    -- Test bookings table
    PERFORM 1 FROM public.bookings LIMIT 1;
    RAISE NOTICE 'Bookings table query successful';
    
    -- Test services table
    PERFORM 1 FROM public.services LIMIT 1;
    RAISE NOTICE 'Services table query successful';
    
    -- Test profiles table
    PERFORM 1 FROM public.profiles LIMIT 1;
    RAISE NOTICE 'Profiles table query successful';
    
    -- Test milestone_approvals table
    PERFORM 1 FROM public.milestone_approvals LIMIT 1;
    RAISE NOTICE 'Milestone approvals table query successful';
    
    RAISE NOTICE 'All RLS policies fixed successfully - no infinite recursion detected!';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error during testing: %', SQLERRM;
END $$;

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';

-- Add helpful comments
COMMENT ON POLICY "Users can view own bookings" ON public.bookings IS 'Allows users to view bookings where they are client or provider';
COMMENT ON POLICY "Users can update own bookings" ON public.bookings IS 'Allows users to update bookings where they are client or provider';
COMMENT ON POLICY "Users can insert own bookings" ON public.bookings IS 'Allows users to create bookings where they are the client';
COMMENT ON POLICY "Users can delete own bookings" ON public.bookings IS 'Allows users to delete bookings where they are client or provider';
COMMENT ON POLICY "Service role can manage bookings" ON public.bookings IS 'Allows service role to manage all bookings';

COMMENT ON POLICY "Users can view active services" ON public.services IS 'Allows users to view active services';
COMMENT ON POLICY "Providers can view own services" ON public.services IS 'Allows providers to view their own services';
COMMENT ON POLICY "Providers can manage own services" ON public.services IS 'Allows providers to manage their own services';
COMMENT ON POLICY "Service role can manage services" ON public.services IS 'Allows service role to manage all services';

COMMENT ON POLICY "Users can view own profile" ON public.profiles IS 'Allows users to view their own profile';
COMMENT ON POLICY "Users can update own profile" ON public.profiles IS 'Allows users to update their own profile';
COMMENT ON POLICY "Users can insert own profile" ON public.profiles IS 'Allows users to create their own profile';
COMMENT ON POLICY "Authenticated users can view verified providers" ON public.profiles IS 'Allows authenticated users to view verified providers';
COMMENT ON POLICY "Service role can manage profiles" ON public.profiles IS 'Allows service role to manage all profiles';

COMMENT ON POLICY "Users can view own approvals" ON public.milestone_approvals IS 'Allows users to view their own milestone approvals';
COMMENT ON POLICY "Users can insert own approvals" ON public.milestone_approvals IS 'Allows users to create their own milestone approvals';
COMMENT ON POLICY "Users can update own approvals" ON public.milestone_approvals IS 'Allows users to update their own milestone approvals';
COMMENT ON POLICY "Users can delete own approvals" ON public.milestone_approvals IS 'Allows users to delete their own milestone approvals';
COMMENT ON POLICY "Service role can manage approvals" ON public.milestone_approvals IS 'Allows service role to manage all milestone approvals';
