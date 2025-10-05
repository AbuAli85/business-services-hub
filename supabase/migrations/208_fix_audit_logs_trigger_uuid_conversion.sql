-- Fix audit_logs trigger to handle UUID conversion properly
-- This migration ensures the trigger function can handle both TEXT and UUID inputs

CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    new_record_id UUID;
    old_record_id UUID;
    record_id_to_use UUID;
BEGIN
    -- Handle different trigger operations and convert to UUID safely
    IF TG_OP = 'DELETE' THEN
        -- Convert OLD.id to UUID safely
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
        -- Convert NEW.id to UUID safely
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
        -- Convert both OLD and NEW to UUID safely
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

-- Add comment
COMMENT ON FUNCTION create_audit_log() IS 'Creates audit log entries with safe UUID conversion for record_id column';

-- Ensure the function is properly secured
REVOKE ALL ON FUNCTION create_audit_log() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_audit_log() TO authenticated;
