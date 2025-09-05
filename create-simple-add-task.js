const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function createSimpleAddTask() {
  console.log('🔧 CREATING SIMPLE ADD_TASK FUNCTION\n')
  console.log('='.repeat(50))

  console.log('\n📋 ISSUE: The add_task function still has ambiguous column references')
  console.log('✅ SOLUTION: Create a completely new, simplified version')

  console.log('\n🚀 SIMPLIFIED SQL TO RUN IN SUPABASE:')
  console.log('='.repeat(50))

  const simplifiedSQL = `-- SIMPLIFIED ADD_TASK FUNCTION - Run this in Supabase SQL Editor
-- This creates a completely new, simplified add_task function

-- Drop the existing function first
DROP FUNCTION IF EXISTS add_task(uuid, text, text, timestamptz);

-- Create a new, simplified add_task function
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION add_task(uuid, text, text, timestamptz) TO authenticated;

-- Verify the function
SELECT 'Simplified add_task function created' as status;`

  console.log(simplifiedSQL)

  console.log('\n' + '='.repeat(50))
  console.log('🎯 INSTRUCTIONS:')
  console.log('='.repeat(50))
  console.log('1. Copy the SQL above')
  console.log('2. Paste it into Supabase SQL Editor')
  console.log('3. Click "Run"')
  console.log('4. You should see "Simplified add_task function created" at the end')
  console.log('5. Run: node test-rpc-directly.js')
  console.log('6. If successful, run: node create-sample-milestones.js')
  
  console.log('\n✅ THIS SIMPLIFIED VERSION:')
  console.log('- Drops the existing function first')
  console.log('- Creates a completely new, clean function')
  console.log('- Uses explicit parameter names to avoid conflicts')
  console.log('- Should definitely work!')
}

createSimpleAddTask()
