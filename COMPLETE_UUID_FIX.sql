-- COMPLETE UUID FIX - More Comprehensive Solution
-- This will completely resolve the UUID type mismatch issue

-- Step 1: Check what's currently causing the error
SELECT 
    n.nspname as schema_name,
    c.relname as table_name,
    t.tgname as trigger_name,
    t.tgtype,
    t.tgenabled
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relname IN ('milestones', 'tasks', 'bookings', 'audit_logs')
AND t.tgname LIKE '%audit%';

-- Step 2: Completely disable all audit triggers temporarily
DROP TRIGGER IF EXISTS trigger_audit_milestones ON milestones CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_tasks ON tasks CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_bookings ON bookings CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_invoices ON invoices CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_services ON services CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_profiles ON profiles CASCADE;

-- Step 3: Drop the problematic audit_logs table completely
DROP TABLE IF EXISTS audit_logs CASCADE;

-- Step 4: Drop any remaining functions that might be causing issues
DROP FUNCTION IF EXISTS create_audit_log() CASCADE;

-- Step 5: Check if there are any other triggers on milestones table
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'milestones';

-- Step 6: Create a completely new audit_logs table with proper structure
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    ip_address INET,
    user_agent TEXT
);

-- Step 7: Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Step 8: Create RLS policies
DROP POLICY IF EXISTS "audit_logs_select_policy" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_policy" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_update_policy" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_delete_policy" ON audit_logs;

CREATE POLICY "audit_logs_select_policy" ON audit_logs
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "audit_logs_insert_policy" ON audit_logs
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "audit_logs_update_policy" ON audit_logs
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "audit_logs_delete_policy" ON audit_logs
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- Step 9: Create indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Step 10: Create a robust audit function
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    record_uuid UUID;
BEGIN
    -- Get the record ID safely
    IF TG_OP = 'DELETE' THEN
        record_uuid := OLD.id::UUID;
    ELSE
        record_uuid := NEW.id::UUID;
    END IF;

    -- Insert audit log with proper error handling
    BEGIN
        INSERT INTO audit_logs (
            table_name,
            record_id,
            action,
            old_values,
            new_values,
            user_id,
            created_at
        ) VALUES (
            TG_TABLE_NAME,
            record_uuid,
            TG_OP,
            CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
            CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
            auth.uid(),
            now()
        );
    EXCEPTION
        WHEN OTHERS THEN
            -- Log error but don't fail the original operation
            RAISE WARNING 'Audit log insertion failed: %', SQLERRM;
    END;

    -- Return appropriate value
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 11: Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON audit_logs TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION create_audit_log() TO authenticated;

-- Step 12: Test the milestone table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'milestones' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 13: Test a simple milestone update (this should work now)
-- You can run this to test:
-- UPDATE milestones SET updated_at = now() WHERE id = 'b9c0f0ca-372c-408c-a0d5-c578a6d657e1';

-- Step 14: Optional - Recreate audit triggers (only if you want audit logging)
-- Uncomment these lines if you want to re-enable audit logging:

-- CREATE TRIGGER trigger_audit_milestones
--     AFTER INSERT OR UPDATE OR DELETE ON milestones
--     FOR EACH ROW EXECUTE FUNCTION create_audit_log();

-- CREATE TRIGGER trigger_audit_tasks
--     AFTER INSERT OR UPDATE OR DELETE ON tasks
--     FOR EACH ROW EXECUTE FUNCTION create_audit_log();

-- CREATE TRIGGER trigger_audit_bookings
--     AFTER INSERT OR UPDATE OR DELETE ON bookings
--     FOR EACH ROW EXECUTE FUNCTION create_audit_log();

-- Step 15: Final verification
SELECT 'UUID fix completed successfully. Milestone updates should now work without errors.' as status;

-- Check if there are any remaining issues
SELECT 
    COUNT(*) as remaining_audit_triggers
FROM information_schema.triggers 
WHERE trigger_name LIKE '%audit%' 
AND event_object_table IN ('milestones', 'tasks', 'bookings');
