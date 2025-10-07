-- Fix Additional Security Issues
-- This script addresses the remaining security warnings from the database linter

-- =============================================
-- 1. Fix Function Search Path Mutable Issues
-- =============================================

-- Fix all functions with mutable search_path by setting search_path = 'public'
-- This prevents search path manipulation attacks

-- Core business functions
ALTER FUNCTION public.update_task SET search_path = 'public';
ALTER FUNCTION public.can_transition SET search_path = 'public';
ALTER FUNCTION public.calculate_booking_progress SET search_path = 'public';
ALTER FUNCTION public.update_milestone_progress SET search_path = 'public';

-- Analytics functions
ALTER FUNCTION public.refresh_booking_progress_analytics SET search_path = 'public';
ALTER FUNCTION public.trigger_refresh_booking_analytics SET search_path = 'public';
ALTER FUNCTION public.get_booking_trends SET search_path = 'public';
ALTER FUNCTION public.get_revenue_analytics SET search_path = 'public';
ALTER FUNCTION public.get_completion_analytics SET search_path = 'public';
ALTER FUNCTION public.get_service_performance SET search_path = 'public';
ALTER FUNCTION public.get_dashboard_kpis SET search_path = 'public';

-- Status and display functions
ALTER FUNCTION public.standardize_booking_status SET search_path = 'public';
ALTER FUNCTION public.get_status_display_info SET search_path = 'public';
ALTER FUNCTION public.get_payment_status_display_info SET search_path = 'public';

-- Utility functions
ALTER FUNCTION public.safe_fetch_profile SET search_path = 'public';
ALTER FUNCTION public.update_booking_files_updated_at SET search_path = 'public';
ALTER FUNCTION public.update_task_comments_updated_at SET search_path = 'public';
ALTER FUNCTION public.update_task_files_updated_at SET search_path = 'public';
ALTER FUNCTION public.update_updated_at_column SET search_path = 'public';

-- Notification functions
ALTER FUNCTION public.notify_booking_progress_update SET search_path = 'public';
ALTER FUNCTION public.notify_task_progress_update SET search_path = 'public';

-- Insight and analytics functions
ALTER FUNCTION public.detect_anomalies SET search_path = 'public';
ALTER FUNCTION public.forecast_revenue SET search_path = 'public';
ALTER FUNCTION public.generate_daily_insights SET search_path = 'public';
ALTER FUNCTION public.get_latest_insights SET search_path = 'public';
ALTER FUNCTION public.resolve_insight SET search_path = 'public';
ALTER FUNCTION public.trigger_manual_insight_generation SET search_path = 'public';
ALTER FUNCTION public.fn_auto_generate_insights SET search_path = 'public';
ALTER FUNCTION public.get_insights_for_notification SET search_path = 'public';
ALTER FUNCTION public.log_notification_attempt SET search_path = 'public';
ALTER FUNCTION public.get_insight_run_stats SET search_path = 'public';

-- =============================================
-- 2. Fix Materialized View API Access Issue
-- =============================================

-- Revoke API access from materialized view
REVOKE SELECT ON public.mv_booking_progress_analytics FROM anon;
REVOKE SELECT ON public.mv_booking_progress_analytics FROM authenticated;

-- Only allow service role access to materialized view
GRANT SELECT ON public.mv_booking_progress_analytics TO service_role;

-- Add comment explaining the restriction
COMMENT ON MATERIALIZED VIEW public.mv_booking_progress_analytics IS 
'Materialized view for internal analytics - API access restricted for security. Use service_role for access.';

-- =============================================
-- 3. Verification and Status Report
-- =============================================

DO $$
DECLARE
    mutable_functions_count INTEGER;
    materialized_view_accessible BOOLEAN;
BEGIN
    -- Check for remaining mutable search_path functions
    SELECT COUNT(*)
    INTO mutable_functions_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.prokind = 'f'
    AND (
        p.proconfig IS NULL 
        OR NOT ('search_path=public' = ANY(p.proconfig))
    );
    
    -- Check materialized view access
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_privileges 
        WHERE table_name = 'mv_booking_progress_analytics'
        AND table_schema = 'public'
        AND grantee IN ('anon', 'authenticated')
    ) INTO materialized_view_accessible;
    
    RAISE NOTICE 'Additional Security Fixes Applied:';
    RAISE NOTICE '- Functions with mutable search_path remaining: %', mutable_functions_count;
    RAISE NOTICE '- Materialized view accessible to API: %', materialized_view_accessible;
    
    IF mutable_functions_count = 0 AND NOT materialized_view_accessible THEN
        RAISE NOTICE '✅ All additional security issues resolved!';
    ELSE
        RAISE NOTICE '⚠️  Some issues may remain - check manually if needed.';
    END IF;
END $$;

-- =============================================
-- 4. Show Current Security Status
-- =============================================

-- Show functions with search_path status
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    CASE 
        WHEN p.proconfig IS NULL THEN 'No search_path (Secure)'
        WHEN 'search_path=public' = ANY(p.proconfig) THEN 'search_path=public (Secure)'
        ELSE 'Other config (Check)'
    END as security_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.prokind = 'f'
AND p.proname IN (
    'update_task', 'can_transition', 'calculate_booking_progress', 'update_milestone_progress',
    'refresh_booking_progress_analytics', 'trigger_refresh_booking_analytics',
    'get_booking_trends', 'get_revenue_analytics', 'get_completion_analytics',
    'get_service_performance', 'get_dashboard_kpis', 'standardize_booking_status',
    'get_status_display_info', 'get_payment_status_display_info', 'safe_fetch_profile',
    'update_booking_files_updated_at', 'update_task_comments_updated_at',
    'update_task_files_updated_at', 'update_updated_at_column',
    'notify_booking_progress_update', 'notify_task_progress_update',
    'detect_anomalies', 'forecast_revenue', 'generate_daily_insights',
    'get_latest_insights', 'resolve_insight', 'trigger_manual_insight_generation',
    'fn_auto_generate_insights', 'get_insights_for_notification',
    'log_notification_attempt', 'get_insight_run_stats'
)
ORDER BY p.proname;

-- Show materialized view access status
SELECT 
    table_name,
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'mv_booking_progress_analytics'
AND table_schema = 'public'
ORDER BY grantee, privilege_type;
