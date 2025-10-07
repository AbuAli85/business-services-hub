-- Apply permissions for mv_booking_progress_analytics
-- Based on the query results, this materialized view exists and is populated

-- Grant SELECT permission to authenticated users
GRANT SELECT ON public.mv_booking_progress_analytics TO authenticated;

-- Also grant permissions for the RBAC materialized view if needed
GRANT SELECT ON public.rbac_user_permissions_mv TO authenticated;

-- Verify permissions were applied
SELECT 
  table_name,
  grantee, 
  privilege_type 
FROM information_schema.table_privileges 
WHERE table_name IN ('mv_booking_progress_analytics', 'rbac_user_permissions_mv')
  AND table_schema = 'public'
  AND grantee = 'authenticated'
ORDER BY table_name;

-- Test access to the materialized view
SELECT COUNT(*) as total_records FROM public.mv_booking_progress_analytics LIMIT 1;
