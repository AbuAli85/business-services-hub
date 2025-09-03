-- Migration: Add title column to bookings table
-- Date: January 2025
-- Description: Add title column to bookings table with default value to fix NOT NULL constraint error

-- Add title column to bookings table
DO $$
BEGIN
    -- Add title column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'bookings' 
        AND column_name = 'title'
    ) THEN
        ALTER TABLE public.bookings 
        ADD COLUMN title TEXT DEFAULT 'Service Booking';
        
        RAISE NOTICE 'Added title column to bookings table';
    ELSE
        RAISE NOTICE 'title column already exists in bookings table';
    END IF;
END $$;

-- Add comment to the column for documentation
COMMENT ON COLUMN public.bookings.title IS 'Title/name of the booking (defaults to "Service Booking" if not provided)';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_title ON public.bookings(title);
