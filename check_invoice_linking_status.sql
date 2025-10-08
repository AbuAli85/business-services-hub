-- Check the current status of invoice linking
-- This will show us exactly what needs to be fixed

-- Step 1: Analyze current state
SELECT 
    'Current Invoice Analysis' as section,
    COUNT(*) as total_invoices,
    COUNT(CASE WHEN client_id IS NULL THEN 1 END) as null_client_ids,
    COUNT(CASE WHEN provider_id IS NULL THEN 1 END) as null_provider_ids,
    COUNT(CASE WHEN booking_id IS NULL THEN 1 END) as null_booking_ids
FROM invoices;

-- Step 2: Check for invalid client references
SELECT 
    'Invalid Client References' as section,
    COUNT(*) as invalid_client_refs
FROM invoices i 
LEFT JOIN profiles p ON i.client_id = p.id 
WHERE i.client_id IS NOT NULL AND p.id IS NULL;

-- Step 3: Check for invalid provider references  
SELECT 
    'Invalid Provider References' as section,
    COUNT(*) as invalid_provider_refs
FROM invoices i 
LEFT JOIN profiles pr ON i.provider_id = pr.id 
WHERE i.provider_id IS NOT NULL AND pr.id IS NULL;

-- Step 4: Check for invalid booking references
SELECT 
    'Invalid Booking References' as section,
    COUNT(*) as invalid_booking_refs
FROM invoices i 
LEFT JOIN bookings b ON i.booking_id = b.id 
WHERE i.booking_id IS NOT NULL AND b.id IS NULL;

-- Step 5: Check for mismatched invoice-booking relationships
SELECT 
    'Mismatched Invoice-Booking IDs' as section,
    COUNT(*) as mismatched_count
FROM invoices i 
INNER JOIN bookings b ON i.booking_id = b.id 
WHERE i.client_id != b.client_id OR i.provider_id != b.provider_id;

-- Step 6: Show sample of current invoice data
SELECT 
    'Sample Invoice Data' as section,
    i.id,
    i.invoice_number,
    i.amount,
    i.status,
    i.client_id,
    i.provider_id,
    i.booking_id,
    c.full_name as client_name,
    p.full_name as provider_name,
    CASE 
        WHEN c.id IS NOT NULL THEN 'Valid Client'
        ELSE 'Invalid Client'
    END as client_status,
    CASE 
        WHEN p.id IS NOT NULL THEN 'Valid Provider'
        ELSE 'Invalid Provider'
    END as provider_status
FROM invoices i
LEFT JOIN profiles c ON i.client_id = c.id
LEFT JOIN profiles p ON i.provider_id = p.id
ORDER BY i.created_at DESC
LIMIT 10;

-- Step 7: Final summary
SELECT 
    'Final Summary' as section,
    COUNT(*) as total_invoices,
    COUNT(CASE WHEN c.id IS NOT NULL THEN 1 END) as valid_client_refs,
    COUNT(CASE WHEN p.id IS NOT NULL THEN 1 END) as valid_provider_refs,
    COUNT(CASE WHEN b.id IS NOT NULL THEN 1 END) as valid_booking_refs
FROM invoices i
LEFT JOIN profiles c ON i.client_id = c.id
LEFT JOIN profiles p ON i.provider_id = p.id
LEFT JOIN bookings b ON i.booking_id = b.id;
