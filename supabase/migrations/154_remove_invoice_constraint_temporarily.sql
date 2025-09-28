-- Migration: Temporarily remove invoice constraint to fix data
-- This removes the problematic constraint so we can clean up the data

-- Drop the constraint if it exists
ALTER TABLE invoices 
DROP CONSTRAINT IF EXISTS invoices_booking_must_be_approved;

-- Add a comment explaining what we're doing
COMMENT ON TABLE invoices IS 
'Invoice constraint temporarily removed for data cleanup - will be re-added after data is fixed';