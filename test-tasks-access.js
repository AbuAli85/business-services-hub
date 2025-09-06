const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTasksAccess() {
  console.log('🧪 Testing tasks table access...\n');

  try {
    // Test 1: Try to read from tasks table
    console.log('📖 Test 1: Reading from tasks table...');
    const { data: readData, error: readError } = await supabase
      .from('tasks')
      .select('*')
      .limit(5);

    if (readError) {
      console.log('❌ Read error:', readError);
    } else {
      console.log('✅ Read successful:', readData);
    }

    // Test 2: Try to insert a test task
    console.log('\n📝 Test 2: Inserting test task...');
    const testTask = {
      booking_id: '00000000-0000-0000-0000-000000000000',
      title: 'Test Task - ' + new Date().toISOString(),
      description: 'Testing task creation after RLS fix',
      status: 'pending'
    };

    const { data: insertData, error: insertError } = await supabase
      .from('tasks')
      .insert([testTask])
      .select();

    if (insertError) {
      console.log('❌ Insert error:', insertError);
    } else {
      console.log('✅ Insert successful:', insertData);
      
      // Test 3: Try to update the task
      console.log('\n✏️ Test 3: Updating test task...');
      const { data: updateData, error: updateError } = await supabase
        .from('tasks')
        .update({ status: 'completed' })
        .eq('id', insertData[0].id)
        .select();

      if (updateError) {
        console.log('❌ Update error:', updateError);
      } else {
        console.log('✅ Update successful:', updateData);
      }

      // Test 4: Try to delete the task
      console.log('\n🗑️ Test 4: Deleting test task...');
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', insertData[0].id);

      if (deleteError) {
        console.log('❌ Delete error:', deleteError);
      } else {
        console.log('✅ Delete successful');
      }
    }

    // Test 5: Check if there are any existing tasks
    console.log('\n📊 Test 5: Checking existing tasks...');
    const { data: allTasks, error: allTasksError } = await supabase
      .from('tasks')
      .select('*');

    if (allTasksError) {
      console.log('❌ All tasks error:', allTasksError);
    } else {
      console.log('✅ All tasks count:', allTasks.length);
      if (allTasks.length > 0) {
        console.log('Sample task:', allTasks[0]);
      }
    }

    console.log('\n🎉 Tasks table access test completed!');

  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

// Run the test
testTasksAccess();
