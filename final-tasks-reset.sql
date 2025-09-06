-- Final comprehensive reset for tasks table permissions
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

-- Step 3: Completely disable RLS
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;

-- Step 4: Drop ALL policies (including any that might be hidden)
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'tasks'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.tasks';
    END LOOP;
END $$;

-- Step 5: Verify no policies remain
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

-- Step 6: Test task creation without RLS
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
            status
        ) VALUES (
            test_milestone_id,
            'Test Task - No RLS',
            'pending'
        ) RETURNING id INTO test_task_id;
        
        RAISE NOTICE 'Test task created with ID: %', test_task_id;
        
        -- Clean up the test task
        DELETE FROM public.tasks WHERE id = test_task_id;
        RAISE NOTICE 'Test task cleaned up';
    ELSE
        RAISE NOTICE 'No milestones found, skipping test';
    END IF;
END $$;

-- Step 7: Re-enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Step 8: Create a very simple policy
CREATE POLICY "tasks_simple_policy" ON public.tasks
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- Step 9: Verify the new policy
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

-- Step 10: Test task creation with RLS enabled
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
            status
        ) VALUES (
            test_milestone_id,
            'Test Task - With RLS',
            'pending'
        ) RETURNING id INTO test_task_id;
        
        RAISE NOTICE 'Test task with RLS created with ID: %', test_task_id;
        
        -- Clean up the test task
        DELETE FROM public.tasks WHERE id = test_task_id;
        RAISE NOTICE 'Test task with RLS cleaned up';
    ELSE
        RAISE NOTICE 'No milestones found, skipping RLS test';
    END IF;
END $$;

-- Final verification
SELECT 
    'Tasks table permissions reset completed successfully!' as status,
    (SELECT COUNT(*) FROM public.tasks) as current_task_count;
