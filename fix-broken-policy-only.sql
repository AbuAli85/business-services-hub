-- Simple fix for the broken "Users can view profiles of booking partners" policy
-- This only fixes the specific broken policy without recreating existing ones

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

-- Verify the policy was created
SELECT policyname, cmd, roles, qual
FROM pg_policies 
WHERE tablename = 'profiles' 
AND policyname = 'Users can view profiles of booking partners';
