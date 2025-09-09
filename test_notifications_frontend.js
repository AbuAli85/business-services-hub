// Test notifications system from frontend
// Run this in your browser console

const testNotificationsFrontend = async () => {
  try {
    console.log('🧪 Testing Notifications System...')
    
    // Check if supabase is available
    if (typeof supabase === 'undefined') {
      console.error('❌ Supabase client not found. Make sure you are on a page with Supabase loaded.')
      return
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('❌ No user logged in:', userError)
      return
    }
    
    console.log('✅ User found:', user.id)

    // Test 1: Create a notification
    console.log('📝 Creating test notification...')
    const { data: notification, error: createError } = await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        type: 'task_created',
        title: 'Frontend Test Notification',
        message: 'This notification was created from the frontend test',
        priority: 'medium',
        data: { test: true, source: 'frontend' }
      })
      .select()
      .single()

    if (createError) {
      console.error('❌ Error creating notification:', createError)
      return
    }
    
    console.log('✅ Notification created successfully:', notification)

    // Test 2: Fetch notifications
    console.log('📖 Fetching notifications...')
    const { data: notifications, error: fetchError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)

    if (fetchError) {
      console.error('❌ Error fetching notifications:', fetchError)
      return
    }
    
    console.log('✅ Notifications fetched successfully:', notifications)

    // Test 3: Update notification (mark as read)
    console.log('✏️ Marking notification as read...')
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notification.id)

    if (updateError) {
      console.error('❌ Error updating notification:', updateError)
      return
    }
    
    console.log('✅ Notification marked as read successfully')

    // Test 4: Check notification settings
    console.log('⚙️ Checking notification settings...')
    const { data: settings, error: settingsError } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (settingsError) {
      console.warn('⚠️ Notification settings not found (this is okay if not created yet):', settingsError)
    } else {
      console.log('✅ Notification settings found:', settings)
    }

    // Test 5: Clean up test notification
    console.log('🧹 Cleaning up test notification...')
    const { error: deleteError } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notification.id)

    if (deleteError) {
      console.error('❌ Error deleting test notification:', deleteError)
      return
    }
    
    console.log('✅ Test notification cleaned up successfully')
    console.log('🎉 All tests passed! Notifications system is working correctly!')
    
    return {
      success: true,
      message: 'Notifications system is working correctly!'
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Run the test
testNotificationsFrontend()
