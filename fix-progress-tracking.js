const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixProgressTracking() {
  console.log('🔧 FIXING PROGRESS TRACKING SYSTEM\n')
  console.log('='.repeat(50))

  console.log('\n📋 ISSUE IDENTIFIED:')
  console.log('-'.repeat(30))
  console.log('❌ Progress not updating when tasks are toggled')
  console.log('❌ RPC functions may not be applied to database')
  console.log('✅ Solution: Apply essential RPC functions')

  console.log('\n🚀 ESSENTIAL SQL TO FIX PROGRESS TRACKING:')
  console.log('='.repeat(50))

  const essentialSQL = `
-- ESSENTIAL FIX: Apply RPC functions for progress tracking
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
GRANT EXECUTE ON FUNCTION calculate_booking_progress(uuid) TO authenticated;
  `

  console.log(essentialSQL)

  console.log('\n' + '='.repeat(50))
  console.log('🎯 INSTRUCTIONS:')
  console.log('='.repeat(50))
  console.log('1. Copy the SQL above')
  console.log('2. Paste it into Supabase SQL Editor')
  console.log('3. Click "Run"')
  console.log('4. Refresh your application')
  console.log('5. Try toggling tasks - progress should update!')
  
  console.log('\n✅ AFTER RUNNING THIS:')
  console.log('- Task toggles will update milestone progress')
  console.log('- Milestone progress will update booking progress')
  console.log('- Progress bars will show real-time updates')
  console.log('- The "0% Complete" issue will be fixed')
  
  console.log('\n🧪 TEST STEPS:')
  console.log('1. Go to a booking details page')
  console.log('2. Click on a task checkbox to mark it complete')
  console.log('3. Watch the progress bars update automatically')
  console.log('4. Check that milestone and booking progress sync')
}

fixProgressTracking()
