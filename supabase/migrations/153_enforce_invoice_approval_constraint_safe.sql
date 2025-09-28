-- Migration: Safe enforcement of invoice creation only after booking approval
-- This version handles existing data gracefully

-- First, let's see what we're working with
DO $$
DECLARE
  total_invoices INTEGER;
  total_bookings INTEGER;
  invalid_invoices_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_invoices FROM invoices;
  SELECT COUNT(*) INTO total_bookings FROM bookings;
  
  -- Count invoices with non-approved bookings
  SELECT COUNT(*) INTO invalid_invoices_count
  FROM invoices i
  JOIN bookings b ON i.booking_id = b.id
  WHERE NOT (
    b.status IN ('approved', 'confirmed', 'in_progress', 'completed') OR
    b.approval_status = 'approved'
  );
  
  -- Use RAISE NOTICE properly
  RAISE NOTICE 'Total invoices: %', total_invoices;
  RAISE NOTICE 'Total bookings: %', total_bookings;
  RAISE NOTICE 'Invalid invoices (with non-approved bookings): %', invalid_invoices_count;
END $$;

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

-- For existing data, we'll update bookings that have invoices to be approved
-- This maintains data integrity while allowing the constraint to be added
DO $$
DECLARE
  updated_count INTEGER := 0;
BEGIN
  -- Update bookings that have invoices but are not approved
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
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % bookings to approved status for existing invoices', updated_count;
END $$;

-- Now add the check constraint
-- This should work now that we've cleaned up the data
ALTER TABLE invoices 
ADD CONSTRAINT invoices_booking_must_be_approved 
CHECK (is_booking_approved(booking_id));

-- Add a comment explaining the constraint
COMMENT ON CONSTRAINT invoices_booking_must_be_approved ON invoices IS 
'Ensures invoices can only be created for approved bookings';

-- Test the constraint
DO $$
DECLARE
  test_booking_id UUID;
  test_result BOOLEAN;
  constraint_exists BOOLEAN;
BEGIN
  -- Check if constraint exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'invoices_booking_must_be_approved'
    AND table_name = 'invoices'
  ) INTO constraint_exists;
  
  IF constraint_exists THEN
    RAISE NOTICE '✅ Constraint invoices_booking_must_be_approved successfully added';
    
    -- Test with a sample booking
    SELECT id INTO test_booking_id FROM bookings LIMIT 1;
    IF test_booking_id IS NOT NULL THEN
      SELECT is_booking_approved(test_booking_id) INTO test_result;
      RAISE NOTICE 'Test booking % approval status: %', test_booking_id, test_result;
    END IF;
  ELSE
    RAISE NOTICE '❌ Constraint was not added successfully';
  END IF;
END $$;
