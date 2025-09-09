// Test script to verify frontend notification components
// Run this in your browser console on your application

async function testFrontendNotifications() {
  console.log('🔍 Testing Frontend Notification Components...\n')

  try {
    // Step 1: Check if notification components are loaded
    console.log('📱 Step 1: Checking notification components')
    
    // Check if notification bell exists
    const notificationBell = document.querySelector('[data-testid="notification-bell"]') || 
                           document.querySelector('.notification-bell') ||
                           document.querySelector('button[aria-label*="notification"]') ||
                           document.querySelector('button[aria-label*="Notification"]')
    
    if (notificationBell) {
      console.log('   ✅ Notification bell found in header')
    } else {
      console.log('   ❌ Notification bell not found - check if it\'s properly integrated')
    }

    // Check if notification center page exists
    const notificationCenter = document.querySelector('[data-testid="notification-center"]') ||
                              document.querySelector('.notification-center')
    
    if (notificationCenter) {
      console.log('   ✅ Notification center component found')
    } else {
      console.log('   ⚠️  Notification center not found - navigate to /dashboard/notifications')
    }

    // Step 2: Test notification service
    console.log('\n🔧 Step 2: Testing notification service')
    
    try {
      // Try to import the notification service
      const { notificationService } = await import('/lib/notification-service.js')
      console.log('   ✅ Notification service imported successfully')
      
      // Test getting current user
      const { getSupabaseClient } = await import('/lib/supabase.js')
      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        console.log('   ✅ User authenticated:', user.email)
        
        // Test getting notifications
        try {
          const notifications = await notificationService.getNotifications(user.id)
          console.log('   ✅ Notifications fetched:', notifications.length, 'notifications')
          
          if (notifications.length > 0) {
            console.log('   📋 Recent notifications:')
            notifications.slice(0, 3).forEach(notif => {
              console.log(`      - ${notif.title} (${notif.type}) - ${notif.read ? 'Read' : 'Unread'}`)
            })
          } else {
            console.log('   ℹ️  No notifications found - this is normal for new users')
          }
        } catch (error) {
          console.log('   ❌ Error fetching notifications:', error.message)
        }
      } else {
        console.log('   ❌ User not authenticated - please log in first')
      }
    } catch (error) {
      console.log('   ❌ Error importing notification service:', error.message)
    }

    // Step 3: Test notification creation
    console.log('\n📝 Step 3: Testing notification creation')
    
    try {
      const { notificationTriggerService } = await import('/lib/notification-triggers.js')
      console.log('   ✅ Notification trigger service imported successfully')
      
      // Test creating a notification
      if (user) {
        try {
          const testNotification = await notificationTriggerService.triggerBookingCreated(
            user.id,
            {
              booking_id: 'test-booking-' + Date.now(),
              booking_title: 'Test Booking from Frontend',
              service_name: 'Test Service',
              actor_id: user.id,
              actor_name: user.user_metadata?.full_name || user.email
            }
          )
          console.log('   ✅ Test notification created successfully:', testNotification.id)
          console.log('   🔔 Check your notification bell - it should show 1 unread notification!')
        } catch (error) {
          console.log('   ❌ Error creating test notification:', error.message)
        }
      }
    } catch (error) {
      console.log('   ❌ Error importing trigger service:', error.message)
    }

    // Step 4: Check UI integration
    console.log('\n🖥️ Step 4: Checking UI integration')
    
    // Check if notification bell shows unread count
    const unreadBadge = document.querySelector('.notification-badge') ||
                       document.querySelector('[data-testid="notification-count"]') ||
                       document.querySelector('.badge')
    
    if (unreadBadge) {
      const count = unreadBadge.textContent || unreadBadge.innerText
      console.log('   ✅ Notification badge found with count:', count)
    } else {
      console.log('   ⚠️  Notification badge not found - check UI integration')
    }

    // Check if notification settings exist
    const settingsLink = document.querySelector('a[href*="notifications"]') ||
                        document.querySelector('a[href*="notification"]')
    
    if (settingsLink) {
      console.log('   ✅ Notification settings link found')
    } else {
      console.log('   ⚠️  Notification settings link not found - check navigation')
    }

    // Step 5: Test email notifications
    console.log('\n📧 Step 5: Testing email notifications')
    
    try {
      const { emailNotificationService } = await import('/lib/email-notification-service.js')
      console.log('   ✅ Email notification service imported successfully')
      
      // Check if user has email preferences
      if (user) {
        const { getSupabaseClient } = await import('/lib/supabase.js')
        const supabase = getSupabaseClient()
        const { data: emailPrefs } = await supabase
          .from('email_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single()
        
        if (emailPrefs) {
          console.log('   ✅ Email preferences found:', {
            email: emailPrefs.email_address,
            verified: emailPrefs.is_verified,
            template_style: emailPrefs.email_template_style,
            send_preference: emailPrefs.send_time_preference
          })
        } else {
          console.log('   ℹ️  No email preferences found - will use defaults')
        }
      }
    } catch (error) {
      console.log('   ❌ Error testing email notifications:', error.message)
    }

    console.log('\n✅ Frontend notification test completed!')
    console.log('\n🎯 What to check next:')
    console.log('   1. Look for the notification bell in your header')
    console.log('   2. Click the bell to see notifications')
    console.log('   3. Navigate to /dashboard/notifications to see the full center')
    console.log('   4. Check your email for notification emails')
    console.log('   5. Try creating a real booking to test the full flow')

  } catch (error) {
    console.error('❌ Error testing frontend notifications:', error)
  }
}

// Run the test
testFrontendNotifications()
