-- Test script to verify table access fix
-- This script tests that we can safely check for missing tables

-- Test 1: Check table existence without accessing them
DO $$
DECLARE
  table_exists BOOLEAN;
  current_table TEXT;
  test_tables TEXT[] := ARRAY['bookings', 'milestones', 'tasks', 'progress_logs'];
BEGIN
  RAISE NOTICE '🧪 Testing table existence check...';
  
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
  
  RAISE NOTICE '✅ Table existence check working correctly!';
END $$;

-- Test 2: Try to access tables safely (should not fail)
DO $$
DECLARE
  table_exists BOOLEAN;
  current_table TEXT;
  test_tables TEXT[] := ARRAY['bookings', 'milestones', 'tasks'];
  table_count INTEGER;
BEGIN
  RAISE NOTICE '🧪 Testing safe table access...';
  
  FOREACH current_table IN ARRAY test_tables
  LOOP
    -- Check if table exists first
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = current_table
    ) INTO table_exists;
    
    IF table_exists THEN
      -- Try to access table safely
      BEGIN
        EXECUTE format('SELECT COUNT(*) FROM %I', current_table) INTO table_count;
        RAISE NOTICE '✅ Table % accessible, count: %', current_table, table_count;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE '❌ Table % access failed: %', current_table, SQLERRM;
      END;
    ELSE
      RAISE NOTICE '⚠️ Table % does not exist - skipping access test', current_table;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Safe table access test completed!';
END $$;

-- Test 3: Show current database state
SELECT 
  'Tables' as component_type,
  table_name as name,
  'exists' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('bookings', 'milestones', 'tasks', 'progress_logs')

UNION ALL

SELECT 
  'Functions' as component_type,
  routine_name as name,
  'exists' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('calculate_booking_progress', 'update_milestone_progress', 'update_task')

ORDER BY component_type, name;
