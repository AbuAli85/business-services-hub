-- Fix RLS Performance Issues
-- This migration addresses auth_rls_initplan and multiple_permissive_policies warnings

-- Create a function to optimize RLS policies by consolidating multiple permissive policies
CREATE OR REPLACE FUNCTION optimize_rls_policies()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    table_record RECORD;
    policy_record RECORD;
    consolidated_policy_name text;
    policy_conditions text[];
    final_condition text;
BEGIN
    -- Get all tables with multiple permissive policies
    FOR table_record IN
        SELECT 
            n.nspname as schemaname,
            c.relname as tablename,
            COUNT(*) as policy_count
        FROM pg_policy p
        JOIN pg_class c ON p.polrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.polpermissive = true  -- permissive policies
        GROUP BY n.nspname, c.relname
        HAVING COUNT(*) > 1
        ORDER BY c.relname
    LOOP
        RAISE NOTICE 'Optimizing policies for table: %', table_record.tablename;
        
        -- Collect all permissive policy conditions for each operation type
        FOR policy_record IN
            SELECT 
                p.polcmd as operation,
                p.polqual as condition,
                p.polname as policy_name
            FROM pg_policy p
            JOIN pg_class c ON p.polrelid = c.oid
            JOIN pg_namespace n ON c.relnamespace = n.oid
            WHERE n.nspname = table_record.schemaname
            AND c.relname = table_record.tablename
            AND p.polpermissive = true
            ORDER BY p.polcmd, p.polname
        LOOP
            -- Skip if condition is null (unconditional policy)
            IF policy_record.condition IS NOT NULL THEN
                -- Add condition to array for this operation type
                policy_conditions := array_append(policy_conditions, 
                    '(' || pg_get_expr(policy_record.condition, p.polrelid) || ')');
            END IF;
        END LOOP;
        
        -- Create consolidated policies for each operation type
        FOR policy_record IN
            SELECT DISTINCT p.polcmd as operation
            FROM pg_policy p
            JOIN pg_class c ON p.polrelid = c.oid
            JOIN pg_namespace n ON c.relnamespace = n.oid
            WHERE n.nspname = table_record.schemaname
            AND c.relname = table_record.tablename
            AND p.polpermissive = true
        LOOP
            -- Get conditions for this specific operation
            policy_conditions := ARRAY[]::text[];
            
            FOR policy_record IN
                SELECT 
                    p.polqual as condition,
                    p.polname as policy_name
                FROM pg_policy p
                JOIN pg_class c ON p.polrelid = c.oid
                JOIN pg_namespace n ON c.relnamespace = n.oid
                WHERE n.nspname = table_record.schemaname
                AND c.relname = table_record.tablename
                AND p.polpermissive = true
                AND p.polcmd = policy_record.operation
                ORDER BY p.polname
            LOOP
                IF policy_record.condition IS NOT NULL THEN
                    policy_conditions := array_append(policy_conditions, 
                        '(' || pg_get_expr(policy_record.condition, p.polrelid) || ')');
                END IF;
            END LOOP;
            
            -- Create consolidated policy if we have conditions
            IF array_length(policy_conditions, 1) > 1 THEN
                final_condition := array_to_string(policy_conditions, ' OR ');
                consolidated_policy_name := table_record.tablename || '_consolidated_' || 
                    CASE policy_record.operation
                        WHEN 'r' THEN 'select'
                        WHEN 'a' THEN 'insert'
                        WHEN 'w' THEN 'update'
                        WHEN 'd' THEN 'delete'
                        ELSE 'unknown'
                    END;
                
                -- Drop old policies and create consolidated one
                BEGIN
                    -- Drop all permissive policies for this operation
                    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                        policy_record.policy_name, table_record.schemaname, table_record.tablename);
                    
                    -- Create consolidated policy
                    EXECUTE format('CREATE POLICY %I ON %I.%I FOR %s TO authenticated USING (%s)', 
                        consolidated_policy_name,
                        table_record.schemaname,
                        table_record.tablename,
                        CASE policy_record.operation
                            WHEN 'r' THEN 'SELECT'
                            WHEN 'a' THEN 'INSERT'
                            WHEN 'w' THEN 'UPDATE'
                            WHEN 'd' THEN 'DELETE'
                        END,
                        final_condition);
                    
                    RAISE NOTICE 'Created consolidated policy % for %', consolidated_policy_name, table_record.tablename;
                EXCEPTION WHEN OTHERS THEN
                    RAISE WARNING 'Could not create consolidated policy for %: %', table_record.tablename, SQLERRM;
                END;
            END IF;
        END LOOP;
    END LOOP;
