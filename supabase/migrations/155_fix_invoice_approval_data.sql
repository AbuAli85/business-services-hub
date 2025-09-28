-- Migration: Fix invoice approval data and add constraint
-- Simple approach to fix existing data and add constraint

-- Create a function to check if a booking is approved
CREATE OR REPLACE FUNCTION is_booking_approved(booking_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  booking_record RECORD;
BEGIN
  -- Handle NULL booking_id (should not happen but be safe)
  IF booking_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  SELECT status, approval_status 
  INTO booking_record
  FROM bookings 
  WHERE id = booking_id;
  
  -- If booking doesn't exist, return false
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Return true if booking is approved by either status or approval_status
  RETURN (
    booking_record.status IN ('approved', 'confirmed', 'in_progress', 'completed') OR
    booking_record.approval_status = 'approved'
  );
END;
$$ LANGUAGE plpgsql;

-- Fix existing data: Update bookings that have invoices to be approved
UPDATE bookings 
SET 
  approval_status = COALESCE(approval_status, 'approved'),
  status = CASE 
    WHEN status = 'pending' THEN 'approved'
    ELSE status
  END
WHERE id IN (
  SELECT DISTINCT booking_id 
  FROM invoices 
  WHERE booking_id IS NOT NULL
) AND NOT (
  status IN ('approved', 'confirmed', 'in_progress', 'completed') OR
  approval_status = 'approved'
);

-- Add the check constraint
ALTER TABLE invoices 
ADD CONSTRAINT invoices_booking_must_be_approved 
CHECK (is_booking_approved(booking_id));

-- Add a comment explaining the constraint
COMMENT ON CONSTRAINT invoices_booking_must_be_approved ON invoices IS 
'Ensures invoices can only be created for approved bookings';
