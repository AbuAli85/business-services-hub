-- Add status column to bookings table - SIMPLE VERSION
-- Date: January 2025
-- Description: Just add the missing status column to fix the error

-- Add status column to bookings table if it doesn't exist
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Add check constraint for valid status values (with error handling)
DO $$
BEGIN
  -- Check if constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'bookings_status_check' 
    AND table_name = 'bookings'
  ) THEN
    ALTER TABLE public.bookings 
    ADD CONSTRAINT bookings_status_check 
    CHECK (status IN ('draft', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'on_hold', 'rescheduled'));
  END IF;
END $$;

-- Update any existing NULL values with default
UPDATE public.bookings 
SET status = 'pending' 
WHERE status IS NULL;

-- Add comment to the column for documentation
COMMENT ON COLUMN public.bookings.status IS 'Status of the booking (draft, pending, confirmed, in_progress, completed, cancelled, on_hold, rescheduled)';
