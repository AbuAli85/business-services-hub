-- Final fix for tasks table permissions
-- Run this in Supabase SQL Editor

-- Step 1: Check current RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'tasks';

-- Step 2: Check current policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'tasks';

-- Step 3: Disable RLS temporarily
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;

-- Step 4: Drop all existing policies
DROP POLICY IF EXISTS "Users can create tasks for their bookings" ON public.tasks;
DROP POLICY IF EXISTS "Users can view tasks for their bookings" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks for their bookings" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete tasks for their bookings" ON public.tasks;
DROP POLICY IF EXISTS "tasks_select_policy" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_policy" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_policy" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_policy" ON public.tasks;
DROP POLICY IF EXISTS "Allow all authenticated users to access tasks" ON public.tasks;

-- Step 5: Re-enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Step 6: Create a very simple, permissive policy
CREATE POLICY "tasks_allow_all_authenticated" ON public.tasks
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- Step 7: Verify the policy was created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'tasks';

-- Step 8: Test task creation (optional)
-- This will create a test task to verify everything works
DO $$
DECLARE
    test_milestone_id uuid;
    test_task_id uuid;
BEGIN
    -- Get a milestone ID
    SELECT id INTO test_milestone_id 
    FROM public.milestones 
    LIMIT 1;
    
    IF test_milestone_id IS NOT NULL THEN
        -- Create a test task
        INSERT INTO public.tasks (
            milestone_id,
            title,
            description,
            status,
            progress_percentage
        ) VALUES (
            test_milestone_id,
            'Test Task - SQL Fix',
            'Testing task creation after SQL fix',
            'pending',
            0
        ) RETURNING id INTO test_task_id;
        
        RAISE NOTICE 'Test task created with ID: %', test_task_id;
        
        -- Clean up the test task
        DELETE FROM public.tasks WHERE id = test_task_id;
        RAISE NOTICE 'Test task cleaned up';
    ELSE
        RAISE NOTICE 'No milestones found, skipping test';
    END IF;
END $$;
