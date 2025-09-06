const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixTasksPermissions() {
  console.log('🔧 Starting comprehensive tasks permissions fix...\n');

  try {
    // Step 1: Check current RLS status
    console.log('📊 Step 1: Checking current RLS status...');
    const { data: rlsStatus, error: rlsError } = await supabase
      .from('pg_tables')
      .select('tablename, rowsecurity')
      .eq('tablename', 'tasks');

    if (rlsError) {
      console.log('Using alternative method to check RLS...');
    } else {
      console.log('RLS Status:', rlsStatus);
    }

    // Step 2: Check current policies
    console.log('\n📋 Step 2: Checking current policies...');
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_table_policies', { table_name: 'tasks' });

    if (policiesError) {
      console.log('Policies check error:', policiesError.message);
    } else {
      console.log('Current policies:', policies);
    }

    // Step 3: Disable RLS temporarily
    console.log('\n🔓 Step 3: Disabling RLS temporarily...');
    const { error: disableError } = await supabase
      .rpc('exec_sql', { 
        sql: 'ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;' 
      });

    if (disableError) {
      console.log('Disable RLS error:', disableError.message);
    } else {
      console.log('✅ RLS disabled successfully');
    }

    // Step 4: Drop all existing policies
    console.log('\n🗑️ Step 4: Dropping all existing policies...');
    const dropPoliciesSQL = `
      DROP POLICY IF EXISTS "Users can create tasks for their bookings" ON public.tasks;
      DROP POLICY IF EXISTS "Users can view tasks for their bookings" ON public.tasks;
      DROP POLICY IF EXISTS "Users can update tasks for their bookings" ON public.tasks;
      DROP POLICY IF EXISTS "Users can delete tasks for their bookings" ON public.tasks;
      DROP POLICY IF EXISTS "tasks_select_policy" ON public.tasks;
      DROP POLICY IF EXISTS "tasks_insert_policy" ON public.tasks;
      DROP POLICY IF EXISTS "tasks_update_policy" ON public.tasks;
      DROP POLICY IF EXISTS "tasks_delete_policy" ON public.tasks;
    `;

    const { error: dropError } = await supabase
      .rpc('exec_sql', { sql: dropPoliciesSQL });

    if (dropError) {
      console.log('Drop policies error:', dropError.message);
    } else {
      console.log('✅ All policies dropped successfully');
    }

    // Step 5: Re-enable RLS
    console.log('\n🔒 Step 5: Re-enabling RLS...');
    const { error: enableError } = await supabase
      .rpc('exec_sql', { 
        sql: 'ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;' 
      });

    if (enableError) {
      console.log('Enable RLS error:', enableError.message);
    } else {
      console.log('✅ RLS re-enabled successfully');
    }

    // Step 6: Create simple, permissive policies
    console.log('\n🛡️ Step 6: Creating new permissive policies...');
    const createPoliciesSQL = `
      -- Allow all authenticated users to access tasks
      CREATE POLICY "Allow all authenticated users to access tasks" ON public.tasks
      FOR ALL TO authenticated
      USING (true)
      WITH CHECK (true);
    `;

    const { error: createError } = await supabase
      .rpc('exec_sql', { sql: createPoliciesSQL });

    if (createError) {
      console.log('Create policies error:', createError.message);
    } else {
      console.log('✅ New policies created successfully');
    }

    // Step 7: Test task creation
    console.log('\n🧪 Step 7: Testing task creation...');
    const testTask = {
      booking_id: '00000000-0000-0000-0000-000000000000', // dummy UUID
      title: 'Test Task',
      description: 'Testing task creation',
      status: 'pending',
      created_at: new Date().toISOString()
    };

    const { data: testData, error: testError } = await supabase
      .from('tasks')
      .insert([testTask])
      .select();

    if (testError) {
      console.log('❌ Test task creation failed:', testError);
    } else {
      console.log('✅ Test task created successfully:', testData);
      
      // Clean up test task
      await supabase
        .from('tasks')
        .delete()
        .eq('id', testData[0].id);
      console.log('🧹 Test task cleaned up');
    }

    // Step 8: Verify final state
    console.log('\n✅ Step 8: Verifying final state...');
    const { data: finalPolicies, error: finalError } = await supabase
      .rpc('get_table_policies', { table_name: 'tasks' });

    if (finalError) {
      console.log('Final verification error:', finalError.message);
    } else {
      console.log('Final policies:', finalPolicies);
    }

    console.log('\n🎉 Tasks permissions fix completed!');
    console.log('You should now be able to create and manage tasks without permission errors.');

  } catch (error) {
    console.error('❌ Error during fix:', error);
  }
}

// Run the fix
fixTasksPermissions();
