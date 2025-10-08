-- Fix invoice client and provider linking issues
-- This script will identify and fix invoices with "Unknown Client" and "Unknown Provider"

-- First, let's see what's in the invoices table
SELECT 
    'Current Invoice Data' as section,
    COUNT(*) as total_invoices,
    COUNT(CASE WHEN client_id IS NULL THEN 1 END) as null_client_ids,
    COUNT(CASE WHEN provider_id IS NULL THEN 1 END) as null_provider_ids,
    COUNT(CASE WHEN booking_id IS NULL THEN 1 END) as null_booking_ids
FROM invoices;

-- Check if there are any invoices with invalid foreign keys
SELECT 
    'Invalid Foreign Keys' as section,
    COUNT(*) as invalid_client_refs
FROM invoices i 
LEFT JOIN profiles p ON i.client_id = p.id 
WHERE i.client_id IS NOT NULL AND p.id IS NULL;

SELECT 
    'Invalid Provider Refs' as section,
    COUNT(*) as invalid_provider_refs
FROM invoices i 
LEFT JOIN profiles pr ON i.provider_id = pr.id 
WHERE i.provider_id IS NOT NULL AND pr.id IS NULL;

-- Check if there are any invoices with invalid booking refs
SELECT 
    'Invalid Booking Refs' as section,
    COUNT(*) as invalid_booking_refs
FROM invoices i 
LEFT JOIN bookings b ON i.booking_id = b.id 
WHERE i.booking_id IS NOT NULL AND b.id IS NULL;

-- Let's see some sample invoice data
SELECT 
    id,
    invoice_number,
    booking_id,
    client_id,
    provider_id,
    amount,
    status,
    created_at
FROM invoices 
ORDER BY created_at DESC 
LIMIT 10;

-- Check if there are any orphaned invoices (invoices without valid bookings)
SELECT 
    'Orphaned Invoices' as section,
    i.id,
    i.invoice_number,
    i.booking_id,
    i.client_id,
    i.provider_id,
    i.amount,
    i.status
FROM invoices i 
LEFT JOIN bookings b ON i.booking_id = b.id 
WHERE b.id IS NULL
ORDER BY i.created_at DESC;

-- Check if there are any invoices with valid bookings but missing client/provider data
SELECT 
    'Invoices with Valid Bookings' as section,
    i.id,
    i.invoice_number,
    i.booking_id,
    i.client_id,
    i.provider_id,
    b.client_id as booking_client_id,
    b.provider_id as booking_provider_id,
    CASE 
        WHEN i.client_id = b.client_id THEN 'Client ID matches'
        ELSE 'Client ID mismatch'
    END as client_match,
    CASE 
        WHEN i.provider_id = b.provider_id THEN 'Provider ID matches'
        ELSE 'Provider ID mismatch'
    END as provider_match
FROM invoices i 
INNER JOIN bookings b ON i.booking_id = b.id 
WHERE i.client_id != b.client_id OR i.provider_id != b.provider_id
ORDER BY i.created_at DESC
LIMIT 10;

-- Fix invoices where client_id or provider_id doesn't match the booking
UPDATE invoices 
SET 
    client_id = b.client_id,
    provider_id = b.provider_id,
    updated_at = NOW()
FROM bookings b 
WHERE invoices.booking_id = b.id 
AND (
    invoices.client_id != b.client_id OR 
    invoices.provider_id != b.provider_id OR
    invoices.client_id IS NULL OR 
    invoices.provider_id IS NULL
);

-- Verify the fixes
SELECT 
    'After Fix - Invoice-Booking Consistency' as section,
    COUNT(*) as total_invoices,
    COUNT(CASE WHEN i.client_id = b.client_id THEN 1 END) as matching_client_ids,
    COUNT(CASE WHEN i.provider_id = b.provider_id THEN 1 END) as matching_provider_ids,
    COUNT(CASE WHEN i.client_id != b.client_id THEN 1 END) as mismatched_client_ids,
    COUNT(CASE WHEN i.provider_id != b.provider_id THEN 1 END) as mismatched_provider_ids
FROM invoices i 
INNER JOIN bookings b ON i.booking_id = b.id;

-- Check for any remaining orphaned invoices
SELECT 
    'Remaining Orphaned Invoices' as section,
    COUNT(*) as orphaned_count
FROM invoices i 
LEFT JOIN bookings b ON i.booking_id = b.id 
WHERE b.id IS NULL;

-- If there are orphaned invoices, we need to decide what to do with them
-- Option 1: Delete them (if they're truly invalid)
-- Option 2: Try to find matching bookings by other criteria
-- Option 3: Keep them but flag them for manual review

-- For now, let's see what orphaned invoices look like
SELECT 
    'Sample Orphaned Invoices' as section,
    i.id,
    i.invoice_number,
    i.booking_id,
    i.client_id,
    i.provider_id,
    i.amount,
    i.status,
    i.created_at
FROM invoices i 
LEFT JOIN bookings b ON i.booking_id = b.id 
WHERE b.id IS NULL
ORDER BY i.created_at DESC
LIMIT 5;
