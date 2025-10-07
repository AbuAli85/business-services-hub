-- Fix permissions for materialized views that actually exist
-- This addresses the "permission denied for materialized view" error

-- First, check which materialized views exist
DO $$
DECLARE
    view_name TEXT;
    view_exists BOOLEAN;
BEGIN
    -- Check and grant permissions for mv_booking_progress_analytics
    SELECT EXISTS(
        SELECT 1 FROM pg_matviews 
        WHERE matviewname = 'mv_booking_progress_analytics' 
        AND schemaname = 'public'
    ) INTO view_exists;
    
    IF view_exists THEN
        GRANT SELECT ON public.mv_booking_progress_analytics TO authenticated;
        RAISE NOTICE '✅ Granted permissions for mv_booking_progress_analytics';
    ELSE
        RAISE NOTICE '❌ mv_booking_progress_analytics does not exist';
    END IF;
    
    -- Check and grant permissions for service_analytics
    SELECT EXISTS(
        SELECT 1 FROM pg_matviews 
        WHERE matviewname = 'service_analytics' 
        AND schemaname = 'public'
    ) INTO view_exists;
    
    IF view_exists THEN
        GRANT SELECT ON public.service_analytics TO authenticated;
        RAISE NOTICE '✅ Granted permissions for service_analytics';
    ELSE
        RAISE NOTICE '❌ service_analytics does not exist';
    END IF;
    
    -- Check and grant permissions for user_analytics
    SELECT EXISTS(
        SELECT 1 FROM pg_matviews 
        WHERE matviewname = 'user_analytics' 
        AND schemaname = 'public'
    ) INTO view_exists;
    
    IF view_exists THEN
        GRANT SELECT ON public.user_analytics TO authenticated;
        RAISE NOTICE '✅ Granted permissions for user_analytics';
    ELSE
        RAISE NOTICE '❌ user_analytics does not exist';
    END IF;
    
    -- Check and grant permissions for booking_analytics
    SELECT EXISTS(
        SELECT 1 FROM pg_matviews 
        WHERE matviewname = 'booking_analytics' 
        AND schemaname = 'public'
    ) INTO view_exists;
    
    IF view_exists THEN
        GRANT SELECT ON public.booking_analytics TO authenticated;
        RAISE NOTICE '✅ Granted permissions for booking_analytics';
    ELSE
        RAISE NOTICE '❌ booking_analytics does not exist';
    END IF;
END $$;

-- Verify all materialized views exist and have proper permissions
SELECT 
  schemaname, 
  matviewname, 
  hasindexes,
  ispopulated
FROM pg_matviews 
WHERE schemaname = 'public'
ORDER BY matviewname;

-- Check current permissions for all materialized views
SELECT 
  table_name,
  grantee, 
  privilege_type 
FROM information_schema.table_privileges 
WHERE table_name IN ('mv_booking_progress_analytics', 'service_analytics', 'user_analytics', 'booking_analytics')
  AND table_schema = 'public'
ORDER BY table_name, grantee;

-- Add comments for documentation
COMMENT ON MATERIALIZED VIEW public.mv_booking_progress_analytics IS 'Materialized view for booking progress analytics - accessible to authenticated users';
COMMENT ON MATERIALIZED VIEW public.service_analytics IS 'Aggregated service performance metrics for analytics - accessible to authenticated users';
COMMENT ON MATERIALIZED VIEW public.user_analytics IS 'Aggregated user performance metrics for analytics - accessible to authenticated users';
COMMENT ON MATERIALIZED VIEW public.booking_analytics IS 'Daily booking analytics with revenue and completion metrics - accessible to authenticated users';
