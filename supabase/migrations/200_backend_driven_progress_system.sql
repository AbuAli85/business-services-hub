-- Backend-Driven Progress System
-- Date: January 2025
-- Description: Create SQL views, audit logs, and transition validation for backend-driven progress tracking

-- 1. Create SQL Views for Progress Tracking

-- View for milestone progress with calculated fields
CREATE OR REPLACE VIEW v_milestone_progress AS
SELECT 
    m.id,
    m.booking_id,
    m.title,
    m.description,
    m.status,
    m.priority,
    m.due_date,
    m.weight,
    m.created_at,
    m.updated_at,
    m.created_by,
    m.is_overdue,
    m.overdue_since,
    m.completed_at,
    
    -- Calculated progress from tasks
    COALESCE(
        CASE 
            WHEN COUNT(t.id) = 0 THEN 0
            ELSE ROUND(AVG(t.progress_percentage))
        END, 0
    ) as progress_percentage,
    
    -- Task counts
    COUNT(t.id) as total_tasks,
    COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
    COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_tasks,
    COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pending_tasks,
    COUNT(CASE WHEN t.is_overdue = TRUE THEN 1 END) as overdue_tasks,
    
    -- Time tracking
    COALESCE(SUM(t.estimated_hours), 0) as total_estimated_hours,
    COALESCE(SUM(t.actual_hours), 0) as total_actual_hours,
    
    -- Status calculation
    CASE 
        WHEN COUNT(t.id) = 0 THEN 'pending'
        WHEN COUNT(CASE WHEN t.status = 'completed' THEN 1 END) = COUNT(t.id) THEN 'completed'
        WHEN COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) > 0 THEN 'in_progress'
        ELSE 'pending'
    END as calculated_status

FROM public.milestones m
LEFT JOIN public.tasks t ON t.milestone_id = m.id
GROUP BY m.id, m.booking_id, m.title, m.description, m.status, m.priority, 
         m.due_date, m.weight, m.created_at, m.updated_at, m.created_by, 
         m.is_overdue, m.overdue_since, m.completed_at;

-- View for booking progress with calculated fields
CREATE OR REPLACE VIEW v_booking_progress AS
SELECT 
    b.id as booking_id,
    COALESCE(b.title, 'Service Booking') as booking_title,
    b.status as booking_status,
    b.client_id,
    b.provider_id,
    b.created_at,
    b.updated_at,
    
    -- Milestone counts
    COUNT(DISTINCT m.id) as total_milestones,
    COUNT(DISTINCT CASE WHEN m.status = 'completed' THEN m.id END) as completed_milestones,
    COUNT(DISTINCT CASE WHEN m.status = 'in_progress' THEN m.id END) as in_progress_milestones,
    COUNT(DISTINCT CASE WHEN m.status = 'pending' THEN m.id END) as pending_milestones,
    
    -- Task counts
    COUNT(DISTINCT t.id) as total_tasks,
    COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks,
    COUNT(DISTINCT CASE WHEN t.status = 'in_progress' THEN t.id END) as in_progress_tasks,
    COUNT(DISTINCT CASE WHEN t.status = 'pending' THEN t.id END) as pending_tasks,
    COUNT(DISTINCT CASE WHEN t.is_overdue = TRUE THEN t.id END) as overdue_tasks,
    
    -- Time tracking
    COALESCE(SUM(t.estimated_hours), 0) as total_estimated_hours,
    COALESCE(SUM(t.actual_hours), 0) as total_actual_hours,
    
    -- Weighted progress calculation
    COALESCE(
        CASE 
            WHEN SUM(m.weight) = 0 THEN 0
            ELSE ROUND(SUM(m.progress_percentage * m.weight) / SUM(m.weight))
        END, 0
    ) as booking_progress

FROM public.bookings b
LEFT JOIN public.milestones m ON m.booking_id = b.id
LEFT JOIN public.tasks t ON t.milestone_id = m.id
GROUP BY b.id, b.title, b.status, b.client_id, b.provider_id, b.created_at, b.updated_at;

