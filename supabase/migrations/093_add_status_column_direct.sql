-- Add status column to bookings table
-- Date: January 2025
-- Description: Add status column to bookings table before Phase 3 features

-- Step 1: Add the status column directly
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Step 2: Add the status constraint
-- First drop the existing constraint if it exists, then add the new one
ALTER TABLE public.bookings 
DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_status_check 
CHECK (status IN ('pending','approved','declined','in_progress','completed','cancelled','rescheduled','on_hold'));

-- Step 3: Add column comment
COMMENT ON COLUMN public.bookings.status IS 'Current state of the booking (pending, approved, declined, in_progress, completed, cancelled, rescheduled, on_hold)';

-- Step 4: Verify the column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'bookings'
  AND column_name = 'status';
