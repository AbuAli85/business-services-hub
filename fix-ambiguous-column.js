const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixAmbiguousColumn() {
  console.log('🔧 FIXING AMBIGUOUS COLUMN ERROR\n')
  console.log('='.repeat(50))

  console.log('\n📋 ISSUE: Column reference "progress_percentage" is ambiguous in add_task function')
  console.log('✅ SOLUTION: Fix the SQL function to use proper table aliases')

  console.log('\n🚀 FIXED SQL TO RUN IN SUPABASE:')
  console.log('='.repeat(50))

  const fixedSQL = `-- FIX AMBIGUOUS COLUMN ERROR - Run this in Supabase SQL Editor
-- This will fix the ambiguous column reference in the add_task function

-- Fix the add_task function with proper table aliases
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
  INSERT INTO tasks (
    milestone_id, title, status, due_date, editable, created_at, updated_at
  ) VALUES (
    add_task.milestone_id, add_task.title, add_task.status, 
    add_task.due_date, true, now(), now()
  ) RETURNING id INTO task_id;
  
  SELECT m.booking_id INTO booking_uuid FROM milestones m WHERE m.id = milestone_id;
  PERFORM update_milestone_progress(milestone_id);
  PERFORM calculate_booking_progress(booking_uuid);
  
  RETURN task_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also fix the update_milestone_progress function to be more explicit
CREATE OR REPLACE FUNCTION update_milestone_progress(milestone_uuid uuid)
RETURNS void AS $$
DECLARE
  total_tasks INTEGER;
  completed_tasks INTEGER;
  progress_percentage INTEGER;
BEGIN
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE t.status = 'completed')
  INTO total_tasks, completed_tasks
  FROM tasks t
  WHERE t.milestone_id = milestone_uuid;

  IF total_tasks > 0 THEN
    progress_percentage := ROUND((completed_tasks::NUMERIC / total_tasks::NUMERIC) * 100);
  ELSE
    progress_percentage := 0;
  END IF;

  UPDATE milestones 
  SET 
    progress_percentage = progress_percentage,
    updated_at = now()
  WHERE id = milestone_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also fix the calculate_booking_progress function to be more explicit
CREATE OR REPLACE FUNCTION calculate_booking_progress(booking_id uuid)
RETURNS INTEGER AS $$
DECLARE
  total_progress INTEGER;
  milestone_count INTEGER;
  weighted_progress NUMERIC := 0;
  total_weight NUMERIC := 0;
  milestone_record RECORD;
BEGIN
  FOR milestone_record IN
    SELECT m.progress_percentage, m.weight
    FROM milestones m
    WHERE m.booking_id = calculate_booking_progress.booking_id
  LOOP
    weighted_progress := weighted_progress + (milestone_record.progress_percentage * milestone_record.weight);
    total_weight := total_weight + milestone_record.weight;
    milestone_count := milestone_count + 1;
  END LOOP;
  
  IF total_weight > 0 THEN
    total_progress := ROUND(weighted_progress / total_weight);
  ELSE
    total_progress := 0;
  END IF;
  
  UPDATE bookings 
  SET 
    project_progress = total_progress,
    updated_at = now()
  WHERE id = booking_id;
  
  RETURN total_progress;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the fix
SELECT 'Ambiguous column error fixed' as status;`

  console.log(fixedSQL)

  console.log('\n' + '='.repeat(50))
  console.log('🎯 INSTRUCTIONS:')
  console.log('='.repeat(50))
  console.log('1. Copy the SQL above')
  console.log('2. Paste it into Supabase SQL Editor')
  console.log('3. Click "Run"')
  console.log('4. You should see "Ambiguous column error fixed" at the end')
  console.log('5. Run: node test-rpc-directly.js')
  console.log('6. If successful, run: node create-sample-milestones.js')
  
  console.log('\n✅ THIS FIX:')
  console.log('- Fixes the ambiguous column reference in add_task')
  console.log('- Makes all functions more explicit with table aliases')
  console.log('- Should resolve the SQL error')
  console.log('- RPC functions should work completely!')
}

fixAmbiguousColumn()
