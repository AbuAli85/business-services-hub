-- Performance Verification Script
-- This script verifies that the indexes are working and improving query performance

-- 1. Check Index Usage Statistics
SELECT 'Index Usage Statistics' as check_type;
SELECT 
    schemaname,
    relname as tablename,
    indexrelname as indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
AND relname IN ('bookings', 'milestones', 'invoices', 'profiles', 'services')
ORDER BY idx_scan DESC;

-- 2. Check Table Scan Statistics
SELECT 'Table Scan Statistics' as check_type;
SELECT 
    schemaname,
    relname as tablename,
    seq_scan as full_scans,
    seq_tup_read as tuples_read,
    idx_scan as index_scans,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
AND relname IN ('bookings', 'milestones', 'invoices', 'profiles', 'services')
ORDER BY seq_scan DESC;

-- 3. Test Query Performance with EXPLAIN ANALYZE
SELECT 'Query Performance Test' as check_type;

-- Test 1: Provider filtering (should use idx_bookings_provider_id)
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM v_booking_status 
WHERE provider_id = (SELECT id FROM profiles WHERE role = 'provider' LIMIT 1)
LIMIT 10;

-- Test 2: Status filtering (should use idx_bookings_status)
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM v_booking_status 
WHERE display_status = 'in_progress'
LIMIT 10;

-- Test 3: Date sorting (should use idx_bookings_created_at)
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM v_booking_status 
ORDER BY created_at DESC
LIMIT 10;

-- 4. Check Index Sizes
SELECT 'Index Sizes' as check_type;
SELECT 
    schemaname,
    relname as tablename,
    indexrelname as indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
AND relname IN ('bookings', 'milestones', 'invoices', 'profiles', 'services')
ORDER BY pg_relation_size(indexrelid) DESC;

-- 5. Verify v_booking_status View Performance
SELECT 'View Performance Test' as check_type;
EXPLAIN (ANALYZE, BUFFERS)
SELECT 
    COUNT(*) as total_bookings,
    COUNT(CASE WHEN display_status = 'in_progress' THEN 1 END) as in_progress,
    COUNT(CASE WHEN display_status = 'completed' THEN 1 END) as completed,
    AVG(progress) as avg_progress
FROM v_booking_status;

SELECT 'Performance verification completed!' as result;
