-- Fix audit_logs trigger function to handle missing changed_fields column
-- Date: January 2025
-- Description: Update create_audit_log function to work with or without changed_fields column

-- First, let's add the changed_fields column if it doesn't exist
DO $$ 
BEGIN
    -- Check if changed_fields column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'audit_logs' 
        AND column_name = 'changed_fields'
        AND table_schema = 'public'
    ) THEN
        -- Add the missing column
        ALTER TABLE public.audit_logs 
        ADD COLUMN changed_fields TEXT[];
        
        RAISE NOTICE 'Added changed_fields column to audit_logs table';
    END IF;
END $$;

-- Update the create_audit_log function to be more robust
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
    has_changed_fields BOOLEAN := FALSE;
BEGIN
    -- Check if changed_fields column exists
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'audit_logs' 
        AND column_name = 'changed_fields'
        AND table_schema = 'public'
    ) INTO has_changed_fields;
    
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
    
    -- For UPDATE, find changed fields (only if column exists)
    IF TG_OP = 'UPDATE' AND has_changed_fields THEN
        changed_fields := ARRAY[]::TEXT[];
        FOR field_name IN SELECT jsonb_object_keys(new_data) LOOP
            IF old_data->field_name IS DISTINCT FROM new_data->field_name THEN
                changed_fields := array_append(changed_fields, field_name);
            END IF;
        END LOOP;
    END IF;
    
    -- Insert audit log entry (with or without changed_fields)
    IF has_changed_fields THEN
        INSERT INTO public.audit_logs (
            table_name,
            record_id,
            action,
            old_values,
            new_values,
            changed_fields,
            user_id
        ) VALUES (
            TG_TABLE_NAME,
            COALESCE(NEW.id, OLD.id),
            TG_OP,
            old_data,
            new_data,
            changed_fields,
            auth.uid()
        );
    ELSE
        INSERT INTO public.audit_logs (
            table_name,
            record_id,
            action,
            old_values,
            new_values,
            user_id
        ) VALUES (
            TG_TABLE_NAME,
            COALESCE(NEW.id, OLD.id),
            TG_OP,
            old_data,
            new_data,
            auth.uid()
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add comment
COMMENT ON FUNCTION create_audit_log() IS 'Creates audit log entries for tasks and milestones, handles missing changed_fields column gracefully';
