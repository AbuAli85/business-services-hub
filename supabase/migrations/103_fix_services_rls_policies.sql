-- Fix services table RLS policies to resolve 400 errors
-- This migration cleans up conflicting policies and ensures proper access

-- Drop all existing policies on services table
DROP POLICY IF EXISTS "Read services public" ON public.services;
DROP POLICY IF EXISTS "Provider manages own services" ON public.services;
DROP POLICY IF EXISTS "Provider updates own services" ON public.services;
DROP POLICY IF EXISTS "Provider deletes own services" ON public.services;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.services;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.services;
DROP POLICY IF EXISTS "Enable update for users based on provider_id" ON public.services;
DROP POLICY IF EXISTS "Enable delete for users based on provider_id" ON public.services;
DROP POLICY IF EXISTS "Anyone can view active services" ON public.services;
DROP POLICY IF EXISTS "Users can view active services" ON public.services;
DROP POLICY IF EXISTS "Users can view own services" ON public.services;
DROP POLICY IF EXISTS "Providers can manage own services" ON public.services;
DROP POLICY IF EXISTS "Admins can manage all services" ON public.services;
DROP POLICY IF EXISTS "Anyone can view approved active services" ON public.services;
DROP POLICY IF EXISTS "Providers can view their own services" ON public.services;
DROP POLICY IF EXISTS "Providers can insert their own services" ON public.services;
DROP POLICY IF EXISTS "Providers can update their own services" ON public.services;
DROP POLICY IF EXISTS "Providers can delete their own services" ON public.services;
DROP POLICY IF EXISTS "Clients can view approved services" ON public.services;
DROP POLICY IF EXISTS "Admins can view all services" ON public.services;
DROP POLICY IF EXISTS "Anyone can view active services with enhanced details" ON public.services;

-- Create clean, simple policies for services table
-- Allow anyone to read active services
CREATE POLICY "Anyone can read active services" ON public.services
    FOR SELECT USING (status = 'active');

-- Allow providers to read their own services (regardless of status)
CREATE POLICY "Providers can read own services" ON public.services
    FOR SELECT USING (provider_id = auth.uid());

-- Allow providers to insert their own services
CREATE POLICY "Providers can insert own services" ON public.services
    FOR INSERT WITH CHECK (provider_id = auth.uid());

-- Allow providers to update their own services
CREATE POLICY "Providers can update own services" ON public.services
    FOR UPDATE USING (provider_id = auth.uid());

-- Allow providers to delete their own services
CREATE POLICY "Providers can delete own services" ON public.services
    FOR DELETE USING (provider_id = auth.uid());

-- Allow admins to do everything
CREATE POLICY "Admins can manage all services" ON public.services
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Grant necessary permissions
GRANT ALL ON public.services TO authenticated;
GRANT SELECT ON public.services TO anon;

-- Ensure RLS is enabled
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
