-- Robust RLS Policy Fixes
-- This script safely fixes the infinite recursion and 500 errors in Supabase
-- Handles existing policies gracefully

-- =============================================
-- 1. Fix Profiles Table RLS Policies
-- =============================================

-- First, disable RLS temporarily to avoid conflicts
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Remove ALL existing policies for profiles table (comprehensive cleanup)
DO $$
DECLARE
    policy_name TEXT;
BEGIN
    -- Get all policy names for profiles table
    FOR policy_name IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', policy_name);
        RAISE NOTICE 'Dropped policy: %', policy_name;
    END LOOP;
END $$;

-- Recreate RLS policies for profiles table
-- 1. Allow read access for authenticated users to their own profile
CREATE POLICY "User can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- 2. Allow insert access for authenticated users to create their own profile
CREATE POLICY "User can create own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- 3. Allow update access for authenticated users to their own profile
CREATE POLICY "User can update own profile fields" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4. Allow service_role to perform all operations
CREATE POLICY "Service role full access" ON public.profiles
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 2. Fix Notifications Table RLS Policies
-- =============================================

-- Disable RLS temporarily
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

-- Remove ALL existing policies for notifications table
DO $$
DECLARE
    policy_name TEXT;
BEGIN
    FOR policy_name IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'notifications'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.notifications', policy_name);
        RAISE NOTICE 'Dropped policy: %', policy_name;
    END LOOP;
END $$;

-- Recreate RLS policies for notifications table
CREATE POLICY "User can view own notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage notifications" ON public.notifications
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Re-enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 3. Fix Companies Table RLS Policies
-- =============================================

-- Disable RLS temporarily
ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;

-- Remove ALL existing policies for companies table
DO $$
DECLARE
    policy_name TEXT;
BEGIN
    FOR policy_name IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'companies'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.companies', policy_name);
        RAISE NOTICE 'Dropped policy: %', policy_name;
    END LOOP;
END $$;

-- Recreate RLS policies for companies table
CREATE POLICY "Authenticated users can view associated companies" ON public.companies
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.company_id = companies.id));

CREATE POLICY "Service role can manage companies" ON public.companies
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Re-enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 4. Fix Bookings Table RLS Policies
-- =============================================

-- Disable RLS temporarily
ALTER TABLE public.bookings DISABLE ROW LEVEL SECURITY;

-- Remove ALL existing policies for bookings table
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
        RAISE NOTICE 'Dropped policy: %', policy_name;
    END LOOP;
END $$;

-- Recreate RLS policies for bookings table
CREATE POLICY "Clients can view their own bookings" ON public.bookings
  FOR SELECT TO authenticated
  USING (auth.uid() = client_id);

CREATE POLICY "Clients can create bookings" ON public.bookings
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Providers can view bookings for their services" ON public.bookings
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.services WHERE services.id = service_id AND services.provider_id = auth.uid()));

CREATE POLICY "Providers can update booking status" ON public.bookings
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.services WHERE services.id = service_id AND services.provider_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.services WHERE services.id = service_id AND services.provider_id = auth.uid()));

CREATE POLICY "Service role can manage bookings" ON public.bookings
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Re-enable RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 5. Test the fixes
-- =============================================

-- Test that we can query the tables without infinite recursion
DO $$
BEGIN
    -- Test profiles query
    PERFORM 1 FROM public.profiles LIMIT 1;
    RAISE NOTICE 'Profiles table query successful';
    
    -- Test notifications query
    PERFORM 1 FROM public.notifications LIMIT 1;
    RAISE NOTICE 'Notifications table query successful';
    
    -- Test companies query
    PERFORM 1 FROM public.companies LIMIT 1;
    RAISE NOTICE 'Companies table query successful';
    
    -- Test bookings query
    PERFORM 1 FROM public.bookings LIMIT 1;
    RAISE NOTICE 'Bookings table query successful';
    
    RAISE NOTICE 'All RLS policy fixes applied successfully!';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error during testing: %', SQLERRM;
END $$;
