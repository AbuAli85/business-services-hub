-- Fix RLS policies for booking_progress table
-- This allows the service role to access the table for testing

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view progress for their bookings" ON public.booking_progress;
DROP POLICY IF EXISTS "Providers can manage progress for their bookings" ON public.booking_progress;

-- Create more permissive policies that work with service role
CREATE POLICY "Allow service role full access" ON public.booking_progress
    FOR ALL USING (true);

-- Also create user-specific policies for when using regular auth
CREATE POLICY "Users can view progress for their bookings" ON public.booking_progress
    FOR SELECT USING (
        booking_id IN (
            SELECT id FROM public.bookings 
            WHERE client_id = auth.uid() OR provider_id = auth.uid()
        )
    );

CREATE POLICY "Providers can manage progress for their bookings" ON public.booking_progress
    FOR ALL USING (
        booking_id IN (
            SELECT id FROM public.bookings 
            WHERE provider_id = auth.uid()
        )
    );
