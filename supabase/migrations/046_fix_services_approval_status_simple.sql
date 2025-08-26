-- Migration: Fix services approval_status column (Simplified Version)
-- Date: December 2024
-- Description: Ensure approval_status column exists in services table
-- This version can be run manually in Supabase SQL editor

-- Add approval_status column to services table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'services' 
        AND column_name = 'approval_status'
    ) THEN
        ALTER TABLE public.services 
        ADD COLUMN approval_status VARCHAR(20) DEFAULT 'pending' 
        CHECK (approval_status IN ('pending', 'approved', 'rejected', 'suspended'));
        
        RAISE NOTICE 'Added approval_status column to services table';
    ELSE
        RAISE NOTICE 'approval_status column already exists in services table';
    END IF;
END $$;

-- Add other missing columns if they don't exist
DO $$
BEGIN
    -- views_count
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'services' AND column_name = 'views_count'
    ) THEN
        ALTER TABLE public.services ADD COLUMN views_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added views_count column';
    END IF;
    
    -- bookings_count
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'services' AND column_name = 'bookings_count'
    ) THEN
        ALTER TABLE public.services ADD COLUMN bookings_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added bookings_count column';
    END IF;
    
    -- rating
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'services' AND column_name = 'rating'
    ) THEN
        ALTER TABLE public.services ADD COLUMN rating NUMERIC(3,2) DEFAULT 0;
        RAISE NOTICE 'Added rating column';
    END IF;
    
    -- tags
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'services' AND column_name = 'tags'
    ) THEN
        ALTER TABLE public.services ADD COLUMN tags TEXT[] DEFAULT '{}';
        RAISE NOTICE 'Added tags column';
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_services_approval_status ON public.services(approval_status);
CREATE INDEX IF NOT EXISTS idx_services_views_count ON public.services(views_count);
CREATE INDEX IF NOT EXISTS idx_services_bookings_count ON public.services(bookings_count);
CREATE INDEX IF NOT EXISTS idx_services_rating ON public.services(rating);

-- Grant necessary permissions
GRANT ALL ON public.services TO service_role;
GRANT SELECT ON public.services TO authenticated;
GRANT SELECT ON public.services TO anon;

-- Note: RLS policies should be managed separately to avoid conflicts
-- You may need to manually review and update policies in your Supabase dashboard
