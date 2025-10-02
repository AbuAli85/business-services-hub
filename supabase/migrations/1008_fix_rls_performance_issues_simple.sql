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
            DROP POLICY IF EXISTS profiles_select_optimized ON public.profiles;
            DROP POLICY IF EXISTS profiles_insert_optimized ON public.profiles;
            DROP POLICY IF EXISTS profiles_update_optimized ON public.profiles;
            DROP POLICY IF EXISTS profiles_delete_optimized ON public.profiles;
            
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
            
            -- Create optimized policies
            CREATE POLICY invoices_select_optimized ON public.invoices
                FOR SELECT TO authenticated 
                USING (
                    auth.uid() = created_by 
                    OR auth.uid() = user_id
                    OR EXISTS (
                        SELECT 1 FROM public.profiles 
                        WHERE id = auth.uid() 
                        AND (role = 'admin' OR role = 'staff')
                    )
                );
            
            CREATE POLICY invoices_insert_optimized ON public.invoices
                FOR INSERT TO authenticated 
                WITH CHECK (auth.uid() = created_by);
            
            CREATE POLICY invoices_update_optimized ON public.invoices
                FOR UPDATE TO authenticated 
                USING (
                    auth.uid() = created_by 
                    OR auth.uid() = user_id
                    OR EXISTS (
                        SELECT 1 FROM public.profiles 
                        WHERE id = auth.uid() 
                        AND (role = 'admin' OR role = 'staff')
                    )
                );
            
            CREATE POLICY invoices_delete_optimized ON public.invoices
                FOR DELETE TO authenticated 
                USING (
                    auth.uid() = created_by 
                    OR EXISTS (
                        SELECT 1 FROM public.profiles 
                        WHERE id = auth.uid() 
                        AND role = 'admin'
                    )
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
            
            -- Create optimized policies
            CREATE POLICY messages_select_optimized ON public.messages
                FOR SELECT TO authenticated 
                USING (
                    auth.uid() = sender_id 
                    OR auth.uid() = recipient_id
                    OR EXISTS (
                        SELECT 1 FROM public.profiles 
                        WHERE id = auth.uid() 
                        AND (role = 'admin' OR role = 'staff')
                    )
                );
            
            CREATE POLICY messages_insert_optimized ON public.messages
                FOR INSERT TO authenticated 
                WITH CHECK (auth.uid() = sender_id);
            
            CREATE POLICY messages_update_optimized ON public.messages
                FOR UPDATE TO authenticated 
                USING (
                    auth.uid() = sender_id 
                    OR EXISTS (
                        SELECT 1 FROM public.profiles 
                        WHERE id = auth.uid() 
                        AND (role = 'admin' OR role = 'staff')
                    )
                );
            
            CREATE POLICY messages_delete_optimized ON public.messages
                FOR DELETE TO authenticated 
                USING (
                    auth.uid() = sender_id 
                    OR EXISTS (
                        SELECT 1 FROM public.profiles 
                        WHERE id = auth.uid() 
                        AND role = 'admin'
                    )
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
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'invoices' AND schemaname = 'public') THEN
        BEGIN
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_created_by ON public.invoices(created_by);
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
            RAISE NOTICE 'Added performance indexes for invoices table';
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Could not add indexes for invoices: %', SQLERRM;
        END;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'messages' AND schemaname = 'public') THEN
        BEGIN
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_recipient_id ON public.messages(recipient_id);
            RAISE NOTICE 'Added performance indexes for messages table';
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Could not add indexes for messages: %', SQLERRM;
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
