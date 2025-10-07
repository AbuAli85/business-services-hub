-- Simple fix for mv_booking_progress_analytics permissions
-- This addresses the specific "permission denied for materialized view" error

-- Check if the materialized view exists and grant permissions
DO $$
DECLARE
    view_exists BOOLEAN;
BEGIN
    -- Check if mv_booking_progress_analytics exists
    SELECT EXISTS(
        SELECT 1 FROM pg_matviews 
        WHERE matviewname = 'mv_booking_progress_analytics' 
        AND schemaname = 'public'
    ) INTO view_exists;
    
    IF view_exists THEN
        -- Grant SELECT permission to authenticated users
        GRANT SELECT ON public.mv_booking_progress_analytics TO authenticated;
        RAISE NOTICE '✅ Successfully granted SELECT permission on mv_booking_progress_analytics to authenticated users';
        
        -- Verify the permission was granted
        IF EXISTS(
            SELECT 1 FROM information_schema.table_privileges 
            WHERE table_name = 'mv_booking_progress_analytics' 
              AND table_schema = 'public'
              AND grantee = 'authenticated'
              AND privilege_type = 'SELECT'
        ) THEN
            RAISE NOTICE '✅ Permission verified: authenticated users can now access mv_booking_progress_analytics';
        ELSE
            RAISE NOTICE '❌ Permission verification failed';
        END IF;
    ELSE
        RAISE NOTICE '❌ mv_booking_progress_analytics materialized view does not exist';
        
        -- List all existing materialized views for reference
        RAISE NOTICE 'Existing materialized views:';
        FOR view_name IN 
            SELECT matviewname FROM pg_matviews WHERE schemaname = 'public' ORDER BY matviewname
        LOOP
            RAISE NOTICE '  - %', view_name;
        END LOOP;
    END IF;
END $$;
