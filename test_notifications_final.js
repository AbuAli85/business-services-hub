#!/usr/bin/env node

/**
 * Final Notification System Test
 * Tests the complete notification system after fixes
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

console.log('🧪 Final Notification System Test...\n')

async function testDatabaseTables() {
  console.log('1️⃣ Testing Database Tables...')
  
  const tables = ['notifications', 'notification_settings', 'email_notification_logs']
  const results = {}
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1)
      if (error) throw error
      results[table] = { exists: true, accessible: true }
      console.log(`✅ Table '${table}' exists and accessible`)
    } catch (error) {
      results[table] = { exists: false, accessible: false, error: error.message }
      console.log(`❌ Table '${table}' error:`, error.message)
    }
  }
  
  return results
}

async function testNotificationCreation() {
  console.log('\n2️⃣ Testing Notification Creation...')
  
  if (!supabaseAdmin) {
    console.log('⚠️ No admin access - skipping notification creation test')
    return { success: false, reason: 'no_admin_access' }
  }
  
  try {
    // Create a test notification
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000',
        type: 'test',
        title: 'Test Notification - Final Test',
        message: 'This is a test notification to verify the system is working',
        priority: 'high',
        data: { test: true, timestamp: new Date().toISOString() }
      })
      .select()
      .single()
    
    if (error) throw error
    
    console.log('✅ Test notification created:', data.id)
    return { success: true, notification: data }
  } catch (error) {
    console.log('❌ Notification creation failed:', error.message)
    return { success: false, error: error.message }
  }
}

async function testRealtimeSubscription() {
  console.log('\n3️⃣ Testing Real-time Subscription...')
  
  return new Promise((resolve) => {
    const channel = supabase.channel('final-test-notifications')
    
    let subscriptionWorking = false
    let timeoutId = null
    
    // Set up timeout
    timeoutId = setTimeout(() => {
      if (!subscriptionWorking) {
        console.log('⚠️ Real-time subscription timeout')
        channel.unsubscribe()
        resolve({ working: false, reason: 'timeout' })
      }
    }, 8000)
    
    // Subscribe to notifications table
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
          console.log(`   Table: ${payload.table}`)
          console.log(`   Record ID: ${payload.new?.id || payload.old?.id}`)
          subscriptionWorking = true
          clearTimeout(timeoutId)
          channel.unsubscribe()
          resolve({ working: true, payload })
        }
      )
      .subscribe((status) => {
        console.log(`📡 Subscription status: ${status}`)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time subscription established')
          // Trigger a notification creation to test real-time
          if (supabaseAdmin) {
            setTimeout(() => {
              supabaseAdmin.from('notifications').insert({
                user_id: '00000000-0000-0000-0000-000000000000',
                type: 'realtime_test',
                title: 'Real-time Test Notification',
                message: 'This notification should trigger real-time updates',
                priority: 'medium'
              }).then(() => {
                console.log('📤 Test notification sent for real-time testing')
              }).catch(err => {
                console.log('❌ Failed to send test notification:', err.message)
              })
            }, 1000)
          }
        } else if (status === 'CHANNEL_ERROR') {
          console.log('❌ Real-time subscription failed')
          clearTimeout(timeoutId)
          resolve({ working: false, reason: 'channel_error' })
        }
      })
  })
}

async function testNotificationQueries() {
  console.log('\n4️⃣ Testing Notification Queries...')
  
  try {
    // Test basic query
    const { data: allNotifications, error: allError } = await supabase
      .from('notifications')
      .select('*')
      .limit(5)
    
    if (allError) throw allError
    console.log(`✅ Basic query successful - found ${allNotifications.length} notifications`)
    
    // Test filtered query
    const { data: testNotifications, error: testError } = await supabase
      .from('notifications')
      .select('*')
      .eq('type', 'test')
      .limit(5)
    
    if (testError) throw testError
    console.log(`✅ Filtered query successful - found ${testNotifications.length} test notifications`)
    
    // Test notification settings query
    const { data: settings, error: settingsError } = await supabase
      .from('notification_settings')
      .select('*')
      .limit(1)
    
    if (settingsError) throw settingsError
    console.log(`✅ Settings query successful - found ${settings.length} settings records`)
    
    return { success: true, counts: { all: allNotifications.length, test: testNotifications.length, settings: settings.length } }
  } catch (error) {
    console.log('❌ Query test failed:', error.message)
    return { success: false, error: error.message }
  }
}

async function testNotificationServiceAPI() {
  console.log('\n5️⃣ Testing Notification Service API...')
  
  try {
    // Test if the notification service is accessible
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Notification service API accessible')
      return { success: true, data }
    } else {
      console.log(`⚠️ Notification service API returned status: ${response.status}`)
      return { success: false, status: response.status }
    }
  } catch (error) {
    console.log('❌ Notification service API error:', error.message)
    return { success: false, error: error.message }
  }
}

async function testEmailNotificationAPI() {
  console.log('\n6️⃣ Testing Email Notification API...')
  
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: 'test@example.com',
        subject: 'Test Notification Email - Final Test',
        text: 'This is a test email notification to verify email functionality',
        html: '<h1>Test Notification</h1><p>This is a test email notification to verify email functionality</p>'
      })
    })
    
    if (response.ok) {
      console.log('✅ Email notification API working')
      return { success: true }
    } else {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      console.log('❌ Email notification API failed:', errorData.error)
      return { success: false, error: errorData.error }
    }
  } catch (error) {
    console.log('❌ Email notification API error:', error.message)
    return { success: false, error: error.message }
  }
}

async function runFinalTest() {
  const results = {
    databaseTables: {},
    notificationCreation: {},
    realtimeSubscription: {},
    notificationQueries: {},
    notificationServiceAPI: {},
    emailNotificationAPI: {}
  }
  
  // Run all tests
  results.databaseTables = await testDatabaseTables()
  results.notificationCreation = await testNotificationCreation()
  results.realtimeSubscription = await testRealtimeSubscription()
  results.notificationQueries = await testNotificationQueries()
  results.notificationServiceAPI = await testNotificationServiceAPI()
  results.emailNotificationAPI = await testEmailNotificationAPI()
  
  // Summary
  console.log('\n📊 Final Test Results:')
  console.log('=====================')
  console.log(`Database Tables: ${Object.values(results.databaseTables).every(t => t.exists && t.accessible) ? '✅' : '❌'}`)
  console.log(`Notification Creation: ${results.notificationCreation.success ? '✅' : '❌'}`)
  console.log(`Real-time Subscription: ${results.realtimeSubscription.working ? '✅' : '❌'}`)
  console.log(`Notification Queries: ${results.notificationQueries.success ? '✅' : '❌'}`)
  console.log(`Notification Service API: ${results.notificationServiceAPI.success ? '✅' : '❌'}`)
  console.log(`Email Notification API: ${results.emailNotificationAPI.success ? '✅' : '❌'}`)
  
  const coreFunctionality = Object.values(results.databaseTables).every(t => t.exists && t.accessible) &&
    results.notificationCreation.success &&
    results.notificationQueries.success
  
  const realtimeWorking = results.realtimeSubscription.working
  const apisWorking = results.notificationServiceAPI.success || results.emailNotificationAPI.success
  
  console.log(`\n🎯 Core Functionality: ${coreFunctionality ? '✅ WORKING' : '❌ ISSUES'}`)
  console.log(`🔄 Real-time Updates: ${realtimeWorking ? '✅ WORKING' : '❌ ISSUES'}`)
  console.log(`🌐 API Endpoints: ${apisWorking ? '✅ WORKING' : '❌ ISSUES'}`)
  
  const overallSuccess = coreFunctionality && realtimeWorking
  
  console.log(`\n🏆 Overall Status: ${overallSuccess ? '✅ FULLY FUNCTIONAL' : '❌ PARTIAL FUNCTIONALITY'}`)
  
  if (overallSuccess) {
    console.log('\n🎉 Notification system is working correctly!')
    console.log('   - Database tables are accessible')
    console.log('   - Notifications can be created and queried')
    console.log('   - Real-time updates are working')
    if (apisWorking) {
      console.log('   - API endpoints are accessible')
    }
  } else {
    console.log('\n🔧 Issues found:')
    if (!coreFunctionality) {
      console.log('   - Core database functionality has issues')
    }
    if (!realtimeWorking) {
      console.log('   - Real-time updates are not working properly')
    }
    if (!apisWorking) {
      console.log('   - API endpoints are not accessible (server may not be running)')
    }
  }
  
  return results
}

// Run the final test
runFinalTest().then(() => {
  console.log('\n🏁 Final notification system test completed')
  process.exit(0)
}).catch(error => {
  console.error('💥 Test failed with error:', error)
  process.exit(1)
})
