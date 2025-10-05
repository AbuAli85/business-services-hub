-- Fix audit_logs table structure inconsistencies
-- This migration ensures the audit_logs table has a consistent structure across all environments

-- First, let's standardize the audit_logs table structure
DO $$
BEGIN
    -- Drop the existing table if it has wrong structure
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_logs' 
        AND column_name = 'record_id' 
        AND data_type = 'text'
    ) THEN
        -- Backup existing data if any
        CREATE TEMP TABLE audit_logs_backup AS 
        SELECT * FROM public.audit_logs;
        
        -- Drop the table
        DROP TABLE IF EXISTS public.audit_logs CASCADE;
        
        RAISE NOTICE 'Dropped audit_logs table with TEXT record_id column';
    END IF;
END $$;

-- Create the standardized audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    user_id UUID REFERENCES auth.users(id),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON public.audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- Enable RLS for audit logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.audit_logs;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.audit_logs;

-- Create RLS policies
CREATE POLICY "Users can view own audit logs" ON public.audit_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Enable insert for authenticated users" ON public.audit_logs
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Grant permissions
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT INSERT ON public.audit_logs TO authenticated;
GRANT SELECT ON public.audit_logs TO anon;

-- Add table comment
COMMENT ON TABLE public.audit_logs IS 'Audit log for tracking changes to database records';
COMMENT ON COLUMN public.audit_logs.table_name IS 'Name of the table that was modified';
COMMENT ON COLUMN public.audit_logs.record_id IS 'ID of the record that was modified (UUID)';
COMMENT ON COLUMN public.audit_logs.action IS 'Type of action performed (INSERT, UPDATE, DELETE)';
COMMENT ON COLUMN public.audit_logs.old_values IS 'Previous values before the change (JSONB)';
COMMENT ON COLUMN public.audit_logs.new_values IS 'New values after the change (JSONB)';
COMMENT ON COLUMN public.audit_logs.changed_fields IS 'Array of field names that were changed';
COMMENT ON COLUMN public.audit_logs.user_id IS 'ID of the user who made the change';
COMMENT ON COLUMN public.audit_logs.ip_address IS 'IP address of the user who made the change';
COMMENT ON COLUMN public.audit_logs.user_agent IS 'User agent string of the client';
COMMENT ON COLUMN public.audit_logs.created_at IS 'Timestamp when the change was made';
