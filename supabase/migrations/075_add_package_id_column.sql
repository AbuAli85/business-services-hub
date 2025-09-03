-- Migration: Add package_id column to bookings table
-- Date: January 2025
-- Description: Add missing package_id column that references service_packages table

-- Add package_id column to bookings table
DO $$
BEGIN
    -- Add package_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'bookings' 
        AND column_name = 'package_id'
    ) THEN
        ALTER TABLE public.bookings 
        ADD COLUMN package_id UUID REFERENCES public.service_packages(id) ON DELETE SET NULL;
        
        RAISE NOTICE 'Added package_id column to bookings table';
    ELSE
        RAISE NOTICE 'package_id column already exists in bookings table';
    END IF;
END $$;

-- Add comment to the column for documentation
COMMENT ON COLUMN public.bookings.package_id IS 'Reference to the selected service package (optional - can be NULL for direct service bookings)';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_package_id ON public.bookings(package_id);
