-- Database Views and Functions Script
-- This script creates materialized views, functions, and other database objects
-- These can be run in a transaction block

BEGIN;

-- ==============================================
-- MATERIALIZED VIEWS FOR PERFORMANCE
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

-- ==============================================
-- PERFORMANCE LOGGING TABLE
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

-- ==============================================
-- PERFORMANCE FUNCTIONS
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

-- Function to optimize realtime subscriptions
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

-- Function to run comprehensive database maintenance
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
    ANALYZE tasks;
    ANALYZE time_entries;
    ANALYZE milestones;
    
    -- Log the maintenance
    INSERT INTO performance_log (operation, timestamp, details)
    VALUES ('database_maintenance', NOW(), 'Completed full database maintenance');
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- CREATE INDEXES ON MATERIALIZED VIEWS
-- ==============================================

-- Create indexes on the materialized views (these are not concurrent)
CREATE INDEX IF NOT EXISTS idx_mv_booking_progress_booking_id 
ON mv_booking_progress(booking_id);

CREATE INDEX IF NOT EXISTS idx_mv_booking_progress_client_name 
ON mv_booking_progress(client_name);

CREATE INDEX IF NOT EXISTS idx_mv_booking_progress_provider_name 
ON mv_booking_progress(provider_name);

CREATE INDEX IF NOT EXISTS idx_mv_user_activity_user_id 
ON mv_user_activity_summary(user_id);

-- Create index on performance log
CREATE INDEX IF NOT EXISTS idx_performance_log_timestamp 
ON performance_log(timestamp DESC);

-- ==============================================
-- COMMENTS AND DOCUMENTATION
-- ==============================================

COMMENT ON MATERIALIZED VIEW mv_booking_progress IS 'Optimized view for booking progress queries with all related data';
COMMENT ON MATERIALIZED VIEW mv_user_activity_summary IS 'Summary of user activity across bookings and notifications';
COMMENT ON FUNCTION refresh_performance_views() IS 'Refreshes materialized views for better query performance';
COMMENT ON FUNCTION optimize_realtime_subscriptions() IS 'Cleans up old realtime subscriptions to reduce overhead';
COMMENT ON FUNCTION run_database_maintenance() IS 'Runs comprehensive database maintenance tasks';
COMMENT ON FUNCTION log_slow_query(VARCHAR, INTEGER, TEXT, TEXT) IS 'Logs slow queries for performance monitoring';

COMMIT;

-- ==============================================
-- VERIFICATION QUERIES
-- ==============================================

-- Check materialized views
SELECT 
    schemaname,
    matviewname,
    definition
FROM pg_matviews 
WHERE schemaname = 'public'
ORDER BY matviewname;

-- Check functions
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name LIKE '%performance%' OR routine_name LIKE '%realtime%'
ORDER BY routine_name;

-- Check performance log table
SELECT 
    operation,
    COUNT(*) as frequency,
    AVG(duration_ms) as avg_duration,
    MAX(timestamp) as last_run
FROM performance_log 
GROUP BY operation
ORDER BY frequency DESC;
