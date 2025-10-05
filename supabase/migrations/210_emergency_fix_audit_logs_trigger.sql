-- Emergency fix for audit_logs UUID type mismatch
-- This migration temporarily disables the problematic trigger and fixes the table structure

-- Step 1: Temporarily disable the audit triggers to prevent errors
DROP TRIGGER IF EXISTS trigger_audit_milestones ON public.milestones;
DROP TRIGGER IF EXISTS trigger_audit_tasks ON public.tasks;

-- Step 2: Fix the audit_logs table structure
DO $$
BEGIN
    -- Check if audit_logs table exists and has wrong record_id type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_logs' 
        AND column_name = 'record_id' 
        AND data_type = 'text'
    ) THEN
        -- Create backup table
        CREATE TABLE IF NOT EXISTS public.audit_logs_backup AS 
        SELECT * FROM public.audit_logs;
        
        -- Drop and recreate with correct structure
        DROP TABLE IF EXISTS public.audit_logs CASCADE;
        
        RAISE NOTICE 'Recreated audit_logs table with correct UUID structure';
    END IF;
END $$;

-- Step 3: Create the correct audit_logs table structure
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

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON public.audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- Step 5: Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies
DROP POLICY IF EXISTS "Users can view own audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.audit_logs;

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

-- Step 7: Grant permissions
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT INSERT ON public.audit_logs TO authenticated;
GRANT SELECT ON public.audit_logs TO anon;

-- Step 8: Create the fixed audit trigger function
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    new_record_id UUID;
    old_record_id UUID;
    record_id_to_use UUID;
BEGIN
    -- Handle different trigger operations and convert to UUID safely
    IF TG_OP = 'DELETE' THEN
        BEGIN
            old_record_id := OLD.id::UUID;
            new_record_id := NULL;
            record_id_to_use := old_record_id;
        EXCEPTION WHEN OTHERS THEN
            -- If conversion fails, skip audit log creation
            RAISE WARNING 'Could not convert OLD.id to UUID for audit log: %', OLD.id;
            RETURN OLD;
        END;
    ELSIF TG_OP = 'INSERT' THEN
        BEGIN
            old_record_id := NULL;
            new_record_id := NEW.id::UUID;
            record_id_to_use := new_record_id;
        EXCEPTION WHEN OTHERS THEN
            -- If conversion fails, skip audit log creation
            RAISE WARNING 'Could not convert NEW.id to UUID for audit log: %', NEW.id;
            RETURN NEW;
        END;
    ELSE -- UPDATE
        BEGIN
            old_record_id := OLD.id::UUID;
            new_record_id := NEW.id::UUID;
            record_id_to_use := new_record_id;
        EXCEPTION WHEN OTHERS THEN
            -- If conversion fails, skip audit log creation
            RAISE WARNING 'Could not convert id to UUID for audit log: OLD=% NEW=%', OLD.id, NEW.id;
            RETURN NEW;
        END;
    END IF;

    -- Insert audit log with proper UUID handling
    INSERT INTO public.audit_logs (
        table_name,
        record_id,
        action,
        old_values,
        new_values,
        user_id,
        created_at
    ) VALUES (
        TG_TABLE_NAME,
        record_id_to_use,
        TG_OP,
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' THEN to_jsonb(NEW) ELSE NULL END,
        COALESCE(NEW.user_id, OLD.user_id, auth.uid()),
        NOW()
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Re-enable the audit triggers
CREATE TRIGGER trigger_audit_milestones
    AFTER INSERT OR UPDATE OR DELETE ON public.milestones
    FOR EACH ROW
    EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER trigger_audit_tasks
    AFTER INSERT OR UPDATE OR DELETE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION create_audit_log();

-- Step 10: Add comments
COMMENT ON TABLE public.audit_logs IS 'Audit log for tracking changes to database records';
COMMENT ON FUNCTION create_audit_log() IS 'Creates audit log entries with safe UUID conversion for record_id column';

-- Step 11: Restore data from backup if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs_backup') THEN
        -- Try to restore data, converting text to UUID where possible
        INSERT INTO public.audit_logs (
            id, table_name, record_id, action, old_values, new_values, 
            changed_fields, user_id, ip_address, user_agent, created_at
        )
        SELECT 
            id,
            table_name,
            CASE 
                WHEN record_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' 
                THEN record_id::UUID 
                ELSE gen_random_uuid() 
            END,
            action,
            old_values,
            new_values,
            changed_fields,
            user_id,
            ip_address,
            user_agent,
            created_at
        FROM public.audit_logs_backup
        WHERE record_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
        
        -- Drop the backup table
        DROP TABLE public.audit_logs_backup;
        
        RAISE NOTICE 'Restored valid audit log entries from backup';
    END IF;
END $$;
