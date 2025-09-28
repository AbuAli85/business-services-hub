-- Test script to verify the ambiguous column fix
-- This script tests the fixed variable naming

-- Test 1: Check table existence (should work without ambiguous column error)
DO $$
DECLARE
  table_exists BOOLEAN;
  current_table TEXT;
  test_tables TEXT[] := ARRAY['bookings', 'milestones', 'tasks', 'progress_logs'];
BEGIN
  RAISE NOTICE '🧪 Testing ambiguous column fix...';
  
  FOREACH current_table IN ARRAY test_tables
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = current_table
    ) INTO table_exists;
    
    IF table_exists THEN
      RAISE NOTICE '✅ Table % exists', current_table;
    ELSE
      RAISE NOTICE '❌ Table % missing', current_table;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Ambiguous column fix working correctly!';
END $$;

-- Test 2: Check function existence (should also work)
DO $$
DECLARE
  func_exists BOOLEAN;
  current_func TEXT;
  test_functions TEXT[] := ARRAY['calculate_booking_progress', 'update_milestone_progress', 'update_task'];
BEGIN
  RAISE NOTICE '🧪 Testing function existence check...';
  
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
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Function existence check working correctly!';
END $$;

-- Test 3: Show all tables in public schema
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Test 4: Show all functions in public schema
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%progress%'
  OR routine_name LIKE '%task%'
  OR routine_name LIKE '%milestone%'
ORDER BY routine_name;
