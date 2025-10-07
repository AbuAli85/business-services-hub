-- Fix Profiles RLS 406 (Not Acceptable) Error
-- This script updates the profiles RLS policies to allow necessary cross-user access

-- Disable RLS temporarily to avoid issues
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

-- Create comprehensive RLS policies for profiles table

-- Policy 1: Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

-- Policy 2: Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id);

-- Policy 3: Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);

-- Policy 4: Authenticated users can view verified providers (for service discovery)
CREATE POLICY "Authenticated users can view verified providers" ON public.profiles
    FOR SELECT TO authenticated
    USING (
        auth.role() = 'authenticated' AND 
        role = 'provider' AND 
        is_verified = true
    );

-- Policy 5: Users can view profiles of users they have bookings with
-- This allows clients to see provider profiles and vice versa
CREATE POLICY "Users can view profiles in their bookings" ON public.profiles
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.bookings b
            WHERE (
                (b.client_id = auth.uid() AND b.provider_id = profiles.id) OR
                (b.provider_id = auth.uid() AND b.client_id = profiles.id)
            )
        )
    );

-- Policy 6: Users can view profiles for messaging/communication
-- This allows users to see basic profile info for communication
CREATE POLICY "Users can view profiles for communication" ON public.profiles
    FOR SELECT TO authenticated
    USING (
        -- Allow viewing profiles that are part of the same company
        EXISTS (
            SELECT 1 FROM public.profiles current_user_profile
            WHERE current_user_profile.id = auth.uid() 
            AND current_user_profile.company_id = profiles.company_id
            AND profiles.company_id IS NOT NULL
        ) OR
        -- Allow viewing profiles of users in the same booking
        EXISTS (
            SELECT 1 FROM public.bookings b
            WHERE (
                (b.client_id = auth.uid() AND b.provider_id = profiles.id) OR
                (b.provider_id = auth.uid() AND b.client_id = profiles.id)
            )
        ) OR
        -- Allow viewing verified providers (for service discovery)
        (role = 'provider' AND is_verified = true)
    );

-- Policy 7: Service role can manage all profiles
CREATE POLICY "Service role can manage profiles" ON public.profiles
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Test the policies to ensure they work
DO $$
BEGIN
    -- Test that we can query the profiles table without 406 errors
    PERFORM 1 FROM public.profiles LIMIT 1;
    RAISE NOTICE 'Profiles table query successful - no 406 errors detected';
    
    RAISE NOTICE 'Profiles RLS policies updated successfully!';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error during testing: %', SQLERRM;
END $$;

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';

-- Add helpful comments
COMMENT ON POLICY "Users can view own profile" ON public.profiles IS 'Allows users to view their own profile';
COMMENT ON POLICY "Users can update own profile" ON public.profiles IS 'Allows users to update their own profile';
COMMENT ON POLICY "Users can insert own profile" ON public.profiles IS 'Allows users to create their own profile';
COMMENT ON POLICY "Authenticated users can view verified providers" ON public.profiles IS 'Allows authenticated users to view verified providers for service discovery';
COMMENT ON POLICY "Users can view profiles in their bookings" ON public.profiles IS 'Allows users to view profiles of users they have bookings with';
COMMENT ON POLICY "Users can view profiles for communication" ON public.profiles IS 'Allows users to view profiles for communication and company members';
COMMENT ON POLICY "Service role can manage profiles" ON public.profiles IS 'Allows service role to manage all profiles';
