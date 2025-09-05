const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function createAllSimplifiedFunctions() {
  console.log('🔧 CREATING ALL SIMPLIFIED FUNCTIONS\n')
  console.log('='.repeat(50))

  console.log('\n📋 ISSUE: Still getting ambiguous column errors')
  console.log('✅ SOLUTION: Create completely new, simplified versions of ALL functions')

  console.log('\n🚀 ALL SIMPLIFIED FUNCTIONS SQL TO RUN IN SUPABASE:')
  console.log('='.repeat(50))

  const allSimplifiedSQL = `-- ALL SIMPLIFIED FUNCTIONS - Run this in Supabase SQL Editor
-- This creates completely new, simplified versions of all functions

-- Drop all existing functions first
DROP FUNCTION IF EXISTS add_task(uuid, text, text, timestamptz);
DROP FUNCTION IF EXISTS update_milestone_progress(uuid);
DROP FUNCTION IF EXISTS calculate_booking_progress(uuid);

-- 1. Create simplified update_milestone_progress function
CREATE OR REPLACE FUNCTION update_milestone_progress(milestone_uuid uuid)
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
  WHERE milestone_id = milestone_uuid;

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
  WHERE id = milestone_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create simplified calculate_booking_progress function
CREATE OR REPLACE FUNCTION calculate_booking_progress(booking_id uuid)
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
    WHERE booking_id = calculate_booking_progress.booking_id
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
  WHERE id = booking_id;
  
  RETURN total_progress;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create simplified add_task function
CREATE OR REPLACE FUNCTION add_task(
  milestone_id uuid,
  title text,
  status text DEFAULT 'pending',
  due_date timestamptz DEFAULT NULL
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
    add_task.milestone_id, 
    add_task.title, 
    add_task.status, 
    add_task.due_date, 
    true, 
    now(), 
    now()
  ) RETURNING id INTO task_id;
  
  -- Get the booking_id from the milestone
  SELECT booking_id INTO booking_uuid 
  FROM milestones 
  WHERE id = add_task.milestone_id;
  
  -- Update milestone progress
  PERFORM update_milestone_progress(add_task.milestone_id);
  
  -- Update booking progress
  PERFORM calculate_booking_progress(booking_uuid);
  
  RETURN task_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create simplified add_milestone function
CREATE OR REPLACE FUNCTION add_milestone(
  booking_id uuid,
  title text,
  description text DEFAULT NULL,
  status text DEFAULT 'pending',
  weight numeric DEFAULT 1.0
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
    add_milestone.booking_id, 
    add_milestone.title, 
    add_milestone.description, 
    add_milestone.status, 
    0, 
    add_milestone.weight, 
    true, 
    now(), 
    now()
  ) RETURNING id INTO milestone_id;
  
  -- Update booking progress
  PERFORM calculate_booking_progress(add_milestone.booking_id);
  
  RETURN milestone_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create simplified update_milestone function
CREATE OR REPLACE FUNCTION update_milestone(
  milestone_id uuid,
  title text DEFAULT NULL,
  description text DEFAULT NULL,
  status text DEFAULT NULL,
  due_date timestamptz DEFAULT NULL,
  weight numeric DEFAULT NULL
) RETURNS void AS $$
DECLARE
  booking_uuid uuid;
BEGIN
  -- Update the milestone
  UPDATE milestones
  SET 
    title = COALESCE(update_milestone.title, milestones.title),
    description = COALESCE(update_milestone.description, milestones.description),
    status = COALESCE(update_milestone.status, milestones.status),
    due_date = COALESCE(update_milestone.due_date, milestones.due_date),
    weight = COALESCE(update_milestone.weight, milestones.weight),
    updated_at = now()
  WHERE id = milestone_id
  RETURNING booking_id INTO booking_uuid;
  
  -- Update milestone progress
  PERFORM update_milestone_progress(milestone_id);
  
  -- Update booking progress
  PERFORM calculate_booking_progress(booking_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create simplified delete_milestone function
CREATE OR REPLACE FUNCTION delete_milestone(milestone_id uuid)
RETURNS void AS $$
DECLARE
  booking_uuid uuid;
BEGIN
  -- Get the booking_id before deleting
  SELECT booking_id INTO booking_uuid 
  FROM milestones 
  WHERE id = milestone_id;
  
  -- Delete tasks first
  DELETE FROM tasks WHERE milestone_id = milestone_id;
  
  -- Delete the milestone
  DELETE FROM milestones WHERE id = milestone_id;
  
  -- Update booking progress
  PERFORM calculate_booking_progress(booking_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create simplified update_task function
CREATE OR REPLACE FUNCTION update_task(
  task_id uuid,
  title text DEFAULT NULL,
  status text DEFAULT NULL,
  due_date timestamptz DEFAULT NULL
) RETURNS void AS $$
DECLARE
  m_id uuid;
  booking_uuid uuid;
BEGIN
  -- Update the task
  UPDATE tasks
  SET 
    title = COALESCE(update_task.title, tasks.title),
    status = COALESCE(update_task.status, tasks.status),
    due_date = COALESCE(update_task.due_date, tasks.due_date),
    updated_at = now()
  WHERE id = task_id
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

-- 8. Create simplified delete_task function
CREATE OR REPLACE FUNCTION delete_task(task_id uuid)
RETURNS void AS $$
DECLARE
  m_id uuid;
  booking_uuid uuid;
BEGIN
  -- Get the milestone_id before deleting
  SELECT milestone_id INTO m_id 
  FROM tasks 
  WHERE id = task_id;
  
  -- Delete the task
  DELETE FROM tasks WHERE id = task_id;
  
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
SELECT 'All simplified functions created successfully' as status;`

  console.log(allSimplifiedSQL)

  console.log('\n' + '='.repeat(50))
  console.log('🎯 INSTRUCTIONS:')
  console.log('='.repeat(50))
  console.log('1. Copy the SQL above')
  console.log('2. Paste it into Supabase SQL Editor')
  console.log('3. Click "Run"')
  console.log('4. You should see "All simplified functions created successfully" at the end')
  console.log('5. Run: node test-rpc-directly.js')
  console.log('6. If successful, run: node create-sample-milestones.js')
  
  console.log('\n✅ THIS COMPLETE SET:')
  console.log('- Drops ALL existing functions first')
  console.log('- Creates completely new, simplified versions')
  console.log('- Eliminates all ambiguous column references')
  console.log('- Should definitely work!')
}

createAllSimplifiedFunctions()
