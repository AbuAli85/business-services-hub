-- Fix total_amount field issue for bookings table
-- This migration adds the missing total_amount field that the webhook trigger expects

-- Add total_amount column if it doesn't exist
DO $$
BEGIN
    -- Check if total_amount column exists
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'bookings' 
        AND column_name = 'total_amount'
    ) THEN
        -- Add total_amount column as a simple numeric field
        ALTER TABLE public.bookings ADD COLUMN total_amount NUMERIC(12,3) DEFAULT 0;
        RAISE NOTICE 'Added total_amount column to bookings table';
    ELSE
        RAISE NOTICE 'total_amount column already exists in bookings table';
    END IF;
END $$;

-- Update existing bookings to have total_amount = amount (or subtotal if amount is 0)
UPDATE public.bookings 
SET total_amount = COALESCE(amount, subtotal, 0)
WHERE total_amount IS NULL OR total_amount = 0;

-- Create a trigger to automatically set total_amount when inserting/updating bookings
CREATE OR REPLACE FUNCTION public.set_booking_total_amount()
RETURNS TRIGGER AS $$
BEGIN
    -- Set total_amount to the amount field if it exists, otherwise use subtotal
    NEW.total_amount = COALESCE(NEW.amount, NEW.subtotal, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_set_booking_total_amount ON public.bookings;

-- Create the trigger
CREATE TRIGGER trigger_set_booking_total_amount
    BEFORE INSERT OR UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.set_booking_total_amount();

-- Grant necessary permissions
GRANT ALL ON public.bookings TO authenticated;
GRANT SELECT ON public.bookings TO anon;
