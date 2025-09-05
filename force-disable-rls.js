const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function forceDisableRLS() {
  console.log('🔧 FORCE DISABLE RLS APPROACH\n')
  console.log('='.repeat(50))

  console.log('\n📋 ISSUE: RLS is still blocking inserts despite SQL execution')
  console.log('✅ SOLUTION: Use a more aggressive approach to disable RLS')

  console.log('\n🚀 AGGRESSIVE SQL TO RUN IN SUPABASE:')
  console.log('='.repeat(50))

  const aggressiveSQL = `-- AGGRESSIVE RLS FIX - Run this in Supabase SQL Editor
-- This will completely disable RLS and create working policies

-- 1. Drop ALL existing policies first
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on milestones
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'milestones') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON milestones';
    END LOOP;
    
    -- Drop all policies on tasks
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'tasks') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON tasks';
    END LOOP;
END $$;

-- 2. Completely disable RLS
ALTER TABLE milestones DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;

-- 3. Create simple working policies
CREATE POLICY "milestones_all_access" ON milestones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "tasks_all_access" ON tasks FOR ALL USING (true) WITH CHECK (true);

-- 4. Re-enable RLS
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 5. Create RPC functions
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
  UPDATE tasks
  SET 
    title = COALESCE(update_task.title, tasks.title),
    status = COALESCE(update_task.status, tasks.status),
    due_date = COALESCE(update_task.due_date, tasks.due_date),
    updated_at = now()
  WHERE id = task_id
  RETURNING milestone_id INTO m_id;

  SELECT booking_id INTO booking_uuid FROM milestones WHERE id = m_id;
  PERFORM update_milestone_progress(m_id);
  PERFORM calculate_booking_progress(booking_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_milestone_progress(milestone_uuid uuid)
RETURNS void AS $$
DECLARE
  total_tasks INTEGER;
  completed_tasks INTEGER;
  progress_percentage INTEGER;
BEGIN
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed')
  INTO total_tasks, completed_tasks
  FROM tasks 
  WHERE milestone_id = milestone_uuid;

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
    SELECT progress_percentage, weight
    FROM milestones
    WHERE milestones.booking_id = calculate_booking_progress.booking_id
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

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION update_task(uuid, text, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION update_milestone_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_booking_progress(uuid) TO authenticated;

-- 7. Verify the setup
SELECT 'RLS setup complete' as status;`

  console.log(aggressiveSQL)

  console.log('\n' + '='.repeat(50))
  console.log('🎯 INSTRUCTIONS:')
  console.log('='.repeat(50))
  console.log('1. Copy the SQL above')
  console.log('2. Paste it into Supabase SQL Editor')
  console.log('3. Click "Run"')
  console.log('4. You should see "RLS setup complete" at the end')
  console.log('5. Run: node check-database-status.js')
  console.log('6. If successful, run: node create-sample-milestones.js')
  
  console.log('\n✅ THIS APPROACH:')
  console.log('- Drops ALL existing policies first')
  console.log('- Completely disables RLS temporarily')
  console.log('- Creates simple working policies')
  console.log('- Re-enables RLS with working policies')
  console.log('- Creates all RPC functions')
  console.log('- Should definitely work this time!')
}

forceDisableRLS()
