-- Diagnose Stack Depth Issue
-- This script helps identify what's causing the stack depth limit exceeded error

-- 1. Check current PostgreSQL configuration
SELECT 
    'Configuration' as category,
    name as parameter,
    setting as current_value,
    unit,
    context,
    short_desc as description
FROM pg_settings 
WHERE name IN ('max_stack_depth', 'work_mem', 'effective_cache_size', 'shared_buffers')
ORDER BY name;

-- 2. Check for complex views that might cause deep recursion
SELECT 
    'Complex Views' as category,
    schemaname,
    viewname,
    length(definition) as definition_length,
    CASE 
        WHEN length(definition) > 10000 THEN 'HIGH RISK - Very complex view'
        WHEN length(definition) > 5000 THEN 'MEDIUM RISK - Complex view'
        ELSE 'LOW RISK - Simple view'
    END as risk_level
FROM pg_views 
WHERE schemaname = 'public'
ORDER BY definition_length DESC;

-- 3. Check for recursive functions
SELECT 
    'Recursive Functions' as category,
    routine_name as function_name,
    length(routine_definition) as routine_definition_length,
    CASE 
        WHEN routine_definition ILIKE '%calculate_booking_progress%' AND routine_name != 'calculate_booking_progress' THEN 'CALLS calculate_booking_progress'
        WHEN routine_definition ILIKE '%update_milestone_progress%' AND routine_name != 'update_milestone_progress' THEN 'CALLS update_milestone_progress'
        WHEN routine_definition ILIKE '%WITH RECURSIVE%' THEN 'USES RECURSIVE CTE'
        ELSE 'No obvious recursion'
    END as recursion_risk
FROM information_schema.routines 
WHERE routine_schema = 'public' 
    AND routine_type = 'FUNCTION'
    AND routine_name IN ('calculate_booking_progress', 'update_milestone_progress', 'update_task')
ORDER BY routine_name;

-- 4. Check for complex queries in views (LATERAL joins, subqueries)
SELECT 
    'Complex Queries' as category,
    viewname,
    COUNT(*) as lateral_joins,
    'HIGH RISK - Multiple LATERAL joins' as risk_level
FROM (
    SELECT 
        viewname,
        (regexp_matches(definition, 'LATERAL', 'gi'))[1] as lateral_match
    FROM pg_views 
    WHERE schemaname = 'public'
) subq
GROUP BY viewname
HAVING COUNT(*) > 2
ORDER BY COUNT(*) DESC;

-- 5. Check table sizes that might affect query complexity
SELECT 
    'Table Sizes' as category,
    schemaname,
    relname as tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_tuples,
    n_dead_tup as dead_tuples,
    CASE 
        WHEN n_live_tup > 100000 THEN 'LARGE TABLE - May cause complex queries'
        WHEN n_live_tup > 10000 THEN 'MEDIUM TABLE'
        ELSE 'SMALL TABLE'
    END as size_category
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- 6. Check for potential infinite loops in RLS policies
SELECT 
    'RLS Policies' as category,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    CASE 
        WHEN qual ILIKE '%profiles%' AND tablename != 'profiles' THEN 'POTENTIAL RECURSION - References profiles table'
        WHEN qual ILIKE '%auth.uid()%' AND qual ILIKE '%SELECT%' THEN 'COMPLEX POLICY - Uses subquery with auth.uid()'
        ELSE 'SIMPLE POLICY'
    END as policy_complexity
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY policy_complexity DESC, tablename;

-- 7. Check for long-running queries that might be causing the issue
SELECT 
    'Active Queries' as category,
    pid,
    state,
    query_start,
    now() - query_start as duration,
    LEFT(query, 100) as query_preview,
    CASE 
        WHEN now() - query_start > interval '5 minutes' THEN 'LONG RUNNING - May cause stack issues'
        WHEN now() - query_start > interval '1 minute' THEN 'MEDIUM DURATION'
        ELSE 'SHORT DURATION'
    END as duration_risk
FROM pg_stat_activity 
WHERE state = 'active' 
    AND query NOT LIKE '%pg_stat_activity%'
ORDER BY duration DESC;

-- 8. Summary and recommendations
DO $$
DECLARE
    stack_depth_kb INTEGER;
    complex_views_count INTEGER;
    recursive_functions_count INTEGER;
BEGIN
    -- Get current stack depth
    SELECT setting::INTEGER INTO stack_depth_kb 
    FROM pg_settings 
    WHERE name = 'max_stack_depth';
    
    -- Count complex views
    SELECT COUNT(*) INTO complex_views_count
    FROM pg_views 
    WHERE schemaname = 'public' AND length(definition) > 5000;
    
    -- Count potentially recursive functions
    SELECT COUNT(*) INTO recursive_functions_count
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
        AND routine_type = 'FUNCTION'
        AND (
            routine_definition ILIKE '%calculate_booking_progress%' OR
            routine_definition ILIKE '%update_milestone_progress%' OR
            routine_definition ILIKE '%WITH RECURSIVE%'
        );
    
    RAISE NOTICE '=== STACK DEPTH DIAGNOSIS SUMMARY ===';
    RAISE NOTICE 'Current max_stack_depth: % KB', stack_depth_kb;
    RAISE NOTICE 'Complex views (>5000 chars): %', complex_views_count;
    RAISE NOTICE 'Potentially recursive functions: %', recursive_functions_count;
    RAISE NOTICE '';
    RAISE NOTICE 'RECOMMENDATIONS:';
    
    IF stack_depth_kb < 4096 THEN
        RAISE NOTICE '1. INCREASE max_stack_depth to at least 8MB (8192 KB)';
    END IF;
    
    IF complex_views_count > 0 THEN
        RAISE NOTICE '2. SIMPLIFY complex views to reduce query depth';
    END IF;
    
    IF recursive_functions_count > 0 THEN
        RAISE NOTICE '3. REPLACE recursive functions with iterative versions';
    END IF;
    
    RAISE NOTICE '4. CHECK for infinite loops in RLS policies';
    RAISE NOTICE '5. MONITOR long-running queries';
    RAISE NOTICE '6. CONSIDER breaking down complex queries into smaller parts';
    
END $$;
