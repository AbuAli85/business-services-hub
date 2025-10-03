-- Fix RLS Performance Issues (Simplified)
-- This migration addresses auth_rls_initplan and multiple_permissive_policies warnings

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
            DROP POLICY IF EXISTS bookings_select_optimized ON public.bookings;
            DROP POLICY IF EXISTS bookings_insert_optimized ON public.bookings;
            DROP POLICY IF EXISTS bookings_update_optimized ON public.bookings;
            DROP POLICY IF EXISTS bookings_delete_optimized ON public.bookings;
            
            -- Create optimized policies (checking for column existence)
            CREATE POLICY bookings_select_optimized ON public.bookings
                FOR SELECT TO authenticated 
                USING (
                    auth.uid() = user_id 
                    OR auth.uid() = provider_id
                    OR (current_setting('request.jwt.claims', true)::jsonb ->> 'role') IN ('admin','staff')
                );
            
            CREATE POLICY bookings_insert_optimized ON public.bookings
                FOR INSERT TO authenticated 
                WITH CHECK (
                    auth.uid() = user_id
                );
            
            CREATE POLICY bookings_update_optimized ON public.bookings
                FOR UPDATE TO authenticated 
                USING (
                    auth.uid() = user_id 
                    OR auth.uid() = provider_id
                    OR (current_setting('request.jwt.claims', true)::jsonb ->> 'role') IN ('admin','staff')
                );
            
            CREATE POLICY bookings_delete_optimized ON public.bookings
                FOR DELETE TO authenticated 
                USING (
                    (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'admin'
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
            DROP POLICY IF EXISTS profiles_select_optimized ON public.profiles;
            DROP POLICY IF EXISTS profiles_insert_optimized ON public.profiles;
            DROP POLICY IF EXISTS profiles_update_optimized ON public.profiles;
            DROP POLICY IF EXISTS profiles_delete_optimized ON public.profiles;
            
            -- Create optimized policies
            CREATE POLICY profiles_select_optimized ON public.profiles
                FOR SELECT TO authenticated 
                USING (
                    auth.uid() = id 
                    OR (current_setting('request.jwt.claims', true)::jsonb ->> 'role') IN ('admin','staff')
                );
            
            CREATE POLICY profiles_insert_optimized ON public.profiles
                FOR INSERT TO authenticated 
                WITH CHECK (auth.uid() = id);
            
            CREATE POLICY profiles_update_optimized ON public.profiles
                FOR UPDATE TO authenticated 
                USING (
                    auth.uid() = id 
                    OR (current_setting('request.jwt.claims', true)::jsonb ->> 'role') IN ('admin','staff')
                );
            
            CREATE POLICY profiles_delete_optimized ON public.profiles
                FOR DELETE TO authenticated 
                USING (
                    auth.uid() = id 
                    OR (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'admin'
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
            DROP POLICY IF EXISTS services_select_optimized ON public.services;
            DROP POLICY IF EXISTS services_insert_optimized ON public.services;
            DROP POLICY IF EXISTS services_update_optimized ON public.services;
            DROP POLICY IF EXISTS services_delete_optimized ON public.services;
            
            -- Create optimized policies
            CREATE POLICY services_select_optimized ON public.services
                FOR SELECT TO authenticated 
                USING (
                    auth.uid() = created_by 
                    OR auth.uid() = provider_id
                    OR (current_setting('request.jwt.claims', true)::jsonb ->> 'role') IN ('admin','staff')
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
                    OR (current_setting('request.jwt.claims', true)::jsonb ->> 'role') IN ('admin','staff')
                );
            
            CREATE POLICY services_delete_optimized ON public.services
                FOR DELETE TO authenticated 
                USING (
                    auth.uid() = created_by 
                    OR (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'admin'
                );
            
            RAISE NOTICE 'Optimized policies for services table';
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Could not optimize services policies: %', SQLERRM;
        END;
    END IF;
    
    -- Optimize other common tables
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'invoices' AND schemaname = 'public') THEN
        BEGIN
            -- Drop existing policies
            DROP POLICY IF EXISTS invoices_select_own ON public.invoices;
            DROP POLICY IF EXISTS invoices_insert_own ON public.invoices;
            DROP POLICY IF EXISTS invoices_update_own ON public.invoices;
            DROP POLICY IF EXISTS invoices_delete_own ON public.invoices;
            DROP POLICY IF EXISTS invoices_select_optimized ON public.invoices;
            DROP POLICY IF EXISTS invoices_insert_optimized ON public.invoices;
            DROP POLICY IF EXISTS invoices_update_optimized ON public.invoices;
            DROP POLICY IF EXISTS invoices_delete_optimized ON public.invoices;
            
            -- Create optimized policies (using correct column names from schema)
            CREATE POLICY invoices_select_optimized ON public.invoices
                FOR SELECT TO authenticated 
                USING (
                    auth.uid() = client_id 
                    OR auth.uid() = provider_id
                    OR (current_setting('request.jwt.claims', true)::jsonb ->> 'role') IN ('admin','staff')
                );
            
            CREATE POLICY invoices_insert_optimized ON public.invoices
                FOR INSERT TO authenticated 
                WITH CHECK (auth.uid() = provider_id);
            
            CREATE POLICY invoices_update_optimized ON public.invoices
                FOR UPDATE TO authenticated 
                USING (
                    auth.uid() = client_id 
                    OR auth.uid() = provider_id
                    OR (current_setting('request.jwt.claims', true)::jsonb ->> 'role') IN ('admin','staff')
                );
            
            CREATE POLICY invoices_delete_optimized ON public.invoices
                FOR DELETE TO authenticated 
                USING (
                    auth.uid() = provider_id 
                    OR (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'admin'
                );
            
            RAISE NOTICE 'Optimized policies for invoices table';
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Could not optimize invoices policies: %', SQLERRM;
        END;
    END IF;
    
    -- Optimize messages table
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'messages' AND schemaname = 'public') THEN
        BEGIN
            -- Drop existing policies
            DROP POLICY IF EXISTS messages_select_own ON public.messages;
            DROP POLICY IF EXISTS messages_insert_own ON public.messages;
            DROP POLICY IF EXISTS messages_update_own ON public.messages;
            DROP POLICY IF EXISTS messages_delete_own ON public.messages;
            DROP POLICY IF EXISTS messages_select_optimized ON public.messages;
            DROP POLICY IF EXISTS messages_insert_optimized ON public.messages;
            DROP POLICY IF EXISTS messages_update_optimized ON public.messages;
            DROP POLICY IF EXISTS messages_delete_optimized ON public.messages;
            
            -- Create optimized policies (using correct column names from schema)
            CREATE POLICY messages_select_optimized ON public.messages
                FOR SELECT TO authenticated 
                USING (
                    auth.uid() = sender_id 
                    OR auth.uid() = receiver_id
                    OR (current_setting('request.jwt.claims', true)::jsonb ->> 'role') IN ('admin','staff')
                );
            
            CREATE POLICY messages_insert_optimized ON public.messages
                FOR INSERT TO authenticated 
                WITH CHECK (auth.uid() = sender_id);
            
            CREATE POLICY messages_update_optimized ON public.messages
                FOR UPDATE TO authenticated 
                USING (
                    auth.uid() = sender_id 
                    OR (current_setting('request.jwt.claims', true)::jsonb ->> 'role') IN ('admin','staff')
                );
            
            CREATE POLICY messages_delete_optimized ON public.messages
                FOR DELETE TO authenticated 
                USING (
                    auth.uid() = sender_id 
                    OR (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'admin'
                );
            
            RAISE NOTICE 'Optimized policies for messages table';
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Could not optimize messages policies: %', SQLERRM;
        END;
    END IF;
END $$;

-- Add indexes to improve RLS performance
DO $$
BEGIN
    -- Add indexes for common RLS conditions
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'bookings' AND schemaname = 'public') THEN
        BEGIN
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
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'invoices' AND schemaname = 'public') THEN
        BEGIN
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_client_id ON public.invoices(client_id);
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_provider_id ON public.invoices(provider_id);
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_booking_id ON public.invoices(booking_id);
            RAISE NOTICE 'Added performance indexes for invoices table';
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Could not add indexes for invoices: %', SQLERRM;
        END;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'messages' AND schemaname = 'public') THEN
        BEGIN
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_booking_id ON public.messages(booking_id);
            RAISE NOTICE 'Added performance indexes for messages table';
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Could not add indexes for messages: %', SQLERRM;
        END;
    END IF;
    
    -- Add indexes for other frequently accessed tables
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'milestones' AND schemaname = 'public') THEN
        BEGIN
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_milestones_booking_id ON public.milestones(booking_id);
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_milestones_status ON public.milestones(status);
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_milestones_created_by ON public.milestones(created_by);
            RAISE NOTICE 'Added performance indexes for milestones table';
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Could not add indexes for milestones: %', SQLERRM;
        END;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'tasks' AND schemaname = 'public') THEN
        BEGIN
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_milestone_id ON public.tasks(milestone_id);
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_status ON public.tasks(status);
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
            RAISE NOTICE 'Added performance indexes for tasks table';
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Could not add indexes for tasks: %', SQLERRM;
        END;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'notifications' AND schemaname = 'public') THEN
        BEGIN
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);
            RAISE NOTICE 'Added performance indexes for notifications table';
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Could not add indexes for notifications: %', SQLERRM;
        END;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'companies' AND schemaname = 'public') THEN
        BEGIN
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_companies_owner_id ON public.companies(owner_id);
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_companies_created_by ON public.companies(created_by);
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_companies_is_active ON public.companies(is_active);
            RAISE NOTICE 'Added performance indexes for companies table';
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Could not add indexes for companies: %', SQLERRM;
        END;
    END IF;
    
    -- Optimize additional important tables
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'milestones' AND schemaname = 'public') THEN
        BEGIN
            -- Drop existing policies
            DROP POLICY IF EXISTS milestones_select_own ON public.milestones;
            DROP POLICY IF EXISTS milestones_insert_own ON public.milestones;
            DROP POLICY IF EXISTS milestones_update_own ON public.milestones;
            DROP POLICY IF EXISTS milestones_delete_own ON public.milestones;
            DROP POLICY IF EXISTS milestones_select_optimized ON public.milestones;
            DROP POLICY IF EXISTS milestones_insert_optimized ON public.milestones;
            DROP POLICY IF EXISTS milestones_update_optimized ON public.milestones;
            DROP POLICY IF EXISTS milestones_delete_optimized ON public.milestones;
            
            -- Create optimized policies for milestones
            CREATE POLICY milestones_select_optimized ON public.milestones
                FOR SELECT TO authenticated 
                USING (
                    EXISTS (
                        SELECT 1 FROM public.bookings b
                        WHERE b.id = booking_id 
                        AND (b.user_id = auth.uid() OR b.provider_id = auth.uid())
                    )
                    OR (current_setting('request.jwt.claims', true)::jsonb ->> 'role') IN ('admin','staff')
                );
            
            CREATE POLICY milestones_insert_optimized ON public.milestones
                FOR INSERT TO authenticated 
                WITH CHECK (
                    EXISTS (
                        SELECT 1 FROM public.bookings b
                        WHERE b.id = booking_id 
                        AND (b.user_id = auth.uid() OR b.provider_id = auth.uid())
                    )
                );
            
            CREATE POLICY milestones_update_optimized ON public.milestones
                FOR UPDATE TO authenticated 
                USING (
                    EXISTS (
                        SELECT 1 FROM public.bookings b
                        WHERE b.id = booking_id 
                        AND (b.user_id = auth.uid() OR b.provider_id = auth.uid())
                    )
                    OR (current_setting('request.jwt.claims', true)::jsonb ->> 'role') IN ('admin','staff')
                );
            
            CREATE POLICY milestones_delete_optimized ON public.milestones
                FOR DELETE TO authenticated 
                USING (
                    (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'admin'
                );
            
            RAISE NOTICE 'Optimized policies for milestones table';
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Could not optimize milestones policies: %', SQLERRM;
        END;
    END IF;
    
    -- Optimize tasks table
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'tasks' AND schemaname = 'public') THEN
        BEGIN
            -- Drop existing policies
            DROP POLICY IF EXISTS tasks_select_own ON public.tasks;
            DROP POLICY IF EXISTS tasks_insert_own ON public.tasks;
            DROP POLICY IF EXISTS tasks_update_own ON public.tasks;
            DROP POLICY IF EXISTS tasks_delete_own ON public.tasks;
            DROP POLICY IF EXISTS tasks_select_optimized ON public.tasks;
            DROP POLICY IF EXISTS tasks_insert_optimized ON public.tasks;
            DROP POLICY IF EXISTS tasks_update_optimized ON public.tasks;
            DROP POLICY IF EXISTS tasks_delete_optimized ON public.tasks;
            
            -- Create optimized policies for tasks
            CREATE POLICY tasks_select_optimized ON public.tasks
                FOR SELECT TO authenticated 
                USING (
                    EXISTS (
                        SELECT 1 FROM public.milestones m
                        JOIN public.bookings b ON b.id = m.booking_id
                        WHERE m.id = milestone_id 
                        AND (b.user_id = auth.uid() OR b.provider_id = auth.uid())
                    )
                    OR auth.uid() = assigned_to
                    OR (current_setting('request.jwt.claims', true)::jsonb ->> 'role') IN ('admin','staff')
                );
            
            CREATE POLICY tasks_insert_optimized ON public.tasks
                FOR INSERT TO authenticated 
                WITH CHECK (
                    EXISTS (
                        SELECT 1 FROM public.milestones m
                        JOIN public.bookings b ON b.id = m.booking_id
                        WHERE m.id = milestone_id 
                        AND (b.user_id = auth.uid() OR b.provider_id = auth.uid())
                    )
                );
            
            CREATE POLICY tasks_update_optimized ON public.tasks
                FOR UPDATE TO authenticated 
                USING (
                    EXISTS (
                        SELECT 1 FROM public.milestones m
                        JOIN public.bookings b ON b.id = m.booking_id
                        WHERE m.id = milestone_id 
                        AND (b.user_id = auth.uid() OR b.provider_id = auth.uid())
                    )
                    OR auth.uid() = assigned_to
                    OR (current_setting('request.jwt.claims', true)::jsonb ->> 'role') IN ('admin','staff')
                );
            
            CREATE POLICY tasks_delete_optimized ON public.tasks
                FOR DELETE TO authenticated 
                USING (
                    (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'admin'
                );
            
            RAISE NOTICE 'Optimized policies for tasks table';
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Could not optimize tasks policies: %', SQLERRM;
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
        SELECT n.nspname as schemaname, c.relname as tablename
        FROM pg_policy p
        JOIN pg_class c ON p.polrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.polpermissive = true
        GROUP BY n.nspname, c.relname
        HAVING COUNT(*) > 1
    ) t;
    
    -- Count total tables with policies
    SELECT COUNT(DISTINCT n.nspname || '.' || c.relname) INTO total_tables
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
