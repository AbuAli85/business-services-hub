-- Add status column to bookings table
-- Date: January 2025
-- Description: Add status column to bookings table before Phase 3 features

-- Step 1: Add the status column directly
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Step 2: Add the status constraint
ALTER TABLE public.bookings 
ADD CONSTRAINT IF NOT EXISTS bookings_status_check 
CHECK (status IN ('draft','pending','confirmed','in_progress','completed','cancelled','on_hold','rescheduled'));

-- Step 3: Add column comment
COMMENT ON COLUMN public.bookings.status IS 'Current state of the booking (draft, pending, confirmed, in_progress, completed, cancelled, on_hold, rescheduled)';

-- Step 4: Verify the column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'bookings'
  AND column_name = 'status';
