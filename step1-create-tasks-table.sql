-- Step 1: Create tasks table
-- Run this first in Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    milestone_id UUID NOT NULL REFERENCES public.milestones(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    due_date TIMESTAMPTZ,
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2) DEFAULT 0,
    tags TEXT[],
    steps JSONB DEFAULT '[]',
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tasks_milestone_id ON public.tasks(milestone_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_approval_status ON public.tasks(approval_status);
CREATE INDEX IF NOT EXISTS idx_tasks_overdue ON public.tasks(is_overdue) WHERE is_overdue = TRUE;

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (drop existing ones first)
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

SELECT 'Tasks table created successfully!' as status;
