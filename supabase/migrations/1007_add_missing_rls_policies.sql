-- Add Missing RLS Policies
-- This migration adds basic RLS policies for tables that have RLS enabled but no policies

-- Create a function to add standard RLS policies for a table
CREATE OR REPLACE FUNCTION add_standard_rls_policies(table_name text, schema_name text DEFAULT 'public')
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    full_table_name text;
    policy_name text;
BEGIN
    full_table_name := schema_name || '.' || table_name;
    
    -- Policy for authenticated users to select their own records
    policy_name := table_name || '_select_own';
    BEGIN
        EXECUTE format('CREATE POLICY %I ON %I FOR SELECT TO authenticated USING (auth.uid() = created_by OR auth.uid() = user_id OR auth.uid() = owner_id)', 
                      policy_name, full_table_name);
        RAISE NOTICE 'Created SELECT policy for %', table_name;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Could not create SELECT policy for %: %', table_name, SQLERRM;
    END;
    
    -- Policy for authenticated users to insert records
    policy_name := table_name || '_insert_own';
    BEGIN
        EXECUTE format('CREATE POLICY %I ON %I FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by OR auth.uid() = user_id OR auth.uid() = owner_id)', 
                      policy_name, full_table_name);
        RAISE NOTICE 'Created INSERT policy for %', table_name;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Could not create INSERT policy for %: %', table_name, SQLERRM;
    END;
    
    -- Policy for authenticated users to update their own records
    policy_name := table_name || '_update_own';
    BEGIN
        EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE TO authenticated USING (auth.uid() = created_by OR auth.uid() = user_id OR auth.uid() = owner_id)', 
                      policy_name, full_table_name);
        RAISE NOTICE 'Created UPDATE policy for %', table_name;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Could not create UPDATE policy for %: %', table_name, SQLERRM;
    END;
    
    -- Policy for authenticated users to delete their own records
    policy_name := table_name || '_delete_own';
    BEGIN
        EXECUTE format('CREATE POLICY %I ON %I FOR DELETE TO authenticated USING (auth.uid() = created_by OR auth.uid() = user_id OR auth.uid() = owner_id)', 
                      policy_name, full_table_name);
        RAISE NOTICE 'Created DELETE policy for %', table_name;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Could not create DELETE policy for %: %', table_name, SQLERRM;
    END;
END;
$$;

-- Add RLS policies for all tables that need them
DO $$
DECLARE
    table_record RECORD;
    success_count INTEGER := 0;
    total_count INTEGER := 0;
BEGIN
    -- Get all tables with RLS enabled but no policies
    FOR table_record IN
        SELECT 
            schemaname,
            tablename
        FROM pg_tables t
        WHERE schemaname = 'public'
        AND EXISTS (
            SELECT 1 FROM pg_class c
            JOIN pg_namespace n ON c.relnamespace = n.oid
            WHERE c.relname = t.tablename
            AND n.nspname = t.schemaname
            AND c.relrowsecurity = true  -- RLS enabled
            AND NOT EXISTS (
                SELECT 1 FROM pg_policy p
                WHERE p.polrelid = c.oid
            )  -- No policies exist
        )
        ORDER BY tablename
    LOOP
        total_count := total_count + 1;
        
        BEGIN
            PERFORM add_standard_rls_policies(table_record.tablename, table_record.schemaname);
            success_count := success_count + 1;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to add policies for %: %', table_record.tablename, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE '=== RLS POLICIES ADDED ===';
    RAISE NOTICE 'Successfully added policies to % of % tables', success_count, total_count;
    
    IF success_count = total_count THEN
        RAISE NOTICE '🎉 All tables now have RLS policies!';
    ELSE
        RAISE WARNING '⚠️ Some tables may need manual policy review';
    END IF;
END $$;

-- Add specific policies for system tables that need different access patterns
DO $$
BEGIN
    -- System metrics - only service role can access
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'system_metrics' AND schemaname = 'public') THEN
        BEGIN
            DROP POLICY IF EXISTS system_metrics_select_own ON public.system_metrics;
            DROP POLICY IF EXISTS system_metrics_insert_own ON public.system_metrics;
            DROP POLICY IF EXISTS system_metrics_update_own ON public.system_metrics;
            DROP POLICY IF EXISTS system_metrics_delete_own ON public.system_metrics;
            
            CREATE POLICY system_metrics_service_only ON public.system_metrics
                FOR ALL TO service_role USING (true);
            
            RAISE NOTICE 'Created service-only policy for system_metrics';
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Could not create service-only policy for system_metrics: %', SQLERRM;
        END;
    END IF;
    
    -- Security events - only service role can access
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'security_events' AND schemaname = 'public') THEN
        BEGIN
            DROP POLICY IF EXISTS security_events_select_own ON public.security_events;
            DROP POLICY IF EXISTS security_events_insert_own ON public.security_events;
            DROP POLICY IF EXISTS security_events_update_own ON public.security_events;
            DROP POLICY IF EXISTS security_events_delete_own ON public.security_events;
            
            CREATE POLICY security_events_service_only ON public.security_events
                FOR ALL TO service_role USING (true);
            
            RAISE NOTICE 'Created service-only policy for security_events';
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Could not create service-only policy for security_events: %', SQLERRM;
        END;
    END IF;
    
    -- API request logs - only service role can access
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'api_request_logs' AND schemaname = 'public') THEN
        BEGIN
            DROP POLICY IF EXISTS api_request_logs_select_own ON public.api_request_logs;
            DROP POLICY IF EXISTS api_request_logs_insert_own ON public.api_request_logs;
            DROP POLICY IF EXISTS api_request_logs_update_own ON public.api_request_logs;
            DROP POLICY IF EXISTS api_request_logs_delete_own ON public.api_request_logs;
            
            CREATE POLICY api_request_logs_service_only ON public.api_request_logs
                FOR ALL TO service_role USING (true);
            
            RAISE NOTICE 'Created service-only policy for api_request_logs';
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Could not create service-only policy for api_request_logs: %', SQLERRM;
        END;
    END IF;
END $$;

-- Clean up the helper function
DROP FUNCTION add_standard_rls_policies(text, text);

-- Verify RLS policies were added
DO $$
DECLARE
    tables_without_policies INTEGER;
    total_rls_tables INTEGER;
BEGIN
    -- Count tables with RLS enabled but no policies
    SELECT COUNT(*) INTO tables_without_policies
    FROM pg_tables t
    WHERE t.schemaname = 'public'
    AND EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE c.relname = t.tablename
        AND n.nspname = t.schemaname
        AND c.relrowsecurity = true
        AND NOT EXISTS (
            SELECT 1 FROM pg_policy p
            WHERE p.polrelid = c.oid
        )
    );
    
    -- Count total tables with RLS enabled
    SELECT COUNT(*) INTO total_rls_tables
    FROM pg_tables t
    WHERE t.schemaname = 'public'
    AND EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE c.relname = t.tablename
        AND n.nspname = t.schemaname
        AND c.relrowsecurity = true
    );
    
    RAISE NOTICE '=== RLS POLICY VERIFICATION ===';
    RAISE NOTICE 'Total tables with RLS enabled: %', total_rls_tables;
    RAISE NOTICE 'Tables without policies: %', tables_without_policies;
    
    IF tables_without_policies = 0 THEN
        RAISE NOTICE '✅ All RLS-enabled tables now have policies!';
    ELSE
        RAISE WARNING '⚠️ % tables still need RLS policies', tables_without_policies;
    END IF;
END $$;
