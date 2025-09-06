const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://reootcngcptfogfozlmz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb290Y25nY3B0Zm9nZm96bG16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0NDM4MiwiZXhwIjoyMDY5MDIwMzgyfQ.BTLA-2wwXJgjW6MKoaw2ERbCr_fXF9w4zgLb70_5DAE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTasksAfterFix() {
  console.log('🧪 Testing tasks after SQL fix...\n');

  try {
    // Get a milestone ID
    console.log('📋 Getting milestone...');
    const { data: milestones, error: milestonesError } = await supabase
      .from('milestones')
      .select('id, title')
      .limit(1);

    if (milestonesError) {
      console.log('❌ Milestones error:', milestonesError);
      return;
    }

    if (milestones.length === 0) {
      console.log('❌ No milestones found');
      return;
    }

    const milestone = milestones[0];
    console.log('✅ Found milestone:', milestone.title);

    // Test task creation
    console.log('\n📝 Creating test task...');
    const { data: newTask, error: taskError } = await supabase
      .from('tasks')
      .insert({
        milestone_id: milestone.id,
        title: 'Test Task - After Fix',
        description: 'Testing after SQL fix',
        status: 'pending',
        progress_percentage: 0
      })
      .select()
      .single();

    if (taskError) {
      console.log('❌ Task creation failed:', taskError);
    } else {
      console.log('✅ Task created successfully!');
      console.log('Task ID:', newTask.id);
      console.log('Task Title:', newTask.title);

      // Test task update
      console.log('\n✏️ Testing task update...');
      const { data: updatedTask, error: updateError } = await supabase
        .from('tasks')
        .update({ status: 'completed' })
        .eq('id', newTask.id)
        .select()
        .single();

      if (updateError) {
        console.log('❌ Task update failed:', updateError);
      } else {
        console.log('✅ Task updated successfully!');
        console.log('New status:', updatedTask.status);
      }

      // Test task deletion
      console.log('\n🗑️ Testing task deletion...');
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', newTask.id);

      if (deleteError) {
        console.log('❌ Task deletion failed:', deleteError);
      } else {
        console.log('✅ Task deleted successfully!');
      }
    }

    console.log('\n🎉 Tasks test completed!');
    console.log('\n💡 If all tests passed, your tasks table is working correctly!');
    console.log('   The issue in your app might be client-side authentication or caching.');

  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

testTasksAfterFix();
