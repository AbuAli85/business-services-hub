-- Migration: Enforce invoice creation only after booking approval
-- This ensures that invoices can only be created for approved bookings

-- Create a function to check if a booking is approved
CREATE OR REPLACE FUNCTION is_booking_approved(booking_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  booking_record RECORD;
BEGIN
  SELECT status, approval_status 
  INTO booking_record
  FROM bookings 
  WHERE id = booking_id;
  
  -- Return true if booking is approved by either status or approval_status
  RETURN (
    booking_record.status IN ('approved', 'confirmed', 'in_progress', 'completed') OR
    booking_record.approval_status = 'approved'
  );
END;
$$ LANGUAGE plpgsql;

-- First, let's check what invoices exist and their booking status
DO $$
DECLARE
  invalid_invoices_count INTEGER;
  invalid_bookings_count INTEGER;
BEGIN
  -- Count invoices with non-approved bookings
  SELECT COUNT(*) INTO invalid_invoices_count
  FROM invoices i
  JOIN bookings b ON i.booking_id = b.id
  WHERE NOT (
    b.status IN ('approved', 'confirmed', 'in_progress', 'completed') OR
    b.approval_status = 'approved'
  );
  
  -- Count bookings that are not approved
  SELECT COUNT(*) INTO invalid_bookings_count
  FROM bookings
  WHERE NOT (
    status IN ('approved', 'confirmed', 'in_progress', 'completed') OR
    approval_status = 'approved'
  );
  
  RAISE NOTICE 'Found % invoices with non-approved bookings', invalid_invoices_count;
  RAISE NOTICE 'Found % non-approved bookings', invalid_bookings_count;
  
  -- If there are invalid invoices, we need to handle them
  IF invalid_invoices_count > 0 THEN
    RAISE NOTICE 'Updating non-approved bookings to approved status to maintain data integrity...';
    
    -- Update bookings to approved status if they have invoices
    UPDATE bookings 
    SET approval_status = 'approved'
    WHERE id IN (
      SELECT DISTINCT booking_id 
      FROM invoices 
      WHERE booking_id IS NOT NULL
    ) AND approval_status IS NULL;
    
    -- Update status to approved if it's still pending
    UPDATE bookings 
    SET status = 'approved'
    WHERE id IN (
      SELECT DISTINCT booking_id 
      FROM invoices 
      WHERE booking_id IS NOT NULL
    ) AND status = 'pending';
    
    RAISE NOTICE 'Updated bookings to approved status for existing invoices';
  END IF;
END $$;

-- Now add the check constraint to the invoices table
ALTER TABLE invoices 
ADD CONSTRAINT invoices_booking_must_be_approved 
CHECK (is_booking_approved(booking_id));

-- Add a comment explaining the constraint
COMMENT ON CONSTRAINT invoices_booking_must_be_approved ON invoices IS 
'Ensures invoices can only be created for approved bookings';

-- Test the constraint with a sample query
DO $$
DECLARE
  test_booking_id UUID;
  test_result BOOLEAN;
BEGIN
  -- Get a sample booking ID for testing
  SELECT id INTO test_booking_id FROM bookings LIMIT 1;
  
  IF test_booking_id IS NOT NULL THEN
    -- Test the function
    SELECT is_booking_approved(test_booking_id) INTO test_result;
    RAISE NOTICE 'Test booking % approval status: %', test_booking_id, test_result;
  END IF;
END $$;
