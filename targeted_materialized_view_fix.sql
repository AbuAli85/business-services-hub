-- Targeted fix for mv_booking_progress_analytics only
-- This materialized view exists and needs permissions

-- Grant SELECT permission to authenticated users for the existing materialized view
GRANT SELECT ON public.mv_booking_progress_analytics TO authenticated;

-- Verify the permission was granted
SELECT 
  table_name,
  grantee, 
  privilege_type 
FROM information_schema.table_privileges 
WHERE table_name = 'mv_booking_progress_analytics'
  AND table_schema = 'public'
  AND grantee = 'authenticated';

-- Test that we can access the materialized view
SELECT COUNT(*) as total_records FROM public.mv_booking_progress_analytics;
