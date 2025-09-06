-- Final fix for tasks table permissions
-- Run this in Supabase SQL Editor

-- Step 1: Disable RLS temporarily
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop all existing policies
DROP POLICY IF EXISTS "Users can create tasks for their bookings" ON public.tasks;
DROP POLICY IF EXISTS "Users can view tasks for their bookings" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks for their bookings" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete tasks for their bookings" ON public.tasks;
DROP POLICY IF EXISTS "tasks_select_policy" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_policy" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_policy" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_policy" ON public.tasks;
DROP POLICY IF EXISTS "Allow all authenticated users to access tasks" ON public.tasks;

-- Step 3: Re-enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Step 4: Create a single, simple policy that allows all authenticated users
CREATE POLICY "Allow all authenticated users to access tasks" ON public.tasks
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- Step 5: Verify the policy was created
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

-- Step 6: Test task creation (optional - you can run this to test)
-- INSERT INTO public.tasks (booking_id, title, description, status) 
-- VALUES ('00000000-0000-0000-0000-000000000000', 'Test Task', 'Testing permissions', 'pending');
