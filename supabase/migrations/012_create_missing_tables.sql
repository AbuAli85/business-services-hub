-- Create missing tables and columns for automation scenarios
-- This migration ensures all required tables and columns exist for the Make.com workflows

-- Create or update users table
DO $$
BEGIN
    -- Check if users table exists
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        -- Create users table if it doesn't exist
        CREATE TABLE public.users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            slack_id TEXT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone_number TEXT,
            role TEXT DEFAULT 'client',
            status TEXT DEFAULT 'active',
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        );
    ELSE
        -- Add missing columns if table exists
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'slack_id') THEN
            ALTER TABLE public.users ADD COLUMN slack_id TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'phone_number') THEN
            ALTER TABLE public.users ADD COLUMN phone_number TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role') THEN
            ALTER TABLE public.users ADD COLUMN role TEXT DEFAULT 'client';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'status') THEN
            ALTER TABLE public.users ADD COLUMN status TEXT DEFAULT 'active';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'updated_at') THEN
            ALTER TABLE public.users ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
        END IF;
    END IF;
END $$;

-- Create or update booking_resources table
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'booking_resources') THEN
        CREATE TABLE public.booking_resources (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            description TEXT,
            capacity INTEGER DEFAULT 1,
            location TEXT,
            amenities JSONB,
            hourly_rate NUMERIC(10,2) DEFAULT 0,
            availability_hours JSONB,
            status TEXT DEFAULT 'active',
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        );
    END IF;
END $$;

-- Create or update audit_logs table
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
        CREATE TABLE public.audit_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES public.profiles(id),
            action TEXT NOT NULL,
            table_name TEXT NOT NULL,
            record_id TEXT NOT NULL,
            old_values JSONB,
            new_values JSONB,
            ip_address INET,
            user_agent TEXT,
            created_at TIMESTAMPTZ DEFAULT now()
        );
    END IF;
END $$;

-- Create or update bookings table
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookings') THEN
        CREATE TABLE public.bookings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES public.profiles(id),
            client_id UUID REFERENCES public.profiles(id),
            resource_id UUID REFERENCES public.booking_resources(id),
            service_id UUID REFERENCES public.services(id),
            start_time TIMESTAMPTZ NOT NULL,
            end_time TIMESTAMPTZ NOT NULL,
            total_cost NUMERIC(10,2) NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        );
    END IF;
END $$;

-- Add indexes for better performance (only if they don't exist)
DO $$
BEGIN
    -- Users table indexes
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_users_email') THEN
            CREATE INDEX idx_users_email ON public.users(email);
        END IF;
        
        IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_users_slack_id') THEN
            -- Only create index if slack_id column exists
            IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'slack_id') THEN
                CREATE INDEX idx_users_slack_id ON public.users(slack_id);
            END IF;
        END IF;
    END IF;
    
    -- Bookings table indexes
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookings') THEN
        IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_bookings_user_id') THEN
            -- Only create index if user_id column exists
            IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'user_id') THEN
                CREATE INDEX idx_bookings_user_id ON public.bookings(user_id);
            END IF;
        END IF;
        
        IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_bookings_client_id') THEN
            CREATE INDEX idx_bookings_client_id ON public.bookings(client_id);
        END IF;
        
        IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_bookings_resource_id') THEN
            -- Only create index if resource_id column exists
            IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'resource_id') THEN
                CREATE INDEX idx_bookings_resource_id ON public.bookings(resource_id);
            END IF;
        END IF;
        
        IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_bookings_service_id') THEN
            CREATE INDEX idx_bookings_service_id ON public.bookings(service_id);
        END IF;
    END IF;
    
    -- Audit logs table indexes
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
        IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_audit_logs_table_record') THEN
            CREATE INDEX idx_audit_logs_table_record ON public.audit_logs(table_name, record_id);
        END IF;
    END IF;
END $$;

-- Grant necessary permissions
GRANT ALL ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon;
GRANT ALL ON public.booking_resources TO authenticated;
GRANT SELECT ON public.booking_resources TO anon;
GRANT ALL ON public.audit_logs TO authenticated;
GRANT SELECT ON public.audit_logs TO anon;
GRANT ALL ON public.bookings TO authenticated;
GRANT SELECT ON public.bookings TO anon;

-- Enable RLS on new tables (only if not already enabled)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'booking_resources') THEN
        ALTER TABLE public.booking_resources ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
        ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookings') THEN
        ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Create RLS policies (only if they don't exist)
DO $$
BEGIN
    -- Users table policies
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'users' AND policyname = 'Enable read access for all users') THEN
            CREATE POLICY "Enable read access for all users" ON public.users
                FOR SELECT USING (true);
        END IF;
        
        IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'users' AND policyname = 'Enable insert for authenticated users') THEN
            CREATE POLICY "Enable insert for authenticated users" ON public.users
                FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
        END IF;
        
        IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'users' AND policyname = 'Enable update for users based on id') THEN
            CREATE POLICY "Enable update for users based on id" ON public.users
                FOR UPDATE USING (auth.uid() = id);
        END IF;
    END IF;
    
    -- Booking resources table policies
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'booking_resources') THEN
        IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'booking_resources' AND policyname = 'Enable read access for all users') THEN
            CREATE POLICY "Enable read access for all users" ON public.booking_resources
                FOR SELECT USING (true);
        END IF;
        
        IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'booking_resources' AND policyname = 'Enable insert for authenticated users') THEN
            CREATE POLICY "Enable insert for authenticated users" ON public.booking_resources
                FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
        END IF;
    END IF;
    
    -- Audit logs table policies
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
        IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'Enable read access for authenticated users') THEN
            CREATE POLICY "Enable read access for authenticated users" ON public.audit_logs
                FOR SELECT USING (auth.uid() IS NOT NULL);
        END IF;
        
        IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'Enable insert for authenticated users') THEN
            CREATE POLICY "Enable insert for authenticated users" ON public.audit_logs
                FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
        END IF;
    END IF;
    
    -- Bookings table policies
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookings') THEN
        IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'Enable read access for all users') THEN
            CREATE POLICY "Enable read access for all users" ON public.bookings
                FOR SELECT USING (true);
        END IF;
        
        IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'Enable insert for authenticated users') THEN
            CREATE POLICY "Enable insert for authenticated users" ON public.bookings
                FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
        END IF;
        
        -- Only create user_id based policies if the column exists
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'user_id') THEN
            IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'Enable update for users based on user_id') THEN
                CREATE POLICY "Enable update for users based on user_id" ON public.bookings
                    FOR UPDATE USING (auth.uid() = user_id);
            END IF;
            
            IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'Enable delete for users based on user_id') THEN
                CREATE POLICY "Enable delete for users based on user_id" ON public.bookings
                    FOR DELETE USING (auth.uid() = user_id);
            END IF;
        END IF;
    END IF;
END $$;
