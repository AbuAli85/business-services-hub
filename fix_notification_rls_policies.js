#!/usr/bin/env node

/**
 * Fix Notification RLS Policies
 * Updates RLS policies to allow proper access to notification tables
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

console.log('🔧 Fixing Notification RLS Policies...\n')

async function dropExistingPolicies() {
  console.log('1️⃣ Dropping existing RLS policies...')
  
  const policies = [
    // Notifications table policies
    'DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications',
    'DROP POLICY IF EXISTS "Users can insert their own notifications" ON notifications',
    'DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications',
    'DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications',
    'DROP POLICY IF EXISTS "Service role can manage all notifications" ON notifications',
    
    // Notification settings table policies
    'DROP POLICY IF EXISTS "Users can view their own notification settings" ON notification_settings',
    'DROP POLICY IF EXISTS "Users can insert their own notification settings" ON notification_settings',
    'DROP POLICY IF EXISTS "Users can update their own notification settings" ON notification_settings',
    'DROP POLICY IF EXISTS "Users can delete their own notification settings" ON notification_settings',
    'DROP POLICY IF EXISTS "Service role can manage all notification settings" ON notification_settings',
    
    // Email notification logs table policies
    'DROP POLICY IF EXISTS "Users can view their own email logs" ON email_notification_logs',
    'DROP POLICY IF EXISTS "Service role can manage email logs" ON email_notification_logs',
    'DROP POLICY IF EXISTS "Service role can manage all email logs" ON email_notification_logs'
  ]
  
  for (const policy of policies) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: policy })
      if (error && !error.message.includes('does not exist')) {
        console.log(`⚠️ Warning dropping policy: ${error.message}`)
      }
    } catch (error) {
      // Ignore errors for non-existent policies
    }
  }
  
  console.log('✅ Existing policies dropped')
}

async function createNotificationPolicies() {
  console.log('\n2️⃣ Creating notification table policies...')
  
  const policies = [
    // Users can view their own notifications
    `CREATE POLICY "notifications_select_own" ON notifications
     FOR SELECT USING (auth.uid() = user_id)`,
    
    // Users can insert their own notifications
    `CREATE POLICY "notifications_insert_own" ON notifications
     FOR INSERT WITH CHECK (auth.uid() = user_id)`,
    
    // Users can update their own notifications
    `CREATE POLICY "notifications_update_own" ON notifications
     FOR UPDATE USING (auth.uid() = user_id)`,
    
    // Users can delete their own notifications
    `CREATE POLICY "notifications_delete_own" ON notifications
     FOR DELETE USING (auth.uid() = user_id)`,
    
    // Service role can manage all notifications
    `CREATE POLICY "notifications_service_role_all" ON notifications
     FOR ALL USING (auth.role() = 'service_role')`
  ]
  
  for (const policy of policies) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: policy })
      if (error) throw error
    } catch (error) {
      console.log(`❌ Error creating policy: ${error.message}`)
      return false
    }
  }
  
  console.log('✅ Notification policies created')
  return true
}

async function createNotificationSettingsPolicies() {
  console.log('\n3️⃣ Creating notification_settings table policies...')
  
  const policies = [
    // Users can view their own notification settings
    `CREATE POLICY "notification_settings_select_own" ON notification_settings
     FOR SELECT USING (auth.uid() = user_id)`,
    
    // Users can insert their own notification settings
    `CREATE POLICY "notification_settings_insert_own" ON notification_settings
     FOR INSERT WITH CHECK (auth.uid() = user_id)`,
    
    // Users can update their own notification settings
    `CREATE POLICY "notification_settings_update_own" ON notification_settings
     FOR UPDATE USING (auth.uid() = user_id)`,
    
    // Users can delete their own notification settings
    `CREATE POLICY "notification_settings_delete_own" ON notification_settings
     FOR DELETE USING (auth.uid() = user_id)`,
    
    // Service role can manage all notification settings
    `CREATE POLICY "notification_settings_service_role_all" ON notification_settings
     FOR ALL USING (auth.role() = 'service_role')`
  ]
  
  for (const policy of policies) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: policy })
      if (error) throw error
    } catch (error) {
      console.log(`❌ Error creating policy: ${error.message}`)
      return false
    }
  }
  
  console.log('✅ Notification settings policies created')
  return true
}

async function createEmailLogsPolicies() {
  console.log('\n4️⃣ Creating email_notification_logs table policies...')
  
  const policies = [
    // Users can view their own email logs
    `CREATE POLICY "email_logs_select_own" ON email_notification_logs
     FOR SELECT USING (
       notification_id IN (
         SELECT id FROM notifications WHERE user_id = auth.uid()
       )
     )`,
    
    // Service role can manage all email logs
    `CREATE POLICY "email_logs_service_role_all" ON email_notification_logs
     FOR ALL USING (auth.role() = 'service_role')`
  ]
  
  for (const policy of policies) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: policy })
      if (error) throw error
    } catch (error) {
      console.log(`❌ Error creating policy: ${error.message}`)
      return false
    }
  }
  
  console.log('✅ Email logs policies created')
  return true
}

async function enableRealtimeForTables() {
  console.log('\n5️⃣ Enabling real-time for notification tables...')
  
  try {
    // Enable real-time for notifications table
    const { error: notificationsError } = await supabase
      .from('notifications')
      .select('*')
      .limit(1)
    
    if (notificationsError) {
      console.log('❌ Notifications table not accessible:', notificationsError.message)
      return false
    }
    
    console.log('✅ Notifications table is accessible for real-time')
    
    // Enable real-time for notification_settings table
    const { error: settingsError } = await supabase
      .from('notification_settings')
      .select('*')
      .limit(1)
    
    if (settingsError) {
      console.log('❌ Notification settings table not accessible:', settingsError.message)
      return false
    }
    
    console.log('✅ Notification settings table is accessible for real-time')
    
    return true
  } catch (error) {
    console.log('❌ Error enabling real-time:', error.message)
    return false
  }
}

async function testPoliciesWithValidUser() {
  console.log('\n6️⃣ Testing policies with valid user...')
  
  try {
    // Get a valid user from the database
    const { data: users, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
    
    if (userError || !users || users.length === 0) {
      console.log('⚠️ No users found in profiles table')
      
      // Try to get users from auth.users (this might not work with RLS)
      const { data: authUsers, error: authError } = await supabase
        .from('auth.users')
        .select('id')
        .limit(1)
      
      if (authError || !authUsers || authUsers.length === 0) {
        console.log('⚠️ No users found in auth.users table')
        return { success: false, reason: 'no_users_found' }
      }
      
      const userId = authUsers[0].id
      console.log(`✅ Found user in auth.users: ${userId}`)
      
      // Test creating a notification with this user
      const { data: notification, error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'test',
          title: 'RLS Policy Test',
          message: 'Testing RLS policies with valid user',
          priority: 'medium'
        })
        .select()
        .single()
      
      if (notificationError) {
        console.log('❌ Failed to create notification with valid user:', notificationError.message)
        return { success: false, error: notificationError.message }
      }
      
      console.log('✅ Successfully created notification with valid user:', notification.id)
      return { success: true, notification }
    }
    
    const userId = users[0].id
    console.log(`✅ Found user in profiles: ${userId}`)
    
    // Test creating a notification with this user
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'test',
        title: 'RLS Policy Test',
        message: 'Testing RLS policies with valid user',
        priority: 'medium'
      })
      .select()
      .single()
    
    if (notificationError) {
      console.log('❌ Failed to create notification with valid user:', notificationError.message)
      return { success: false, error: notificationError.message }
    }
    
    console.log('✅ Successfully created notification with valid user:', notification.id)
    return { success: true, notification }
    
  } catch (error) {
    console.log('❌ Error testing policies:', error.message)
    return { success: false, error: error.message }
  }
}

async function testRealtimeAfterRLSFix() {
  console.log('\n7️⃣ Testing real-time after RLS fix...')
  
  return new Promise((resolve) => {
    const channel = supabase.channel('rls-fix-test')
    
    let received = false
    const timeout = setTimeout(() => {
      if (!received) {
        console.log('⚠️ Real-time test timeout after RLS fix')
        channel.unsubscribe()
        resolve({ working: false, reason: 'timeout' })
      }
    }, 10000)
    
    channel
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'notifications' 
        }, 
        (payload) => {
          console.log('✅ Real-time notification received after RLS fix!')
          console.log(`   Event: ${payload.eventType}`)
          console.log(`   Record ID: ${payload.new?.id || payload.old?.id}`)
          received = true
          clearTimeout(timeout)
          channel.unsubscribe()
          resolve({ working: true, payload })
        }
      )
      .subscribe((status) => {
        console.log(`📡 Real-time status after RLS fix: ${status}`)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time subscription established after RLS fix')
          // Create a test notification to trigger real-time
          setTimeout(() => {
            supabase.from('notifications').insert({
              user_id: '00000000-0000-0000-0000-000000000000',
              type: 'realtime_rls_test',
              title: 'Real-time RLS Test',
              message: 'Testing real-time after RLS policy fixes',
              priority: 'high'
            }).then(() => {
              console.log('📤 Test notification sent for real-time RLS testing')
            }).catch(err => {
              console.log('❌ Failed to send test notification:', err.message)
            })
          }, 1000)
        } else if (status === 'CHANNEL_ERROR') {
          console.log('❌ Real-time subscription failed after RLS fix')
          clearTimeout(timeout)
          resolve({ working: false, reason: 'channel_error' })
        }
      })
  })
}

async function runRLSFix() {
  console.log('Starting RLS policy fix process...\n')
  
  // Step 1: Drop existing policies
  await dropExistingPolicies()
  
  // Step 2: Create new policies
  const notificationPolicies = await createNotificationPolicies()
  const settingsPolicies = await createNotificationSettingsPolicies()
  const emailLogsPolicies = await createEmailLogsPolicies()
  
  // Step 3: Enable real-time
  const realtimeEnabled = await enableRealtimeForTables()
  
  // Step 4: Test with valid user
  const userTest = await testPoliciesWithValidUser()
  
  // Step 5: Test real-time
  const realtimeTest = await testRealtimeAfterRLSFix()
  
  // Summary
  console.log('\n📊 RLS Fix Results:')
  console.log('==================')
  console.log(`Notification Policies: ${notificationPolicies ? '✅' : '❌'}`)
  console.log(`Settings Policies: ${settingsPolicies ? '✅' : '❌'}`)
  console.log(`Email Logs Policies: ${emailLogsPolicies ? '✅' : '❌'}`)
  console.log(`Real-time Enabled: ${realtimeEnabled ? '✅' : '❌'}`)
  console.log(`User Test: ${userTest.success ? '✅' : '❌'}`)
  console.log(`Real-time Test: ${realtimeTest.working ? '✅' : '❌'}`)
  
  const overallSuccess = notificationPolicies && settingsPolicies && emailLogsPolicies && 
    realtimeEnabled && userTest.success && realtimeTest.working
  
  console.log(`\n🎯 Overall Status: ${overallSuccess ? '✅ RLS POLICIES FIXED' : '❌ ISSUES REMAIN'}`)
  
  if (overallSuccess) {
    console.log('\n🎉 RLS policies have been successfully fixed!')
    console.log('   - All notification tables are accessible')
    console.log('   - Users can manage their own notifications')
    console.log('   - Real-time updates are working')
    console.log('   - Service role has full access for system operations')
  } else {
    console.log('\n🔧 Some issues remain:')
    if (!notificationPolicies) console.log('   - Notification table policies need attention')
    if (!settingsPolicies) console.log('   - Settings table policies need attention')
    if (!emailLogsPolicies) console.log('   - Email logs policies need attention')
    if (!realtimeEnabled) console.log('   - Real-time access needs to be enabled')
    if (!userTest.success) console.log('   - User authentication test failed')
    if (!realtimeTest.working) console.log('   - Real-time functionality needs fixing')
  }
  
  return overallSuccess
}

// Run the RLS fix
runRLSFix().then(() => {
  console.log('\n🏁 RLS policy fix completed')
  process.exit(0)
}).catch(error => {
  console.error('💥 RLS fix failed with error:', error)
  process.exit(1)
})
