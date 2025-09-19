-- Comprehensive RLS Policy Fixes
-- This script fixes the infinite recursion and 500 errors in Supabase

-- =============================================
-- 1. Fix Profiles Table RLS Policies
-- =============================================

-- Remove potentially problematic RLS policies that might cause recursion
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.profiles;
DROP POLICY IF EXISTS "Enable delete for users based on id" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated read access" ON public.profiles;
DROP POLICY IF EXISTS "Allow individual read access" ON public.profiles;
DROP POLICY IF EXISTS "Allow individual insert access" ON public.profiles;
DROP POLICY IF EXISTS "Allow individual update access" ON public.profiles;
DROP POLICY IF EXISTS "Allow individual delete access" ON public.profiles;
DROP POLICY IF EXISTS "Allow service_role to manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Service role can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;

-- Recreate RLS policies for profiles table to prevent infinite recursion
-- Policies are ordered and specific to prevent conflicts and ensure correct access.

-- 1. Allow read access for authenticated users to their own profile
CREATE POLICY "User can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- 2. Allow insert access for authenticated users to create their own profile
CREATE POLICY "User can create own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- 3. Allow update access for authenticated users to their own profile
--    Note: RLS policies don't support OLD/NEW syntax, so we'll use a simpler approach
CREATE POLICY "User can update own profile fields" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4. Allow service_role to perform all operations (SELECT, INSERT, UPDATE, DELETE)
--    This is crucial for admin functions and backend processes.
CREATE POLICY "Service role full access" ON public.profiles
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Ensure RLS is enabled for the table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 2. Fix Notifications Table RLS Policies
-- =============================================

-- Remove potentially problematic RLS policies for notifications
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.notifications;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.notifications;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.notifications;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.notifications;

-- Recreate RLS policies for notifications table
-- 1. Allow authenticated users to read their own notifications
CREATE POLICY "User can view own notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 2. Allow service_role to perform all operations on notifications
CREATE POLICY "Service role can manage notifications" ON public.notifications
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Ensure RLS is enabled for the table
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 3. Fix Companies Table RLS Policies
-- =============================================

-- Remove potentially problematic RLS policies for companies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.companies;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.companies;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.companies;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.companies;

-- Recreate RLS policies for companies table
-- 1. Allow authenticated users to read companies they are associated with
CREATE POLICY "Authenticated users can view associated companies" ON public.companies
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.company_id = companies.id));

-- 2. Allow service_role to perform all operations on companies
CREATE POLICY "Service role can manage companies" ON public.companies
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Ensure RLS is enabled for the table
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 4. Fix Bookings Table RLS Policies
-- =============================================

-- Remove potentially problematic RLS policies for bookings
DROP POLICY IF EXISTS "Enable read access for all users" ON public.bookings;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.bookings;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.bookings;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.bookings;

-- Recreate RLS policies for bookings table
-- 1. Clients can view their own bookings
CREATE POLICY "Clients can view their own bookings" ON public.bookings
  FOR SELECT TO authenticated
  USING (auth.uid() = client_id);

-- 2. Clients can create bookings
CREATE POLICY "Clients can create bookings" ON public.bookings
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = client_id);

-- 3. Providers can view bookings for their services
CREATE POLICY "Providers can view bookings for their services" ON public.bookings
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.services WHERE services.id = service_id AND services.provider_id = auth.uid()));

-- 4. Providers can update the status of bookings for their services
CREATE POLICY "Providers can update booking status" ON public.bookings
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.services WHERE services.id = booking_id AND services.provider_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.services WHERE services.id = service_id AND services.provider_id = auth.uid()));

-- 5. Allow service_role to perform all operations on bookings
CREATE POLICY "Service role can manage bookings" ON public.bookings
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Ensure RLS is enabled for the table
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
