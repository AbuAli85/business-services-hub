// Client-side fix for tasks permission issues
// This script will be injected into the browser console

console.log('🔧 Starting client-side tasks fix...');

// Function to test tasks access
async function testTasksAccess() {
  try {
    console.log('🧪 Testing tasks access...');
    
    // Get Supabase client
    const { createClient } = await import('https://cdn.skypack.dev/@supabase/supabase-js@2');
    const supabaseUrl = 'https://reootcngcptfogfozlmz.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb290Y25nY3B0Zm9nZm96bG16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDQzODIsImV4cCI6MjA2OTAyMDM4Mn0.WQwDpYX2M4pyPaliUqTinwy1xWWFKm4OntN2HUfP6n0';
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Check current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('❌ Session error:', sessionError);
      return;
    }
    
    if (!session) {
      console.error('❌ No active session');
      return;
    }
    
    console.log('✅ User authenticated:', session.user.id);
    
    // Get a milestone ID
    const { data: milestones, error: milestonesError } = await supabase
      .from('milestones')
      .select('id')
      .limit(1);
    
    if (milestonesError || !milestones || milestones.length === 0) {
      console.error('❌ No milestones found:', milestonesError);
      return;
    }
    
    const milestoneId = milestones[0].id;
    console.log('✅ Found milestone:', milestoneId);
    
    // Test task creation
    const { data: newTask, error: taskError } = await supabase
      .from('tasks')
      .insert({
        milestone_id: milestoneId,
        title: 'Test Task - Client Side',
        description: 'Testing from client side',
        status: 'pending',
        progress_percentage: 0
      })
      .select()
      .single();
    
    if (taskError) {
      console.error('❌ Task creation failed:', taskError);
    } else {
      console.log('✅ Task created successfully:', newTask.id);
      
      // Clean up
      await supabase
        .from('tasks')
        .delete()
        .eq('id', newTask.id);
      console.log('✅ Test task cleaned up');
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

// Function to refresh authentication
async function refreshAuth() {
  try {
    console.log('🔄 Refreshing authentication...');
    
    const { createClient } = await import('https://cdn.skypack.dev/@supabase/supabase-js@2');
    const supabaseUrl = 'https://reootcngcptfogfozlmz.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb290Y25nY3B0Zm9nZm96bG16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDQzODIsImV4cCI6MjA2OTAyMDM4Mn0.WQwDpYX2M4pyPaliUqTinwy1xWWFKm4OntN2HUfP6n0';
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Refresh the session
    const { data: { session }, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('❌ Refresh error:', error);
    } else {
      console.log('✅ Session refreshed successfully');
      console.log('👤 User ID:', session.user.id);
    }
    
  } catch (error) {
    console.error('❌ Error refreshing auth:', error);
  }
}

// Run the test
testTasksAccess();

// Make functions available globally
window.testTasksAccess = testTasksAccess;
window.refreshAuth = refreshAuth;

console.log('🔧 Client-side tasks fix loaded. Use testTasksAccess() or refreshAuth() in console.');
