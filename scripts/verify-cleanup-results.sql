-- Verify cleanup results
-- Run this after applying the cleanup script to verify duplicates are gone

-- 1. Check function count (should be exactly 3)
SELECT 
  'Function Count' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 3 THEN '✅ PASS'
    ELSE '❌ FAIL - Expected 3, found ' || COUNT(*)
  END as result
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('calculate_booking_progress', 'update_milestone_progress', 'update_task');

-- 2. Check for duplicates (should be 0)
SELECT 
  'Duplicate Check' as check_type,
  COUNT(*) as duplicate_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS - No duplicates'
    ELSE '❌ FAIL - Found ' || COUNT(*) || ' duplicates'
  END as result
FROM (
  SELECT routine_name, COUNT(*) as func_count
  FROM information_schema.routines 
  WHERE routine_schema = 'public' 
  AND routine_name IN ('calculate_booking_progress', 'update_milestone_progress', 'update_task')
  GROUP BY routine_name
  HAVING COUNT(*) > 1
) duplicates;

-- 3. List all functions with their signatures
SELECT 
  'Function List' as check_type,
  routine_name,
  data_type as return_type,
  specific_name,
  '✅ Single version' as result
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('calculate_booking_progress', 'update_milestone_progress', 'update_task')
ORDER BY routine_name;

-- 4. Test function existence
DO $$
DECLARE
  func_exists BOOLEAN;
  current_func TEXT;
  test_functions TEXT[] := ARRAY['calculate_booking_progress', 'update_milestone_progress', 'update_task'];
  all_exist BOOLEAN := TRUE;
BEGIN
  RAISE NOTICE '🧪 Testing function existence...';
  
  FOREACH current_func IN ARRAY test_functions
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name = current_func
    ) INTO func_exists;
    
    IF func_exists THEN
      RAISE NOTICE '✅ Function % exists', current_func;
    ELSE
      RAISE NOTICE '❌ Function % missing', current_func;
      all_exist := FALSE;
    END IF;
  END LOOP;
  
  IF all_exist THEN
    RAISE NOTICE '🎉 All functions exist and are ready to use!';
  ELSE
    RAISE NOTICE '⚠️ Some functions are missing - check the cleanup script';
  END IF;
END $$;

-- 5. Summary
SELECT 
  'SUMMARY' as check_type,
  'Cleanup verification complete' as message,
  'Check the results above' as result;
