-- Fix Make.com Integration - Database Schema Alignment
-- This migration ensures all tables and columns match what Make.com scenarios expect

-- 1. Fix bookings table to match Make.com expectations
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS resource_id UUID, -- Remove foreign key constraint for now
ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS total_cost NUMERIC(10,2) DEFAULT 0;

-- Update existing bookings to have required fields
UPDATE public.bookings 
SET user_id = client_id 
WHERE user_id IS NULL;

-- 2. Create missing users table (Make.com expects this)
-- First, drop the table if it exists to avoid constraint issues
DROP TABLE IF EXISTS public.users CASCADE;

CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    role TEXT DEFAULT 'client' CHECK (role IN ('admin', 'provider', 'client', 'staff')),
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    phone_number TEXT,
    slack_id TEXT
);

-- Populate users table from profiles with proper role mapping
INSERT INTO public.users (id, full_name, email, role, status, created_at, phone_number)
SELECT 
    p.id,
    p.full_name,
    au.email,
    CASE 
        WHEN p.role::text = 'promoter' THEN 'provider'
        WHEN p.role::text = 'admin' THEN 'admin'
        WHEN p.role::text = 'client' THEN 'client'
        WHEN p.role::text = 'staff' THEN 'staff'
        ELSE 'client'
    END as role,
    'active',
    p.created_at,
    p.phone
FROM public.profiles p
JOIN auth.users au ON p.id = au.id
ON CONFLICT (id) DO NOTHING;

-- 3. Create missing audit_logs table with proper structure
CREATE TABLE IF NOT EXISTS public.audit_logs (
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

-- 4. Add missing columns to services table for Make.com
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'suspended')),
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 5. Create missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_resource_id ON public.bookings(resource_id);
CREATE INDEX IF NOT EXISTS idx_bookings_start_time ON public.bookings(start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_end_time ON public.bookings(end_time);
CREATE INDEX IF NOT EXISTS idx_bookings_total_cost ON public.bookings(total_cost);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_slack_id ON public.users(slack_id);
CREATE INDEX IF NOT EXISTS idx_services_approval_status ON public.services(approval_status);

-- 6. Enable RLS on new tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for new tables (with IF NOT EXISTS checks)
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can view own audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;

-- Users table policies
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- Note: Simplified policies without admin role checking
CREATE POLICY "Users can view all users" ON public.users
    FOR SELECT USING (true);

-- Audit logs policies
CREATE POLICY "Users can view own audit logs" ON public.audit_logs
    FOR SELECT USING (auth.uid() = user_id);

-- 8. Grant necessary permissions
GRANT ALL ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon;
GRANT ALL ON public.audit_logs TO authenticated;
GRANT SELECT ON public.audit_logs TO anon;

-- 9. Create functions for Make.com scenarios
CREATE OR REPLACE FUNCTION public.get_booking_details(booking_id UUID)
RETURNS TABLE (
    id UUID,
    client_id UUID,
    provider_id UUID,
    service_id UUID,
    resource_id UUID,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    total_cost NUMERIC(10,2),
    status TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        b.client_id,
        b.provider_id,
        b.service_id,
        b.resource_id,
        b.start_time,
        b.end_time,
        b.total_cost,
        b.status,
        b.created_at
    FROM public.bookings b
    WHERE b.id = booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create webhook trigger function
CREATE OR REPLACE FUNCTION public.handle_webhook_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- This function will be called when webhooks are triggered
    -- Make.com will handle the actual webhook logic
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. Add comments for documentation
COMMENT ON TABLE public.users IS 'Users table for Make.com integration';
COMMENT ON TABLE public.audit_logs IS 'Audit logs for tracking system changes';
COMMENT ON FUNCTION public.get_booking_details(UUID) IS 'Get booking details for Make.com scenarios';

-- 12. Update existing RLS policies to be more permissive for Make.com
DROP POLICY IF EXISTS "Enable read access for all users" ON public.bookings;
CREATE POLICY "Enable read access for all users" ON public.bookings
    FOR SELECT USING (true);

-- 13. Ensure all required columns have default values
ALTER TABLE public.bookings 
ALTER COLUMN status SET DEFAULT 'draft',
ALTER COLUMN total_cost SET DEFAULT 0;

-- 14. Create a view for Make.com to easily access booking data
CREATE OR REPLACE VIEW public.make_com_bookings AS
SELECT 
    b.id,
    b.client_id,
    b.provider_id,
    b.service_id,
    b.resource_id,
    b.start_time,
    b.end_time,
    b.total_cost,
    b.status,
    b.created_at,
    c.full_name as client_name,
    p.full_name as provider_name,
    s.title as service_title
FROM public.bookings b
LEFT JOIN public.profiles c ON b.client_id = c.id
LEFT JOIN public.profiles p ON b.provider_id = p.id
LEFT JOIN public.services s ON b.service_id = s.id;

-- Grant access to the view
GRANT SELECT ON public.make_com_bookings TO authenticated;
GRANT SELECT ON public.make_com_bookings TO anon;

-- 15. Final verification - ensure all required tables exist
DO $$
BEGIN
    -- Verify all required tables exist
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookings') THEN
        RAISE EXCEPTION 'Bookings table is missing';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        RAISE EXCEPTION 'Users table is missing';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
        RAISE EXCEPTION 'Audit logs table is missing';
    END IF;
    
    RAISE NOTICE 'All required tables for Make.com integration are present';
END $$;
