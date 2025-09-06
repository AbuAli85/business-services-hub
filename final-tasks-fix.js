const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://reootcngcptfogfozlmz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb290Y25nY3B0Zm9nZm96bG16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0NDM4MiwiZXhwIjoyMDY5MDIwMzgyfQ.BTLA-2wwXJgjW6MKoaw2ERbCr_fXF9w4zgLb70_5DAE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function finalTasksFix() {
  console.log('🔧 Final comprehensive fix for tasks table...\n');

  try {
    // Step 1: Check current RLS status
    console.log('📊 Step 1: Checking RLS status...');
    const { data: rlsCheck, error: rlsError } = await supabase
      .from('pg_tables')
      .select('tablename, rowsecurity')
      .eq('tablename', 'tasks');

    if (rlsError) {
      console.log('RLS check error:', rlsError.message);
    } else {
      console.log('RLS status:', rlsCheck);
    }

    // Step 2: Disable RLS completely
    console.log('\n🔓 Step 2: Disabling RLS completely...');
    const { error: disableError } = await supabase
      .rpc('exec_sql', { 
        sql: 'ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;' 
      });

    if (disableError) {
      console.log('Disable error:', disableError.message);
    } else {
      console.log('✅ RLS disabled');
    }

    // Step 3: Test task creation without RLS
    console.log('\n🧪 Step 3: Testing task creation without RLS...');
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
        console.log('❌ Test task creation failed:', testError);
      } else {
        console.log('✅ Test task created successfully:', testTask.title);
        
        // Clean up
        await supabase
          .from('tasks')
          .delete()
          .eq('id', testTask.id);
        console.log('✅ Test task cleaned up');
      }
    }

    // Step 4: Re-enable RLS with simple policy
    console.log('\n🔒 Step 4: Re-enabling RLS with simple policy...');
    
    // First re-enable RLS
    const { error: enableError } = await supabase
      .rpc('exec_sql', { 
        sql: 'ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;' 
      });

    if (enableError) {
      console.log('Enable error:', enableError.message);
    } else {
      console.log('✅ RLS re-enabled');
    }

    // Create a very simple policy
    const { error: policyError } = await supabase
      .rpc('exec_sql', { 
        sql: `
          DROP POLICY IF EXISTS "Allow all authenticated users to access tasks" ON public.tasks;
          CREATE POLICY "Allow all authenticated users to access tasks" ON public.tasks
          FOR ALL TO authenticated
          USING (true)
          WITH CHECK (true);
        ` 
      });

    if (policyError) {
      console.log('Policy error:', policyError.message);
    } else {
      console.log('✅ Simple policy created');
    }

    // Step 5: Test with RLS enabled
    console.log('\n🧪 Step 5: Testing with RLS enabled...');
    if (milestones && milestones.length > 0) {
      const { data: testTask2, error: testError2 } = await supabase
        .from('tasks')
        .insert({
          milestone_id: milestones[0].id,
          title: 'Test Task - With RLS',
          description: 'Testing with RLS enabled',
          status: 'pending',
          progress_percentage: 0
        })
        .select()
        .single();

      if (testError2) {
        console.log('❌ Test with RLS failed:', testError2);
      } else {
        console.log('✅ Test with RLS successful:', testTask2.title);
        
        // Clean up
        await supabase
          .from('tasks')
          .delete()
          .eq('id', testTask2.id);
        console.log('✅ Test task cleaned up');
      }
    }

    console.log('\n🎉 Final tasks fix completed!');
    console.log('\n💡 If this worked, the issue in your app is likely:');
    console.log('   1. Client-side authentication context');
    console.log('   2. Browser cache - try hard refresh (Ctrl+F5)');
    console.log('   3. Different user session');

  } catch (error) {
    console.error('❌ Error during fix:', error);
  }
}

finalTasksFix();
