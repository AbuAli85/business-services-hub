-- Migration: Fix Client Access Policies
-- Description: Fix RLS policies to allow clients to properly access services, bookings, and messages
-- Date: 2024-12-19

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view active services" ON services;
DROP POLICY IF EXISTS "Users can view own services" ON services;
DROP POLICY IF EXISTS "Providers can manage own services" ON services;
DROP POLICY IF EXISTS "Admins can manage all services" ON services;

DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Clients can create bookings" ON bookings;
DROP POLICY IF EXISTS "Users can update own bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can manage all bookings" ON bookings;

DROP POLICY IF EXISTS "Users can view own messages" ON messages;
DROP POLICY IF EXISTS "Users can manage own messages" ON messages;

-- Create new, more permissive policies for services
CREATE POLICY "Anyone can view active services" ON services
    FOR SELECT USING (status = 'active' OR status = 'draft');

CREATE POLICY "Providers can manage own services" ON services
    FOR ALL USING (auth.uid() = provider_id);

CREATE POLICY "Admins can manage all services" ON services
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create new policies for bookings
CREATE POLICY "Users can view own bookings" ON bookings
    FOR SELECT USING (
        auth.uid() = client_id OR 
        auth.uid() = provider_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Clients can create bookings" ON bookings
    FOR INSERT WITH CHECK (
        auth.uid() = client_id
    );

CREATE POLICY "Users can update own bookings" ON bookings
    FOR UPDATE USING (
        auth.uid() = client_id OR 
        auth.uid() = provider_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can manage all bookings" ON bookings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create new policies for messages
CREATE POLICY "Users can view own messages" ON messages
    FOR SELECT USING (
        auth.uid() = sender_id OR 
        auth.uid() = receiver_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can insert messages" ON messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id
    );

CREATE POLICY "Users can update own messages" ON messages
    FOR UPDATE USING (
        auth.uid() = sender_id OR
        auth.uid() = receiver_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can manage all messages" ON messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create policies for reviews (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reviews') THEN
        -- Drop existing policies first
        EXECUTE 'DROP POLICY IF EXISTS "Anyone can view reviews" ON reviews';
        EXECUTE 'DROP POLICY IF EXISTS "Users can create reviews" ON reviews';
        EXECUTE 'DROP POLICY IF EXISTS "Users can update own reviews" ON reviews';
        
        -- Create new policies
        EXECUTE 'CREATE POLICY "Anyone can view reviews" ON reviews FOR SELECT USING (true)';
        EXECUTE 'CREATE POLICY "Users can create reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = client_id)';
        EXECUTE 'CREATE POLICY "Users can update own reviews" ON reviews FOR UPDATE USING (auth.uid() = client_id)';
        
        RAISE NOTICE 'Reviews policies created successfully';
    ELSE
        RAISE NOTICE 'Reviews table does not exist, skipping policies';
    END IF;
END $$;

-- Create policies for invoices (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
        -- Drop existing policies first
        EXECUTE 'DROP POLICY IF EXISTS "Users can view own invoices" ON invoices';
        EXECUTE 'DROP POLICY IF EXISTS "Users can create invoices" ON invoices';
        
        -- Create new policies
        EXECUTE 'CREATE POLICY "Users can view own invoices" ON invoices FOR SELECT USING (auth.uid() = client_id OR auth.uid() = provider_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = ''admin''))';
        EXECUTE 'CREATE POLICY "Users can create invoices" ON invoices FOR INSERT WITH CHECK (auth.uid() = provider_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = ''admin''))';
        
        RAISE NOTICE 'Invoices policies created successfully';
    ELSE
        RAISE NOTICE 'Invoices table does not exist, skipping policies';
    END IF;
END $$;

-- Create policies for payments (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payments') THEN
        -- Drop existing policies first
        EXECUTE 'DROP POLICY IF EXISTS "Users can view own payments" ON payments';
        EXECUTE 'DROP POLICY IF EXISTS "Users can create payments" ON payments';
        
        -- Create new policies
        EXECUTE 'CREATE POLICY "Users can view own payments" ON payments FOR SELECT USING (auth.uid() = client_id OR auth.uid() = provider_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = ''admin''))';
        EXECUTE 'CREATE POLICY "Users can create payments" ON payments FOR INSERT WITH CHECK (auth.uid() = client_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = ''admin''))';
        
        RAISE NOTICE 'Payments policies created successfully';
    ELSE
        RAISE NOTICE 'Payments table does not exist, skipping policies';
    END IF;
END $$;

-- Create policies for notifications (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
        -- Drop existing policies first
        EXECUTE 'DROP POLICY IF EXISTS "Users can view own notifications" ON notifications';
        EXECUTE 'DROP POLICY IF EXISTS "Users can update own notifications" ON notifications';
        
        -- Create new policies
        EXECUTE 'CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = ''admin''))';
        EXECUTE 'CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = ''admin''))';
        
        RAISE NOTICE 'Notifications policies created successfully';
    ELSE
        RAISE NOTICE 'Notifications table does not exist, skipping policies';
    END IF;
END $$;

-- Create policies for companies
CREATE POLICY "Anyone can view companies" ON companies
    FOR SELECT USING (true);

CREATE POLICY "Users can manage own company" ON companies
    FOR ALL USING (
        auth.uid() = owner_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create policies for favorite_services (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'favorite_services') THEN
        -- Drop existing policies first
        EXECUTE 'DROP POLICY IF EXISTS "Users can view own favorites" ON favorite_services';
        EXECUTE 'DROP POLICY IF EXISTS "Users can manage own favorites" ON favorite_services';
        
        -- Create new policies
        EXECUTE 'CREATE POLICY "Users can view own favorites" ON favorite_services FOR SELECT USING (auth.uid() = client_id)';
        EXECUTE 'CREATE POLICY "Users can manage own favorites" ON favorite_services FOR ALL USING (auth.uid() = client_id)';
        
        RAISE NOTICE 'Favorite services policies created successfully';
    ELSE
        RAISE NOTICE 'Favorite services table does not exist, skipping policies';
    END IF;
END $$;

-- Create policies for favorite_providers (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'favorite_providers') THEN
        -- Drop existing policies first
        EXECUTE 'DROP POLICY IF EXISTS "Users can view own favorites" ON favorite_providers';
        EXECUTE 'DROP POLICY IF EXISTS "Users can manage own favorites" ON favorite_providers';
        
        -- Create new policies
        EXECUTE 'CREATE POLICY "Users can view own favorites" ON favorite_providers FOR SELECT USING (auth.uid() = client_id)';
        EXECUTE 'CREATE POLICY "Users can manage own favorites" ON favorite_providers FOR ALL USING (auth.uid() = client_id)';
        
        RAISE NOTICE 'Favorite providers policies created successfully';
    ELSE
        RAISE NOTICE 'Favorite providers table does not exist, skipping policies';
    END IF;
END $$;

-- Create policies for service_reviews (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'service_reviews') THEN
        -- Drop existing policies first
        EXECUTE 'DROP POLICY IF EXISTS "Anyone can view service reviews" ON service_reviews';
        EXECUTE 'DROP POLICY IF EXISTS "Users can create service reviews" ON service_reviews';
        EXECUTE 'DROP POLICY IF EXISTS "Users can update own service reviews" ON service_reviews';
        
        -- Create new policies
        EXECUTE 'CREATE POLICY "Anyone can view service reviews" ON service_reviews FOR SELECT USING (true)';
        EXECUTE 'CREATE POLICY "Users can create service reviews" ON service_reviews FOR INSERT WITH CHECK (auth.uid() = client_id)';
        EXECUTE 'CREATE POLICY "Users can update own service reviews" ON service_reviews FOR UPDATE USING (auth.uid() = client_id)';
        
        RAISE NOTICE 'Service reviews policies created successfully';
    ELSE
        RAISE NOTICE 'Service reviews table does not exist, skipping policies';
    END IF;
END $$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Verify the policies were created successfully
SELECT 'Migration completed successfully. Created policies for:' as status;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