-- View for task status with overdue calculation
CREATE OR REPLACE VIEW v_tasks_status AS
SELECT 
    t.id,
    t.milestone_id,
    t.title,
    t.description,
    t.status,
    t.priority,
    t.due_date,
    t.progress_percentage,
    t.estimated_hours,
    t.actual_hours,
    t.assigned_to,
    t.created_by,
    t.created_at,
    t.updated_at,
    t.completed_at,
    t.approval_status,
    t.approved_by,
    t.approved_at,
    t.approval_notes,
    
    -- Overdue calculation
    CASE 
        WHEN t.due_date IS NULL THEN FALSE
        WHEN t.status IN ('completed', 'cancelled') THEN FALSE
        WHEN t.due_date < NOW() THEN TRUE
        ELSE FALSE
    END as is_overdue,
    
    -- Overdue since calculation
    CASE 
        WHEN t.due_date IS NULL THEN NULL
        WHEN t.status IN ('completed', 'cancelled') THEN NULL
        WHEN t.due_date < NOW() THEN t.due_date
        ELSE NULL
    END as overdue_since,
    
    -- Time remaining calculation
    CASE 
        WHEN t.due_date IS NULL THEN NULL
        WHEN t.status IN ('completed', 'cancelled') THEN NULL
        ELSE EXTRACT(EPOCH FROM (t.due_date - NOW())) / 3600 -- hours
    END as hours_until_due

FROM public.tasks t;

-- 2. Create Audit Logs Table

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON public.audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);

-- Enable RLS for audit logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policy for audit logs (users can only see their own audit logs)
CREATE POLICY "Users can view their own audit logs" ON public.audit_logs
    FOR SELECT USING (user_id = auth.uid());

-- 3. Create Audit Trigger Functions
-- (Functions are defined in the triggers section to ensure proper order)

-- 4. Create Transition Validation Function
-- (can_transition function is now defined in the triggers section above)

-- 5. Create Transition Enforcement Trigger Functions
-- (Functions are defined in the triggers section to ensure proper order)

-- 6. Create RPC Function for Milestone Progress Recalculation
-- (recalc_milestone_progress function is now defined in the triggers section above)

