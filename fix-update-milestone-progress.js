const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixUpdateMilestoneProgress() {
  console.log('🔧 FIXING UPDATE_MILESTONE_PROGRESS FUNCTION\n')
  console.log('='.repeat(50))

  console.log('\n📋 ISSUE: update_milestone_progress still has ambiguous column reference')
  console.log('✅ SOLUTION: Fix the function to use explicit table aliases')

  console.log('\n🚀 FIXED UPDATE_MILESTONE_PROGRESS SQL TO RUN IN SUPABASE:')
  console.log('='.repeat(50))

  const fixedSQL = `-- FIX UPDATE_MILESTONE_PROGRESS FUNCTION - Run this in Supabase SQL Editor
-- This fixes the ambiguous column reference in update_milestone_progress

-- Drop the existing function first
DROP FUNCTION IF EXISTS update_milestone_progress(uuid);

-- Create the fixed update_milestone_progress function
CREATE OR REPLACE FUNCTION update_milestone_progress(milestone_uuid_param uuid)
RETURNS void AS $$
DECLARE
  total_tasks INTEGER;
  completed_tasks INTEGER;
  progress_percentage INTEGER;
BEGIN
  -- Count total and completed tasks with explicit table alias
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE t.status = 'completed')
  INTO total_tasks, completed_tasks
  FROM tasks t
  WHERE t.milestone_id = milestone_uuid_param;

  -- Calculate progress percentage
  IF total_tasks > 0 THEN
    progress_percentage := ROUND((completed_tasks::NUMERIC / total_tasks::NUMERIC) * 100);
  ELSE
    progress_percentage := 0;
  END IF;

  -- Update the milestone with explicit table alias
  UPDATE milestones m
  SET 
    progress_percentage = progress_percentage,
    updated_at = now()
  WHERE m.id = milestone_uuid_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_milestone_progress(uuid) TO authenticated;

-- Verify the fix
SELECT 'update_milestone_progress function fixed' as status;`

  console.log(fixedSQL)

  console.log('\n' + '='.repeat(50))
  console.log('🎯 INSTRUCTIONS:')
  console.log('='.repeat(50))
  console.log('1. Copy the SQL above')
  console.log('2. Paste it into Supabase SQL Editor')
  console.log('3. Click "Run"')
  console.log('4. You should see "update_milestone_progress function fixed" at the end')
  console.log('5. Run: node test-update-milestone-progress.js')
  console.log('6. If successful, run: node test-rpc-with-correct-signatures.js')
  
  console.log('\n✅ THIS FIX:')
  console.log('- Uses explicit table aliases (t.status, m.id, m.progress_percentage)')
  console.log('- Eliminates the ambiguous column reference')
  console.log('- Should finally work!')
}

fixUpdateMilestoneProgress()
