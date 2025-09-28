-- Safe function test that handles missing tables
-- This script tests functions without failing on missing tables

-- 1. Check if required tables exist
DO $$
DECLARE
  table_exists BOOLEAN;
  current_table TEXT;
  required_tables TEXT[] := ARRAY['bookings', 'milestones', 'tasks'];
  missing_tables TEXT[] := ARRAY[]::TEXT[];
BEGIN
  RAISE NOTICE '🔍 Checking required tables...';
  
  FOREACH current_table IN ARRAY required_tables
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
      missing_tables := array_append(missing_tables, current_table);
    END IF;
  END LOOP;
  
  IF array_length(missing_tables, 1) > 0 THEN
    RAISE NOTICE '⚠️ Missing tables: %', array_to_string(missing_tables, ', ');
    RAISE NOTICE '💡 Run migration 161 to create missing tables';
  ELSE
    RAISE NOTICE '✅ All required tables exist';
  END IF;
END $$;

-- 2. Check if functions exist
DO $$
DECLARE
  func_exists BOOLEAN;
  func_name TEXT;
  required_functions TEXT[] := ARRAY['calculate_booking_progress', 'update_milestone_progress', 'update_task'];
  missing_functions TEXT[] := ARRAY[]::TEXT[];
BEGIN
  RAISE NOTICE '🔍 Checking required functions...';
  
  FOREACH func_name IN ARRAY required_functions
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name = func_name
    ) INTO func_exists;
    
    IF func_exists THEN
      RAISE NOTICE '✅ Function % exists', func_name;
    ELSE
      RAISE NOTICE '❌ Function % missing', func_name;
      missing_functions := array_append(missing_functions, func_name);
    END IF;
  END LOOP;
  
  IF array_length(missing_functions, 1) > 0 THEN
    RAISE NOTICE '⚠️ Missing functions: %', array_to_string(missing_functions, ', ');
    RAISE NOTICE '💡 Run migration 160 to create missing functions';
  ELSE
    RAISE NOTICE '✅ All required functions exist';
  END IF;
END $$;

-- 3. Test functions only if tables exist
DO $$
DECLARE
  test_booking_id uuid;
  test_milestone_id uuid;
  test_task_id uuid;
  result INTEGER;
  booking_count INTEGER := 0;
  milestone_count INTEGER := 0;
  task_count INTEGER := 0;
  bookings_exist BOOLEAN := FALSE;
  milestones_exist BOOLEAN := FALSE;
  tasks_exist BOOLEAN := FALSE;
BEGIN
  -- Check if tables exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'bookings'
  ) INTO bookings_exist;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'milestones'
  ) INTO milestones_exist;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'tasks'
  ) INTO tasks_exist;
  
  -- Count data if tables exist
  IF bookings_exist THEN
    BEGIN
      SELECT COUNT(*) INTO booking_count FROM bookings;
      RAISE NOTICE '📊 Found % bookings', booking_count;
    EXCEPTION
      WHEN undefined_table THEN
        RAISE NOTICE '⚠️ bookings table does not exist - skipping booking tests';
        bookings_exist := FALSE;
    END;
  ELSE
    RAISE NOTICE '⚠️ bookings table does not exist - skipping booking tests';
  END IF;
  
  IF milestones_exist THEN
    BEGIN
      SELECT COUNT(*) INTO milestone_count FROM milestones;
      RAISE NOTICE '📊 Found % milestones', milestone_count;
    EXCEPTION
      WHEN undefined_table THEN
        RAISE NOTICE '⚠️ milestones table does not exist - skipping milestone tests';
        milestones_exist := FALSE;
    END;
  ELSE
    RAISE NOTICE '⚠️ milestones table does not exist - skipping milestone tests';
  END IF;
  
  IF tasks_exist THEN
    BEGIN
      SELECT COUNT(*) INTO task_count FROM tasks;
      RAISE NOTICE '📊 Found % tasks', task_count;
    EXCEPTION
      WHEN undefined_table THEN
        RAISE NOTICE '⚠️ tasks table does not exist - skipping task tests';
        tasks_exist := FALSE;
    END;
  ELSE
    RAISE NOTICE '⚠️ tasks table does not exist - skipping task tests';
  END IF;
  
  -- Test calculate_booking_progress if we have bookings
  IF bookings_exist AND booking_count > 0 THEN
    BEGIN
      SELECT id INTO test_booking_id FROM bookings LIMIT 1;
      
      BEGIN
        SELECT calculate_booking_progress(test_booking_id) INTO result;
        RAISE NOTICE '✅ calculate_booking_progress works: booking_id=%, result=%', test_booking_id, result;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE '❌ calculate_booking_progress failed: %', SQLERRM;
      END;
    EXCEPTION
      WHEN undefined_table THEN
        RAISE NOTICE '⚠️ bookings table does not exist - skipping booking tests';
        bookings_exist := FALSE;
    END;
  ELSIF bookings_exist THEN
    RAISE NOTICE '⚠️ No bookings available for testing calculate_booking_progress';
  END IF;
  
  -- Test update_milestone_progress if we have milestones
  IF milestones_exist AND milestone_count > 0 THEN
    BEGIN
      SELECT id INTO test_milestone_id FROM milestones LIMIT 1;
      
      BEGIN
        PERFORM update_milestone_progress(test_milestone_id);
        RAISE NOTICE '✅ update_milestone_progress works: milestone_id=%', test_milestone_id;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE '❌ update_milestone_progress failed: %', SQLERRM;
      END;
    EXCEPTION
      WHEN undefined_table THEN
        RAISE NOTICE '⚠️ milestones table does not exist - skipping milestone tests';
        milestones_exist := FALSE;
    END;
  ELSIF milestones_exist THEN
    RAISE NOTICE '⚠️ No milestones available for testing update_milestone_progress';
  END IF;
  
  -- Test update_task if we have tasks
  IF tasks_exist AND task_count > 0 THEN
    BEGIN
      SELECT id INTO test_task_id FROM tasks LIMIT 1;
      
      BEGIN
        PERFORM update_task(test_task_id, 'Test Update', 'completed');
        RAISE NOTICE '✅ update_task works: task_id=%', test_task_id;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE '❌ update_task failed: %', SQLERRM;
      END;
    EXCEPTION
      WHEN undefined_table THEN
        RAISE NOTICE '⚠️ tasks table does not exist - skipping task tests';
        tasks_exist := FALSE;
    END;
  ELSIF tasks_exist THEN
    RAISE NOTICE '⚠️ No tasks available for testing update_task';
  END IF;
  
  -- Summary
  RAISE NOTICE '📋 Test Summary:';
  RAISE NOTICE '   - Tables exist: bookings=%, milestones=%, tasks=%', bookings_exist, milestones_exist, tasks_exist;
  RAISE NOTICE '   - Data available: bookings=%, milestones=%, tasks=%', booking_count, milestone_count, task_count;
  
  IF NOT bookings_exist OR NOT milestones_exist OR NOT tasks_exist THEN
    RAISE NOTICE '💡 To fix missing tables, run: supabase migration up 161';
  END IF;
  
END $$;

-- 4. Show function signatures (if functions exist)
SELECT 
  routine_name,
  LEFT(routine_definition, 100) || '...' as definition_preview
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('calculate_booking_progress', 'update_milestone_progress', 'update_task')
ORDER BY routine_name;