-- 7. Create Triggers

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_audit_tasks ON public.tasks;
DROP TRIGGER IF EXISTS trigger_audit_milestones ON public.milestones;
DROP TRIGGER IF EXISTS trigger_enforce_task_transition ON public.tasks;
DROP TRIGGER IF EXISTS trigger_enforce_milestone_transition ON public.milestones;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS create_audit_log();
DROP FUNCTION IF EXISTS enforce_task_transition();
DROP FUNCTION IF EXISTS enforce_milestone_transition();
DROP FUNCTION IF EXISTS can_transition(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS recalc_milestone_progress(UUID);

-- Recreate the functions to ensure they exist before creating triggers
-- First, recreate the can_transition function since other functions depend on it
CREATE OR REPLACE FUNCTION can_transition(
    current_status TEXT,
    new_status TEXT,
    entity_type TEXT DEFAULT 'task'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    -- Define allowed transitions for tasks
    IF entity_type = 'task' THEN
        RETURN CASE
            -- From pending
            WHEN current_status = 'pending' AND new_status IN ('in_progress', 'cancelled') THEN TRUE
            -- From in_progress
            WHEN current_status = 'in_progress' AND new_status IN ('completed', 'cancelled', 'on_hold') THEN TRUE
            -- From completed
            WHEN current_status = 'completed' AND new_status IN ('in_progress', 'cancelled') THEN TRUE
            -- From cancelled
            WHEN current_status = 'cancelled' AND new_status IN ('pending', 'in_progress') THEN TRUE
            -- From on_hold
            WHEN current_status = 'on_hold' AND new_status IN ('in_progress', 'cancelled') THEN TRUE
            -- Same status
            WHEN current_status = new_status THEN TRUE
            -- Default: not allowed
            ELSE FALSE
        END;
    END IF;
    
    -- Define allowed transitions for milestones (same as tasks for now)
    IF entity_type = 'milestone' THEN
        RETURN CASE
            -- From pending
            WHEN current_status = 'pending' AND new_status IN ('in_progress', 'cancelled') THEN TRUE
            -- From in_progress
            WHEN current_status = 'in_progress' AND new_status IN ('completed', 'cancelled', 'on_hold') THEN TRUE
            -- From completed
            WHEN current_status = 'completed' AND new_status IN ('in_progress', 'cancelled') THEN TRUE
            -- From cancelled
            WHEN current_status = 'cancelled' AND new_status IN ('pending', 'in_progress') THEN TRUE
            -- From on_hold
            WHEN current_status = 'on_hold' AND new_status IN ('in_progress', 'cancelled') THEN TRUE
            -- Same status
            WHEN current_status = new_status THEN TRUE
            -- Default: not allowed
            ELSE FALSE
        END;
    END IF;
    
    RETURN FALSE;
END;
$$;

-- Function to create audit log entries
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
    
    -- Insert audit log entry
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
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Function for task transition validation
CREATE OR REPLACE FUNCTION enforce_task_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only check transitions for status changes
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        -- Validate the transition
        IF NOT can_transition(OLD.status, NEW.status, 'task') THEN
            RAISE EXCEPTION 'Invalid status transition from % to % for task', OLD.status, NEW.status;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Function for milestone transition validation
CREATE OR REPLACE FUNCTION enforce_milestone_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only check transitions for status changes
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        -- Validate the transition
        IF NOT can_transition(OLD.status, NEW.status, 'milestone') THEN
            RAISE EXCEPTION 'Invalid status transition from % to % for milestone', OLD.status, NEW.status;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Function for milestone progress recalculation
CREATE OR REPLACE FUNCTION recalc_milestone_progress(p_milestone_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    milestone_record RECORD;
    new_progress INTEGER;
    new_status TEXT;
    result JSONB;
BEGIN
    -- Get milestone details
    SELECT * INTO milestone_record
    FROM public.milestones
    WHERE id = p_milestone_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Milestone with id % not found', p_milestone_id;
    END IF;
    
    -- Calculate new progress from tasks
    SELECT COALESCE(AVG(progress_percentage), 0)::INTEGER
    INTO new_progress
    FROM public.tasks
    WHERE milestone_id = p_milestone_id;
    
    -- Determine new status based on progress and task statuses
    SELECT CASE 
        WHEN COUNT(t.id) = 0 THEN 'pending'
        WHEN COUNT(CASE WHEN t.status = 'completed' THEN 1 END) = COUNT(t.id) THEN 'completed'
        WHEN COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) > 0 THEN 'in_progress'
        WHEN COUNT(CASE WHEN t.status = 'cancelled' THEN 1 END) = COUNT(t.id) THEN 'cancelled'
        ELSE 'pending'
    END
    INTO new_status
    FROM public.tasks t
    WHERE t.milestone_id = p_milestone_id;
    
    -- Update milestone with new progress and status
    UPDATE public.milestones
    SET 
        progress_percentage = new_progress,
        status = new_status,
        updated_at = NOW(),
        completed_at = CASE 
            WHEN new_status = 'completed' AND completed_at IS NULL THEN NOW()
            WHEN new_status != 'completed' THEN NULL
            ELSE completed_at
        END
    WHERE id = p_milestone_id;
    
    -- Return result
    result := jsonb_build_object(
        'milestone_id', p_milestone_id,
        'old_progress', milestone_record.progress_percentage,
        'new_progress', new_progress,
        'old_status', milestone_record.status,
        'new_status', new_status,
        'updated_at', NOW()
    );
    
    RETURN result;
END;
$$;

-- Create audit triggers for tasks (only for specific fields)
CREATE TRIGGER trigger_audit_tasks
    AFTER INSERT OR UPDATE OR DELETE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION create_audit_log();

-- Create audit triggers for milestones (only for specific fields)
CREATE TRIGGER trigger_audit_milestones
    AFTER INSERT OR UPDATE OR DELETE ON public.milestones
    FOR EACH ROW
    EXECUTE FUNCTION create_audit_log();

-- Create transition enforcement triggers
CREATE TRIGGER trigger_enforce_task_transition
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION enforce_task_transition();

CREATE TRIGGER trigger_enforce_milestone_transition
    BEFORE UPDATE ON public.milestones
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION enforce_milestone_transition();

-- 8. Grant Permissions

-- Grant permissions on views
GRANT SELECT ON v_milestone_progress TO authenticated;
GRANT SELECT ON v_booking_progress TO authenticated;
GRANT SELECT ON v_tasks_status TO authenticated;

-- Grant permissions on audit logs
GRANT SELECT ON public.audit_logs TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION can_transition(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION recalc_milestone_progress(UUID) TO authenticated;

-- 9. Add Comments for Documentation

COMMENT ON VIEW v_milestone_progress IS 'Milestone progress view with calculated fields from tasks';
COMMENT ON VIEW v_booking_progress IS 'Booking progress view with calculated fields from milestones and tasks';
COMMENT ON VIEW v_tasks_status IS 'Task status view with overdue calculations';
COMMENT ON TABLE public.audit_logs IS 'Audit log for tracking changes to tasks and milestones';
COMMENT ON FUNCTION can_transition(TEXT, TEXT, TEXT) IS 'Validates if a status transition is allowed';
COMMENT ON FUNCTION recalc_milestone_progress(UUID) IS 'Recalculates and updates milestone progress from tasks';
