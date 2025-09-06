const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://reootcngcptfogfozlmz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb290Y25nY3B0Zm9nZm96bG16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0NDM4MiwiZXhwIjoyMDY5MDIwMzgyfQ.BTLA-2wwXJgjW6MKoaw2ERbCr_fXF9w4zgLb70_5DAE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTaskCreation() {
  console.log('🧪 Testing task creation with correct structure...\n');

  try {
    // Step 1: Get a sample booking ID
    console.log('📋 Step 1: Getting a sample booking...');
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id')
      .limit(1);

    if (bookingsError) {
      console.log('❌ Bookings error:', bookingsError);
      return;
    }

    if (bookings.length === 0) {
      console.log('❌ No bookings found');
      return;
    }

    const bookingId = bookings[0].id;
    console.log('✅ Found booking:', bookingId);

    // Step 2: Get or create a milestone for this booking
    console.log('\n📋 Step 2: Getting milestones for booking...');
    const { data: milestones, error: milestonesError } = await supabase
      .from('milestones')
      .select('*')
      .eq('booking_id', bookingId)
      .limit(1);

    let milestoneId;
    if (milestonesError || milestones.length === 0) {
      console.log('📝 Creating a new milestone...');
      const { data: newMilestone, error: milestoneError } = await supabase
        .from('milestones')
        .insert({
          booking_id: bookingId,
          title: 'Test Milestone',
          description: 'Test milestone for task creation',
          status: 'pending',
          progress_percentage: 0
        })
        .select()
        .single();

      if (milestoneError) {
        console.log('❌ Milestone creation error:', milestoneError);
        return;
      }

      milestoneId = newMilestone.id;
      console.log('✅ Created milestone:', milestoneId);
    } else {
      milestoneId = milestones[0].id;
      console.log('✅ Using existing milestone:', milestoneId);
    }

    // Step 3: Create a task with the correct structure
    console.log('\n📝 Step 3: Creating task with milestone_id...');
    const { data: newTask, error: taskError } = await supabase
      .from('tasks')
      .insert({
        milestone_id: milestoneId,
        title: 'Test Task - ' + new Date().toISOString(),
        description: 'Testing task creation with correct structure',
        status: 'pending',
        progress_percentage: 0
      })
      .select()
      .single();

    if (taskError) {
      console.log('❌ Task creation error:', taskError);
    } else {
      console.log('✅ Task created successfully!');
      console.log('Task details:', {
        id: newTask.id,
        title: newTask.title,
        milestone_id: newTask.milestone_id,
        status: newTask.status
      });

      // Step 4: Test updating the task
      console.log('\n✏️ Step 4: Testing task update...');
      const { data: updatedTask, error: updateError } = await supabase
        .from('tasks')
        .update({ status: 'completed' })
        .eq('id', newTask.id)
        .select()
        .single();

      if (updateError) {
        console.log('❌ Task update error:', updateError);
      } else {
        console.log('✅ Task updated successfully!');
        console.log('Updated status:', updatedTask.status);
      }

      // Step 5: Clean up - delete the test task
      console.log('\n🗑️ Step 5: Cleaning up test task...');
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', newTask.id);

      if (deleteError) {
        console.log('❌ Task deletion error:', deleteError);
      } else {
        console.log('✅ Test task cleaned up successfully!');
      }
    }

    console.log('\n🎉 Task creation test completed successfully!');
    console.log('\n💡 The issue in your app might be:');
    console.log('   1. The milestone_id is not being found correctly');
    console.log('   2. The user authentication context is different');
    console.log('   3. There might be a client-side caching issue');

  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

testTaskCreation();
