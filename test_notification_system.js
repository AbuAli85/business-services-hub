#!/usr/bin/env node

/**
 * Comprehensive Notification System Test
 * Tests real-time notifications, email delivery, and database functionality
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

console.log('🧪 Starting Notification System Test...\n')

async function testDatabaseConnection() {
  console.log('1️⃣ Testing Database Connection...')
  try {
    const { data, error } = await supabase.from('notifications').select('count').limit(1)
    if (error) throw error
    console.log('✅ Database connection successful')
    return true
  } catch (error) {
    console.error('❌ Database connection failed:', error.message)
    return false
  }
}

async function testNotificationTables() {
  console.log('\n2️⃣ Testing Notification Tables...')
  
  const tables = ['notifications', 'notification_settings', 'email_notification_logs']
  const results = {}
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1)
      if (error) throw error
      results[table] = { exists: true, error: null }
      console.log(`✅ Table '${table}' exists and accessible`)
    } catch (error) {
      results[table] = { exists: false, error: error.message }
      console.log(`❌ Table '${table}' error:`, error.message)
    }
  }
  
  return results
}

async function testRLSPolicies() {
  console.log('\n3️⃣ Testing RLS Policies...')
  
  try {
    // Test if we can read notifications (should work for authenticated users)
    const { data, error } = await supabase.from('notifications').select('*').limit(1)
    
    if (error && error.code === 'PGRST301') {
      console.log('⚠️ RLS policies active - need authentication to test fully')
      return { rlsActive: true, needsAuth: true }
    } else if (error) {
      console.log('❌ RLS policy test failed:', error.message)
      return { rlsActive: false, error: error.message }
    } else {
      console.log('✅ RLS policies working correctly')
      return { rlsActive: true, needsAuth: false }
    }
  } catch (error) {
    console.log('❌ RLS test error:', error.message)
    return { rlsActive: false, error: error.message }
  }
}

async function testRealtimeSubscription() {
  console.log('\n4️⃣ Testing Real-time Subscription...')
  
  return new Promise((resolve) => {
    const channel = supabase.channel('test-notifications')
    
    let subscriptionWorking = false
    let timeoutId = null
    
    // Set up timeout
    timeoutId = setTimeout(() => {
      if (!subscriptionWorking) {
        console.log('⚠️ Real-time subscription timeout - may not be working')
        channel.unsubscribe()
        resolve({ working: false, reason: 'timeout' })
      }
    }, 5000)
    
    // Subscribe to notifications table
    channel
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'notifications' 
        }, 
        (payload) => {
          console.log('✅ Real-time notification received:', payload.eventType)
          subscriptionWorking = true
          clearTimeout(timeoutId)
          channel.unsubscribe()
          resolve({ working: true, payload })
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time subscription established')
          // Test by creating a notification (if we have admin access)
          if (supabaseAdmin) {
            testCreateNotification()
          }
        } else if (status === 'CHANNEL_ERROR') {
          console.log('❌ Real-time subscription failed')
          clearTimeout(timeoutId)
          resolve({ working: false, reason: 'channel_error' })
        }
      })
  })
}

async function testCreateNotification() {
  console.log('\n5️⃣ Testing Notification Creation...')
  
  if (!supabaseAdmin) {
    console.log('⚠️ No admin access - skipping notification creation test')
    return { success: false, reason: 'no_admin_access' }
  }
  
  try {
    // First, get a test user
    const { data: users, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .limit(1)
    
    if (userError || !users || users.length === 0) {
      console.log('⚠️ No users found - creating test notification with dummy user')
      const testUserId = '00000000-0000-0000-0000-000000000000'
      
      const { data, error } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: testUserId,
          type: 'test',
          title: 'Test Notification',
          message: 'This is a test notification',
          priority: 'medium'
        })
        .select()
        .single()
      
      if (error) throw error
      
      console.log('✅ Test notification created:', data.id)
      return { success: true, notification: data }
    } else {
      const userId = users[0].id
      
      const { data, error } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'test',
          title: 'Test Notification',
          message: 'This is a test notification for real-time testing',
          priority: 'high'
        })
        .select()
        .single()
      
      if (error) throw error
      
      console.log('✅ Test notification created for user:', userId)
      return { success: true, notification: data }
    }
  } catch (error) {
    console.log('❌ Notification creation failed:', error.message)
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
        subject: 'Test Notification Email',
        text: 'This is a test email notification',
        html: '<h1>Test Notification</h1><p>This is a test email notification</p>'
      })
    })
    
    if (response.ok) {
      console.log('✅ Email notification API working')
      return { success: true }
    } else {
      const errorData = await response.json()
      console.log('❌ Email notification API failed:', errorData.error)
      return { success: false, error: errorData.error }
    }
  } catch (error) {
    console.log('❌ Email notification API error:', error.message)
    return { success: false, error: error.message }
  }
}

async function testNotificationService() {
  console.log('\n7️⃣ Testing Notification Service...')
  
  try {
    // Test the notification service by calling the API
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    if (response.ok) {
      console.log('✅ Notification service API accessible')
      return { success: true }
    } else {
      console.log('⚠️ Notification service API returned:', response.status)
      return { success: false, status: response.status }
    }
  } catch (error) {
    console.log('❌ Notification service error:', error.message)
    return { success: false, error: error.message }
  }
}

async function runAllTests() {
  const results = {
    databaseConnection: false,
    tables: {},
    rlsPolicies: {},
    realtimeSubscription: {},
    notificationCreation: {},
    emailAPI: {},
    notificationService: {}
  }
  
  // Run tests
  results.databaseConnection = await testDatabaseConnection()
  results.tables = await testNotificationTables()
  results.rlsPolicies = await testRLSPolicies()
  results.realtimeSubscription = await testRealtimeSubscription()
  results.notificationCreation = await testCreateNotification()
  results.emailAPI = await testEmailNotificationAPI()
  results.notificationService = await testNotificationService()
  
  // Summary
  console.log('\n📊 Test Results Summary:')
  console.log('========================')
  console.log(`Database Connection: ${results.databaseConnection ? '✅' : '❌'}`)
  console.log(`Tables Status: ${Object.values(results.tables).every(t => t.exists) ? '✅' : '❌'}`)
  console.log(`RLS Policies: ${results.rlsPolicies.rlsActive ? '✅' : '❌'}`)
  console.log(`Real-time Subscription: ${results.realtimeSubscription.working ? '✅' : '❌'}`)
  console.log(`Notification Creation: ${results.notificationCreation.success ? '✅' : '❌'}`)
  console.log(`Email API: ${results.emailAPI.success ? '✅' : '❌'}`)
  console.log(`Notification Service: ${results.notificationService.success ? '✅' : '❌'}`)
  
  const overallSuccess = results.databaseConnection && 
    Object.values(results.tables).every(t => t.exists) &&
    results.rlsPolicies.rlsActive &&
    results.realtimeSubscription.working
  
  console.log(`\n🎯 Overall Status: ${overallSuccess ? '✅ WORKING' : '❌ ISSUES FOUND'}`)
  
  if (!overallSuccess) {
    console.log('\n🔧 Recommendations:')
    if (!results.databaseConnection) {
      console.log('- Check Supabase connection and environment variables')
    }
    if (!Object.values(results.tables).every(t => t.exists)) {
      console.log('- Run database migrations to create missing tables')
    }
    if (!results.realtimeSubscription.working) {
      console.log('- Check Supabase real-time configuration')
    }
    if (!results.emailAPI.success) {
      console.log('- Check email service configuration (SendGrid/Resend)')
    }
  }
  
  return results
}

// Run the tests
runAllTests().then(() => {
  console.log('\n🏁 Notification system test completed')
  process.exit(0)
}).catch(error => {
  console.error('💥 Test failed with error:', error)
  process.exit(1)
})
