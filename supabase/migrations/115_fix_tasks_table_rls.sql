-- Fix RLS policies for tasks table
-- This migration ensures users can create, read, update, and delete tasks

-- First, check if the tasks table exists and has the correct structure
DO $$
BEGIN
    -- Check if tasks table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks' AND table_schema = 'public') THEN
        -- Create tasks table if it doesn't exist
        CREATE TABLE public.tasks (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            milestone_id UUID NOT NULL REFERENCES public.milestones(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
            progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
            priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
            due_date TIMESTAMPTZ,
            completed_at TIMESTAMPTZ,
            is_overdue BOOLEAN DEFAULT FALSE,
            estimated_hours DECIMAL(5,2),
            actual_hours DECIMAL(5,2),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Create indexes
        CREATE INDEX idx_tasks_milestone_id ON public.tasks(milestone_id);
        CREATE INDEX idx_tasks_status ON public.tasks(status);
        CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
        CREATE INDEX idx_tasks_is_overdue ON public.tasks(is_overdue);
        
        -- Add comments
        COMMENT ON TABLE public.tasks IS 'Tasks associated with milestones and bookings';
        COMMENT ON COLUMN public.tasks.milestone_id IS 'Reference to the milestone this task belongs to';
        COMMENT ON COLUMN public.tasks.title IS 'Task title';
        COMMENT ON COLUMN public.tasks.description IS 'Task description';
        COMMENT ON COLUMN public.tasks.status IS 'Current status of the task';
        COMMENT ON COLUMN public.tasks.progress_percentage IS 'Completion percentage (0-100)';
        COMMENT ON COLUMN public.tasks.priority IS 'Task priority level';
        COMMENT ON COLUMN public.tasks.due_date IS 'When the task is due';
        COMMENT ON COLUMN public.tasks.completed_at IS 'When the task was completed';
        COMMENT ON COLUMN public.tasks.is_overdue IS 'Whether the task is overdue';
        COMMENT ON COLUMN public.tasks.estimated_hours IS 'Estimated hours to complete';
        COMMENT ON COLUMN public.tasks.actual_hours IS 'Actual hours spent';
    END IF;
END $$;

-- Enable RLS on tasks table
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view tasks for their bookings" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks for their bookings" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks for their bookings" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete tasks for their bookings" ON public.tasks;

-- Create RLS policies for tasks table

-- Policy 1: Users can view tasks for bookings they are involved in
CREATE POLICY "Users can view tasks for their bookings" ON public.tasks
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.milestones m
            JOIN public.bookings b ON m.booking_id = b.id
            WHERE m.id = tasks.milestone_id
            AND (
                b.client_id = auth.uid() OR 
                b.provider_id = auth.uid()
            )
        )
    );

-- Policy 2: Users can create tasks for bookings they are involved in
CREATE POLICY "Users can create tasks for their bookings" ON public.tasks
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.milestones m
            JOIN public.bookings b ON m.booking_id = b.id
            WHERE m.id = tasks.milestone_id
            AND (
                b.client_id = auth.uid() OR 
                b.provider_id = auth.uid()
            )
        )
    );

-- Policy 3: Users can update tasks for bookings they are involved in
CREATE POLICY "Users can update tasks for their bookings" ON public.tasks
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.milestones m
            JOIN public.bookings b ON m.booking_id = b.id
            WHERE m.id = tasks.milestone_id
            AND (
                b.client_id = auth.uid() OR 
                b.provider_id = auth.uid()
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.milestones m
            JOIN public.bookings b ON m.booking_id = b.id
            WHERE m.id = tasks.milestone_id
            AND (
                b.client_id = auth.uid() OR 
                b.provider_id = auth.uid()
            )
        )
    );

-- Policy 4: Users can delete tasks for bookings they are involved in
CREATE POLICY "Users can delete tasks for their bookings" ON public.tasks
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.milestones m
            JOIN public.bookings b ON m.booking_id = b.id
            WHERE m.id = tasks.milestone_id
            AND (
                b.client_id = auth.uid() OR 
                b.provider_id = auth.uid()
            )
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_tasks_updated_at ON public.tasks;
CREATE TRIGGER trigger_update_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_tasks_updated_at();

-- Create function to check if task is overdue
CREATE OR REPLACE FUNCTION public.check_task_overdue()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if task is overdue
    IF NEW.due_date IS NOT NULL AND NEW.status != 'completed' THEN
        NEW.is_overdue = (NEW.due_date < NOW());
    ELSE
        NEW.is_overdue = FALSE;
    END IF;
    
    -- Set completed_at timestamp when status changes to completed
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completed_at = NOW();
    ELSIF NEW.status != 'completed' THEN
        NEW.completed_at = NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for overdue check
DROP TRIGGER IF EXISTS trigger_check_task_overdue ON public.tasks;
CREATE TRIGGER trigger_check_task_overdue
    BEFORE INSERT OR UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.check_task_overdue();
