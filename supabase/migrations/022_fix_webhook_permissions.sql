-- Fix webhook permissions for Make.com integration
-- This migration ensures that webhook handlers can operate on tables

-- Grant service role permissions to bypass RLS for webhook operations
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Ensure service_role can create new tables and sequences
GRANT CREATE ON SCHEMA public TO service_role;

-- Temporarily disable RLS on critical tables for webhook operations
ALTER TABLE public.bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.services DISABLE ROW LEVEL SECURITY;

-- Add comment
COMMENT ON SCHEMA public IS 'Public schema with webhook-friendly access for service role';
