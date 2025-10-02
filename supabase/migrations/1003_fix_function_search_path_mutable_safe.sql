-- Fix Function Search Path Mutable warnings - Safe Version
-- This migration fixes functions with mutable search_path configurations
-- Analysis shows: 35 secure (no search_path), 0 explicit, 205 with other config (potentially insecure)

-- Create a function to fix mutable search_path configurations
CREATE OR REPLACE FUNCTION fix_mutable_search_paths()
RETURNS TABLE(
    schema_name text,
    function_name text,
    function_args text,
    old_config text[],
    status text
)
LANGUAGE plpgsql
AS $$
DECLARE
    func_record RECORD;
    fixed_count INTEGER := 0;
    error_count INTEGER := 0;
BEGIN
    -- Find functions with mutable search_path (not explicitly set to 'public')
    FOR func_record IN
        SELECT 
            n.nspname as schema_name,
            p.proname as function_name,
            pg_get_function_identity_arguments(p.oid) as function_args,
            p.proconfig as old_config,
            p.oid as func_oid
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname IN ('public', 'hr')
        AND p.prokind = 'f'  -- Only functions
        AND (
            p.proconfig IS NULL  -- No search_path set
            OR NOT ('search_path=public' = ANY(p.proconfig))  -- Not explicitly set to public
        )
        ORDER BY n.nspname, p.proname
    LOOP
        BEGIN
            -- Set search_path to 'public' for this function
            EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = ''public''', 
                          func_record.schema_name, 
                          func_record.function_name, 
                          func_record.function_args);
            
            fixed_count := fixed_count + 1;
            
            RETURN QUERY SELECT 
                func_record.schema_name::text,
                func_record.function_name::text,
                func_record.function_args::text,
                func_record.old_config,
                'FIXED'::text;
                
        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
            
            RETURN QUERY SELECT 
                func_record.schema_name::text,
                func_record.function_name::text,
                func_record.function_args::text,
                func_record.old_config,
                ('ERROR: ' || SQLERRM)::text;
        END;
    END LOOP;
    
    RAISE NOTICE 'Fixed % functions, % errors encountered', fixed_count, error_count;
END;
$$;

-- Execute the fix function to secure all mutable search_paths
SELECT * FROM fix_mutable_search_paths();

-- Summary statistics after fixing
DO $$
DECLARE
    total_functions INTEGER;
    secure_functions INTEGER;
    insecure_functions INTEGER;
    security_percentage NUMERIC;
BEGIN
    -- Count total functions
    SELECT COUNT(*) INTO total_functions
    FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname IN ('public', 'hr')
    AND p.prokind = 'f';
    
    -- Count secure functions (explicitly set to 'public')
    SELECT COUNT(*) INTO secure_functions
    FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname IN ('public', 'hr')
    AND p.prokind = 'f'
    AND p.proconfig IS NOT NULL 
    AND 'search_path=public' = ANY(p.proconfig);
    
    insecure_functions := total_functions - secure_functions;
    security_percentage := CASE WHEN total_functions > 0 THEN ROUND((secure_functions::numeric / total_functions * 100), 2) ELSE 0 END;
    
    RAISE NOTICE '=== FUNCTION SEARCH PATH SECURITY FIX COMPLETE ===';
    RAISE NOTICE 'Total functions analyzed: %', total_functions;
    RAISE NOTICE 'Functions with secure search_path: %', secure_functions;
    RAISE NOTICE 'Functions still needing attention: %', insecure_functions;
    RAISE NOTICE 'Security improvement: %', security_percentage || '%';
    
    IF insecure_functions = 0 THEN
        RAISE NOTICE '✅ SUCCESS: All functions now have secure search_path configuration!';
        RAISE NOTICE 'Your database is now optimally secured against search_path attacks.';
    ELSE
        RAISE WARNING '⚠️  % functions still need manual review', insecure_functions;
        RAISE NOTICE 'Check the function list above for any remaining issues.';
    END IF;
    
    RAISE NOTICE '=== SECURITY FIX COMPLETE ===';
END $$;

-- Clean up the fix function
DROP FUNCTION fix_mutable_search_paths();

-- Final verification query for reference
SELECT 
    'Function Search Path Security Status' as check_type,
    COUNT(*) as total_functions,
    COUNT(CASE WHEN p.proconfig IS NULL THEN 1 END) as no_search_path,
    COUNT(CASE WHEN p.proconfig IS NOT NULL AND 'search_path=public' = ANY(p.proconfig) THEN 1 END) as secure_search_path,
    COUNT(CASE WHEN p.proconfig IS NOT NULL AND NOT ('search_path=public' = ANY(p.proconfig)) THEN 1 END) as other_config
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname IN ('public', 'hr')
AND p.prokind = 'f';