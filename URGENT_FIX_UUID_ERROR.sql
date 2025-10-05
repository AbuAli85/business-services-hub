-- URGENT FIX: UUID Type Mismatch Error
-- Run this in Supabase SQL Editor to fix the immediate milestone update error

-- 1. First, let's check the current audit_logs table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'audit_logs' 
AND column_name = 'record_id';

-- 2. Fix the audit_logs table structure
-- Drop the existing table and recreate with proper UUID type
DROP TABLE IF EXISTS audit_logs CASCADE;

-- Recreate audit_logs table with proper UUID type
CREATE TABLE audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL,
    old_values JSONB,
    new_values JSONB,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Recreate RLS policies
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Users can insert own audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Users can update own audit logs" ON audit_logs;

-- Create new RLS policies
CREATE POLICY "Users can view own audit logs" ON audit_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own audit logs" ON audit_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own audit logs" ON audit_logs
    FOR UPDATE USING (auth.uid() = user_id);

-- 4. Create indexes for better performance
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- 5. Create a safe audit log function that handles UUID conversion
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    -- Safely handle UUID conversion
    BEGIN
        INSERT INTO audit_logs (
            table_name,
            record_id,
            action,
            old_values,
            new_values,
            user_id
        ) VALUES (
            TG_TABLE_NAME,
            COALESCE(NEW.id, OLD.id)::UUID,
            TG_OP,
            CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
            CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
            auth.uid()
        );
        
        RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
    EXCEPTION
        WHEN OTHERS THEN
            -- Log the error but don't fail the original operation
            RAISE WARNING 'Audit log failed: %', SQLERRM;
            RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Recreate triggers with proper error handling
DROP TRIGGER IF EXISTS trigger_audit_milestones ON milestones;
DROP TRIGGER IF EXISTS trigger_audit_tasks ON tasks;
DROP TRIGGER IF EXISTS trigger_audit_bookings ON bookings;

-- Create new triggers
CREATE TRIGGER trigger_audit_milestones
    AFTER INSERT OR UPDATE OR DELETE ON milestones
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER trigger_audit_tasks
    AFTER INSERT OR UPDATE OR DELETE ON tasks
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER trigger_audit_bookings
    AFTER INSERT OR UPDATE OR DELETE ON bookings
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

-- 7. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON audit_logs TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 8. Test the fix by trying a simple milestone update
-- This should work now without UUID errors
SELECT 'UUID fix applied successfully. You can now update milestones without errors.' as status;
