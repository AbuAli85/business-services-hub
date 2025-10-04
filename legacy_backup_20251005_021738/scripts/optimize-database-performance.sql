-- Database Performance Optimization Script
-- Based on PostgreSQL query performance analysis

-- ==============================================
-- CRITICAL INDEXES FOR PERFORMANCE
-- ==============================================

-- 1. Milestone Approvals Optimization
-- This addresses the 0.62% performance impact from milestone_approvals queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_milestone_approvals_milestone_id 
ON milestone_approvals(milestone_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_milestone_approvals_created_at 
ON milestone_approvals(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_milestone_approvals_status 
ON milestone_approvals(status);

-- 2. Notifications Optimization
-- This addresses the 0.37% performance impact from notifications queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_created_at 
ON notifications(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_id 
ON notifications(user_id);

-- 3. Profiles Optimization
-- This addresses frequent profile role lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_id_role 
ON profiles(id, role);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_email 
ON profiles(email);

-- 4. Services Optimization
-- This addresses service queries that are frequently accessed
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_status_created_at 
ON services(status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_provider_id 
ON services(provider_id);

-- 5. Bookings Optimization
-- This addresses booking queries and joins
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_client_id 
ON bookings(client_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_provider_id 
ON bookings(provider_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_status_created_at 
ON bookings(status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_service_id 
ON bookings(service_id);

-- 6. Invoices Optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_booking_id 
ON invoices(booking_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_status 
ON invoices(status);

-- ==============================================
-- MATERIALIZED VIEWS FOR FREQUENTLY ACCESSED DATA
-- ==============================================

-- 1. Booking Progress View
-- This will reduce the need for complex joins in the booking progress queries
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_booking_progress AS
SELECT 
    b.id as booking_id,
    b.status,
    b.approval_status,
    b.amount_cents,
    b.currency,
    b.created_at,
    b.updated_at,
    s.title as service_title,
    s.description as service_description,
    s.category as service_category,
    c.full_name as client_name,
    c.email as client_email,
    p.full_name as provider_name,
    p.email as provider_email,
    COALESCE(progress.progress_pct, 0) as progress_percentage,
    inv.status as invoice_status,
    inv.amount as invoice_amount
FROM bookings b
LEFT JOIN services s ON b.service_id = s.id
LEFT JOIN profiles c ON b.client_id = c.id
LEFT JOIN profiles p ON b.provider_id = p.id
LEFT JOIN v_booking_progress progress ON b.id = progress.booking_id
LEFT JOIN invoices inv ON b.id = inv.booking_id;

-- Create index on the materialized view
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mv_booking_progress_booking_id 
ON mv_booking_progress(booking_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mv_booking_progress_client_id 
ON mv_booking_progress(client_name);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mv_booking_progress_provider_id 
ON mv_booking_progress(provider_name);

-- 2. User Activity Summary View
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_user_activity_summary AS
SELECT 
    p.id as user_id,
    p.full_name,
    p.email,
    p.role,
    COUNT(DISTINCT b.id) as total_bookings,
    COUNT(DISTINCT CASE WHEN b.status = 'completed' THEN b.id END) as completed_bookings,
    COUNT(DISTINCT CASE WHEN b.status = 'in_progress' THEN b.id END) as active_bookings,
    COUNT(DISTINCT n.id) as total_notifications,
    COUNT(DISTINCT CASE WHEN n.read_at IS NULL THEN n.id END) as unread_notifications,
    MAX(b.updated_at) as last_booking_activity,
    MAX(n.created_at) as last_notification_activity
FROM profiles p
LEFT JOIN bookings b ON (p.id = b.client_id OR p.id = b.provider_id)
LEFT JOIN notifications n ON p.id = n.user_id
GROUP BY p.id, p.full_name, p.email, p.role;

-- Create index on the user activity view
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mv_user_activity_user_id 
ON mv_user_activity_summary(user_id);

-- ==============================================
-- QUERY OPTIMIZATION FUNCTIONS
-- ==============================================

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_performance_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_booking_progress;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_activity_summary;
    
    -- Log the refresh
    INSERT INTO performance_log (operation, timestamp, details)
    VALUES ('materialized_view_refresh', NOW(), 'Refreshed booking progress and user activity views');
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- PERFORMANCE MONITORING SETUP
-- ==============================================

-- Create performance logging table
CREATE TABLE IF NOT EXISTS performance_log (
    id SERIAL PRIMARY KEY,
    operation VARCHAR(100) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duration_ms INTEGER,
    details TEXT,
    query_text TEXT
);

-- Create index on performance log
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_log_timestamp 
ON performance_log(timestamp DESC);

-- Function to log slow queries
CREATE OR REPLACE FUNCTION log_slow_query(
    p_operation VARCHAR(100),
    p_duration_ms INTEGER,
    p_details TEXT DEFAULT NULL,
    p_query_text TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    INSERT INTO performance_log (operation, duration_ms, details, query_text)
    VALUES (p_operation, p_duration_ms, p_details, p_query_text);
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- REALTIME OPTIMIZATION
-- ==============================================

-- Create a function to manage realtime subscriptions more efficiently
CREATE OR REPLACE FUNCTION optimize_realtime_subscriptions()
RETURNS void AS $$
BEGIN
    -- Clean up old subscriptions
    DELETE FROM realtime.subscription 
    WHERE created_at < NOW() - INTERVAL '1 hour'
    AND subscription_id NOT IN (
        SELECT DISTINCT subscription_id 
        FROM realtime.subscription 
        WHERE created_at > NOW() - INTERVAL '5 minutes'
    );
    
    -- Log the cleanup
    INSERT INTO performance_log (operation, timestamp, details)
    VALUES ('realtime_cleanup', NOW(), 'Cleaned up old realtime subscriptions');
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- AUTOMATED MAINTENANCE
-- ==============================================

-- Create a maintenance function that runs periodically
CREATE OR REPLACE FUNCTION run_database_maintenance()
RETURNS void AS $$
BEGIN
    -- Refresh materialized views
    PERFORM refresh_performance_views();
    
    -- Clean up realtime subscriptions
    PERFORM optimize_realtime_subscriptions();
    
    -- Update table statistics
    ANALYZE bookings;
    ANALYZE services;
    ANALYZE profiles;
    ANALYZE notifications;
    ANALYZE milestone_approvals;
    ANALYZE invoices;
    
    -- Log the maintenance
    INSERT INTO performance_log (operation, timestamp, details)
    VALUES ('database_maintenance', NOW(), 'Completed full database maintenance');
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- CONFIGURATION OPTIMIZATIONS
-- ==============================================

-- Optimize PostgreSQL settings for better performance
-- Note: These require superuser privileges and server restart

-- Increase shared_buffers for better caching
-- ALTER SYSTEM SET shared_buffers = '256MB';

-- Optimize work_mem for complex queries
-- ALTER SYSTEM SET work_mem = '16MB';

-- Increase effective_cache_size
-- ALTER SYSTEM SET effective_cache_size = '1GB';

-- Optimize random_page_cost for SSD storage
-- ALTER SYSTEM SET random_page_cost = 1.1;

-- ==============================================
-- VERIFICATION QUERIES
-- ==============================================

-- Query to check index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_tup_read DESC;

-- Query to check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Query to check slow queries
SELECT 
    operation,
    COUNT(*) as frequency,
    AVG(duration_ms) as avg_duration,
    MAX(duration_ms) as max_duration
FROM performance_log 
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY operation
ORDER BY avg_duration DESC;

-- ==============================================
-- EXECUTION INSTRUCTIONS
-- ==============================================

-- 1. Run this script during low-traffic periods
-- 2. Monitor the performance_log table for any issues
-- 3. Set up a cron job to run run_database_maintenance() every hour
-- 4. Monitor index usage and adjust as needed
-- 5. Consider implementing connection pooling (PgBouncer)

-- Example cron job setup:
-- 0 * * * * psql -d your_database -c "SELECT run_database_maintenance();"

COMMENT ON FUNCTION refresh_performance_views() IS 'Refreshes materialized views for better query performance';
COMMENT ON FUNCTION optimize_realtime_subscriptions() IS 'Cleans up old realtime subscriptions to reduce overhead';
COMMENT ON FUNCTION run_database_maintenance() IS 'Runs comprehensive database maintenance tasks';
COMMENT ON FUNCTION log_slow_query(VARCHAR, INTEGER, TEXT, TEXT) IS 'Logs slow queries for performance monitoring';