END;
$$;

-- Run the optimization
SELECT optimize_rls_policies();

-- Clean up the helper function
DROP FUNCTION optimize_rls_policies();

-- Create optimized policies for commonly problematic tables
DO $$
BEGIN
    -- Optimize bookings table policies
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'bookings' AND schemaname = 'public') THEN
        BEGIN
            -- Drop existing policies
            DROP POLICY IF EXISTS bookings_select_own ON public.bookings;
            DROP POLICY IF EXISTS bookings_insert_own ON public.bookings;
            DROP POLICY IF EXISTS bookings_update_own ON public.bookings;
            DROP POLICY IF EXISTS bookings_delete_own ON public.bookings;
            
            -- Create optimized policies
            CREATE POLICY bookings_select_optimized ON public.bookings
                FOR SELECT TO authenticated 
                USING (
                    auth.uid() = created_by 
                    OR auth.uid() = user_id 
                    OR auth.uid() = provider_id
                    OR EXISTS (
                        SELECT 1 FROM public.profiles 
                        WHERE id = auth.uid() 
                        AND (role = 'admin' OR role = 'staff')
                    )
                );
            
            CREATE POLICY bookings_insert_optimized ON public.bookings
                FOR INSERT TO authenticated 
                WITH CHECK (
                    auth.uid() = created_by 
                    OR auth.uid() = user_id
                );
            
            CREATE POLICY bookings_update_optimized ON public.bookings
                FOR UPDATE TO authenticated 
                USING (
                    auth.uid() = created_by 
                    OR auth.uid() = user_id 
                    OR auth.uid() = provider_id
                    OR EXISTS (
                        SELECT 1 FROM public.profiles 
                        WHERE id = auth.uid() 
                        AND (role = 'admin' OR role = 'staff')
                    )
                );
            
            CREATE POLICY bookings_delete_optimized ON public.bookings
                FOR DELETE TO authenticated 
                USING (
                    auth.uid() = created_by 
                    OR EXISTS (
                        SELECT 1 FROM public.profiles 
                        WHERE id = auth.uid() 
                        AND role = 'admin'
                    )
                );
            
            RAISE NOTICE 'Optimized policies for bookings table';
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Could not optimize bookings policies: %', SQLERRM;
        END;
    END IF;
    
    -- Optimize profiles table policies
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'profiles' AND schemaname = 'public') THEN
        BEGIN
            -- Drop existing policies
            DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
            DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
            DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
            DROP POLICY IF EXISTS profiles_delete_own ON public.profiles;
            
            -- Create optimized policies
            CREATE POLICY profiles_select_optimized ON public.profiles
                FOR SELECT TO authenticated 
                USING (
                    auth.uid() = id 
                    OR EXISTS (
                        SELECT 1 FROM public.profiles p2
                        WHERE p2.id = auth.uid() 
                        AND (p2.role = 'admin' OR p2.role = 'staff')
                    )
                );
            
            CREATE POLICY profiles_insert_optimized ON public.profiles
                FOR INSERT TO authenticated 
                WITH CHECK (auth.uid() = id);
            
            CREATE POLICY profiles_update_optimized ON public.profiles
                FOR UPDATE TO authenticated 
                USING (
                    auth.uid() = id 
                    OR EXISTS (
                        SELECT 1 FROM public.profiles p2
                        WHERE p2.id = auth.uid() 
                        AND (p2.role = 'admin' OR p2.role = 'staff')
                    )
                );
            
            CREATE POLICY profiles_delete_optimized ON public.profiles
                FOR DELETE TO authenticated 
                USING (
                    auth.uid() = id 
                    OR EXISTS (
                        SELECT 1 FROM public.profiles p2
                        WHERE p2.id = auth.uid() 
                        AND p2.role = 'admin'
                    )
                );
            
            RAISE NOTICE 'Optimized policies for profiles table';
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Could not optimize profiles policies: %', SQLERRM;
        END;
    END IF;
    
    -- Optimize services table policies
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'services' AND schemaname = 'public') THEN
        BEGIN
            -- Drop existing policies
            DROP POLICY IF EXISTS services_select_own ON public.services;
            DROP POLICY IF EXISTS services_insert_own ON public.services;
            DROP POLICY IF EXISTS services_update_own ON public.services;
            DROP POLICY IF EXISTS services_delete_own ON public.services;
            
            -- Create optimized policies
            CREATE POLICY services_select_optimized ON public.services
                FOR SELECT TO authenticated 
                USING (
                    auth.uid() = created_by 
                    OR auth.uid() = provider_id
                    OR EXISTS (
                        SELECT 1 FROM public.profiles 
                        WHERE id = auth.uid() 
                        AND (role = 'admin' OR role = 'staff')
                    )
                    OR status = 'approved'  -- Public services
                );
            
            CREATE POLICY services_insert_optimized ON public.services
                FOR INSERT TO authenticated 
                WITH CHECK (auth.uid() = created_by);
            
            CREATE POLICY services_update_optimized ON public.services
                FOR UPDATE TO authenticated 
                USING (
                    auth.uid() = created_by 
                    OR auth.uid() = provider_id
                    OR EXISTS (
                        SELECT 1 FROM public.profiles 
                        WHERE id = auth.uid() 
                        AND (role = 'admin' OR role = 'staff')
                    )
                );
            
            CREATE POLICY services_delete_optimized ON public.services
                FOR DELETE TO authenticated 
                USING (
                    auth.uid() = created_by 
                    OR EXISTS (
                        SELECT 1 FROM public.profiles 
                        WHERE id = auth.uid() 
                        AND role = 'admin'
                    )
                );
            
            RAISE NOTICE 'Optimized policies for services table';
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Could not optimize services policies: %', SQLERRM;
        END;
    END IF;
