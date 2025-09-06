const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://reootcngcptfogfozlmz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb290Y25nY3B0Zm9nZm96bG16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0NDM4MiwiZXhwIjoyMDY5MDIwMzgyfQ.BTLA-2wwXJgjW6MKoaw2ERbCr_fXF9w4zgLb70_5DAE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTasksSimple() {
  console.log('🧪 Simple tasks test...\n');

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

    // Try to create a task with minimal data
    console.log('\n📝 Creating task with minimal data...');
    const { data: newTask, error: taskError } = await supabase
      .from('tasks')
      .insert({
        milestone_id: milestone.id,
        title: 'Simple Test Task',
        status: 'pending'
      })
      .select()
      .single();

    if (taskError) {
      console.log('❌ Task creation failed:', taskError);
      
      // Try with even more minimal data
      console.log('\n📝 Trying with even more minimal data...');
      const { data: newTask2, error: taskError2 } = await supabase
        .from('tasks')
        .insert({
          milestone_id: milestone.id,
          title: 'Minimal Task'
        })
        .select()
        .single();

      if (taskError2) {
        console.log('❌ Minimal task creation also failed:', taskError2);
      } else {
        console.log('✅ Minimal task created:', newTask2.title);
        
        // Clean up
        await supabase
          .from('tasks')
          .delete()
          .eq('id', newTask2.id);
        console.log('✅ Cleaned up');
      }
    } else {
      console.log('✅ Task created successfully:', newTask.title);
      
      // Clean up
      await supabase
        .from('tasks')
        .delete()
        .eq('id', newTask.id);
      console.log('✅ Cleaned up');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testTasksSimple();
