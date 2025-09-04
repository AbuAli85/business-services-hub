-- Add status column to bookings table first
-- Date: January 2025
-- Description: Add the missing status column to bookings table before Phase 3 features

-- Add status column to bookings table if it doesn't exist
DO $$
BEGIN
  -- Check if status column exists in bookings table
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'bookings' 
    AND column_name = 'status'
  ) THEN
    -- Add status column as TEXT with default value
    ALTER TABLE public.bookings 
    ADD COLUMN status TEXT DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'on_hold', 'rescheduled'));
    
    RAISE NOTICE 'Added status column to bookings table';
  ELSE
    RAISE NOTICE 'status column already exists in bookings table';
  END IF;
END $$;

-- Update any existing NULL values with default
UPDATE public.bookings 
SET status = 'pending' 
WHERE status IS NULL;

-- Add comment to the column for documentation
COMMENT ON COLUMN public.bookings.status IS 'Status of the booking (draft, pending, confirmed, in_progress, completed, cancelled, on_hold, rescheduled)';
