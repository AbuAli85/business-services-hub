-- Apply Security Fixes Script
-- This script applies the comprehensive security fixes to resolve all database security issues

-- Run the migration
\i supabase/migrations/218_fix_security_issues_comprehensive_corrected.sql

-- Verify the fixes
DO $$
DECLARE
    rls_disabled_count INTEGER;
    security_definer_count INTEGER;
BEGIN
    -- Check for tables with RLS disabled
    SELECT COUNT(*)
    INTO rls_disabled_count
    FROM pg_tables t
    LEFT JOIN pg_class c ON c.relname = t.tablename
    WHERE t.schemaname = 'public' 
    AND t.tablename IN ('bookings', 'tasks', 'insight_run_logs', 'notification_channels', 'insight_notifications', 'insight_events')
    AND NOT c.relrowsecurity;
    
    -- Check for SECURITY DEFINER views
    SELECT COUNT(*)
    INTO security_definer_count
    FROM pg_views v
    JOIN pg_class c ON c.relname = v.viewname
    WHERE v.schemaname = 'public'
    AND c.relkind = 'v'
    AND EXISTS (
        SELECT 1 FROM pg_rewrite r
        JOIN pg_class c2 ON c2.oid = r.ev_class
        WHERE c2.relname = v.viewname
        AND r.ev_type = '1'
        AND r.ev_enabled = 'O'
    );
    
    RAISE NOTICE 'Security Fix Verification:';
    RAISE NOTICE '- Tables with RLS disabled: %', rls_disabled_count;
    RAISE NOTICE '- SECURITY DEFINER views remaining: %', security_definer_count;
    
    IF rls_disabled_count = 0 AND security_definer_count = 0 THEN
        RAISE NOTICE '✅ All security issues have been resolved!';
    ELSE
        RAISE NOTICE '⚠️  Some security issues may still remain. Please review manually.';
    END IF;
END $$;

-- Show current RLS status for all relevant tables
SELECT 
    schemaname,
    tablename,
    CASE WHEN relrowsecurity THEN 'Enabled' ELSE 'Disabled' END as rls_status
FROM pg_tables t
LEFT JOIN pg_class c ON c.relname = t.tablename
WHERE t.schemaname = 'public' 
AND t.tablename IN ('bookings', 'tasks', 'insight_run_logs', 'notification_channels', 'insight_notifications', 'insight_events')
ORDER BY tablename;

-- Show current view security settings
SELECT 
    schemaname,
    viewname,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_rewrite r
            JOIN pg_class c ON c.oid = r.ev_class
            WHERE c.relname = v.viewname
            AND r.ev_type = '1'
            AND r.ev_enabled = 'O'
        ) THEN 'SECURITY DEFINER'
        ELSE 'SECURITY INVOKER (Default)'
    END as security_type
FROM pg_views v
WHERE v.schemaname = 'public'
AND v.viewname IN (
    'bookings_full_view', 'v_provider_workload_analytics', 'v_service_performance',
    'v_booking_anomalies', 'v_completion_analytics', 'v_booking_status',
    'v_booking_status_metrics', 'v_revenue_by_status', 'v_revenue_forecast', 'v_booking_trends'
)
ORDER BY viewname;
