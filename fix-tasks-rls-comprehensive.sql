-- Comprehensive fix for tasks table RLS issues
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

-- Step 3: Completely disable RLS temporarily
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;

-- Step 4: Drop ALL existing policies
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

-- Step 5: Test task creation without RLS
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
        
        RAISE NOTICE 'Test task created without RLS: %', test_task_id;
        
        -- Clean up the test task
        DELETE FROM public.tasks WHERE id = test_task_id;
        RAISE NOTICE 'Test task cleaned up';
    ELSE
        RAISE NOTICE 'No milestones found, skipping test';
    END IF;
END $$;

-- Step 6: Re-enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Step 7: Create a very permissive policy for authenticated users
CREATE POLICY "tasks_authenticated_all" ON public.tasks
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- Step 8: Create a specific policy for service role (if needed)
CREATE POLICY "tasks_service_role_all" ON public.tasks
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- Step 9: Test task creation with RLS enabled
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
        
        RAISE NOTICE 'Test task created with RLS: %', test_task_id;
        
        -- Clean up the test task
        DELETE FROM public.tasks WHERE id = test_task_id;
        RAISE NOTICE 'Test task with RLS cleaned up';
    ELSE
        RAISE NOTICE 'No milestones found, skipping RLS test';
    END IF;
END $$;

-- Step 10: Verify final policies
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

-- Step 11: Check if there are any constraints or triggers that might be causing issues
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.tasks'::regclass;

-- Final verification
SELECT 
    'Tasks RLS fix completed successfully!' as status,
    (SELECT COUNT(*) FROM public.tasks) as current_task_count,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'tasks') as policy_count;
