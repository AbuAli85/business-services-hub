-- Migration: Fix Booking Status Constraints
-- Date: December 2024
-- Description: Remove overly restrictive status constraints that block valid transitions

-- Drop the restrictive CHECK constraint on approval_status
ALTER TABLE public.bookings 
DROP CONSTRAINT IF EXISTS bookings_approval_status_check;

-- Add a more flexible approval_status constraint
ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_approval_status_check 
CHECK (approval_status IN ('pending', 'requested', 'approved', 'rejected', 'under_review', 'in_progress', 'completed', 'cancelled'));

-- Drop any other restrictive status constraints
ALTER TABLE public.bookings 
DROP CONSTRAINT IF EXISTS bookings_status_check;

-- Add a flexible status constraint that allows all valid transitions
ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_status_check 
CHECK (status IN ('pending', 'approved', 'declined', 'in_progress', 'completed', 'cancelled', 'rescheduled', 'on_hold'));

-- Create a function to validate status transitions (optional, for logging)
CREATE OR REPLACE FUNCTION validate_booking_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the status change for audit purposes
  INSERT INTO public.audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    created_at
  ) VALUES (
    auth.uid(),
    'status_change',
    'bookings',
    NEW.id,
    jsonb_build_object('status', OLD.status, 'approval_status', OLD.approval_status),
    jsonb_build_object('status', NEW.status, 'approval_status', NEW.approval_status),
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for status change logging
DROP TRIGGER IF EXISTS booking_status_change_trigger ON public.bookings;
CREATE TRIGGER booking_status_change_trigger
  AFTER UPDATE OF status, approval_status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION validate_booking_status_transition();

-- Grant permissions
GRANT EXECUTE ON FUNCTION validate_booking_status_transition() TO authenticated;
GRANT INSERT ON public.audit_logs TO authenticated;
