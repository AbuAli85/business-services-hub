-- Fix the bookings_status_check constraint to match application logic
-- This migration ensures the constraint allows the status values we actually use

-- Drop the existing constraint (it might be the old one with 'confirmed')
ALTER TABLE public.bookings 
DROP CONSTRAINT IF EXISTS bookings_status_check;

-- Add the correct constraint with the status values we actually use
ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_status_check 
CHECK (status IN ('pending', 'approved', 'declined', 'in_progress', 'completed', 'cancelled', 'rescheduled', 'on_hold'));

-- Add comment for documentation
COMMENT ON CONSTRAINT bookings_status_check ON public.bookings IS 'Ensures booking status values match application logic: pending, approved, declined, in_progress, completed, cancelled, rescheduled, on_hold';
