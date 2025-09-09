const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key'
const supabase = createClient(supabaseUrl, supabaseKey)

async function debugEmailIssue() {
  console.log('🔍 Debugging Email Notification Issue...\n')

  try {
    // 1. Check if email notification tables exist
    console.log('1️⃣ Checking email notification tables...')
    
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['email_notification_logs', 'user_email_preferences'])

    if (tablesError) {
      console.error('❌ Error checking tables:', tablesError)
    } else {
      console.log('✅ Email tables found:', tables.map(t => t.table_name))
    }

    // 2. Check your existing notification
    console.log('\n2️⃣ Checking your existing notification...')
    
    const { data: notifications, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', 'afd6ae15-28e8-494f-9d79-cbc2f0b04ae0')

    if (notifError) {
      console.error('❌ Error loading notification:', notifError)
    } else {
      console.log('✅ Notification found:', notifications[0])
    }

    // 3. Check if email logs exist for this notification
    console.log('\n3️⃣ Checking email logs...')
    
    const { data: emailLogs, error: logsError } = await supabase
      .from('email_notification_logs')
      .select('*')
      .eq('notification_id', 'afd6ae15-28e8-494f-9d79-cbc2f0b04ae0')

    if (logsError) {
      console.error('❌ Error loading email logs:', logsError)
      console.log('💡 This suggests the email_notification_logs table might not exist yet')
    } else {
      console.log('✅ Email logs found:', emailLogs.length, 'entries')
      if (emailLogs.length > 0) {
        console.log('📧 Email log details:', emailLogs[0])
      }
    }

    // 4. Check user email preferences
    console.log('\n4️⃣ Checking user email preferences...')
    
    const { data: preferences, error: prefError } = await supabase
      .from('user_email_preferences')
      .select('*')
      .eq('user_id', 'afd6ae15-28e8-494f-9d79-cbc2f0b04ae0')

    if (prefError) {
      console.error('❌ Error loading preferences:', prefError)
      console.log('💡 This suggests the user_email_preferences table might not exist yet')
    } else {
      console.log('✅ Email preferences found:', preferences)
    }

    // 5. Check if notification service is integrated
    console.log('\n5️⃣ Checking notification service integration...')
    
    // Look for the notification service file
    const fs = require('fs')
    const path = require('path')
    
    const servicePath = path.join(__dirname, 'lib', 'notification-service.ts')
    if (fs.existsSync(servicePath)) {
      console.log('✅ Notification service file exists')
      
      // Check if it has email integration
      const serviceContent = fs.readFileSync(servicePath, 'utf8')
      if (serviceContent.includes('emailNotificationService')) {
        console.log('✅ Email integration found in notification service')
      } else {
        console.log('❌ Email integration NOT found in notification service')
      }
    } else {
      console.log('❌ Notification service file not found')
    }

    // 6. Check if email service exists
    console.log('\n6️⃣ Checking email service...')
    
    const emailServicePath = path.join(__dirname, 'lib', 'email-notification-service.ts')
    if (fs.existsSync(emailServicePath)) {
      console.log('✅ Email notification service file exists')
    } else {
      console.log('❌ Email notification service file not found')
    }

    // 7. Check if Edge Function exists
    console.log('\n7️⃣ Checking Edge Function...')
    
    const edgeFunctionPath = path.join(__dirname, 'supabase', 'functions', 'send-email', 'index.ts')
    if (fs.existsSync(edgeFunctionPath)) {
      console.log('✅ Edge Function file exists')
    } else {
      console.log('❌ Edge Function file not found')
    }

    console.log('\n🎯 DIAGNOSIS:')
    console.log('Based on the results above, here are the likely reasons why you didn\'t receive an email:')
    console.log('')
    console.log('1. 📧 Email notification tables may not exist yet (need to run migration)')
    console.log('2. 🔗 Email integration may not be connected to your notification service')
    console.log('3. ⚙️ Edge Function may not be deployed')
    console.log('4. 📋 User email preferences may not be set up')
    console.log('')
    console.log('💡 NEXT STEPS:')
    console.log('1. Run the database migration to create email tables')
    console.log('2. Deploy the Edge Function for sending emails')
    console.log('3. Update your notification service to include email integration')
    console.log('4. Set up user email preferences')

  } catch (error) {
    console.error('❌ Debug failed:', error)
  }
}

// Run the debug
debugEmailIssue()
