-- Simple verification script for function cleanup
-- This will show clear results about the cleanup

-- 1. Count functions (should be exactly 3)
SELECT 
  'Function Count' as metric,
  COUNT(*) as value,
  CASE 
    WHEN COUNT(*) = 3 THEN '✅ CORRECT'
    ELSE '❌ WRONG - Expected 3, found ' || COUNT(*)
  END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('calculate_booking_progress', 'update_milestone_progress', 'update_task');

-- 2. Check for duplicates (should be 0)
SELECT 
  'Duplicate Functions' as metric,
  COUNT(*) as value,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ NONE FOUND'
    ELSE '❌ FOUND ' || COUNT(*) || ' DUPLICATES'
  END as status
FROM (
  SELECT routine_name
  FROM information_schema.routines 
  WHERE routine_schema = 'public' 
  AND routine_name IN ('calculate_booking_progress', 'update_milestone_progress', 'update_task')
  GROUP BY routine_name
  HAVING COUNT(*) > 1
) duplicates;

-- 3. List each function with count
SELECT 
  routine_name as function_name,
  COUNT(*) as versions,
  CASE 
    WHEN COUNT(*) = 1 THEN '✅ SINGLE VERSION'
    ELSE '❌ ' || COUNT(*) || ' VERSIONS'
  END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('calculate_booking_progress', 'update_milestone_progress', 'update_task')
GROUP BY routine_name
ORDER BY routine_name;

-- 4. Test function existence
DO $$
DECLARE
  func_count INTEGER;
  duplicate_count INTEGER;
  all_good BOOLEAN := TRUE;
BEGIN
  -- Count total functions
  SELECT COUNT(*) INTO func_count
  FROM information_schema.routines 
  WHERE routine_schema = 'public' 
  AND routine_name IN ('calculate_booking_progress', 'update_milestone_progress', 'update_task');
  
  -- Count duplicates
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT routine_name
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name IN ('calculate_booking_progress', 'update_milestone_progress', 'update_task')
    GROUP BY routine_name
    HAVING COUNT(*) > 1
  ) duplicates;
  
  RAISE NOTICE '📊 VERIFICATION RESULTS:';
  RAISE NOTICE '   Total functions: %', func_count;
  RAISE NOTICE '   Duplicates found: %', duplicate_count;
  
  IF func_count = 3 AND duplicate_count = 0 THEN
    RAISE NOTICE '🎉 SUCCESS: All functions cleaned up correctly!';
    RAISE NOTICE '   ✅ 3 functions exist';
    RAISE NOTICE '   ✅ No duplicates found';
    RAISE NOTICE '   ✅ Ready to use!';
  ELSE
    RAISE NOTICE '⚠️ ISSUES FOUND:';
    IF func_count != 3 THEN
      RAISE NOTICE '   ❌ Expected 3 functions, found %', func_count;
      all_good := FALSE;
    END IF;
    IF duplicate_count > 0 THEN
      RAISE NOTICE '   ❌ Found % duplicate functions', duplicate_count;
      all_good := FALSE;
    END IF;
    
    IF NOT all_good THEN
      RAISE NOTICE '💡 SOLUTION: Run the cleanup script again';
    END IF;
  END IF;
END $$;
