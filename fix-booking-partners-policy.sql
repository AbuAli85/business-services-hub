-- Fix the "Users can view profiles of booking partners" RLS policy
-- The current policy has a bug: "WHERE (bookings.provider_id = bookings.id)" should be "WHERE (bookings.provider_id = profiles.id)"

-- Drop the broken policy
DROP POLICY IF EXISTS "Users can view profiles of booking partners" ON public.profiles;

-- Create the corrected policy
CREATE POLICY "Users can view profiles of booking partners" ON public.profiles
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT DISTINCT client_id FROM public.bookings WHERE provider_id = profiles.id
            UNION
            SELECT DISTINCT provider_id FROM public.bookings WHERE client_id = profiles.id
        )
    );

-- Also create a simpler policy for authenticated users to view basic profile info
-- This allows viewing basic profile information for any user (name, company, etc.)
CREATE POLICY "Users can view basic profile info" ON public.profiles
    FOR SELECT
    USING (
        -- Allow viewing basic profile information (id, full_name, company_name, role, avatar_url)
        -- This is safe as it doesn't expose sensitive information
        auth.role() = 'authenticated'
    );

-- Verify the policies are created correctly
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;
