-- Migration: Fix Bookings RLS Policies
-- Description: Create simple, non-recursive RLS policies for bookings table
-- Date: 2024-12-20

-- Drop all existing policies on bookings table
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can insert own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Service role can manage bookings" ON public.bookings;

-- Create simple policies

-- Policy 1: Users can view their own bookings (as client or provider)
CREATE POLICY "Users can view own bookings" ON public.bookings
    FOR SELECT USING (
        auth.uid() = client_id OR 
        auth.uid() = provider_id
    );

-- Policy 2: Users can update their own bookings
CREATE POLICY "Users can update own bookings" ON public.bookings
    FOR UPDATE USING (
        auth.uid() = client_id OR 
        auth.uid() = provider_id
    );

-- Policy 3: Users can insert bookings where they are the client
CREATE POLICY "Users can insert own bookings" ON public.bookings
    FOR INSERT WITH CHECK (auth.uid() = client_id);

-- Policy 4: Service role can manage all bookings
CREATE POLICY "Service role can manage bookings" ON public.bookings
    FOR ALL USING (auth.role() = 'service_role');

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
    RAISE NOTICE 'Bookings RLS policies fixed successfully!';
END $$;
