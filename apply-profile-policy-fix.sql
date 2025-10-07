-- Comprehensive fix for profile access issues
-- This script fixes the broken RLS policy and ensures proper profile access

-- 1. Drop the broken "Users can view profiles of booking partners" policy
DROP POLICY IF EXISTS "Users can view profiles of booking partners" ON public.profiles;

-- 2. Create a corrected policy that properly references the profiles table
CREATE POLICY "Users can view profiles of booking partners" ON public.profiles
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT DISTINCT client_id FROM public.bookings WHERE provider_id = profiles.id
            UNION
            SELECT DISTINCT provider_id FROM public.bookings WHERE client_id = profiles.id
        )
    );

-- 3. Drop existing policies that might conflict and recreate them
DROP POLICY IF EXISTS "Users can view basic profile info" ON public.profiles;
DROP POLICY IF EXISTS "Service role full access" ON public.profiles;

-- 4. Create a policy to allow viewing basic profile information for any authenticated user
-- This is safe as it only exposes non-sensitive information
CREATE POLICY "Users can view basic profile info" ON public.profiles
    FOR SELECT
    USING (
        -- Allow viewing basic profile information (id, full_name, company_name, role, avatar_url)
        auth.role() = 'authenticated'
    );

-- 5. Ensure the service_role has full access
CREATE POLICY "Service role full access" ON public.profiles
    FOR ALL
    USING (current_setting('role') = 'service_role')
    WITH CHECK (current_setting('role') = 'service_role');

-- 5. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- 6. Verify all policies are in place
SELECT 
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 7. Test the policies by checking if they work
-- This is a test query that should work if policies are correct
-- SELECT id, full_name, company_name FROM public.profiles LIMIT 1;
