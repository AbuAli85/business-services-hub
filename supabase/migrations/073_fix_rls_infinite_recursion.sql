-- Migration: Fix RLS Infinite Recursion
-- Description: Drop all existing policies and create simple, non-recursive ones
-- Date: 2024-12-20

-- Drop ALL existing policies on profiles table to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view verified providers" ON public.profiles;
DROP POLICY IF EXISTS "Enhanced profiles access for booking details" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view basic profile info" ON public.profiles;
DROP POLICY IF EXISTS "Safe profile access for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Anonymous users can view verified providers" ON public.profiles;
DROP POLICY IF EXISTS "Service role can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Service role can read profiles" ON public.profiles;

-- Create simple, non-recursive policies

-- Policy 1: Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- Policy 2: Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Policy 3: Users can insert their own profile (for new registrations)
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Policy 4: Authenticated users can view verified providers (public profiles)
CREATE POLICY "Authenticated users can view verified providers" ON public.profiles
    FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        role = 'provider' AND 
        verification_status = 'approved'
    );

-- Policy 5: Anonymous users can view verified providers
CREATE POLICY "Anonymous users can view verified providers" ON public.profiles
    FOR SELECT USING (
        role = 'provider' AND 
        verification_status = 'approved'
    );

-- Policy 6: Service role can do everything (for admin operations)
CREATE POLICY "Service role full access" ON public.profiles
    FOR ALL USING (auth.role() = 'service_role');

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';

-- Add helpful comments
COMMENT ON POLICY "Users can view own profile" ON public.profiles IS 'Users can always view their complete profile';
COMMENT ON POLICY "Users can update own profile" ON public.profiles IS 'Users can update their own profile information';
COMMENT ON POLICY "Users can insert own profile" ON public.profiles IS 'Users can create their own profile during registration';
COMMENT ON POLICY "Authenticated users can view verified providers" ON public.profiles IS 'Authenticated users can view approved provider profiles';
COMMENT ON POLICY "Anonymous users can view verified providers" ON public.profiles IS 'Anonymous users can view approved provider profiles';
COMMENT ON POLICY "Service role full access" ON public.profiles IS 'Service role has full access for admin operations';

DO $$
BEGIN
    RAISE NOTICE 'RLS policies fixed successfully!';
    RAISE NOTICE 'All recursive policies removed and replaced with simple ones';
    RAISE NOTICE 'Profiles table should now work without infinite recursion errors';
END $$;
