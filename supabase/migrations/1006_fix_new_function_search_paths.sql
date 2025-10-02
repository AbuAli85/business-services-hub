-- Fix Search Path for New Functions
-- This migration sets search_path for the functions created in previous migrations

-- Set search_path for get_mv_columns function
ALTER FUNCTION public.get_mv_columns(text) SET search_path = 'public';

-- Set search_path for check_security_status function
ALTER FUNCTION public.check_security_status() SET search_path = 'public';

-- Set search_path for get_user_permissions_secure function
ALTER FUNCTION public.get_user_permissions_secure() SET search_path = 'public';

-- Verify the fixes
DO $$
DECLARE
    fixed_count INTEGER := 0;
    total_count INTEGER := 3;
BEGIN
    -- Check get_mv_columns
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname = 'get_mv_columns'
        AND n.nspname = 'public'
        AND p.proconfig IS NOT NULL
        AND 'search_path=public' = ANY(p.proconfig)
    ) THEN
        fixed_count := fixed_count + 1;
        RAISE NOTICE '✅ get_mv_columns: search_path set to public';
    ELSE
        RAISE WARNING '⚠️ get_mv_columns: search_path not set';
    END IF;
    
    -- Check check_security_status
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname = 'check_security_status'
        AND n.nspname = 'public'
        AND p.proconfig IS NOT NULL
        AND 'search_path=public' = ANY(p.proconfig)
    ) THEN
        fixed_count := fixed_count + 1;
        RAISE NOTICE '✅ check_security_status: search_path set to public';
    ELSE
        RAISE WARNING '⚠️ check_security_status: search_path not set';
    END IF;
    
    -- Check get_user_permissions_secure
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname = 'get_user_permissions_secure'
        AND n.nspname = 'public'
        AND p.proconfig IS NOT NULL
        AND 'search_path=public' = ANY(p.proconfig)
    ) THEN
        fixed_count := fixed_count + 1;
        RAISE NOTICE '✅ get_user_permissions_secure: search_path set to public';
    ELSE
        RAISE WARNING '⚠️ get_user_permissions_secure: search_path not set';
    END IF;
    
    RAISE NOTICE '=== FUNCTION SEARCH PATH FIX COMPLETE ===';
    RAISE NOTICE 'Fixed % of % new functions', fixed_count, total_count;
    
    IF fixed_count = total_count THEN
        RAISE NOTICE '🎉 All new functions now have secure search_path!';
    ELSE
        RAISE WARNING '⚠️ Some functions may need manual review';
    END IF;
END $$;
