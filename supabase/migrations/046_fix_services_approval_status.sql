-- Migration: Fix services approval_status column
-- Date: December 2024
-- Description: Ensure approval_status column exists in services table

-- Add approval_status column to services table if it doesn't exist
DO $$
BEGIN
    -- Check if the column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'services' 
        AND column_name = 'approval_status'
    ) THEN
        -- Add the column
        ALTER TABLE public.services 
        ADD COLUMN approval_status VARCHAR(20) DEFAULT 'pending' 
        CHECK (approval_status IN ('pending', 'approved', 'rejected', 'suspended'));
        
        RAISE NOTICE 'Added approval_status column to services table';
    ELSE
        RAISE NOTICE 'approval_status column already exists in services table';
    END IF;
END $$;

-- Add views_count and bookings_count columns if they don't exist
DO $$
BEGIN
    -- Check if views_count column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'services' 
        AND column_name = 'views_count'
    ) THEN
        ALTER TABLE public.services ADD COLUMN views_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added views_count column to services table';
    END IF;
    
    -- Check if bookings_count column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'services' 
        AND column_name = 'bookings_count'
    ) THEN
        ALTER TABLE public.services ADD COLUMN bookings_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added bookings_count column to services table';
    END IF;
    
    -- Check if rating column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'services' 
        AND column_name = 'rating'
    ) THEN
        ALTER TABLE public.services ADD COLUMN rating NUMERIC(3,2) DEFAULT 0;
        RAISE NOTICE 'Added rating column to services table';
    END IF;
    
    -- Check if tags column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'services' 
        AND column_name = 'tags'
    ) THEN
        ALTER TABLE public.services ADD COLUMN tags TEXT[] DEFAULT '{}';
        RAISE NOTICE 'Added tags column to services table';
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_services_approval_status ON public.services(approval_status);
CREATE INDEX IF NOT EXISTS idx_services_views_count ON public.services(views_count);
CREATE INDEX IF NOT EXISTS idx_services_bookings_count ON public.services(bookings_count);
CREATE INDEX IF NOT EXISTS idx_services_rating ON public.services(rating);

-- Update RLS policies to handle approval_status
-- Drop existing policies that might conflict
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

-- Create updated policies that handle approval_status properly
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

-- Grant necessary permissions
GRANT ALL ON public.services TO service_role;
GRANT SELECT ON public.services TO authenticated;
GRANT SELECT ON public.services TO anon;

-- Final verification
DO $$
BEGIN
    RAISE NOTICE 'Migration 046_fix_services_approval_status completed successfully';
    RAISE NOTICE 'Services table now has all required columns for approval workflow';
    RAISE NOTICE 'RLS policies updated to handle approval status properly';
    RAISE NOTICE 'Performance indexes added for better query performance';
END $$;
