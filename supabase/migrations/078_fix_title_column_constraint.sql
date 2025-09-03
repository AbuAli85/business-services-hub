-- Migration: Fix title column constraint in bookings table
-- Date: January 2025
-- Description: Add default value to existing title column to fix NOT NULL constraint error

-- Fix title column constraint
DO $$
BEGIN
    -- Check if title column exists and has NOT NULL constraint
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'bookings' 
        AND column_name = 'title'
        AND is_nullable = 'NO'
    ) THEN
        -- Add default value to existing NOT NULL column
        ALTER TABLE public.bookings 
        ALTER COLUMN title SET DEFAULT 'Service Booking';
        
        RAISE NOTICE 'Added default value to existing title column';
    ELSE
        RAISE NOTICE 'Title column either does not exist or is already nullable';
    END IF;
END $$;

-- Update any existing NULL values with the default
UPDATE public.bookings 
SET title = 'Service Booking' 
WHERE title IS NULL;

-- Add comment to the column for documentation
COMMENT ON COLUMN public.bookings.title IS 'Title/name of the booking (defaults to "Service Booking" if not provided)';
