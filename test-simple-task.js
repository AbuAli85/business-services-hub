const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://reootcngcptfogfozlmz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb290Y25nY3B0Zm9nZm96bG16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0NDM4MiwiZXhwIjoyMDY5MDIwMzgyfQ.BTLA-2wwXJgjW6MKoaw2ERbCr_fXF9w4zgLb70_5DAE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSimpleTask() {
  console.log('🧪 Testing simple task creation...\n');

  try {
    // Get an existing milestone ID
    console.log('📋 Getting existing milestone...');
    const { data: milestones, error: milestonesError } = await supabase
      .from('milestones')
      .select('id, booking_id, title')
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
    console.log('✅ Found milestone:', milestone.title, '(ID:', milestone.id + ')');

    // Create a task using the existing milestone
    console.log('\n📝 Creating task...');
    const { data: newTask, error: taskError } = await supabase
      .from('tasks')
      .insert({
        milestone_id: milestone.id,
        title: 'Simple Test Task',
        description: 'Testing with existing milestone',
        status: 'pending',
        progress_percentage: 0
      })
      .select()
      .single();

    if (taskError) {
      console.log('❌ Task creation error:', taskError);
    } else {
      console.log('✅ Task created successfully!');
      console.log('Task:', {
        id: newTask.id,
        title: newTask.title,
        milestone_id: newTask.milestone_id,
        status: newTask.status
      });

      // Clean up
      console.log('\n🗑️ Cleaning up...');
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

testSimpleTask();
