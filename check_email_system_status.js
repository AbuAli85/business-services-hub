// Check the current status of your email notification system
// Run this in your browser console on your booking page

async function checkEmailSystemStatus() {
  console.log('🔍 Checking Email Notification System Status...\n')

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
      return
    }

    console.log('✅ Email tables found:', tables.map(t => t.table_name))

    // 2. Check your existing notification
    console.log('\n2️⃣ Checking your existing notification...')
    
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

    // 5. Check Edge Function availability
    console.log('\n5️⃣ Checking Edge Function...')
    
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: 'test@example.com',
          subject: 'Test Email',
          html: '<p>Test</p>',
          text: 'Test',
          notification_type: 'test',
          notification_id: 'test'
        }
      })

      if (error) {
        console.log('⚠️ Edge Function error:', error.message)
      } else {
        console.log('✅ Edge Function is working:', data)
      }
    } catch (funcError) {
      console.log('❌ Edge Function not available:', funcError.message)
    }

    // 6. Summary
    console.log('\n🎯 SYSTEM STATUS SUMMARY:')
    console.log('========================')
    
    if (tables.length === 0) {
      console.log('❌ Email tables: NOT CREATED')
      console.log('💡 Action: Run the SQL migration')
    } else {
      console.log('✅ Email tables: CREATED')
    }

    if (emailLogs.length === 0) {
      console.log('❌ Email logs: NO LOGS FOUND')
      console.log('💡 Action: Check if emails are being sent')
    } else {
      console.log('✅ Email logs: WORKING')
    }

    if (!preferences || preferences.length === 0) {
      console.log('❌ Email preferences: NOT SET UP')
      console.log('💡 Action: Set up user email preferences')
    } else {
      console.log('✅ Email preferences: CONFIGURED')
    }

    console.log('\n📋 NEXT STEPS:')
    if (tables.length === 0) {
      console.log('1. Run the SQL migration: fix_email_notifications_safe.sql')
    }
    if (!preferences || preferences.length === 0) {
      console.log('2. Set up email preferences for your user')
    }
    if (emailLogs.length === 0) {
      console.log('3. Test sending an email notification')
    }

  } catch (error) {
    console.error('❌ Check failed:', error)
  }
}

// Run the check
checkEmailSystemStatus()
