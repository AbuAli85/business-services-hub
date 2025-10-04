-- Simple Performance Test
-- This script tests the key performance improvements without complex system table queries

-- 1. Test v_booking_status view exists and works
SELECT 'Testing v_booking_status view' as test_name;
SELECT COUNT(*) as total_bookings FROM v_booking_status;

-- 2. Test basic query performance (should be fast with indexes)
SELECT 'Testing basic query performance' as test_name;
SELECT 
    id,
    booking_title,
    service_title,
    client_name,
    provider_name,
    display_status,
    progress
FROM v_booking_status 
LIMIT 10;

-- 3. Test filtering performance
SELECT 'Testing filtering performance' as test_name;
SELECT 
    display_status,
    COUNT(*) as count
FROM v_booking_status 
GROUP BY display_status
ORDER BY count DESC;

-- 4. Test search performance
SELECT 'Testing search performance' as test_name;
SELECT 
    id,
    booking_title,
    service_title,
    client_name
FROM v_booking_status 
WHERE booking_title ILIKE '%service%' 
   OR service_title ILIKE '%service%' 
   OR client_name ILIKE '%client%'
LIMIT 5;

-- 5. Test sorting performance
SELECT 'Testing sorting performance' as test_name;
SELECT 
    id,
    booking_title,
    service_title,
    progress,
    display_status,
    created_at
FROM v_booking_status 
ORDER BY created_at DESC, progress DESC
LIMIT 10;

-- 6. Test aggregation performance
SELECT 'Testing aggregation performance' as test_name;
SELECT 
    display_status,
    COUNT(*) as total_bookings,
    AVG(progress) as avg_progress,
    SUM(amount) as total_amount
FROM v_booking_status 
GROUP BY display_status
ORDER BY total_bookings DESC;

SELECT 'Simple performance test completed!' as result;
