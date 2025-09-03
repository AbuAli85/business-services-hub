-- Migration: Add missing booking columns for create booking form
-- Date: January 2025
-- Description: Add all missing columns that the create booking form requires

-- Add missing columns to bookings table
DO $$
BEGIN
    -- Add special_requirements column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'bookings' 
        AND column_name = 'special_requirements'
    ) THEN
        ALTER TABLE public.bookings 
        ADD COLUMN special_requirements TEXT;
        
        RAISE NOTICE 'Added special_requirements column to bookings table';
    ELSE
        RAISE NOTICE 'special_requirements column already exists in bookings table';
    END IF;
    
    -- Add scheduled_time column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'bookings' 
        AND column_name = 'scheduled_time'
    ) THEN
        ALTER TABLE public.bookings 
        ADD COLUMN scheduled_time TEXT;
        
        RAISE NOTICE 'Added scheduled_time column to bookings table';
    ELSE
        RAISE NOTICE 'scheduled_time column already exists in bookings table';
    END IF;
    
    -- Add location column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'bookings' 
        AND column_name = 'location'
    ) THEN
        ALTER TABLE public.bookings 
        ADD COLUMN location TEXT;
        
        RAISE NOTICE 'Added location column to bookings table';
    ELSE
        RAISE NOTICE 'location column already exists in bookings table';
    END IF;
    
    -- Add urgency column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'bookings' 
        AND column_name = 'urgency'
    ) THEN
        ALTER TABLE public.bookings 
        ADD COLUMN urgency TEXT DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high', 'urgent'));
        
        RAISE NOTICE 'Added urgency column to bookings table';
    ELSE
        RAISE NOTICE 'urgency column already exists in bookings table';
    END IF;
    
    -- Add scheduled_date column if it doesn't exist (as TIMESTAMPTZ)
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'bookings' 
        AND column_name = 'scheduled_date'
    ) THEN
        ALTER TABLE public.bookings 
        ADD COLUMN scheduled_date TIMESTAMPTZ;
        
        RAISE NOTICE 'Added scheduled_date column to bookings table';
    ELSE
        RAISE NOTICE 'scheduled_date column already exists in bookings table';
    END IF;
    
    -- Add amount column if it doesn't exist (for compatibility)
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'bookings' 
        AND column_name = 'amount'
    ) THEN
        ALTER TABLE public.bookings 
        ADD COLUMN amount NUMERIC(12,3) DEFAULT 0;
        
        RAISE NOTICE 'Added amount column to bookings table';
    ELSE
        RAISE NOTICE 'amount column already exists in bookings table';
    END IF;
END $$;

-- Add comments to the columns for documentation
COMMENT ON COLUMN public.bookings.special_requirements IS 'Special requirements or additional notes from the client';
COMMENT ON COLUMN public.bookings.scheduled_time IS 'Scheduled time for the service (e.g., "10:00", "14:30")';
COMMENT ON COLUMN public.bookings.location IS 'Location where the service will be provided';
COMMENT ON COLUMN public.bookings.urgency IS 'Urgency level of the booking (low, medium, high, urgent)';
COMMENT ON COLUMN public.bookings.scheduled_date IS 'Scheduled date and time for the service';
COMMENT ON COLUMN public.bookings.amount IS 'Total amount for the booking';
COMMENT ON COLUMN public.bookings.budget_range IS 'Budget range selected by client during booking creation';
