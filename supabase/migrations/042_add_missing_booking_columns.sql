-- Migration: Add Missing Booking Columns
-- Date: December 2024
-- Description: Add missing columns that the bookings dashboard needs

-- Add missing columns to bookings table
DO $$
BEGIN
    -- Add notes column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'notes') THEN
        ALTER TABLE public.bookings ADD COLUMN notes TEXT;
        RAISE NOTICE 'Added notes column to bookings table';
    END IF;
    
    -- Add rating column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'rating') THEN
        ALTER TABLE public.bookings ADD COLUMN rating INTEGER CHECK (rating BETWEEN 1 AND 5);
        RAISE NOTICE 'Added rating column to bookings table';
    END IF;
    
    -- Add review column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'review') THEN
        ALTER TABLE public.bookings ADD COLUMN review TEXT;
        RAISE NOTICE 'Added review column to bookings table';
    END IF;
    
    -- Add amount column if it doesn't exist (for compatibility with dashboard)
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'amount') THEN
        ALTER TABLE public.bookings ADD COLUMN amount NUMERIC(12,3) DEFAULT 0;
        RAISE NOTICE 'Added amount column to bookings table';
    END IF;
    
    -- Add payment_status column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'payment_status') THEN
        ALTER TABLE public.bookings ADD COLUMN payment_status TEXT DEFAULT 'pending';
        RAISE NOTICE 'Added payment_status column to bookings table';
    END IF;
    
    -- Add scheduled_date column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'scheduled_date') THEN
        ALTER TABLE public.bookings ADD COLUMN scheduled_date DATE;
        RAISE NOTICE 'Added scheduled_date column to bookings table';
    END IF;
    
    -- Add scheduled_time column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'scheduled_time') THEN
        ALTER TABLE public.bookings ADD COLUMN scheduled_time TIME;
        RAISE NOTICE 'Added scheduled_time column to bookings table';
    END IF;
    
    -- Add estimated_duration column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'estimated_duration') THEN
        ALTER TABLE public.bookings ADD COLUMN estimated_duration TEXT;
        RAISE NOTICE 'Added estimated_duration column to bookings table';
    END IF;
    
    -- Add location column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'location') THEN
        ALTER TABLE public.bookings ADD COLUMN location TEXT;
        RAISE NOTICE 'Added location column to bookings table';
    END IF;
    
    -- Add cancellation_reason column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'cancellation_reason') THEN
        ALTER TABLE public.bookings ADD COLUMN cancellation_reason TEXT;
        RAISE NOTICE 'Added cancellation_reason column to bookings table';
    END IF;
    
    RAISE NOTICE 'All missing booking columns have been added successfully!';
END $$;

-- Update existing bookings to have default values
UPDATE public.bookings 
SET 
    notes = COALESCE(notes, ''),
    amount = COALESCE(amount, 0),
    payment_status = COALESCE(payment_status, 'pending')
WHERE notes IS NULL OR amount IS NULL OR payment_status IS NULL;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_bookings_notes ON public.bookings USING gin(to_tsvector('english', notes));
CREATE INDEX IF NOT EXISTS idx_bookings_rating ON public.bookings(rating);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON public.bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_date ON public.bookings(scheduled_date);

-- Verify the table structure
SELECT 'Current bookings table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'bookings'
ORDER BY ordinal_position;

-- Show sample data to verify
SELECT 'Sample booking data:' as info;
SELECT id, status, notes, rating, amount, payment_status, created_at
FROM public.bookings 
LIMIT 3;
