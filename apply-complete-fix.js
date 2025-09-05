const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function applyCompleteFix() {
  console.log('🔧 COMPLETE FIX FOR PROGRESS TRACKING\n')
  console.log('='.repeat(60))

  console.log('\n📋 CURRENT ISSUES:')
  console.log('-'.repeat(30))
  console.log('❌ Permission denied for table milestones')
  console.log('❌ RLS policies blocking inserts')
  console.log('❌ Progress not updating when tasks are toggled')
  console.log('❌ No sample data to test with')

  console.log('\n🚀 STEP 1: FIX RLS POLICIES')
  console.log('='.repeat(40))
  console.log('Copy and run this SQL in Supabase SQL Editor:')
  console.log('')

  const rlsSQL = `-- Fix RLS policies for milestones and tasks tables
-- This will allow authenticated users to manage milestones and tasks

-- 1. Drop existing policies
DROP POLICY IF EXISTS "Allow read access to milestones" ON milestones;
DROP POLICY IF EXISTS "Allow insert access to milestones" ON milestones;
DROP POLICY IF EXISTS "Allow update access to milestones" ON milestones;
DROP POLICY IF EXISTS "Allow delete access to milestones" ON milestones;

DROP POLICY IF EXISTS "Allow read access to tasks" ON tasks;
DROP POLICY IF EXISTS "Allow insert access to tasks" ON tasks;
DROP POLICY IF EXISTS "Allow update access to tasks" ON tasks;
DROP POLICY IF EXISTS "Allow delete access to tasks" ON tasks;

-- 2. Create new permissive policies for milestones
CREATE POLICY "Allow read access to milestones" ON milestones 
FOR SELECT USING (true);

CREATE POLICY "Allow insert access to milestones" ON milestones 
FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update access to milestones" ON milestones 
FOR UPDATE USING (true);

CREATE POLICY "Allow delete access to milestones" ON milestones 
FOR DELETE USING (true);

-- 3. Create new permissive policies for tasks
CREATE POLICY "Allow read access to tasks" ON tasks 
FOR SELECT USING (true);

CREATE POLICY "Allow insert access to tasks" ON tasks 
FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update access to tasks" ON tasks 
FOR UPDATE USING (true);

CREATE POLICY "Allow delete access to tasks" ON tasks 
FOR DELETE USING (true);

-- 4. Ensure RLS is enabled
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;`

  console.log(rlsSQL)

  console.log('\n🚀 STEP 2: APPLY RPC FUNCTIONS')
  console.log('='.repeat(40))
  console.log('Copy and run this SQL in Supabase SQL Editor:')
  console.log('')

  const rpcSQL = `-- ESSENTIAL FIX: Apply RPC functions for progress tracking
-- This will fix the progress not updating issue

-- 1. Update Task RPC (most important for task toggles)
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

-- 2. Update Milestone Progress RPC
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

  -- Update milestone progress
  UPDATE milestones 
  SET 
    progress_percentage = progress_percentage,
    updated_at = now()
  WHERE id = milestone_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Calculate Booking Progress RPC
CREATE OR REPLACE FUNCTION calculate_booking_progress(booking_id uuid)
RETURNS INTEGER AS $$
DECLARE
  total_progress INTEGER;
  milestone_count INTEGER;
  weighted_progress NUMERIC := 0;
  total_weight NUMERIC := 0;
  milestone_record RECORD;
BEGIN
  -- Calculate weighted progress across all milestones for this booking
  FOR milestone_record IN
    SELECT progress_percentage, weight
    FROM milestones
    WHERE milestones.booking_id = calculate_booking_progress.booking_id
  LOOP
    weighted_progress := weighted_progress + (milestone_record.progress_percentage * milestone_record.weight);
    total_weight := total_weight + milestone_record.weight;
    milestone_count := milestone_count + 1;
  END LOOP;
  
  -- Calculate final progress percentage
  IF total_weight > 0 THEN
    total_progress := ROUND(weighted_progress / total_weight);
  ELSE
    total_progress := 0;
  END IF;
  
  -- Update booking progress
  UPDATE bookings 
  SET 
    project_progress = total_progress,
    updated_at = now()
  WHERE id = booking_id;
  
  RETURN total_progress;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant execute permissions
GRANT EXECUTE ON FUNCTION update_task(uuid, text, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION update_milestone_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_booking_progress(uuid) TO authenticated;`

  console.log(rpcSQL)

  console.log('\n🚀 STEP 3: CREATE SAMPLE DATA')
  console.log('='.repeat(40))
  console.log('After applying the above SQL, run:')
  console.log('node create-sample-milestones.js')
  console.log('')

  console.log('🎯 INSTRUCTIONS:')
  console.log('='.repeat(40))
  console.log('1. Go to your Supabase Dashboard')
  console.log('2. Navigate to SQL Editor')
  console.log('3. Copy and paste STEP 1 SQL, then click "Run"')
  console.log('4. Copy and paste STEP 2 SQL, then click "Run"')
  console.log('5. Run: node create-sample-milestones.js')
  console.log('6. Refresh your application and test progress tracking!')
  
  console.log('\n✅ AFTER COMPLETING ALL STEPS:')
  console.log('- Milestones and tasks can be created')
  console.log('- Progress tracking will work properly')
  console.log('- Task toggles will update progress in real-time')
  console.log('- Sample data will be available for testing')
  
  console.log('\n🧪 TEST STEPS:')
  console.log('1. Go to booking details page')
  console.log('2. Click on task checkboxes to mark them complete')
  console.log('3. Watch progress bars update automatically')
  console.log('4. Verify milestone and booking progress sync')
}

applyCompleteFix()
