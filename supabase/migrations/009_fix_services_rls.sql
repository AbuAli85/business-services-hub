-- Fix RLS policies for services table
-- This migration ensures that providers can create and manage their own services

-- First, enable RLS on services table if not already enabled
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON public.services;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.services;
DROP POLICY IF EXISTS "Enable update for users based on provider_id" ON public.services;
DROP POLICY IF EXISTS "Enable delete for users based on provider_id" ON public.services;

-- Create policy for reading services (public access)
CREATE POLICY "Enable read access for all users" ON public.services
    FOR SELECT USING (true);

-- Create policy for inserting services (authenticated users can create services)
CREATE POLICY "Enable insert for authenticated users" ON public.services
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Create policy for updating services (users can only update their own services)
CREATE POLICY "Enable update for users based on provider_id" ON public.services
    FOR UPDATE USING (auth.uid() = provider_id);

-- Create policy for deleting services (users can only delete their own services)
CREATE POLICY "Enable delete for users based on provider_id" ON public.services
    FOR DELETE USING (auth.uid() = provider_id);

-- Grant necessary permissions
GRANT ALL ON public.services TO authenticated;
GRANT SELECT ON public.services TO anon;
