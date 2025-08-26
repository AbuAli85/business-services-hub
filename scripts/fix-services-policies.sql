-- Quick fix for services table RLS policies
-- Run this in your Supabase SQL editor to resolve policy conflicts

-- First, let's see what policies currently exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'services';

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Anyone can view active services" ON public.services;
DROP POLICY IF EXISTS "Anyone can view approved active services" ON public.services;
DROP POLICY IF EXISTS "Providers can view their own services" ON public.services;
DROP POLICY IF EXISTS "Clients can view approved services" ON public.services;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.services;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.services;
DROP POLICY IF EXISTS "Enable update for users based on provider_id" ON public.services;
DROP POLICY IF EXISTS "Enable delete for users based on provider_id" ON public.services;
DROP POLICY IF EXISTS "Providers can insert their own services" ON public.services;
DROP POLICY IF EXISTS "Providers can update their own services" ON public.services;
DROP POLICY IF EXISTS "Providers can delete their own services" ON public.services;
DROP POLICY IF EXISTS "Admins can view all services" ON public.services;
DROP POLICY IF EXISTS "Read services public" ON public.services;
DROP POLICY IF EXISTS "Provider manages own services" ON public.services;
DROP POLICY IF EXISTS "Provider updates own services" ON public.services;
DROP POLICY IF EXISTS "Provider deletes own services" ON public.services;

-- Create clean, simple policies
-- Policy for viewing approved active services (public access)
CREATE POLICY "Anyone can view approved active services" ON public.services
    FOR SELECT USING (
        status = 'active' 
        AND (approval_status = 'approved' OR approval_status IS NULL)
    );

-- Policy for providers to view their own services regardless of approval status
CREATE POLICY "Providers can view their own services" ON public.services
    FOR SELECT USING (provider_id = auth.uid());

-- Policy for providers to insert their own services
CREATE POLICY "Providers can insert their own services" ON public.services
    FOR INSERT WITH CHECK (provider_id = auth.uid());

-- Policy for providers to update their own services
CREATE POLICY "Providers can update their own services" ON public.services
    FOR UPDATE USING (provider_id = auth.uid());

-- Policy for providers to delete their own services
CREATE POLICY "Providers can delete their own services" ON public.services
    FOR DELETE USING (provider_id = auth.uid());

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'services';
