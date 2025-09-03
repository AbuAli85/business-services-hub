-- Migration: Fix all booking table constraints
-- Date: January 2025
-- Description: Add default values to all required columns to prevent NOT NULL constraint errors

-- Fix all booking table constraints
DO $$
BEGIN
    -- Add default value to title column if it has NOT NULL constraint
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'bookings' 
        AND column_name = 'title'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.bookings 
        ALTER COLUMN title SET DEFAULT 'Service Booking';
        
        RAISE NOTICE 'Added default value to title column';
    END IF;
    
    -- Add default value to start_time column if it has NOT NULL constraint
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'bookings' 
        AND column_name = 'start_time'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.bookings 
        ALTER COLUMN start_time SET DEFAULT now();
        
        RAISE NOTICE 'Added default value to start_time column';
    END IF;
    
    -- Add default value to end_time column if it has NOT NULL constraint
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'bookings' 
        AND column_name = 'end_time'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.bookings 
        ALTER COLUMN end_time SET DEFAULT (now() + interval '2 hours');
        
        RAISE NOTICE 'Added default value to end_time column';
    END IF;
    
    -- Add default value to total_cost column if it has NOT NULL constraint
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'bookings' 
        AND column_name = 'total_cost'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.bookings 
        ALTER COLUMN total_cost SET DEFAULT 0;
        
        RAISE NOTICE 'Added default value to total_cost column';
    END IF;
    
    -- Add default value to subtotal column if it has NOT NULL constraint
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'bookings' 
        AND column_name = 'subtotal'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.bookings 
        ALTER COLUMN subtotal SET DEFAULT 0;
        
        RAISE NOTICE 'Added default value to subtotal column';
    END IF;
    
    -- Add default value to total_amount column if it has NOT NULL constraint
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'bookings' 
        AND column_name = 'total_amount'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.bookings 
        ALTER COLUMN total_amount SET DEFAULT 0;
        
        RAISE NOTICE 'Added default value to total_amount column';
    END IF;
    
    -- Add default value to amount column if it has NOT NULL constraint
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'bookings' 
        AND column_name = 'amount'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.bookings 
        ALTER COLUMN amount SET DEFAULT 0;
        
        RAISE NOTICE 'Added default value to amount column';
    END IF;
    
    -- Add default value to total_price column if it has NOT NULL constraint
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'bookings' 
        AND column_name = 'total_price'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.bookings 
        ALTER COLUMN total_price SET DEFAULT 0;
        
        RAISE NOTICE 'Added default value to total_price column';
    END IF;
    
    -- Add default value to currency column if it has NOT NULL constraint
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'bookings' 
        AND column_name = 'currency'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.bookings 
        ALTER COLUMN currency SET DEFAULT 'OMR';
        
        RAISE NOTICE 'Added default value to currency column';
    END IF;
    
    -- Add default value to status column if it has NOT NULL constraint
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'bookings' 
        AND column_name = 'status'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.bookings 
        ALTER COLUMN status SET DEFAULT 'pending';
        
        RAISE NOTICE 'Added default value to status column';
    END IF;
END $$;

-- Update any existing NULL values with appropriate defaults
UPDATE public.bookings 
SET title = 'Service Booking' 
WHERE title IS NULL;

UPDATE public.bookings 
SET start_time = now() 
WHERE start_time IS NULL;

UPDATE public.bookings 
SET end_time = (now() + interval '2 hours') 
WHERE end_time IS NULL;

UPDATE public.bookings 
SET total_cost = 0 
WHERE total_cost IS NULL;

UPDATE public.bookings 
SET subtotal = 0 
WHERE subtotal IS NULL;

UPDATE public.bookings 
SET total_amount = 0 
WHERE total_amount IS NULL;

UPDATE public.bookings 
SET amount = 0 
WHERE amount IS NULL;

UPDATE public.bookings 
SET total_price = 0 
WHERE total_price IS NULL;

UPDATE public.bookings 
SET currency = 'OMR' 
WHERE currency IS NULL;

UPDATE public.bookings 
SET status = 'pending' 
WHERE status IS NULL;

-- Add comments to the columns for documentation
COMMENT ON COLUMN public.bookings.title IS 'Title/name of the booking (defaults to "Service Booking" if not provided)';
COMMENT ON COLUMN public.bookings.start_time IS 'Start time of the booking (defaults to current time if not provided)';
COMMENT ON COLUMN public.bookings.end_time IS 'End time of the booking (defaults to 2 hours after start time if not provided)';
COMMENT ON COLUMN public.bookings.total_cost IS 'Total cost of the booking (defaults to 0 if not provided)';
COMMENT ON COLUMN public.bookings.subtotal IS 'Subtotal before taxes (defaults to 0 if not provided)';
COMMENT ON COLUMN public.bookings.total_amount IS 'Total amount including taxes (defaults to 0 if not provided)';
COMMENT ON COLUMN public.bookings.amount IS 'Amount of the booking (defaults to 0 if not provided)';
COMMENT ON COLUMN public.bookings.total_price IS 'Total price of the booking (defaults to 0 if not provided)';
COMMENT ON COLUMN public.bookings.currency IS 'Currency code (defaults to "OMR" if not provided)';
COMMENT ON COLUMN public.bookings.status IS 'Status of the booking (defaults to "pending" if not provided)';
