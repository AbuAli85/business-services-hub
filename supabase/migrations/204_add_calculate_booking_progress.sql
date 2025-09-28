-- Add calculate_booking_progress function
-- Date: January 2025
-- Description: Create the missing calculate_booking_progress function that's being called by components

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS calculate_booking_progress(uuid);

-- Create calculate_booking_progress function
CREATE OR REPLACE FUNCTION calculate_booking_progress(booking_id uuid)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    booking_record RECORD;
    total_weight INTEGER := 0;
    weighted_progress NUMERIC := 0;
    new_progress INTEGER;
BEGIN
    -- Get booking details
    SELECT * INTO booking_record
    FROM public.bookings
    WHERE id = booking_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking with id % not found', booking_id;
    END IF;
    
    -- Calculate weighted progress from milestones
    SELECT 
        COALESCE(SUM(m.weight), 0) as total_weight,
        COALESCE(SUM(m.progress_percentage * m.weight), 0) as weighted_progress
    INTO total_weight, weighted_progress
    FROM public.milestones m
    WHERE m.booking_id = calculate_booking_progress.booking_id;
    
    -- Calculate new progress percentage
    IF total_weight = 0 THEN
        new_progress := 0;
    ELSE
        new_progress := ROUND(weighted_progress / total_weight);
    END IF;
    
    -- Update booking with new progress
    UPDATE public.bookings
    SET 
        progress_percentage = new_progress,
        updated_at = NOW()
    WHERE id = calculate_booking_progress.booking_id;
    
    -- Return the new progress as integer (for compatibility with existing code)
    RETURN new_progress;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION calculate_booking_progress(uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION calculate_booking_progress(uuid) IS 'Calculates weighted progress across all milestones for a booking and updates the bookings table';
