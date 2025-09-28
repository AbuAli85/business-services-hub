-- Simple diagnostic - shows complete database status
-- This will give you all the information you need

-- 1. Show all functions
SELECT 
  'FUNCTION' as type,
  routine_name as name,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('calculate_booking_progress', 'update_milestone_progress', 'update_task')
ORDER BY routine_name;

-- 2. Show all tables
SELECT 
  'TABLE' as type,
  table_name as name,
  'EXISTS' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('bookings', 'milestones', 'tasks', 'progress_logs')
ORDER BY table_name;

-- 3. Count functions
SELECT 
  'COUNT' as type,
  'Functions' as name,
  COUNT(*) as value
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('calculate_booking_progress', 'update_milestone_progress', 'update_task');

-- 4. Count tables
SELECT 
  'COUNT' as type,
  'Tables' as name,
  COUNT(*) as value
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('bookings', 'milestones', 'tasks', 'progress_logs');

-- 5. Check for duplicates
SELECT 
  'DUPLICATE' as type,
  routine_name as name,
  COUNT(*) as versions
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('calculate_booking_progress', 'update_milestone_progress', 'update_task')
GROUP BY routine_name
ORDER BY routine_name;

-- 6. Simple status check
DO $$
DECLARE
  func_count INTEGER;
  table_count INTEGER;
  duplicate_count INTEGER;
BEGIN
  -- Count functions
  SELECT COUNT(*) INTO func_count
  FROM information_schema.routines 
  WHERE routine_schema = 'public' 
  AND routine_name IN ('calculate_booking_progress', 'update_milestone_progress', 'update_task');
  
  -- Count tables
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('bookings', 'milestones', 'tasks', 'progress_logs');
  
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
  
  RAISE NOTICE '📊 SIMPLE DIAGNOSTIC RESULTS:';
  RAISE NOTICE '   Functions: %', func_count;
  RAISE NOTICE '   Tables: %', table_count;
  RAISE NOTICE '   Duplicates: %', duplicate_count;
  
  IF func_count = 3 AND duplicate_count = 0 THEN
    RAISE NOTICE '✅ FUNCTIONS: PERFECT!';
  ELSE
    RAISE NOTICE '❌ FUNCTIONS: ISSUES FOUND';
  END IF;
  
  IF table_count = 4 THEN
    RAISE NOTICE '✅ TABLES: PERFECT!';
  ELSIF table_count = 0 THEN
    RAISE NOTICE '⚠️ TABLES: NONE FOUND';
  ELSE
    RAISE NOTICE '⚠️ TABLES: PARTIAL (%/4)', table_count;
  END IF;
  
  IF func_count = 3 AND table_count = 4 AND duplicate_count = 0 THEN
    RAISE NOTICE '🎉 OVERALL: PERFECT! Ready for production!';
  ELSIF func_count = 3 AND duplicate_count = 0 THEN
    RAISE NOTICE '✅ OVERALL: Functions ready! Tables may be missing.';
  ELSE
    RAISE NOTICE '⚠️ OVERALL: Some issues remain.';
  END IF;
END $$;
