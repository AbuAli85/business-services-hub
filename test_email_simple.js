// Simple test to verify email notifications are working
// Run this in your browser console on your booking page

async function testEmailNotifications() {
  console.log('🧪 Testing Email Notifications...\n')

  try {
    // 1. Check if email tables exist
    console.log('1️⃣ Checking email tables...')
    
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['email_notification_logs', 'user_email_preferences'])

    if (tablesError) {
      console.error('❌ Error checking tables:', tablesError)
      console.log('💡 You need to run the SQL migration first')
      return
    }

    console.log('✅ Email tables found:', tables.map(t => t.table_name))

    // 2. Check your existing notification
    console.log('\n2️⃣ Checking your notification...')
    
    const { data: notifications, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', 'afd6ae15-28e8-494f-9d79-cbc2f0b04ae0')

    if (notifError) {
      console.error('❌ Error loading notification:', notifError)
      return
    }

    console.log('✅ Notification found:', notifications[0])

    // 3. Check email logs for this notification
    console.log('\n3️⃣ Checking email logs...')
    
    const { data: emailLogs, error: logsError } = await supabase
      .from('email_notification_logs')
      .select('*')
      .eq('notification_id', 'afd6ae15-28e8-494f-9d79-cbc2f0b04ae0')

    if (logsError) {
      console.error('❌ Error loading email logs:', logsError)
      console.log('💡 Email logs table might not exist yet')
    } else {
      console.log('✅ Email logs found:', emailLogs.length, 'entries')
      if (emailLogs.length > 0) {
        console.log('📧 Latest email log:', emailLogs[0])
      } else {
        console.log('ℹ️ No email logs found - this means no email was sent')
      }
    }

    // 4. Check user email preferences
    console.log('\n4️⃣ Checking email preferences...')
    
    const { data: preferences, error: prefError } = await supabase
      .from('user_email_preferences')
      .select('*')
      .eq('user_id', 'afd6ae15-28e8-494f-9d79-cbc2f0b04ae0')

    if (prefError) {
      console.error('❌ Error loading preferences:', prefError)
      console.log('💡 Email preferences table might not exist yet')
    } else {
      console.log('✅ Email preferences found:', preferences)
    }

    // 5. Test sending an email for your existing notification
    console.log('\n5️⃣ Testing email sending...')
    
    try {
      // Import the notification service (this would work in a real Next.js environment)
      const { notificationService } = await import('/lib/notification-service')
      
      const emailResult = await notificationService.sendEmailNotification('afd6ae15-28e8-494f-9d79-cbc2f0b04ae0')
      console.log('✅ Email sending test result:', emailResult)
    } catch (emailError) {
      console.log('⚠️ Email service test (expected in browser):', emailError.message)
    }

    console.log('\n🎯 DIAGNOSIS:')
    if (tables.length === 0) {
      console.log('❌ Email tables don\'t exist - run the SQL migration first')
    } else if (emailLogs.length === 0) {
      console.log('❌ No email logs found - email wasn\'t sent for your notification')
      console.log('💡 This could be because:')
      console.log('   - Email preferences are disabled')
      console.log('   - Email service isn\'t working')
      console.log('   - Edge Function isn\'t deployed')
    } else {
      console.log('✅ Email system is working! Check your email inbox')
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testEmailNotifications()
