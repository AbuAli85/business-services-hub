-- Check what functions currently exist
-- This will show you the current state of your database

-- 1. Show all functions in the public schema
SELECT 
  'CURRENT FUNCTIONS' as type,
  routine_name as name,
  data_type as return_type,
  specific_name as signature
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%progress%'
  OR routine_name LIKE '%task%'
  OR routine_name LIKE '%booking%'
ORDER BY routine_name, specific_name;

-- 2. Count functions
SELECT 
  'COUNT' as type,
  'Total functions' as name,
  COUNT(*) as value
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%progress%'
  OR routine_name LIKE '%task%'
  OR routine_name LIKE '%booking%';

-- 3. Check specific functions
DO $$
DECLARE
  func_exists BOOLEAN;
  func_name TEXT;
  test_functions TEXT[] := ARRAY['calculate_booking_progress', 'update_milestone_progress', 'update_task'];
  all_exist BOOLEAN := TRUE;
BEGIN
  RAISE NOTICE '🔍 CURRENT FUNCTION STATUS:';
  
  FOREACH func_name IN ARRAY test_functions
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name = func_name
    ) INTO func_exists;
    
    IF func_exists THEN
      RAISE NOTICE '   ✅ %: EXISTS', func_name;
    ELSE
      RAISE NOTICE '   ❌ %: MISSING', func_name;
      all_exist := FALSE;
    END IF;
  END LOOP;
  
  IF all_exist THEN
    RAISE NOTICE '🎉 ALL FUNCTIONS EXIST!';
  ELSE
    RAISE NOTICE '⚠️ SOME FUNCTIONS ARE MISSING';
  END IF;
END $$;
