-- Fix the specific duplicate update_milestone_progress function
-- This script targets only the duplicate milestone progress function

-- 1. Drop ALL existing versions of update_milestone_progress
DROP FUNCTION IF EXISTS update_milestone_progress(uuid);
DROP FUNCTION IF EXISTS update_milestone_progress(uuid, integer);
DROP FUNCTION IF EXISTS update_milestone_progress(uuid, integer, integer);
DROP FUNCTION IF EXISTS update_milestone_progress(uuid, text);
DROP FUNCTION IF EXISTS update_milestone_progress(uuid, text, integer);
DROP FUNCTION IF EXISTS update_milestone_progress(uuid, text, integer, integer);

-- 2. Create the single correct version
CREATE OR REPLACE FUNCTION update_milestone_progress(milestone_uuid uuid)
RETURNS void AS $$
DECLARE
  total_tasks INTEGER;
  completed_tasks INTEGER;
  new_progress_percentage INTEGER;
  booking_uuid uuid;
BEGIN
  -- Get the booking_id for this milestone
  SELECT booking_id INTO booking_uuid FROM milestones WHERE id = milestone_uuid;
  
  -- Count total and completed tasks
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed')
  INTO total_tasks, completed_tasks
  FROM tasks 
  WHERE milestone_id = milestone_uuid;

  -- Calculate progress percentage
  IF total_tasks > 0 THEN
    new_progress_percentage := ROUND((completed_tasks::NUMERIC / total_tasks::NUMERIC) * 100);
  ELSE
    new_progress_percentage := 0;
  END IF;

  -- Update milestone progress
  UPDATE milestones 
  SET 
    progress_percentage = new_progress_percentage,
    completed_tasks = completed_tasks,
    total_tasks = total_tasks,
    updated_at = now()
  WHERE id = milestone_uuid;
  
  -- Update booking progress if we have a booking_id
  IF booking_uuid IS NOT NULL THEN
    PERFORM calculate_booking_progress(booking_uuid);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Grant permissions
GRANT EXECUTE ON FUNCTION update_milestone_progress(uuid) TO authenticated;

-- 4. Add comment
COMMENT ON FUNCTION update_milestone_progress(uuid) IS 'Updates milestone progress based on task completion and triggers booking progress update';

-- 5. Verify the fix
DO $$
DECLARE
  func_count INTEGER;
  duplicate_count INTEGER;
BEGIN
  -- Count total update_milestone_progress functions
  SELECT COUNT(*) INTO func_count
  FROM information_schema.routines 
  WHERE routine_schema = 'public' 
  AND routine_name = 'update_milestone_progress';
  
  -- Check for duplicates
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT routine_name
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name = 'update_milestone_progress'
    GROUP BY routine_name
    HAVING COUNT(*) > 1
  ) duplicates;
  
  RAISE NOTICE '🔧 MILESTONE PROGRESS FUNCTION FIX:';
  RAISE NOTICE '   Total functions: %', func_count;
  RAISE NOTICE '   Duplicates found: %', duplicate_count;
  
  IF func_count = 1 AND duplicate_count = 0 THEN
    RAISE NOTICE '✅ SUCCESS: update_milestone_progress fixed!';
    RAISE NOTICE '   ✅ Single version exists';
    RAISE NOTICE '   ✅ No duplicates found';
  ELSE
    RAISE NOTICE '❌ ISSUE: Still have problems';
    RAISE NOTICE '   Expected 1 function, found %', func_count;
    RAISE NOTICE '   Duplicates: %', duplicate_count;
  END IF;
END $$;

-- 6. Show all function signatures for verification
SELECT 
  routine_name,
  specific_name,
  data_type as return_type,
  'CURRENT' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'update_milestone_progress'
ORDER BY specific_name;
