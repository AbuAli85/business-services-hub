-- Test API Changes
-- This script tests the key changes we made to ensure they work correctly

-- 1. Test v_booking_status view exists and has the right columns
SELECT 'Testing v_booking_status view structure' as test_name;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'v_booking_status'
ORDER BY ordinal_position;

-- 2. Test that we can query the view with our new field names
SELECT 'Testing v_booking_status query with new fields' as test_name;
SELECT 
    id,
    booking_title,
    service_title,
    client_name,
    provider_name,
    display_status,
    progress,
    payment_status,
    amount,
    currency
FROM v_booking_status 
LIMIT 3;

-- 3. Test status filtering works
SELECT 'Testing status filtering' as test_name;
SELECT 
    display_status,
    COUNT(*) as count
FROM v_booking_status 
GROUP BY display_status
ORDER BY count DESC;

-- 4. Test search functionality
SELECT 'Testing search functionality' as test_name;
SELECT 
    id,
    booking_title,
    service_title,
    client_name
FROM v_booking_status 
WHERE booking_title ILIKE '%test%' 
   OR service_title ILIKE '%test%' 
   OR client_name ILIKE '%test%'
LIMIT 5;

-- 5. Test sorting by new fields
SELECT 'Testing sorting by new fields' as test_name;
SELECT 
    id,
    booking_title,
    service_title,
    progress,
    display_status
FROM v_booking_status 
ORDER BY service_title ASC, progress DESC
LIMIT 5;

SELECT 'All API change tests completed!' as result;
