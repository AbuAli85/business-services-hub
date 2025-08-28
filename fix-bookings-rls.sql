-- Fix Bookings RLS Policies
-- This script fixes the permission denied error for updating bookings

-- First, drop any conflicting policies
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.bookings;
DROP POLICY IF EXISTS "Users can update own bookings" ON public.bookings;

-- Create the correct update policy for bookings
CREATE POLICY "Users can update own bookings" ON public.bookings
    FOR UPDATE USING (
        auth.uid() = client_id OR 
        auth.uid() = provider_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Also ensure the correct select policy exists
DROP POLICY IF EXISTS "Enable read access for all users" ON public.bookings;
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;

CREATE POLICY "Users can view own bookings" ON public.bookings
    FOR SELECT USING (
        auth.uid() = client_id OR 
        auth.uid() = provider_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Ensure RLS is enabled
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON public.bookings TO authenticated;
GRANT SELECT ON public.bookings TO anon;
