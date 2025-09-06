-- Fix Tasks Table Permissions
-- Run this in your Supabase SQL Editor

-- Step 1: Temporarily disable RLS for testing
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;

-- Step 2: Test that tasks can be accessed (this should work now)
-- You can test by trying to create a task in your app

-- Step 3: Re-enable RLS with proper policies
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop any existing policies
DROP POLICY IF EXISTS "Users can view tasks for their bookings" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks for their bookings" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks for their bookings" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete tasks for their bookings" ON public.tasks;

-- Step 5: Create proper RLS policies

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

-- Step 6: Create helpful functions and triggers

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_tasks_updated_at ON public.tasks;
CREATE TRIGGER trigger_update_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_tasks_updated_at();

-- Function to check if task is overdue
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

-- Trigger for overdue check
DROP TRIGGER IF EXISTS trigger_check_task_overdue ON public.tasks;
CREATE TRIGGER trigger_check_task_overdue
    BEFORE INSERT OR UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.check_task_overdue();

-- Step 7: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_milestone_id ON public.tasks(milestone_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_is_overdue ON public.tasks(is_overdue);

-- Step 8: Add comments for documentation
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

-- Success message
SELECT 'Tasks table permissions fixed successfully! You can now create and manage tasks.' as message;
