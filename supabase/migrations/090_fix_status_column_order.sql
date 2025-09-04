-- Fix status column order - Add column BEFORE any functions reference it
-- Date: January 2025
-- Description: Add status column to bookings table before creating functions that reference it

/* ---------- 1. Ensure the bookings.status column exists ---------- */
-- Add the column if it isn't there
DO $$
BEGIN
   IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'bookings'
          AND column_name  = 'status'
   ) THEN
      ALTER TABLE public.bookings
         ADD COLUMN status TEXT DEFAULT 'pending';

      RAISE NOTICE 'Added status column to bookings table';
   END IF;
END $$;

/* ---------- 2. Add the constraint (optional) ---------- */
DO $$
BEGIN
   IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'bookings_status_check'
          AND table_name      = 'bookings'
   ) THEN
      ALTER TABLE public.bookings
         ADD CONSTRAINT bookings_status_check
         CHECK (status IN ('draft','pending','confirmed',
                           'in_progress','completed','cancelled',
                           'on_hold','rescheduled'));
   END IF;
END $$;

-- Update any existing NULL values with default
UPDATE public.bookings 
SET status = 'pending' 
WHERE status IS NULL;

-- Add comment to the column for documentation
COMMENT ON COLUMN public.bookings.status IS 'Status of the booking (draft, pending, confirmed, in_progress, completed, cancelled, on_hold, rescheduled)';

/* ---------- 3. Verify the column exists ---------- */
-- This will show us what columns exist in the bookings table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'bookings'
ORDER BY ordinal_position;
