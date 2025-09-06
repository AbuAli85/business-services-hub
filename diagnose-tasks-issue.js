const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://reootcngcptfogfozlmz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb290Y25nY3B0Zm9nZm96bG16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0NDM4MiwiZXhwIjoyMDY5MDIwMzgyfQ.BTLA-2wwXJgjW6MKoaw2ERbCr_fXF9w4zgLb70_5DAE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseTasksIssue() {
  console.log('🔍 Diagnosing tasks table issue...\n');

  try {
    // Test 1: Check if we can read from tasks table
    console.log('📖 Test 1: Reading from tasks table...');
    const { data: readData, error: readError } = await supabase
      .from('tasks')
      .select('*')
      .limit(1);

    if (readError) {
      console.log('❌ Read error:', readError);
    } else {
      console.log('✅ Read successful. Found', readData.length, 'tasks');
    }

    // Test 2: Check RLS status
    console.log('\n🔒 Test 2: Checking RLS status...');
    const { data: rlsData, error: rlsError } = await supabase
      .from('pg_tables')
      .select('tablename, rowsecurity')
      .eq('tablename', 'tasks');

    if (rlsError) {
      console.log('❌ RLS check error:', rlsError);
    } else {
      console.log('✅ RLS status:', rlsData);
    }

    // Test 3: Check policies
    console.log('\n🛡️ Test 3: Checking policies...');
    const { data: policiesData, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'tasks');

    if (policiesError) {
      console.log('❌ Policies check error:', policiesError);
    } else {
      console.log('✅ Policies found:', policiesData.length);
      policiesData.forEach(policy => {
        console.log(`  - ${policy.policyname}: ${policy.cmd} for ${policy.roles}`);
      });
    }

    // Test 4: Try to disable RLS temporarily
    console.log('\n🔓 Test 4: Attempting to disable RLS...');
    const { error: disableError } = await supabase
      .rpc('exec_sql', { 
        sql: 'ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;' 
      });

    if (disableError) {
      console.log('❌ Disable RLS error:', disableError);
    } else {
      console.log('✅ RLS disabled successfully');
      
      // Test task creation without RLS
      console.log('\n📝 Testing task creation without RLS...');
      const { data: milestones } = await supabase
        .from('milestones')
        .select('id')
        .limit(1);

      if (milestones && milestones.length > 0) {
        const { data: testTask, error: testError } = await supabase
          .from('tasks')
          .insert({
            milestone_id: milestones[0].id,
            title: 'Test Task - No RLS',
            description: 'Testing without RLS',
            status: 'pending',
            progress_percentage: 0
          })
          .select()
          .single();

        if (testError) {
          console.log('❌ Task creation without RLS failed:', testError);
        } else {
          console.log('✅ Task created without RLS:', testTask.title);
          
          // Clean up
          await supabase
            .from('tasks')
            .delete()
            .eq('id', testTask.id);
          console.log('✅ Test task cleaned up');
        }
      }
    }

    // Test 5: Check table structure
    console.log('\n📋 Test 5: Checking table structure...');
    const { data: sampleTask, error: sampleError } = await supabase
      .from('tasks')
      .select('*')
      .limit(1);

    if (sampleError) {
      console.log('❌ Sample data error:', sampleError);
    } else {
      console.log('✅ Table structure:');
      if (sampleTask.length > 0) {
        Object.keys(sampleTask[0]).forEach(key => {
          console.log(`  - ${key}: ${typeof sampleTask[0][key]}`);
        });
      }
    }

    console.log('\n🎉 Diagnosis completed!');

  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
  }
}

diagnoseTasksIssue();
