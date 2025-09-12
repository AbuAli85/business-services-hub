-- Apply missing tables for advanced progress tracking
-- Run this in Supabase Dashboard > SQL Editor

-- 1. Create tasks table
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

-- 2. Create time tracking table
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

-- 3. Create comments table
CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    comment TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE, -- Internal notes (provider-only)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes
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

-- 5. Enable RLS
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

-- 9. Add comments
COMMENT ON TABLE public.tasks IS 'Individual tasks within milestones for detailed progress tracking';
COMMENT ON TABLE public.time_entries IS 'Time tracking entries for tasks with start/stop functionality';
COMMENT ON TABLE public.task_comments IS 'Comments and discussions on tasks (internal and shared)';

-- 10. Verify tables were created
SELECT 'Tables created successfully!' as status;
