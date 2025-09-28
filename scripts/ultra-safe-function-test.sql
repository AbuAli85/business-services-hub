-- Ultra-safe function test that never accesses missing tables
-- This script only checks existence and never tries to access missing tables

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
  current_func TEXT;
  required_functions TEXT[] := ARRAY['calculate_booking_progress', 'update_milestone_progress', 'update_task'];
  missing_functions TEXT[] := ARRAY[]::TEXT[];
BEGIN
  RAISE NOTICE '🔍 Checking required functions...';
  
  FOREACH current_func IN ARRAY required_functions
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
      missing_functions := array_append(missing_functions, current_func);
    END IF;
  END LOOP;
  
  IF array_length(missing_functions, 1) > 0 THEN
    RAISE NOTICE '⚠️ Missing functions: %', array_to_string(missing_functions, ', ');
    RAISE NOTICE '💡 Run migration 160 to create missing functions';
  ELSE
    RAISE NOTICE '✅ All required functions exist';
  END IF;
END $$;

-- 3. Show function signatures (if functions exist)
SELECT 
  routine_name,
  LEFT(routine_definition, 100) || '...' as definition_preview
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('calculate_booking_progress', 'update_milestone_progress', 'update_task')
ORDER BY routine_name;

-- 4. Show table structure (if tables exist)
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('bookings', 'milestones', 'tasks', 'progress_logs')
ORDER BY table_name, ordinal_position;

-- 5. Summary and next steps
DO $$
DECLARE
  table_count INTEGER;
  func_count INTEGER;
  all_tables_exist BOOLEAN := TRUE;
  all_functions_exist BOOLEAN := TRUE;
BEGIN
  -- Count existing tables
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('bookings', 'milestones', 'tasks', 'progress_logs');
  
  -- Count existing functions
  SELECT COUNT(*) INTO func_count
  FROM information_schema.routines 
  WHERE routine_schema = 'public' 
  AND routine_name IN ('calculate_booking_progress', 'update_milestone_progress', 'update_task');
  
  -- Check if all required components exist
  all_tables_exist := (table_count = 4);
  all_functions_exist := (func_count = 3);
  
  RAISE NOTICE '📋 Summary:';
  RAISE NOTICE '   - Tables: %/4 exist', table_count;
  RAISE NOTICE '   - Functions: %/3 exist', func_count;
  
  IF all_tables_exist AND all_functions_exist THEN
    RAISE NOTICE '🎉 All required components exist! You can now test the functions.';
  ELSIF all_tables_exist THEN
    RAISE NOTICE '⚠️ Tables exist but functions are missing. Run: supabase migration up 160';
  ELSIF all_functions_exist THEN
    RAISE NOTICE '⚠️ Functions exist but tables are missing. Run: supabase migration up 161';
  ELSE
    RAISE NOTICE '⚠️ Both tables and functions are missing. Run both migrations:';
    RAISE NOTICE '   - supabase migration up 161 (for tables)';
    RAISE NOTICE '   - supabase migration up 160 (for functions)';
  END IF;
END $$;
