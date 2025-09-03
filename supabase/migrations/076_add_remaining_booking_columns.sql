-- Migration: Add remaining missing booking columns
-- Date: January 2025
-- Description: Add vat_percent, vat_amount, and due_at columns to bookings table

-- Add missing columns to bookings table
DO $$
BEGIN
    -- Add vat_percent column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'bookings' 
        AND column_name = 'vat_percent'
    ) THEN
        ALTER TABLE public.bookings 
        ADD COLUMN vat_percent NUMERIC(5,2) DEFAULT 5.00;
        
        RAISE NOTICE 'Added vat_percent column to bookings table';
    ELSE
        RAISE NOTICE 'vat_percent column already exists in bookings table';
    END IF;
    
    -- Add vat_amount column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'bookings' 
        AND column_name = 'vat_amount'
    ) THEN
        ALTER TABLE public.bookings 
        ADD COLUMN vat_amount NUMERIC(12,3) DEFAULT 0;
        
        RAISE NOTICE 'Added vat_amount column to bookings table';
    ELSE
        RAISE NOTICE 'vat_amount column already exists in bookings table';
    END IF;
    
    -- Add due_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'bookings' 
        AND column_name = 'due_at'
    ) THEN
        ALTER TABLE public.bookings 
        ADD COLUMN due_at TIMESTAMPTZ;
        
        RAISE NOTICE 'Added due_at column to bookings table';
    ELSE
        RAISE NOTICE 'due_at column already exists in bookings table';
    END IF;
END $$;

-- Add comments to the columns for documentation
COMMENT ON COLUMN public.bookings.vat_percent IS 'VAT percentage applied to the booking (default 5.00%)';
COMMENT ON COLUMN public.bookings.vat_amount IS 'VAT amount calculated based on subtotal and vat_percent';
COMMENT ON COLUMN public.bookings.due_at IS 'Due date for payment or service completion';

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_due_at ON public.bookings(due_at);
CREATE INDEX IF NOT EXISTS idx_bookings_vat_percent ON public.bookings(vat_percent);
