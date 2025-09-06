const { createClient } = require('@supabase/supabase-js');

// Using credentials from env.example
const supabaseUrl = 'https://reootcngcptfogfozlmz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb290Y25nY3B0Zm9nZm96bG16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0NDM4MiwiZXhwIjoyMDY5MDIwMzgyfQ.BTLA-2wwXJgjW6MKoaw2ERbCr_fXF9w4zgLb70_5DAE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTasksAccess() {
  console.log('🧪 Testing tasks table access with service role...\n');

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
      console.log('✅ Read successful. Found', readData.length, 'tasks');
      if (readData.length > 0) {
        console.log('Sample task:', readData[0]);
      }
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
      console.log('✅ Insert successful:', insertData[0].title);
      
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
        console.log('✅ Update successful:', updateData[0].status);
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

    // Test 5: Check RLS policies
    console.log('\n🔍 Test 5: Checking RLS policies...');
    const { data: policies, error: policiesError } = await supabase
      .rpc('exec_sql', { 
        sql: `SELECT policyname, cmd, roles, qual, with_check FROM pg_policies WHERE tablename = 'tasks';` 
      });

    if (policiesError) {
      console.log('❌ Policies check error:', policiesError);
    } else {
      console.log('✅ Current policies:', policies);
    }

    console.log('\n🎉 Tasks table access test completed!');
    console.log('\n💡 If all tests passed, the issue might be:');
    console.log('   1. Browser cache - try hard refresh (Ctrl+F5)');
    console.log('   2. Client-side authentication - check if user is logged in');
    console.log('   3. Different Supabase project - verify you\'re using the right project');

  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

// Run the test
testTasksAccess();
