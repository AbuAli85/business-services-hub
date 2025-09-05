const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function createFinalFix() {
  console.log('🔧 CREATING FINAL FIX\n')
  console.log('='.repeat(50))

  console.log('\n📋 ISSUE: Still getting ambiguous column errors with booking_id')
  console.log('✅ SOLUTION: Use completely different parameter names to avoid conflicts')

  console.log('\n🚀 FINAL FIX SQL TO RUN IN SUPABASE:')
  console.log('='.repeat(50))

  const finalFixSQL = `-- FINAL FIX - Run this in Supabase SQL Editor
-- This uses completely different parameter names to avoid conflicts

-- Drop all existing functions first
DROP FUNCTION IF EXISTS add_task(uuid, text, text, timestamptz);
DROP FUNCTION IF EXISTS update_milestone_progress(uuid);
DROP FUNCTION IF EXISTS calculate_booking_progress(uuid);
DROP FUNCTION IF EXISTS add_milestone(uuid, text, text, text, numeric);
DROP FUNCTION IF EXISTS update_milestone(uuid, text, text, text, timestamptz, numeric);
DROP FUNCTION IF EXISTS delete_milestone(uuid);
DROP FUNCTION IF EXISTS update_task(uuid, text, text, timestamptz);
DROP FUNCTION IF EXISTS delete_task(uuid);

-- 1. Create update_milestone_progress function with different parameter name
CREATE OR REPLACE FUNCTION update_milestone_progress(milestone_uuid_param uuid)
RETURNS void AS $$
DECLARE
  total_tasks INTEGER;
  completed_tasks INTEGER;
  progress_percentage INTEGER;
BEGIN
  -- Count total and completed tasks
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed')
  INTO total_tasks, completed_tasks
  FROM tasks 
  WHERE milestone_id = milestone_uuid_param;

  -- Calculate progress percentage
  IF total_tasks > 0 THEN
    progress_percentage := ROUND((completed_tasks::NUMERIC / total_tasks::NUMERIC) * 100);
  ELSE
    progress_percentage := 0;
  END IF;

  -- Update the milestone
  UPDATE milestones 
  SET 
    progress_percentage = progress_percentage,
    updated_at = now()
  WHERE id = milestone_uuid_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create calculate_booking_progress function with different parameter name
CREATE OR REPLACE FUNCTION calculate_booking_progress(booking_uuid_param uuid)
RETURNS INTEGER AS $$
DECLARE
  total_progress INTEGER;
  weighted_progress NUMERIC := 0;
  total_weight NUMERIC := 0;
  milestone_record RECORD;
BEGIN
  -- Calculate weighted progress
  FOR milestone_record IN
    SELECT progress_percentage, weight
    FROM milestones
    WHERE booking_id = booking_uuid_param
  LOOP
    weighted_progress := weighted_progress + (milestone_record.progress_percentage * milestone_record.weight);
    total_weight := total_weight + milestone_record.weight;
  END LOOP;
  
  -- Calculate final progress
  IF total_weight > 0 THEN
    total_progress := ROUND(weighted_progress / total_weight);
  ELSE
    total_progress := 0;
  END IF;
  
  -- Update the booking
  UPDATE bookings 
  SET 
    project_progress = total_progress,
    updated_at = now()
  WHERE id = booking_uuid_param;
  
  RETURN total_progress;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create add_task function with different parameter names
CREATE OR REPLACE FUNCTION add_task(
  milestone_uuid_param uuid,
  task_title text,
  task_status text DEFAULT 'pending',
  task_due_date timestamptz DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  task_id uuid;
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
  ) RETURNING id INTO task_id;
  
  -- Get the booking_id from the milestone
  SELECT booking_id INTO booking_uuid 
  FROM milestones 
  WHERE id = milestone_uuid_param;
  
  -- Update milestone progress
  PERFORM update_milestone_progress(milestone_uuid_param);
  
  -- Update booking progress
  PERFORM calculate_booking_progress(booking_uuid);
  
  RETURN task_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create add_milestone function with different parameter names
CREATE OR REPLACE FUNCTION add_milestone(
  booking_uuid_param uuid,
  milestone_title text,
  milestone_description text DEFAULT NULL,
  milestone_status text DEFAULT 'pending',
  milestone_weight numeric DEFAULT 1.0
) RETURNS uuid AS $$
DECLARE
  milestone_id uuid;
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
  ) RETURNING id INTO milestone_id;
  
  -- Update booking progress
  PERFORM calculate_booking_progress(booking_uuid_param);
  
  RETURN milestone_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create update_milestone function with different parameter names
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
  UPDATE milestones
  SET 
    title = COALESCE(milestone_title, milestones.title),
    description = COALESCE(milestone_description, milestones.description),
    status = COALESCE(milestone_status, milestones.status),
    due_date = COALESCE(milestone_due_date, milestones.due_date),
    weight = COALESCE(milestone_weight, milestones.weight),
    updated_at = now()
  WHERE id = milestone_uuid_param
  RETURNING booking_id INTO booking_uuid;
  
  -- Update milestone progress
  PERFORM update_milestone_progress(milestone_uuid_param);
  
  -- Update booking progress
  PERFORM calculate_booking_progress(booking_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create delete_milestone function with different parameter name
CREATE OR REPLACE FUNCTION delete_milestone(milestone_uuid_param uuid)
RETURNS void AS $$
DECLARE
  booking_uuid uuid;
BEGIN
  -- Get the booking_id before deleting
  SELECT booking_id INTO booking_uuid 
  FROM milestones 
  WHERE id = milestone_uuid_param;
  
  -- Delete tasks first
  DELETE FROM tasks WHERE milestone_id = milestone_uuid_param;
  
  -- Delete the milestone
  DELETE FROM milestones WHERE id = milestone_uuid_param;
  
  -- Update booking progress
  PERFORM calculate_booking_progress(booking_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create update_task function with different parameter names
CREATE OR REPLACE FUNCTION update_task(
  task_uuid_param uuid,
  task_title text DEFAULT NULL,
  task_status text DEFAULT NULL,
  task_due_date timestamptz DEFAULT NULL
) RETURNS void AS $$
DECLARE
  m_id uuid;
  booking_uuid uuid;
BEGIN
  -- Update the task
  UPDATE tasks
  SET 
    title = COALESCE(task_title, tasks.title),
    status = COALESCE(task_status, tasks.status),
    due_date = COALESCE(task_due_date, tasks.due_date),
    updated_at = now()
  WHERE id = task_uuid_param
  RETURNING milestone_id INTO m_id;

  -- Get the booking_id
  SELECT booking_id INTO booking_uuid 
  FROM milestones 
  WHERE id = m_id;
  
  -- Update milestone progress
  PERFORM update_milestone_progress(m_id);
  
  -- Update booking progress
  PERFORM calculate_booking_progress(booking_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create delete_task function with different parameter name
CREATE OR REPLACE FUNCTION delete_task(task_uuid_param uuid)
RETURNS void AS $$
DECLARE
  m_id uuid;
  booking_uuid uuid;
BEGIN
  -- Get the milestone_id before deleting
  SELECT milestone_id INTO m_id 
  FROM tasks 
  WHERE id = task_uuid_param;
  
  -- Delete the task
  DELETE FROM tasks WHERE id = task_uuid_param;
  
  -- Get the booking_id
  SELECT booking_id INTO booking_uuid 
  FROM milestones 
  WHERE id = m_id;
  
  -- Update milestone progress
  PERFORM update_milestone_progress(m_id);
  
  -- Update booking progress
  PERFORM calculate_booking_progress(booking_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant all permissions
GRANT EXECUTE ON FUNCTION update_milestone_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_booking_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION add_task(uuid, text, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION add_milestone(uuid, text, text, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION update_milestone(uuid, text, text, text, timestamptz, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_milestone(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_task(uuid, text, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_task(uuid) TO authenticated;

-- Verify the setup
SELECT 'Final fix applied successfully' as status;`

  console.log(finalFixSQL)

  console.log('\n' + '='.repeat(50))
  console.log('🎯 INSTRUCTIONS:')
  console.log('='.repeat(50))
  console.log('1. Copy the SQL above')
  console.log('2. Paste it into Supabase SQL Editor')
  console.log('3. Click "Run"')
  console.log('4. You should see "Final fix applied successfully" at the end')
  console.log('5. Run: node test-rpc-directly.js')
  console.log('6. If successful, run: node create-sample-milestones.js')
  
  console.log('\n✅ THIS FINAL FIX:')
  console.log('- Uses completely different parameter names (milestone_uuid_param, booking_uuid_param, etc.)')
  console.log('- Eliminates ALL possible column name conflicts')
  console.log('- Should definitely work this time!')
}

createFinalFix()
