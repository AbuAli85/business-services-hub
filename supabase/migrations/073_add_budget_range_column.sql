-- Migration: Add budget_range column to bookings table
-- Date: January 2025
-- Description: Add missing budget_range column that the create booking form requires

-- Add budget_range column to bookings table
DO $$
BEGIN
    -- Add budget_range column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'bookings' 
        AND column_name = 'budget_range'
    ) THEN
        ALTER TABLE public.bookings 
        ADD COLUMN budget_range TEXT;
        
        RAISE NOTICE 'Added budget_range column to bookings table';
    ELSE
        RAISE NOTICE 'budget_range column already exists in bookings table';
    END IF;
END $$;

-- Add comment to the column for documentation
COMMENT ON COLUMN public.bookings.budget_range IS 'Budget range selected by client during booking creation (e.g., "100-500", "500-1000", etc.)';
