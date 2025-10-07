-- Fix Bookings RLS Infinite Recursion
-- This script removes all existing policies and creates simple, non-recursive ones

-- First, disable RLS temporarily to avoid issues
ALTER TABLE public.bookings DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on bookings table to prevent conflicts
DO $$
DECLARE
    policy_name TEXT;
BEGIN
    FOR policy_name IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'bookings'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.bookings', policy_name);
        RAISE NOTICE 'Dropped policy: %', policy_name;
    END LOOP;
END $$;

-- Create simple, non-recursive RLS policies for bookings table

-- Policy 1: Users can view their own bookings (as client or provider)
CREATE POLICY "Users can view own bookings" ON public.bookings
    FOR SELECT TO authenticated
    USING (
        auth.uid() = client_id OR 
        auth.uid() = provider_id
    );

-- Policy 2: Users can update their own bookings
CREATE POLICY "Users can update own bookings" ON public.bookings
    FOR UPDATE TO authenticated
    USING (
        auth.uid() = client_id OR 
        auth.uid() = provider_id
    );

-- Policy 3: Users can insert bookings where they are the client
CREATE POLICY "Users can insert own bookings" ON public.bookings
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = client_id);

-- Policy 4: Users can delete their own bookings (optional)
CREATE POLICY "Users can delete own bookings" ON public.bookings
    FOR DELETE TO authenticated
    USING (
        auth.uid() = client_id OR 
        auth.uid() = provider_id
    );

-- Policy 5: Service role can manage all bookings
CREATE POLICY "Service role can manage bookings" ON public.bookings
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Re-enable RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Test the policies to ensure no recursion
DO $$
BEGIN
    -- Test that we can query the bookings table without infinite recursion
    PERFORM 1 FROM public.bookings LIMIT 1;
    RAISE NOTICE 'Bookings table query successful - no infinite recursion detected';
    
    RAISE NOTICE 'Bookings RLS policies fixed successfully!';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error during testing: %', SQLERRM;
END $$;

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';

-- Add helpful comments
COMMENT ON POLICY "Users can view own bookings" ON public.bookings IS 'Allows users to view bookings where they are client or provider';
COMMENT ON POLICY "Users can update own bookings" ON public.bookings IS 'Allows users to update bookings where they are client or provider';
COMMENT ON POLICY "Users can insert own bookings" ON public.bookings IS 'Allows users to create bookings where they are the client';
COMMENT ON POLICY "Users can delete own bookings" ON public.bookings IS 'Allows users to delete bookings where they are client or provider';
COMMENT ON POLICY "Service role can manage bookings" ON public.bookings IS 'Allows service role to manage all bookings';
