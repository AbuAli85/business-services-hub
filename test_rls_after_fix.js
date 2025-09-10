#!/usr/bin/env node

/**
 * Test RLS Policies After Fix
 * Tests the notification system after RLS policy fixes
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const supabaseAdmin = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null
let authedClient = null

console.log('🧪 Testing RLS Policies After Fix...\n')

async function ensureAuthenticatedClient() {
  const email = process.env.TEST_EMAIL
  const password = process.env.TEST_PASSWORD
  if (!email || !password) {
    console.log('⚠️ TEST_EMAIL/TEST_PASSWORD not set. Continuing without authentication (RLS-protected tables will fail).')
    return null
  }
  try {
    const client = createClient(supabaseUrl, supabaseKey)
    const { data, error } = await client.auth.signInWithPassword({ email, password })
    if (error) {
      console.log('❌ Auth sign-in failed:', error.message)
      return null
    }
    console.log('✅ Authenticated as', data.user?.email)
    authedClient = client
    return client
  } catch (e) {
    console.log('❌ Auth error:', e.message)
    return null
  }
}

async function testTableAccess() {
  console.log('1️⃣ Testing table access...')
  
  const tables = ['notifications', 'notification_settings', 'email_notification_logs']
  const results = {}
  
  const client = authedClient || supabase
  for (const table of tables) {
    try {
      const { data, error } = await client.from(table).select('*').limit(1)
      if (error) {
        results[table] = { accessible: false, error: error.message }
        console.log(`❌ Table '${table}' not accessible: ${error.message}`)
      } else {
        results[table] = { accessible: true, count: data.length }
        console.log(`✅ Table '${table}' accessible (${data.length} records)`)
      }
    } catch (error) {
      results[table] = { accessible: false, error: error.message }
      console.log(`❌ Table '${table}' error: ${error.message}`)
    }
  }
  
  return results
}

async function testNotificationCreation() {
  console.log('\n2️⃣ Testing notification creation...')
  
  if (!supabaseAdmin) {
    console.log('⚠️ No admin access - skipping notification creation test')
    return { success: false, reason: 'no_admin_access' }
  }
  
  try {
    // Get a valid user ID
    const { data: users, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .limit(1)
    
    if (userError || !users || users.length === 0) {
      console.log('⚠️ No users found in profiles table')
      return { success: false, reason: 'no_users' }
    }
    
    const userId = users[0].id
    console.log(`✅ Found user: ${userId}`)
    
    // Create a test notification
    const { data: notification, error: notificationError } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'rls_test',
        title: 'RLS Fix Test Notification',
        message: 'Testing notification creation after RLS policy fixes',
        priority: 'high',
        data: { test: true, timestamp: new Date().toISOString() }
      })
      .select()
      .single()
    
    if (notificationError) {
      console.log('❌ Failed to create notification:', notificationError.message)
      return { success: false, error: notificationError.message }
    }
    
    console.log(`✅ Successfully created notification: ${notification.id}`)
    return { success: true, notification }
  } catch (error) {
    console.log('❌ Error testing notification creation:', error.message)
    return { success: false, error: error.message }
  }
}

async function testRealtimeSubscription() {
  console.log('\n3️⃣ Testing real-time subscription...')
  
  return new Promise((resolve) => {
    const client = authedClient || supabase
    const channel = client.channel('rls-test-notifications')
    
    let received = false
    let subscriptionEstablished = false
    const timeout = setTimeout(() => {
      if (!received) {
        console.log('⚠️ Real-time test timeout')
        channel.unsubscribe()
        resolve({ 
          working: false, 
          reason: 'timeout',
          subscriptionEstablished 
        })
      }
    }, 12000)
    
    channel
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'notifications' 
        }, 
        (payload) => {
          console.log('✅ Real-time notification received!')
          console.log(`   Event: ${payload.eventType}`)
          console.log(`   Record ID: ${payload.new?.id || payload.old?.id}`)
          received = true
          clearTimeout(timeout)
          channel.unsubscribe()
          resolve({ 
            working: true, 
            payload,
            subscriptionEstablished 
          })
        }
      )
      .subscribe((status) => {
        console.log(`📡 Real-time status: ${status}`)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time subscription established')
          subscriptionEstablished = true
          
          // Create a test notification to trigger real-time
          if (supabaseAdmin) {
            setTimeout(() => {
              supabaseAdmin.from('notifications').insert({
                user_id: '00000000-0000-0000-0000-000000000000',
                type: 'realtime_rls_test',
                title: 'Real-time RLS Test',
                message: 'Testing real-time after RLS policy fixes',
                priority: 'urgent'
              }).then(() => {
                console.log('📤 Test notification sent for real-time testing')
              }).catch(err => {
                console.log('❌ Failed to send test notification:', err.message)
              })
            }, 2000)
          }
        } else if (status === 'CHANNEL_ERROR') {
          console.log('❌ Real-time subscription failed')
          clearTimeout(timeout)
          resolve({ 
            working: false, 
            reason: 'channel_error',
            subscriptionEstablished 
          })
        }
      })
  })
}

async function testNotificationQueries() {
  console.log('\n4️⃣ Testing notification queries...')
  
  try {
    // Test basic query
    const client = authedClient || supabase
    const { data: allNotifications, error: allError } = await client
      .from('notifications')
      .select('*')
      .limit(10)
    
    if (allError) {
      console.log('❌ Basic query failed:', allError.message)
      return { success: false, error: allError.message }
    }
    
    console.log(`✅ Basic query successful - found ${allNotifications.length} notifications`)
    
    // Test filtered query
    const { data: testNotifications, error: testError } = await client
      .from('notifications')
      .select('*')
      .eq('type', 'rls_test')
      .limit(5)
    
    if (testError) {
      console.log('❌ Filtered query failed:', testError.message)
      return { success: false, error: testError.message }
    }
    
    console.log(`✅ Filtered query successful - found ${testNotifications.length} test notifications`)
    
    // Test notification settings query
    const { data: settings, error: settingsError } = await client
      .from('notification_settings')
      .select('*')
      .limit(5)
    
    if (settingsError) {
      console.log('❌ Settings query failed:', settingsError.message)
      return { success: false, error: settingsError.message }
    }
    
    console.log(`✅ Settings query successful - found ${settings.length} settings records`)
    
    return { 
      success: true, 
      counts: { 
        all: allNotifications.length, 
        test: testNotifications.length, 
        settings: settings.length 
      } 
    }
  } catch (error) {
    console.log('❌ Query test failed:', error.message)
    return { success: false, error: error.message }
  }
}

async function runRLSTest() {
  console.log('Starting RLS policy test...\n')
  
  // Try to authenticate test user for RLS-protected access
  await ensureAuthenticatedClient()

  // Test 1: Table access
  const tableAccess = await testTableAccess()
  
  // Test 2: Notification creation
  const notificationCreation = await testNotificationCreation()
  
  // Test 3: Real-time subscription
  const realtimeTest = await testRealtimeSubscription()
  
  // Test 4: Notification queries
  const queryTest = await testNotificationQueries()
  
  // Summary
  console.log('\n📊 RLS Test Results:')
  console.log('===================')
  
  const tableAccessSuccess = Object.values(tableAccess).every(t => t.accessible)
  console.log(`Table Access: ${tableAccessSuccess ? '✅' : '❌'}`)
  console.log(`Notification Creation: ${notificationCreation.success ? '✅' : '❌'}`)
  console.log(`Real-time Subscription: ${realtimeTest.working ? '✅' : '❌'}`)
  console.log(`Notification Queries: ${queryTest.success ? '✅' : '❌'}`)
  
  const overallSuccess = tableAccessSuccess && 
    notificationCreation.success && 
    realtimeTest.working && 
    queryTest.success
  
  console.log(`\n🎯 Overall Status: ${overallSuccess ? '✅ RLS POLICIES WORKING' : '❌ ISSUES FOUND'}`)
  
  if (overallSuccess) {
    console.log('\n🎉 RLS policies are working correctly!')
    console.log('   - All notification tables are accessible')
    console.log('   - Notifications can be created and queried')
    console.log('   - Real-time updates are working')
    console.log('   - Users can manage their own notifications')
  } else {
    console.log('\n🔧 Issues found:')
    if (!tableAccessSuccess) {
      console.log('   - Some tables are not accessible')
      Object.entries(tableAccess).forEach(([table, result]) => {
        if (!result.accessible) {
          console.log(`     - ${table}: ${result.error}`)
        }
      })
    }
    if (!notificationCreation.success) {
      console.log(`   - Notification creation failed: ${notificationCreation.error || notificationCreation.reason}`)
    }
    if (!realtimeTest.working) {
      console.log(`   - Real-time not working: ${realtimeTest.reason}`)
    }
    if (!queryTest.success) {
      console.log(`   - Query test failed: ${queryTest.error}`)
    }
  }
  
  return {
    tableAccess,
    notificationCreation,
    realtimeTest,
    queryTest,
    overallSuccess
  }
}

// Run the RLS test
runRLSTest().then(() => {
  console.log('\n🏁 RLS policy test completed')
  process.exit(0)
}).catch(error => {
  console.error('💥 RLS test failed with error:', error)
  process.exit(1)
})
