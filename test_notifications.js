// Test script to verify notifications system works
// Run this in your browser console or as a Node.js script

const testNotifications = async () => {
  try {
    // Test creating a notification
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('No user logged in')
      return
    }

    console.log('Testing notifications system...')
    console.log('User ID:', user.id)

    // Test notification creation
    const { data: notification, error: createError } = await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        type: 'task_created',
        title: 'Test Notification',
        message: 'This is a test notification to verify the system works',
        priority: 'medium',
        data: { test: true }
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating notification:', createError)
      return
    }

    console.log('✅ Notification created successfully:', notification)

    // Test fetching notifications
    const { data: notifications, error: fetchError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('Error fetching notifications:', fetchError)
      return
    }

    console.log('✅ Notifications fetched successfully:', notifications)

    // Test notification settings
    const { data: settings, error: settingsError } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (settingsError) {
      console.error('Error fetching notification settings:', settingsError)
      return
    }

    console.log('✅ Notification settings fetched successfully:', settings)

    // Test marking notification as read
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notification.id)

    if (updateError) {
      console.error('Error updating notification:', updateError)
      return
    }

    console.log('✅ Notification marked as read successfully')

    // Clean up test notification
    const { error: deleteError } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notification.id)

    if (deleteError) {
      console.error('Error deleting test notification:', deleteError)
      return
    }

    console.log('✅ Test notification cleaned up successfully')
    console.log('🎉 Notifications system is working correctly!')

  } catch (error) {
    console.error('Test failed:', error)
  }
}

// Run the test
testNotifications()
