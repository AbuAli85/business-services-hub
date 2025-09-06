-- Final comprehensive fix for tasks table RLS issues
-- This script will completely reset and properly configure RLS for the tasks table

-- Step 1: Disable RLS temporarily
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop all existing policies
DROP POLICY IF EXISTS "tasks_allow_everything" ON public.tasks;
DROP POLICY IF EXISTS "Allow all authenticated users to access tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view tasks for their bookings" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks for their bookings" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks for their bookings" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete tasks for their bookings" ON public.tasks;

-- Step 3: Re-enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Step 4: Create a very permissive policy for authenticated users
CREATE POLICY "tasks_authenticated_all" ON public.tasks
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Step 5: Grant necessary permissions
GRANT ALL ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO anon;

-- Step 6: Verify the setup
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

-- Step 7: Test with a simple query
SELECT COUNT(*) as task_count FROM public.tasks;
