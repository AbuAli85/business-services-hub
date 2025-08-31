-- Migration: Fix Service Packages RLS Policies
-- Description: Add proper RLS policies to service_packages table to resolve permission denied errors
-- Date: 2024-12-19

-- Enable RLS on service_packages table if not already enabled
ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own service packages" ON public.service_packages;
DROP POLICY IF EXISTS "Users can insert their own service packages" ON public.service_packages;
DROP POLICY IF EXISTS "Users can update their own service packages" ON public.service_packages;
DROP POLICY IF EXISTS "Users can delete their own service packages" ON public.service_packages;
DROP POLICY IF EXISTS "Public can view approved service packages" ON public.service_packages;

-- Policy 1: Users can view service packages for services they own
CREATE POLICY "Users can view their own service packages" ON public.service_packages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.services 
            WHERE services.id = service_packages.service_id 
            AND services.provider_id = auth.uid()
        )
    );

-- Policy 2: Users can insert service packages for services they own
CREATE POLICY "Users can insert their own service packages" ON public.service_packages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.services 
            WHERE services.id = service_packages.service_id 
            AND services.provider_id = auth.uid()
        )
    );

-- Policy 3: Users can update service packages for services they own
CREATE POLICY "Users can update their own service packages" ON public.service_packages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.services 
            WHERE services.id = service_packages.service_id 
            AND services.provider_id = auth.uid()
        )
    );

-- Policy 4: Users can delete service packages for services they own
CREATE POLICY "Users can delete their own service packages" ON public.service_packages
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.services 
            WHERE services.id = service_packages.service_id 
            AND services.provider_id = auth.uid()
        )
    );

-- Policy 5: Public can view service packages for approved services
CREATE POLICY "Public can view approved service packages" ON public.service_packages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.services 
            WHERE services.id = service_packages.service_id 
            AND services.status = 'active'
        )
    );

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_packages TO authenticated;
GRANT SELECT ON public.service_packages TO anon;

-- Create simple indexes for better performance (without subqueries)
CREATE INDEX IF NOT EXISTS idx_service_packages_service_id ON public.service_packages(service_id);
CREATE INDEX IF NOT EXISTS idx_service_packages_price ON public.service_packages(price);