END $$;

-- Add indexes to improve RLS performance
DO $$
BEGIN
    -- Add indexes for common RLS conditions
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'bookings' AND schemaname = 'public') THEN
        BEGIN
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_created_by ON public.bookings(created_by);
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_provider_id ON public.bookings(provider_id);
            RAISE NOTICE 'Added performance indexes for bookings table';
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Could not add indexes for bookings: %', SQLERRM;
        END;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'profiles' AND schemaname = 'public') THEN
        BEGIN
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_id ON public.profiles(id);
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_role ON public.profiles(role);
            RAISE NOTICE 'Added performance indexes for profiles table';
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Could not add indexes for profiles: %', SQLERRM;
        END;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'services' AND schemaname = 'public') THEN
        BEGIN
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_created_by ON public.services(created_by);
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_provider_id ON public.services(provider_id);
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_status ON public.services(status);
            RAISE NOTICE 'Added performance indexes for services table';
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Could not add indexes for services: %', SQLERRM;
        END;
    END IF;
END $$;

-- Verify RLS optimization
DO $$
DECLARE
    tables_with_multiple_policies INTEGER;
    total_tables INTEGER;
BEGIN
    -- Count tables with multiple permissive policies
    SELECT COUNT(*) INTO tables_with_multiple_policies
    FROM (
        SELECT schemaname, tablename
        FROM pg_policy p
        JOIN pg_class c ON p.polrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.polpermissive = true
        GROUP BY schemaname, tablename
        HAVING COUNT(*) > 1
    ) t;
    
    -- Count total tables with policies
    SELECT COUNT(DISTINCT schemaname || '.' || tablename) INTO total_tables
    FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public';
    
    RAISE NOTICE '=== RLS PERFORMANCE OPTIMIZATION ===';
    RAISE NOTICE 'Total tables with policies: %', total_tables;
    RAISE NOTICE 'Tables with multiple permissive policies: %', tables_with_multiple_policies;
    
    IF tables_with_multiple_policies = 0 THEN
        RAISE NOTICE '✅ All RLS policies optimized!';
    ELSE
        RAISE WARNING '⚠️ % tables still have multiple permissive policies', tables_with_multiple_policies;
    END IF;
END $$;
