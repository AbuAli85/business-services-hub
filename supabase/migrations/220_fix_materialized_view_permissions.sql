-- Fix permissions for mv_booking_progress_analytics materialized view
-- Addresses "permission denied for materialized view" errors
-- Migration: 220_fix_materialized_view_permissions.sql

-- Grant permissions for the confirmed existing materialized view
GRANT SELECT ON public.mv_booking_progress_analytics TO authenticated;

-- Add comment for documentation
COMMENT ON MATERIALIZED VIEW public.mv_booking_progress_analytics IS 'Materialized view for booking progress analytics - accessible to authenticated users';

-- Verify permission was applied correctly
DO $$
DECLARE
    has_permission BOOLEAN;
BEGIN
    -- Check if authenticated role has SELECT permission on mv_booking_progress_analytics
    SELECT EXISTS(
        SELECT 1 
        FROM information_schema.table_privileges 
        WHERE table_name = 'mv_booking_progress_analytics' 
          AND table_schema = 'public'
          AND grantee = 'authenticated'
          AND privilege_type = 'SELECT'
    ) INTO has_permission;
    
    IF has_permission THEN
        RAISE NOTICE '✅ Permission granted: authenticated can SELECT from mv_booking_progress_analytics';
    ELSE
        RAISE NOTICE '❌ Permission missing: authenticated cannot SELECT from mv_booking_progress_analytics';
    END IF;
END $$;
