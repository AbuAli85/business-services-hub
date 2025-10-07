-- Fix for 406 (Not Acceptable) errors when querying profiles table
-- This script ensures proper RLS policies are in place for profile access

-- Check current RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles';

-- Enable RLS if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Create comprehensive RLS policies for profiles table

-- 1. Users can view their own profile
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

-- 2. Users can view profiles of users they have bookings with
CREATE POLICY "Users can view profiles of booking partners" ON public.profiles
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT DISTINCT client_id FROM public.bookings WHERE provider_id = id
            UNION
            SELECT DISTINCT provider_id FROM public.bookings WHERE client_id = id
        )
    );

-- 3. Users can update their own profile
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 4. Users can insert their own profile
CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- 5. Allow service_role to access all profiles (for admin operations)
CREATE POLICY "Service role can access all profiles" ON public.profiles
    FOR ALL
    USING (current_setting('role') = 'service_role');

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- Verify policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;
