-- Step 2: Create time_entries and task_comments tables
-- Run this second in Supabase Dashboard > SQL Editor

-- Create time_entries table
CREATE TABLE IF NOT EXISTS public.time_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_minutes INTEGER,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create task_comments table
CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    comment TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_time_entries_task_id ON public.time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON public.time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_active ON public.time_entries(is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON public.task_comments(user_id);

-- Enable RLS
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for time_entries (drop existing ones first)
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

-- Create RLS policies for task_comments (drop existing ones first)
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

SELECT 'Time entries and task comments tables created successfully!' as status;
