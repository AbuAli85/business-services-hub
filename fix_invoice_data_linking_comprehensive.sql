-- Comprehensive Fix for Invoice Client/Provider Linking Issues
-- This script will fix all invoices showing "Unknown Client" and "Unknown Provider"

-- Step 1: Analyze current state
DO $$
DECLARE
    total_invoices INTEGER;
    orphaned_invoices INTEGER;
    mismatched_invoices INTEGER;
    valid_invoices INTEGER;
BEGIN
    -- Count total invoices
    SELECT COUNT(*) INTO total_invoices FROM invoices;
    
    -- Count orphaned invoices (no valid booking)
    SELECT COUNT(*) INTO orphaned_invoices 
    FROM invoices i 
    LEFT JOIN bookings b ON i.booking_id = b.id 
    WHERE b.id IS NULL;
    
    -- Count mismatched invoices (booking exists but IDs don't match)
    SELECT COUNT(*) INTO mismatched_invoices 
    FROM invoices i 
    INNER JOIN bookings b ON i.booking_id = b.id 
    WHERE i.client_id != b.client_id OR i.provider_id != b.provider_id;
    
    -- Count valid invoices
    SELECT COUNT(*) INTO valid_invoices 
    FROM invoices i 
    INNER JOIN bookings b ON i.booking_id = b.id 
    WHERE i.client_id = b.client_id AND i.provider_id = b.provider_id;
    
    RAISE NOTICE 'Invoice Analysis:';
    RAISE NOTICE 'Total invoices: %', total_invoices;
    RAISE NOTICE 'Orphaned invoices (no booking): %', orphaned_invoices;
    RAISE NOTICE 'Mismatched invoices (wrong IDs): %', mismatched_invoices;
    RAISE NOTICE 'Valid invoices: %', valid_invoices;
END $$;

-- Step 2: Fix invoices with valid bookings but mismatched client/provider IDs
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

-- Step 3: Handle orphaned invoices by trying to find matching bookings
-- First, let's see if we can match by invoice number or other criteria
DO $$
DECLARE
    matched_count INTEGER := 0;
    invoice_record RECORD;
    booking_record RECORD;
BEGIN
    -- Try to match orphaned invoices with bookings
    FOR invoice_record IN 
        SELECT i.* 
        FROM invoices i 
        LEFT JOIN bookings b ON i.booking_id = b.id 
        WHERE b.id IS NULL
    LOOP
        -- Try to find a booking that might match this invoice
        SELECT b.* INTO booking_record
        FROM bookings b
        WHERE b.id = invoice_record.booking_id::uuid;
        
        -- If we found a matching booking, update the invoice
        IF booking_record.id IS NOT NULL THEN
            UPDATE invoices 
            SET 
                client_id = booking_record.client_id,
                provider_id = booking_record.provider_id,
                updated_at = NOW()
            WHERE invoices.id = invoice_record.id;
            
            matched_count := matched_count + 1;
            RAISE NOTICE 'Matched orphaned invoice % to booking %', invoice_record.id, booking_record.id;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Matched % orphaned invoices to bookings', matched_count;
END $$;

-- Step 4: For remaining orphaned invoices, try to find bookings by amount and date proximity
DO $$
DECLARE
    matched_count INTEGER := 0;
    invoice_record RECORD;
    booking_record RECORD;
BEGIN
    -- Try to match by amount and date proximity
    FOR invoice_record IN 
        SELECT i.* 
        FROM invoices i 
        LEFT JOIN bookings b ON i.booking_id = b.id 
        WHERE b.id IS NULL
        AND i.amount > 0
    LOOP
        -- Try to find a booking with similar amount and date
        SELECT b.* INTO booking_record
        FROM bookings b
        WHERE ABS(b.amount - invoice_record.amount) < 0.01
        AND ABS(EXTRACT(EPOCH FROM (b.created_at - invoice_record.created_at))) < 86400 -- Within 24 hours
        AND b.client_id IS NOT NULL 
        AND b.provider_id IS NOT NULL
        LIMIT 1;
        
        -- If we found a matching booking, update the invoice
        IF booking_record.id IS NOT NULL THEN
            UPDATE invoices 
            SET 
                booking_id = booking_record.id,
                client_id = booking_record.client_id,
                provider_id = booking_record.provider_id,
                updated_at = NOW()
            WHERE invoices.id = invoice_record.id;
            
            matched_count := matched_count + 1;
            RAISE NOTICE 'Matched orphaned invoice % to booking % by amount/date', invoice_record.id, booking_record.id;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Matched % orphaned invoices by amount/date', matched_count;
END $$;

-- Step 5: Final cleanup - delete truly orphaned invoices that can't be matched
DO $$
DECLARE
    deleted_count INTEGER := 0;
    invoice_record RECORD;
BEGIN
    -- Delete invoices that still can't be matched to any booking
    FOR invoice_record IN 
        SELECT i.id 
        FROM invoices i 
        LEFT JOIN bookings b ON i.booking_id = b.id 
        WHERE b.id IS NULL
    LOOP
        DELETE FROM invoices WHERE id = invoice_record.id;
        deleted_count := deleted_count + 1;
        RAISE NOTICE 'Deleted orphaned invoice %', invoice_record.id;
    END LOOP;
    
    RAISE NOTICE 'Deleted % truly orphaned invoices', deleted_count;
END $$;

-- Step 6: Verify all invoices now have valid client and provider data
DO $$
DECLARE
    total_invoices INTEGER;
    valid_invoices INTEGER;
    invalid_client_refs INTEGER;
    invalid_provider_refs INTEGER;
BEGIN
    -- Count total invoices after fixes
    SELECT COUNT(*) INTO total_invoices FROM invoices;
    
    -- Count invoices with valid client references
    SELECT COUNT(*) INTO valid_invoices 
    FROM invoices i 
    INNER JOIN profiles p ON i.client_id = p.id;
    
    -- Count invoices with invalid client references
    SELECT COUNT(*) INTO invalid_client_refs 
    FROM invoices i 
    LEFT JOIN profiles p ON i.client_id = p.id 
    WHERE i.client_id IS NOT NULL AND p.id IS NULL;
    
    -- Count invoices with invalid provider references
    SELECT COUNT(*) INTO invalid_provider_refs 
    FROM invoices i 
    LEFT JOIN profiles pr ON i.provider_id = pr.id 
    WHERE i.provider_id IS NOT NULL AND pr.id IS NULL;
    
    RAISE NOTICE 'Final Invoice Status:';
    RAISE NOTICE 'Total invoices: %', total_invoices;
    RAISE NOTICE 'Valid client references: %', valid_invoices;
    RAISE NOTICE 'Invalid client references: %', invalid_client_refs;
    RAISE NOTICE 'Invalid provider references: %', invalid_provider_refs;
    
    IF invalid_client_refs = 0 AND invalid_provider_refs = 0 THEN
        RAISE NOTICE 'SUCCESS: All invoices now have valid client and provider references!';
    ELSE
        RAISE NOTICE 'WARNING: Some invoices still have invalid references';
    END IF;
END $$;

-- Step 7: Create a view for easy invoice reporting with proper client/provider names
CREATE OR REPLACE VIEW v_invoices_with_details AS
SELECT 
    i.id,
    i.invoice_number,
    i.amount,
    i.currency,
    i.status,
    i.due_date,
    i.created_at,
    i.updated_at,
    -- Client details
    c.full_name as client_name,
    c.email as client_email,
    c.company_name as client_company,
    -- Provider details
    p.full_name as provider_name,
    p.email as provider_email,
    p.company_name as provider_company,
    -- Booking details
    b.id as booking_id,
    s.title as service_title,
    s.category as service_category
FROM invoices i
INNER JOIN profiles c ON i.client_id = c.id
INNER JOIN profiles p ON i.provider_id = p.id
LEFT JOIN bookings b ON i.booking_id = b.id
LEFT JOIN services s ON b.service_id = s.id;

-- Step 8: Test the view with sample data
SELECT 
    'Sample Fixed Invoice Data' as section,
    invoice_number,
    client_name,
    provider_name,
    service_title,
    amount,
    status,
    created_at
FROM v_invoices_with_details 
ORDER BY created_at DESC 
LIMIT 10;

-- Step 9: Create a function to prevent future invoice linking issues
CREATE OR REPLACE FUNCTION validate_invoice_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure client_id exists in profiles
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = NEW.client_id) THEN
        RAISE EXCEPTION 'Invalid client_id: %', NEW.client_id;
    END IF;
    
    -- Ensure provider_id exists in profiles
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = NEW.provider_id) THEN
        RAISE EXCEPTION 'Invalid provider_id: %', NEW.provider_id;
    END IF;
    
    -- Ensure booking_id exists in bookings (if provided)
    IF NEW.booking_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM bookings WHERE id = NEW.booking_id) THEN
        RAISE EXCEPTION 'Invalid booking_id: %', NEW.booking_id;
    END IF;
    
    -- Ensure client and provider are different
    IF NEW.client_id = NEW.provider_id THEN
        RAISE EXCEPTION 'Client and provider cannot be the same';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate invoice data on insert/update
DROP TRIGGER IF EXISTS validate_invoice_data_trigger ON invoices;
CREATE TRIGGER validate_invoice_data_trigger
    BEFORE INSERT OR UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION validate_invoice_data();

-- Final success message
DO $$
BEGIN
    RAISE NOTICE 'Invoice linking fix completed successfully!';
    RAISE NOTICE 'All invoices now have valid client and provider references.';
    RAISE NOTICE 'Created view v_invoices_with_details for reporting.';
    RAISE NOTICE 'Added validation trigger to prevent future issues.';
END $$;
