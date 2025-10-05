-- Fix audit_logs table record_id column type mismatch
-- This migration fixes the issue where record_id is defined as TEXT in some places but UUID in others

-- First, check if the column exists and what type it is
DO $$
BEGIN
    -- Check if record_id column exists and is TEXT type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_logs' 
        AND column_name = 'record_id' 
        AND data_type = 'text'
    ) THEN
        -- Convert TEXT to UUID
        ALTER TABLE public.audit_logs 
        ALTER COLUMN record_id TYPE UUID USING record_id::UUID;
        
        RAISE NOTICE 'Converted record_id column from TEXT to UUID';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_logs' 
        AND column_name = 'record_id' 
        AND data_type = 'uuid'
    ) THEN
        RAISE NOTICE 'record_id column is already UUID type';
    ELSE
        -- Column doesn't exist, create it as UUID
        ALTER TABLE public.audit_logs 
        ADD COLUMN IF NOT EXISTS record_id UUID;
        
        RAISE NOTICE 'Added record_id column as UUID type';
    END IF;
END $$;

-- Ensure the audit_logs trigger function handles UUID properly
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    new_record_id UUID;
    old_record_id UUID;
BEGIN
    -- Handle different trigger operations
    IF TG_OP = 'DELETE' THEN
        old_record_id := OLD.id;
        new_record_id := NULL;
    ELSIF TG_OP = 'INSERT' THEN
        old_record_id := NULL;
        new_record_id := NEW.id;
    ELSE -- UPDATE
        old_record_id := OLD.id;
        new_record_id := NEW.id;
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
        COALESCE(new_record_id, old_record_id), -- Use the appropriate record_id
        TG_OP,
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' THEN to_jsonb(NEW) ELSE NULL END,
        COALESCE(NEW.user_id, OLD.user_id, auth.uid()),
        NOW()
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION create_audit_log() IS 'Creates audit log entries with proper UUID handling for record_id column';

-- Ensure indexes are properly created
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON public.audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);

-- Grant necessary permissions
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT INSERT ON public.audit_logs TO authenticated;
