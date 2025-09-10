-- Fix bookings table requirements column
-- Date: 2024-12-19
-- Description: Ensure requirements column exists in bookings table

-- Add requirements column if it doesn't exist
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS requirements JSONB;

-- Add comment for documentation
COMMENT ON COLUMN public.bookings.requirements IS 'Client brief and requirements for the booking';

-- Ensure the column is properly indexed for performance
CREATE INDEX IF NOT EXISTS idx_bookings_requirements ON public.bookings USING GIN (requirements);
