const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function applyCRUDRPCs() {
  console.log('🔧 APPLYING CRUD RPC FUNCTIONS FOR MILESTONES AND TASKS\n')
  console.log('='.repeat(60))

  console.log('\n📋 CRUD RPC FUNCTIONS TO ADD:')
  console.log('-'.repeat(40))
  console.log('✅ add_milestone - Create new milestones')
  console.log('✅ update_milestone - Update milestone details')
  console.log('✅ delete_milestone - Delete milestones')
  console.log('✅ add_task - Create new tasks')
  console.log('✅ update_task - Update task details')
  console.log('✅ delete_task - Delete tasks')

  console.log('\n🚀 SQL TO RUN IN SUPABASE:')
  console.log('='.repeat(60))

  const rpcSQL = `
-- Migration: Add CRUD RPC functions for milestones and tasks
-- This enables providers to fully manage milestones and tasks

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS add_milestone(uuid, text, text, timestamptz, numeric);
DROP FUNCTION IF EXISTS update_milestone(uuid, text, text, timestamptz, text);
DROP FUNCTION IF EXISTS delete_milestone(uuid);
DROP FUNCTION IF EXISTS add_task(uuid, text, timestamptz);
DROP FUNCTION IF EXISTS update_task(uuid, text, text, timestamptz);
DROP FUNCTION IF EXISTS delete_task(uuid);

-- 1. Add Milestone RPC
CREATE OR REPLACE FUNCTION add_milestone(
  booking_id uuid,
  title text,
  description text,
  due_date timestamptz,
  weight numeric default 1
) RETURNS uuid AS $$
DECLARE 
  new_id uuid;
BEGIN
  INSERT INTO milestones (
    booking_id, 
    title, 
    description, 
    due_date, 
    weight, 
    status, 
    progress_percentage, 
    editable, 
    created_at, 
    updated_at
  )
  VALUES (
    booking_id, 
    title, 
    description, 
    due_date, 
    weight, 
    'pending', 
    0, 
    true, 
    now(), 
    now()
  )
  RETURNING id INTO new_id;
  
  -- Update booking progress
  PERFORM calculate_booking_progress(booking_id);
  
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update Milestone RPC
CREATE OR REPLACE FUNCTION update_milestone(
  milestone_id uuid,
  title text DEFAULT NULL,
  description text DEFAULT NULL,
  due_date timestamptz DEFAULT NULL,
  status text DEFAULT NULL
) RETURNS void AS $$
DECLARE
  booking_uuid uuid;
BEGIN
  -- Get booking_id for progress update
  SELECT booking_id INTO booking_uuid FROM milestones WHERE id = milestone_id;
  
  UPDATE milestones
  SET 
    title = COALESCE(update_milestone.title, milestones.title),
    description = COALESCE(update_milestone.description, milestones.description),
    due_date = COALESCE(update_milestone.due_date, milestones.due_date),
    status = COALESCE(update_milestone.status, milestones.status),
    updated_at = now()
  WHERE id = milestone_id;
  
  -- Update milestone progress and booking progress
  PERFORM update_milestone_progress(milestone_id);
  PERFORM calculate_booking_progress(booking_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Delete Milestone RPC
CREATE OR REPLACE FUNCTION delete_milestone(milestone_id uuid)
RETURNS void AS $$
DECLARE
  booking_uuid uuid;
BEGIN
  -- Get booking_id before deletion
  SELECT booking_id INTO booking_uuid FROM milestones WHERE id = milestone_id;
  
  -- Delete milestone (cascade will delete tasks)
  DELETE FROM milestones WHERE id = milestone_id;
  
  -- Update booking progress
  IF booking_uuid IS NOT NULL THEN
    PERFORM calculate_booking_progress(booking_uuid);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Add Task RPC
CREATE OR REPLACE FUNCTION add_task(
  milestone_id uuid,
  title text,
  due_date timestamptz DEFAULT NULL
) RETURNS uuid AS $$
DECLARE 
  new_id uuid;
  booking_uuid uuid;
BEGIN
  -- Get booking_id for progress update
  SELECT booking_id INTO booking_uuid FROM milestones WHERE id = milestone_id;
  
  INSERT INTO tasks (
    milestone_id, 
    title, 
    status, 
    due_date, 
    editable,
    created_at,
    updated_at
  )
  VALUES (
    milestone_id, 
    title, 
    'pending', 
    due_date, 
    true,
    now(),
    now()
  )
  RETURNING id INTO new_id;
  
  -- Update milestone and booking progress
  PERFORM update_milestone_progress(milestone_id);
  PERFORM calculate_booking_progress(booking_uuid);
  
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update Task RPC
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
  -- Update task and get milestone_id
  UPDATE tasks
  SET 
    title = COALESCE(update_task.title, tasks.title),
    status = COALESCE(update_task.status, tasks.status),
    due_date = COALESCE(update_task.due_date, tasks.due_date),
    updated_at = now()
  WHERE id = task_id
  RETURNING milestone_id INTO m_id;

  -- Get booking_id for progress update
  SELECT booking_id INTO booking_uuid FROM milestones WHERE id = m_id;

  -- Update milestone and booking progress
  PERFORM update_milestone_progress(m_id);
  PERFORM calculate_booking_progress(booking_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Delete Task RPC
CREATE OR REPLACE FUNCTION delete_task(task_id uuid)
RETURNS void AS $$
DECLARE
  m_id uuid;
  booking_uuid uuid;
BEGIN
  -- Get milestone_id before deletion
  SELECT milestone_id INTO m_id FROM tasks WHERE id = task_id;
  
  -- Delete task
  DELETE FROM tasks WHERE id = task_id;
  
  -- Update progress if milestone exists
  IF m_id IS NOT NULL THEN
    SELECT booking_id INTO booking_uuid FROM milestones WHERE id = m_id;
    PERFORM update_milestone_progress(m_id);
    PERFORM calculate_booking_progress(booking_uuid);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant execute permissions
GRANT EXECUTE ON FUNCTION add_milestone(uuid, text, text, timestamptz, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION update_milestone(uuid, text, text, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_milestone(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION add_task(uuid, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION update_task(uuid, text, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_task(uuid) TO authenticated;
  `

  console.log(rpcSQL)

  console.log('\n' + '='.repeat(60))
  console.log('🎯 INSTRUCTIONS:')
  console.log('='.repeat(60))
  console.log('1. Copy the SQL above')
  console.log('2. Paste it into Supabase SQL Editor')
  console.log('3. Click "Run"')
  console.log('4. Refresh your application')
  
  console.log('\n✅ AFTER RUNNING THIS:')
  console.log('- Providers can add/edit/delete milestones')
  console.log('- Providers can add/edit/delete tasks')
  console.log('- All changes automatically sync progress')
  console.log('- Full CRUD functionality will be available')
  
  console.log('\n🧪 TEST AFTER RUNNING:')
  console.log('1. Go to a booking details page as a provider')
  console.log('2. Try adding a new milestone')
  console.log('3. Try adding tasks to the milestone')
  console.log('4. Try editing and deleting items')
  console.log('5. Verify progress updates automatically')
}

applyCRUDRPCs()
