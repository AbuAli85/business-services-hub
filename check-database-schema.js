const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabaseSchema() {
  try {
    console.log('🔍 Checking database schema for advanced progress tracking...\n');
    
    // Check if milestones table exists
    const { data: milestonesCheck, error: milestonesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'milestones');
    
    if (milestonesError) {
      console.log('❌ Error checking milestones table:', milestonesError.message);
    } else if (milestonesCheck && milestonesCheck.length > 0) {
      console.log('✅ Milestones table exists');
    } else {
      console.log('❌ Milestones table does NOT exist');
    }
    
    // Check if tasks table exists
    const { data: tasksCheck, error: tasksError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'tasks');
    
    if (tasksError) {
      console.log('❌ Error checking tasks table:', tasksError.message);
    } else if (tasksCheck && tasksCheck.length > 0) {
      console.log('✅ Tasks table exists');
    } else {
      console.log('❌ Tasks table does NOT exist');
    }
    
    // Check if time_entries table exists
    const { data: timeEntriesCheck, error: timeEntriesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'time_entries');
    
    if (timeEntriesError) {
      console.log('❌ Error checking time_entries table:', timeEntriesError.message);
    } else if (timeEntriesCheck && timeEntriesCheck.length > 0) {
      console.log('✅ Time_entries table exists');
    } else {
      console.log('❌ Time_entries table does NOT exist');
    }
    
    // Check if task_comments table exists
    const { data: taskCommentsCheck, error: taskCommentsError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'task_comments');
    
    if (taskCommentsError) {
      console.log('❌ Error checking task_comments table:', taskCommentsError.message);
    } else if (taskCommentsCheck && taskCommentsCheck.length > 0) {
      console.log('✅ Task_comments table exists');
    } else {
      console.log('❌ Task_comments table does NOT exist');
    }
    
    console.log('\n📋 Summary:');
    console.log('If any tables are missing, you need to manually apply the SQL migration.');
    console.log('Go to Supabase Dashboard > SQL Editor and run the contents of:');
    console.log('supabase/migrations/094_advanced_progress_tracking.sql');
    
  } catch (error) {
    console.error('❌ Error checking database schema:', error.message);
  }
}

checkDatabaseSchema();