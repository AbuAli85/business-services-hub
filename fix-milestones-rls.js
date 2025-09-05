const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixMilestonesRLS() {
  console.log('🔧 FIXING MILESTONES RLS POLICIES\n')
  console.log('='.repeat(50))

  console.log('\n📋 ISSUE IDENTIFIED:')
  console.log('-'.repeat(30))
  console.log('❌ Permission denied for table milestones')
  console.log('❌ RLS policies are blocking inserts')
  console.log('✅ Solution: Fix RLS policies for milestones and tasks')

  console.log('\n🚀 SQL TO FIX RLS POLICIES:')
  console.log('='.repeat(50))

  const rlsSQL = `
-- Fix RLS policies for milestones and tasks tables
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
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
  `

  console.log(rlsSQL)

  console.log('\n' + '='.repeat(50))
  console.log('🎯 INSTRUCTIONS:')
  console.log('='.repeat(50))
  console.log('1. Copy the SQL above')
  console.log('2. Paste it into Supabase SQL Editor')
  console.log('3. Click "Run"')
  console.log('4. Run the sample data creation script again')
  
  console.log('\n✅ AFTER RUNNING THIS:')
  console.log('- Milestones and tasks can be created')
  console.log('- Progress tracking will work properly')
  console.log('- Sample data can be inserted')
  
  console.log('\n🧪 NEXT STEPS:')
  console.log('1. Apply the RLS fix SQL above')
  console.log('2. Run: node create-sample-milestones.js')
  console.log('3. Test the progress tracking in the UI')
}

fixMilestonesRLS()
