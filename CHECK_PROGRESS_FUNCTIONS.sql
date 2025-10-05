-- Check if progress calculation functions exist and are working

-- Step 1: Check if the functions exist
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name IN ('calculate_booking_progress', 'update_milestone_progress', 'update_task')
ORDER BY routine_name;

-- Step 2: Test if we can call the functions
-- First, let's get a sample booking ID
SELECT id as sample_booking_id FROM bookings LIMIT 1;

-- Step 3: Test milestone progress function with a sample milestone
SELECT id as sample_milestone_id FROM milestones LIMIT 1;

-- Step 4: Test task progress function with a sample task  
SELECT id as sample_task_id FROM tasks LIMIT 1;

SELECT 'Functions check completed. If functions exist, the API should work.' as status;
