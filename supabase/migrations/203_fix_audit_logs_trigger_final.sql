-- Final fix for audit_logs trigger function
-- Date: January 2025
-- Description: Update create_audit_log function to work with the actual audit_logs table structure

-- Drop the trigger function and all dependent objects
DROP FUNCTION IF EXISTS create_audit_log() CASCADE;

-- Create the updated audit log function that matches your table structure
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
    changed_fields TEXT[];
    field_name TEXT;
    should_log BOOLEAN := FALSE;
BEGIN
    -- Convert OLD and NEW records to JSONB
    IF TG_OP = 'DELETE' THEN
        old_data = to_jsonb(OLD);
        new_data = NULL;
        should_log := TRUE;
    ELSIF TG_OP = 'INSERT' THEN
        old_data = NULL;
        new_data = to_jsonb(NEW);
        should_log := TRUE;
    ELSE -- UPDATE
        old_data = to_jsonb(OLD);
        new_data = to_jsonb(NEW);
        
        -- Only log if specific fields changed
        IF (OLD.status IS DISTINCT FROM NEW.status) OR
           (OLD.title IS DISTINCT FROM NEW.title) OR
           (OLD.due_date IS DISTINCT FROM NEW.due_date) OR
           (OLD.progress_percentage IS DISTINCT FROM NEW.progress_percentage) THEN
            should_log := TRUE;
        END IF;
    END IF;
    
    -- Only proceed if we should log this change
    IF NOT should_log THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- For UPDATE, find changed fields
    IF TG_OP = 'UPDATE' THEN
        changed_fields := ARRAY[]::TEXT[];
        FOR field_name IN SELECT jsonb_object_keys(new_data) LOOP
            IF old_data->field_name IS DISTINCT FROM new_data->field_name THEN
                changed_fields := array_append(changed_fields, field_name);
            END IF;
        END LOOP;
    END IF;
    
    -- Insert audit log entry with all available columns
    INSERT INTO public.audit_logs (
        table_name,
        record_id,
        action,
        old_values,
        new_values,
        changed_fields,
        user_id,
        event_type,
        created_at
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        old_data,
        new_data,
        changed_fields,
        auth.uid(),
        'data_change',
        NOW()
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Recreate the triggers
DROP TRIGGER IF EXISTS trigger_audit_tasks ON public.tasks;
DROP TRIGGER IF EXISTS trigger_audit_milestones ON public.milestones;

-- Create audit triggers for tasks
CREATE TRIGGER trigger_audit_tasks
    AFTER INSERT OR UPDATE OR DELETE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION create_audit_log();

-- Create audit triggers for milestones
CREATE TRIGGER trigger_audit_milestones
    AFTER INSERT OR UPDATE OR DELETE ON public.milestones
    FOR EACH ROW
    EXECUTE FUNCTION create_audit_log();

-- Add comment
COMMENT ON FUNCTION create_audit_log() IS 'Creates audit log entries for tasks and milestones with proper column mapping';
