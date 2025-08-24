-- Migration: Test Messaging with Existing Data
-- Date: December 2024
-- Description: Test messaging functionality using existing data

-- Check current state
SELECT 'profiles' as table_name, COUNT(*) as record_count FROM profiles
UNION ALL
SELECT 'services' as table_name, COUNT(*) as record_count FROM services
UNION ALL
SELECT 'bookings' as table_name, COUNT(*) as record_count FROM bookings
UNION ALL
SELECT 'messages' as table_name, COUNT(*) as record_count FROM messages;

-- Find profiles that actually have services
SELECT 
    p.id as profile_id,
    p.full_name,
    COUNT(s.id) as service_count
FROM profiles p
LEFT JOIN services s ON s.provider_id = p.id
GROUP BY p.id, p.full_name
HAVING COUNT(s.id) > 0
ORDER BY service_count DESC
LIMIT 5;

-- Find profiles that actually have bookings
SELECT 
    p.id as profile_id,
    p.full_name,
    COUNT(b.id) as booking_count
FROM profiles p
LEFT JOIN bookings b ON b.client_id = p.id OR b.provider_id = p.id
GROUP BY p.id, p.full_name
HAVING COUNT(b.id) > 0
ORDER BY booking_count DESC
LIMIT 5;

-- Find the complete chain: profile -> service -> booking
WITH profile_service_booking AS (
    SELECT 
        p.id as profile_id,
        p.full_name,
        s.id as service_id,
        s.title as service_title,
        b.id as booking_id,
        b.status as booking_status
    FROM profiles p
    INNER JOIN services s ON s.provider_id = p.id
    INNER JOIN bookings b ON b.service_id = s.id
    LIMIT 5
)
SELECT * FROM profile_service_booking;

-- Test messaging with the real data we found
DO $$
DECLARE
    test_profile_id UUID := 'd2ce1fe9-806f-4dbc-8efb-9cf160f19e4b';
    test_service_id UUID := 'd59a77bb-100a-4bb3-9755-ccb4b07ba06b';
    test_booking_id UUID := '8ccbb969-3639-4ff4-ae4d-722d9580db57';
BEGIN
    RAISE NOTICE 'Testing messaging with real data:';
    RAISE NOTICE 'Profile: % (fahad alamri)', test_profile_id;
    RAISE NOTICE 'Service: % (PRO services)', test_service_id;
    RAISE NOTICE 'Booking: % (pending)', test_booking_id;
    
    -- Verify the data exists
    IF EXISTS (SELECT 1 FROM profiles WHERE id = test_profile_id) THEN
        RAISE NOTICE '✓ Profile exists';
    ELSE
        RAISE NOTICE '✗ Profile not found';
        RETURN;
    END IF;
    
    IF EXISTS (SELECT 1 FROM services WHERE id = test_service_id) THEN
        RAISE NOTICE '✓ Service exists';
    ELSE
        RAISE NOTICE '✗ Service not found';
        RETURN;
    END IF;
    
    IF EXISTS (SELECT 1 FROM bookings WHERE id = test_booking_id) THEN
        RAISE NOTICE '✓ Booking exists';
    ELSE
        RAISE NOTICE '✗ Booking not found';
        RETURN;
    END IF;
    
    -- Try to create a test message
    INSERT INTO messages (sender_id, content, booking_id) 
    VALUES (test_profile_id, 'Test message from fahad alamri using real data', test_booking_id);
    
    RAISE NOTICE '✓ Successfully created test message';
    
    -- Verify the message was created
    IF EXISTS (SELECT 1 FROM messages WHERE content = 'Test message from fahad alamri using real data') THEN
        RAISE NOTICE '✓ Message verified in database';
    ELSE
        RAISE NOTICE '✗ Message not found in database';
    END IF;
    
    -- Clean up test message
    DELETE FROM messages WHERE content = 'Test message from fahad alamri using real data';
    RAISE NOTICE '✓ Cleaned up test message';
    
    RAISE NOTICE 'Messaging system test completed successfully!';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error during test: %', SQLERRM;
END $$;
