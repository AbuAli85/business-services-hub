-- Complete Advanced Progress Tracking Migration
-- This script includes ALL missing components

-- 1. Create tasks table (if not exists)
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    milestone_id UUID NOT NULL REFERENCES public.milestones(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    due_date TIMESTAMPTZ,
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2) DEFAULT 0,
    tags TEXT[], -- Array of tags for categorization
    steps JSONB DEFAULT '[]', -- Array of step objects with {title, completed, due_date}
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    assigned_to UUID,
    is_overdue BOOLEAN DEFAULT FALSE,
    overdue_since TIMESTAMPTZ,
    approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    approval_notes TEXT
);

-- 2. Create time_entries table (if not exists)
CREATE TABLE IF NOT EXISTS public.time_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_minutes INTEGER, -- Calculated duration in minutes
    is_active BOOLEAN DEFAULT FALSE, -- For active time tracking
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create task_comments table (if not exists)
CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    comment TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE, -- Internal notes (provider-only)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_milestone_id ON public.tasks(milestone_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_approval_status ON public.tasks(approval_status);
CREATE INDEX IF NOT EXISTS idx_tasks_overdue ON public.tasks(is_overdue) WHERE is_overdue = TRUE;

CREATE INDEX IF NOT EXISTS idx_time_entries_task_id ON public.time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON public.time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_active ON public.time_entries(is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON public.task_comments(user_id);

-- 5. Enable RLS for all tables
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for tasks
DROP POLICY IF EXISTS "Users can view tasks for their bookings" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks for their bookings" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks for their bookings" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete tasks for their bookings" ON public.tasks;

CREATE POLICY "Users can view tasks for their bookings" ON public.tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.milestones m
      JOIN public.bookings b ON b.id = m.booking_id
      WHERE m.id = tasks.milestone_id 
      AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

CREATE POLICY "Users can create tasks for their bookings" ON public.tasks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.milestones m
      JOIN public.bookings b ON b.id = m.booking_id
      WHERE m.id = tasks.milestone_id 
      AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

CREATE POLICY "Users can update tasks for their bookings" ON public.tasks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.milestones m
      JOIN public.bookings b ON b.id = m.booking_id
      WHERE m.id = tasks.milestone_id 
      AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete tasks for their bookings" ON public.tasks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.milestones m
      JOIN public.bookings b ON b.id = m.booking_id
      WHERE m.id = tasks.milestone_id 
      AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

-- 7. Create RLS policies for time entries
DROP POLICY IF EXISTS "Users can view time entries for their tasks" ON public.time_entries;
DROP POLICY IF EXISTS "Users can create time entries for their tasks" ON public.time_entries;
DROP POLICY IF EXISTS "Users can update time entries for their tasks" ON public.time_entries;
DROP POLICY IF EXISTS "Users can delete time entries for their tasks" ON public.time_entries;

CREATE POLICY "Users can view time entries for their tasks" ON public.time_entries
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.milestones m ON m.id = t.milestone_id
      JOIN public.bookings b ON b.id = m.booking_id
      WHERE t.id = time_entries.task_id 
      AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

CREATE POLICY "Users can create time entries for their tasks" ON public.time_entries
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.milestones m ON m.id = t.milestone_id
      JOIN public.bookings b ON b.id = m.booking_id
      WHERE t.id = time_entries.task_id 
      AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

CREATE POLICY "Users can update time entries for their tasks" ON public.time_entries
  FOR UPDATE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.milestones m ON m.id = t.milestone_id
      JOIN public.bookings b ON b.id = m.booking_id
      WHERE t.id = time_entries.task_id 
      AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete time entries for their tasks" ON public.time_entries
  FOR DELETE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.milestones m ON m.id = t.milestone_id
      JOIN public.bookings b ON b.id = m.booking_id
      WHERE t.id = time_entries.task_id 
      AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

-- 8. Create RLS policies for task comments
DROP POLICY IF EXISTS "Users can view comments for their tasks" ON public.task_comments;
DROP POLICY IF EXISTS "Users can create comments for their tasks" ON public.task_comments;
DROP POLICY IF EXISTS "Users can update comments for their tasks" ON public.task_comments;
DROP POLICY IF EXISTS "Users can delete comments for their tasks" ON public.task_comments;

CREATE POLICY "Users can view comments for their tasks" ON public.task_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.milestones m ON m.id = t.milestone_id
      JOIN public.bookings b ON b.id = m.booking_id
      WHERE t.id = task_comments.task_id 
      AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

CREATE POLICY "Users can create comments for their tasks" ON public.task_comments
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.milestones m ON m.id = t.milestone_id
      JOIN public.bookings b ON b.id = m.booking_id
      WHERE t.id = task_comments.task_id 
      AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

CREATE POLICY "Users can update comments for their tasks" ON public.task_comments
  FOR UPDATE USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.milestones m ON m.id = t.milestone_id
      JOIN public.bookings b ON b.id = m.booking_id
      WHERE t.id = task_comments.task_id 
      AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete comments for their tasks" ON public.task_comments
  FOR DELETE USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.milestones m ON m.id = t.milestone_id
      JOIN public.bookings b ON b.id = m.booking_id
      WHERE t.id = task_comments.task_id 
      AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

-- 9. Create functions for progress calculation
CREATE OR REPLACE FUNCTION calculate_milestone_progress(milestone_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    avg_progress INTEGER;
BEGIN
    SELECT COALESCE(AVG(progress_percentage), 0)::INTEGER
    INTO avg_progress
    FROM public.tasks
    WHERE milestone_id = calculate_milestone_progress.milestone_id;
    
    RETURN avg_progress;
END;
$$;

CREATE OR REPLACE FUNCTION calculate_booking_progress(booking_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    weighted_progress DECIMAL;
    total_weight DECIMAL;
BEGIN
    SELECT 
        COALESCE(SUM(progress_percentage * weight), 0) / NULLIF(SUM(weight), 0),
        COALESCE(SUM(weight), 0)
    INTO weighted_progress, total_weight
    FROM public.milestones
    WHERE booking_id = calculate_booking_progress.booking_id;
    
    IF total_weight = 0 THEN
        RETURN 0;
    END IF;
    
    RETURN (weighted_progress)::INTEGER;
END;
$$;

-- 10. Create function to update overdue status
CREATE OR REPLACE FUNCTION update_overdue_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update overdue status for milestones
    UPDATE public.milestones 
    SET 
        is_overdue = TRUE,
        overdue_since = COALESCE(overdue_since, NOW())
    WHERE due_date < NOW() 
    AND status NOT IN ('completed', 'cancelled')
    AND is_overdue = FALSE;
    
    -- Update overdue status for tasks
    UPDATE public.tasks 
    SET 
        is_overdue = TRUE,
        overdue_since = COALESCE(overdue_since, NOW())
    WHERE due_date < NOW() 
    AND status NOT IN ('completed', 'cancelled')
    AND is_overdue = FALSE;
END;
$$;

-- 11. Create function to update milestone progress when tasks change
CREATE OR REPLACE FUNCTION update_milestone_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    milestone_id UUID;
    new_progress INTEGER;
BEGIN
    -- Get milestone_id from the task
    IF TG_OP = 'DELETE' THEN
        milestone_id = OLD.milestone_id;
    ELSE
        milestone_id = NEW.milestone_id;
    END IF;
    
    -- Calculate new progress
    SELECT COALESCE(AVG(progress_percentage), 0)::INTEGER
    INTO new_progress
    FROM public.tasks
    WHERE milestone_id = update_milestone_progress.milestone_id;
    
    -- Update milestone progress
    UPDATE public.milestones
    SET 
        progress_percentage = new_progress,
        updated_at = NOW()
    WHERE id = milestone_id;
    
    -- Update milestone status based on progress
    UPDATE public.milestones
    SET status = CASE
        WHEN new_progress = 100 THEN 'completed'
        WHEN new_progress > 0 THEN 'in_progress'
        ELSE 'pending'
    END
    WHERE id = milestone_id AND status != 'cancelled';
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- 12. Create function to update booking progress when milestones change
CREATE OR REPLACE FUNCTION update_booking_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    booking_id UUID;
    new_progress INTEGER;
BEGIN
    -- Get booking_id from the milestone
    IF TG_OP = 'DELETE' THEN
        booking_id = OLD.booking_id;
    ELSE
        booking_id = NEW.booking_id;
    END IF;
    
    -- Calculate new progress
    SELECT calculate_booking_progress(booking_id)
    INTO new_progress;
    
    -- Update booking progress
    UPDATE public.bookings
    SET 
        progress_percentage = new_progress,
        updated_at = NOW()
    WHERE id = booking_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- 13. Create triggers for automatic progress updates
DROP TRIGGER IF EXISTS trigger_update_milestone_progress ON public.tasks;
CREATE TRIGGER trigger_update_milestone_progress
    AFTER INSERT OR UPDATE OR DELETE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_milestone_progress();

DROP TRIGGER IF EXISTS trigger_update_booking_progress ON public.milestones;
CREATE TRIGGER trigger_update_booking_progress
    AFTER INSERT OR UPDATE OR DELETE ON public.milestones
    FOR EACH ROW
    EXECUTE FUNCTION update_booking_progress();

-- 14. Create view for comprehensive progress data
CREATE OR REPLACE VIEW booking_progress_view AS
SELECT 
    b.id as booking_id,
    COALESCE(b.title, 'Service Booking') as booking_title,
    COALESCE(b.status, 'pending') as booking_status,
    COALESCE(b.progress_percentage, 0) as booking_progress,
    COUNT(DISTINCT m.id) as total_milestones,
    COUNT(DISTINCT CASE WHEN m.status = 'completed' THEN m.id END) as completed_milestones,
    COUNT(DISTINCT t.id) as total_tasks,
    COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks,
    COUNT(DISTINCT CASE WHEN t.is_overdue = TRUE THEN t.id END) as overdue_tasks,
    COALESCE(SUM(t.estimated_hours), 0) as total_estimated_hours,
    COALESCE(SUM(t.actual_hours), 0) as total_actual_hours,
    b.created_at,
    b.updated_at
FROM public.bookings b
LEFT JOIN public.milestones m ON m.booking_id = b.id
LEFT JOIN public.tasks t ON t.milestone_id = m.id
GROUP BY b.id, b.title, b.status, b.progress_percentage, b.created_at, b.updated_at;

-- 15. Grant necessary permissions
GRANT SELECT ON booking_progress_view TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_milestone_progress(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_booking_progress(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_overdue_status() TO authenticated;

-- 16. Add comments to tables for documentation
COMMENT ON TABLE public.tasks IS 'Individual tasks within milestones for detailed progress tracking';
COMMENT ON TABLE public.time_entries IS 'Time tracking entries for tasks with start/stop functionality';
COMMENT ON TABLE public.task_comments IS 'Comments and discussions on tasks (internal and shared)';

-- 17. Verify completion
SELECT 'Migration completed successfully!' as status;
SELECT 'All tables, functions, and views have been created.' as message;
