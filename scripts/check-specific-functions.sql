-- Check for our specific functions
-- This will show exactly which of our 3 functions exist

-- 1. Check for calculate_booking_progress
SELECT 
  'calculate_booking_progress' as function_name,
  CASE 
    WHEN COUNT(*) > 0 THEN 'EXISTS'
    ELSE 'MISSING'
  END as status,
  COUNT(*) as versions,
  array_agg(specific_name) as signatures
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'calculate_booking_progress';

-- 2. Check for update_milestone_progress
SELECT 
  'update_milestone_progress' as function_name,
  CASE 
    WHEN COUNT(*) > 0 THEN 'EXISTS'
    ELSE 'MISSING'
  END as status,
  COUNT(*) as versions,
  array_agg(specific_name) as signatures
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'update_milestone_progress';

-- 3. Check for update_task
SELECT 
  'update_task' as function_name,
  CASE 
    WHEN COUNT(*) > 0 THEN 'EXISTS'
    ELSE 'MISSING'
  END as status,
  COUNT(*) as versions,
  array_agg(specific_name) as signatures
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'update_task';

-- 4. Show all our functions with details
SELECT 
  'DETAILS' as type,
  routine_name as function_name,
  specific_name as signature,
  data_type as return_type,
  'EXISTS' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('calculate_booking_progress', 'update_milestone_progress', 'update_task')
ORDER BY routine_name, specific_name;

-- 5. Summary check
DO $$
DECLARE
  calculate_exists BOOLEAN := FALSE;
  milestone_exists BOOLEAN := FALSE;
  task_exists BOOLEAN := FALSE;
  total_count INTEGER;
BEGIN
  -- Check each function individually
  SELECT EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name = 'calculate_booking_progress'
  ) INTO calculate_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name = 'update_milestone_progress'
  ) INTO milestone_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name = 'update_task'
  ) INTO task_exists;
  
  -- Count total
  SELECT COUNT(*) INTO total_count
  FROM information_schema.routines 
  WHERE routine_schema = 'public' 
  AND routine_name IN ('calculate_booking_progress', 'update_milestone_progress', 'update_task');
  
  RAISE NOTICE '🎯 SPECIFIC FUNCTION CHECK:';
  RAISE NOTICE '   calculate_booking_progress: %', CASE WHEN calculate_exists THEN 'EXISTS' ELSE 'MISSING' END;
  RAISE NOTICE '   update_milestone_progress: %', CASE WHEN milestone_exists THEN 'EXISTS' ELSE 'MISSING' END;
  RAISE NOTICE '   update_task: %', CASE WHEN task_exists THEN 'EXISTS' ELSE 'MISSING' END;
  RAISE NOTICE '   Total found: %/3', total_count;
  
  IF calculate_exists AND milestone_exists AND task_exists THEN
    RAISE NOTICE '🎉 SUCCESS: All 3 functions exist!';
  ELSIF calculate_exists OR milestone_exists OR task_exists THEN
    RAISE NOTICE '⚠️ PARTIAL: Some functions exist, some are missing';
  ELSE
    RAISE NOTICE '❌ MISSING: None of our 3 functions exist';
  END IF;
END $$;
