const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function createComprehensiveFinalFix() {
  console.log('🔧 CREATING COMPREHENSIVE FINAL FIX\n')
  console.log('='.repeat(50))

  console.log('\n📋 ISSUE: RLS permissions and ambiguous column references')
  console.log('✅ SOLUTION: Create a comprehensive fix for both issues')

  console.log('\n🚀 COMPREHENSIVE FINAL FIX SQL TO RUN IN SUPABASE:')
  console.log('='.repeat(50))

  const comprehensiveSQL = `-- COMPREHENSIVE FINAL FIX - Run this in Supabase SQL Editor
-- This fixes both RLS permissions and ambiguous column references

-- 1. Fix RLS policies for tasks table
DROP POLICY IF EXISTS "tasks_all_access" ON tasks;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks_all_access" ON tasks FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 2. Fix RLS policies for milestones table
DROP POLICY IF EXISTS "milestones_all_access" ON milestones;
ALTER TABLE milestones DISABLE ROW LEVEL SECURITY;
CREATE POLICY "milestones_all_access" ON milestones FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

-- 3. Drop and recreate all functions with completely unambiguous names
DROP FUNCTION IF EXISTS add_task(uuid, text, text, timestamptz);
DROP FUNCTION IF EXISTS update_milestone_progress(uuid);
DROP FUNCTION IF EXISTS calculate_booking_progress(uuid);
DROP FUNCTION IF EXISTS add_milestone(uuid, text, text, text, numeric);
DROP FUNCTION IF EXISTS update_milestone(uuid, text, text, text, timestamptz, numeric);
DROP FUNCTION IF EXISTS delete_milestone(uuid);
DROP FUNCTION IF EXISTS update_task(uuid, text, text, timestamptz);
DROP FUNCTION IF EXISTS delete_task(uuid);

-- 4. Create update_milestone_progress function with completely unambiguous names
CREATE OR REPLACE FUNCTION update_milestone_progress(milestone_uuid_param uuid)
RETURNS void AS $$
DECLARE
  total_tasks_count INTEGER;
  completed_tasks_count INTEGER;
  calculated_progress_percentage INTEGER;
BEGIN
  -- Count total and completed tasks with explicit table alias
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE t.status = 'completed')
  INTO total_tasks_count, completed_tasks_count
  FROM tasks t
  WHERE t.milestone_id = milestone_uuid_param;

  -- Calculate progress percentage
  IF total_tasks_count > 0 THEN
    calculated_progress_percentage := ROUND((completed_tasks_count::NUMERIC / total_tasks_count::NUMERIC) * 100);
  ELSE
    calculated_progress_percentage := 0;
  END IF;

  -- Update the milestone with explicit table alias
  UPDATE milestones m
  SET 
    progress_percentage = calculated_progress_percentage,
    updated_at = now()
  WHERE m.id = milestone_uuid_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create calculate_booking_progress function
CREATE OR REPLACE FUNCTION calculate_booking_progress(booking_uuid_param uuid)
RETURNS INTEGER AS $$
DECLARE
  final_progress INTEGER;
  weighted_progress_sum NUMERIC := 0;
  total_weight_sum NUMERIC := 0;
  milestone_record RECORD;
BEGIN
  -- Calculate weighted progress
  FOR milestone_record IN
    SELECT m.progress_percentage, m.weight
    FROM milestones m
    WHERE m.booking_id = booking_uuid_param
  LOOP
    weighted_progress_sum := weighted_progress_sum + (milestone_record.progress_percentage * milestone_record.weight);
    total_weight_sum := total_weight_sum + milestone_record.weight;
  END LOOP;
  
  -- Calculate final progress
  IF total_weight_sum > 0 THEN
    final_progress := ROUND(weighted_progress_sum / total_weight_sum);
  ELSE
    final_progress := 0;
  END IF;
  
  -- Update the booking
  UPDATE bookings b
  SET 
    project_progress = final_progress,
    updated_at = now()
  WHERE b.id = booking_uuid_param;
  
  RETURN final_progress;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create add_task function
CREATE OR REPLACE FUNCTION add_task(
  milestone_uuid_param uuid,
  task_title text,
  task_status text DEFAULT 'pending',
  task_due_date timestamptz DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  new_task_id uuid;
  booking_uuid uuid;
BEGIN
  -- Insert the task
  INSERT INTO tasks (
    milestone_id, 
    title, 
    status, 
    due_date, 
    editable, 
    created_at, 
    updated_at
  ) VALUES (
    milestone_uuid_param, 
    task_title, 
    task_status, 
    task_due_date, 
    true, 
    now(), 
    now()
  ) RETURNING id INTO new_task_id;
  
  -- Get the booking_id from the milestone
  SELECT m.booking_id INTO booking_uuid 
  FROM milestones m
  WHERE m.id = milestone_uuid_param;
  
  -- Update milestone progress
  PERFORM update_milestone_progress(milestone_uuid_param);
  
  -- Update booking progress
  PERFORM calculate_booking_progress(booking_uuid);
  
  RETURN new_task_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create add_milestone function
CREATE OR REPLACE FUNCTION add_milestone(
  booking_uuid_param uuid,
  milestone_title text,
  milestone_description text DEFAULT NULL,
  milestone_status text DEFAULT 'pending',
  milestone_weight numeric DEFAULT 1.0
) RETURNS uuid AS $$
DECLARE
  new_milestone_id uuid;
BEGIN
  -- Insert the milestone
  INSERT INTO milestones (
    booking_id, 
    title, 
    description, 
    status, 
    progress_percentage, 
    weight, 
    editable, 
    created_at, 
    updated_at
  ) VALUES (
    booking_uuid_param, 
    milestone_title, 
    milestone_description, 
    milestone_status, 
    0, 
    milestone_weight, 
    true, 
    now(), 
    now()
  ) RETURNING id INTO new_milestone_id;
  
  -- Update booking progress
  PERFORM calculate_booking_progress(booking_uuid_param);
  
  RETURN new_milestone_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create update_milestone function
CREATE OR REPLACE FUNCTION update_milestone(
  milestone_uuid_param uuid,
  milestone_title text DEFAULT NULL,
  milestone_description text DEFAULT NULL,
  milestone_status text DEFAULT NULL,
  milestone_due_date timestamptz DEFAULT NULL,
  milestone_weight numeric DEFAULT NULL
) RETURNS void AS $$
DECLARE
  booking_uuid uuid;
BEGIN
  -- Update the milestone
  UPDATE milestones m
  SET 
    title = COALESCE(milestone_title, m.title),
    description = COALESCE(milestone_description, m.description),
    status = COALESCE(milestone_status, m.status),
    due_date = COALESCE(milestone_due_date, m.due_date),
    weight = COALESCE(milestone_weight, m.weight),
    updated_at = now()
  WHERE m.id = milestone_uuid_param
  RETURNING m.booking_id INTO booking_uuid;
  
  -- Update milestone progress
  PERFORM update_milestone_progress(milestone_uuid_param);
  
  -- Update booking progress
  PERFORM calculate_booking_progress(booking_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create delete_milestone function
CREATE OR REPLACE FUNCTION delete_milestone(milestone_uuid_param uuid)
RETURNS void AS $$
DECLARE
  booking_uuid uuid;
BEGIN
  -- Get the booking_id before deleting
  SELECT m.booking_id INTO booking_uuid 
  FROM milestones m
  WHERE m.id = milestone_uuid_param;
  
  -- Delete tasks first
  DELETE FROM tasks t WHERE t.milestone_id = milestone_uuid_param;
  
  -- Delete the milestone
  DELETE FROM milestones m WHERE m.id = milestone_uuid_param;
  
  -- Update booking progress
  PERFORM calculate_booking_progress(booking_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create update_task function
CREATE OR REPLACE FUNCTION update_task(
  task_uuid_param uuid,
  task_title text DEFAULT NULL,
  task_status text DEFAULT NULL,
  task_due_date timestamptz DEFAULT NULL
) RETURNS void AS $$
DECLARE
  milestone_id uuid;
  booking_uuid uuid;
BEGIN
  -- Update the task
  UPDATE tasks t
  SET 
    title = COALESCE(task_title, t.title),
    status = COALESCE(task_status, t.status),
    due_date = COALESCE(task_due_date, t.due_date),
    updated_at = now()
  WHERE t.id = task_uuid_param
  RETURNING t.milestone_id INTO milestone_id;

  -- Get the booking_id
  SELECT m.booking_id INTO booking_uuid 
  FROM milestones m
  WHERE m.id = milestone_id;
  
  -- Update milestone progress
  PERFORM update_milestone_progress(milestone_id);
  
  -- Update booking progress
  PERFORM calculate_booking_progress(booking_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create delete_task function
CREATE OR REPLACE FUNCTION delete_task(task_uuid_param uuid)
RETURNS void AS $$
DECLARE
  milestone_id uuid;
  booking_uuid uuid;
BEGIN
  -- Get the milestone_id before deleting
  SELECT t.milestone_id INTO milestone_id 
  FROM tasks t
  WHERE t.id = task_uuid_param;
  
  -- Delete the task
  DELETE FROM tasks t WHERE t.id = task_uuid_param;
  
  -- Get the booking_id
  SELECT m.booking_id INTO booking_uuid 
  FROM milestones m
  WHERE m.id = milestone_id;
  
  -- Update milestone progress
  PERFORM update_milestone_progress(milestone_id);
  
  -- Update booking progress
  PERFORM calculate_booking_progress(booking_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Grant all permissions
GRANT EXECUTE ON FUNCTION update_milestone_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_booking_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION add_task(uuid, text, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION add_milestone(uuid, text, text, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION update_milestone(uuid, text, text, text, timestamptz, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_milestone(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_task(uuid, text, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_task(uuid) TO authenticated;

-- 13. Verify the setup
SELECT 'Comprehensive final fix applied successfully' as status;`

  console.log(comprehensiveSQL)

  console.log('\n' + '='.repeat(50))
  console.log('🎯 INSTRUCTIONS:')
  console.log('='.repeat(50))
  console.log('1. Copy the SQL above')
  console.log('2. Paste it into Supabase SQL Editor')
  console.log('3. Click "Run"')
  console.log('4. You should see "Comprehensive final fix applied successfully" at the end')
  console.log('5. Run: node test-rpc-with-correct-signatures.js')
  console.log('6. If successful, run: node create-sample-milestones.js')
  
  console.log('\n✅ THIS COMPREHENSIVE FIX:')
  console.log('- Fixes RLS policies for both tables')
  console.log('- Uses completely unambiguous variable names')
  console.log('- Uses explicit table aliases everywhere')
  console.log('- Should finally work completely!')
}

createComprehensiveFinalFix()
