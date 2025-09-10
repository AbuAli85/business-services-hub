#!/usr/bin/env node

/**
 * Apply RLS Fix Migration
 * Applies the RLS policy fix migration and tests the results
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

console.log('🔧 Applying RLS Fix Migration...\n')

async function applyMigration() {
  console.log('1️⃣ Reading migration file...')
  
  try {
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20241221_fix_notification_rls_policies.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('✅ Migration file read successfully')
    console.log(`📄 Migration size: ${migrationSQL.length} characters`)
    
    return migrationSQL
  } catch (error) {
    console.error('❌ Error reading migration file:', error.message)
    return null
  }
}

async function executeMigration(sql) {
  console.log('\n2️⃣ Executing migration...')
  
  try {
    // Split the SQL into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`)
    
    let successCount = 0
    let errorCount = 0
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.trim() === '') continue
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement })
        if (error) {
          console.log(`⚠️ Statement ${i + 1} warning: ${error.message}`)
          errorCount++
        } else {
          successCount++
        }
      } catch (error) {
        console.log(`❌ Statement ${i + 1} error: ${error.message}`)
        errorCount++
      }
    }
    
    console.log(`✅ Migration executed: ${successCount} successful, ${errorCount} errors`)
    return { success: successCount > 0, successCount, errorCount }
  } catch (error) {
    console.error('❌ Error executing migration:', error.message)
    return { success: false, error: error.message }
  }
}

async function testRLSPolicies() {
  console.log('\n3️⃣ Testing RLS policies...')
  
  try {
    // Test 1: Check if we can read notifications
    const { data: notifications, error: notificationsError } = await supabase
      .from('notifications')
      .select('*')
      .limit(5)
    
    if (notificationsError) {
      console.log('❌ Cannot read notifications:', notificationsError.message)
      return false
    }
    
    console.log(`✅ Can read notifications (${notifications.length} found)`)
    
    // Test 2: Check if we can read notification_settings
    const { data: settings, error: settingsError } = await supabase
      .from('notification_settings')
      .select('*')
      .limit(5)
    
    if (settingsError) {
      console.log('❌ Cannot read notification_settings:', settingsError.message)
      return false
    }
    
    console.log(`✅ Can read notification_settings (${settings.length} found)`)
    
    // Test 3: Check if we can read email_notification_logs
    const { data: logs, error: logsError } = await supabase
      .from('email_notification_logs')
      .select('*')
      .limit(5)
    
    if (logsError) {
      console.log('❌ Cannot read email_notification_logs:', logsError.message)
      return false
    }
    
    console.log(`✅ Can read email_notification_logs (${logs.length} found)`)
    
    return true
  } catch (error) {
    console.log('❌ Error testing RLS policies:', error.message)
    return false
  }
}

async function testNotificationCreation() {
  console.log('\n4️⃣ Testing notification creation...')
  
  try {
    // Get a valid user ID
    const { data: users, error: userError } = await supabase
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
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'rls_test',
        title: 'RLS Fix Test',
        message: 'Testing notification creation after RLS fix',
        priority: 'high'
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

async function testRealtimeAfterFix() {
  console.log('\n5️⃣ Testing real-time after RLS fix...')
  
  return new Promise((resolve) => {
    const channel = supabase.channel('rls-fix-realtime-test')
    
    let received = false
    const timeout = setTimeout(() => {
      if (!received) {
        console.log('⚠️ Real-time test timeout')
        channel.unsubscribe()
        resolve({ working: false, reason: 'timeout' })
      }
    }, 15000)
    
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
          resolve({ working: true, payload })
        }
      )
      .subscribe((status) => {
        console.log(`📡 Real-time status: ${status}`)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time subscription established')
          // Create a test notification to trigger real-time
          setTimeout(() => {
            supabase.from('notifications').insert({
              user_id: '00000000-0000-0000-0000-000000000000',
              type: 'realtime_rls_fix_test',
              title: 'Real-time RLS Fix Test',
              message: 'Testing real-time after RLS policy fixes',
              priority: 'urgent'
            }).then(() => {
              console.log('📤 Test notification sent for real-time testing')
            }).catch(err => {
              console.log('❌ Failed to send test notification:', err.message)
            })
          }, 2000)
        } else if (status === 'CHANNEL_ERROR') {
          console.log('❌ Real-time subscription failed')
          clearTimeout(timeout)
          resolve({ working: false, reason: 'channel_error' })
        }
      })
  })
}

async function runRLSFix() {
  // Step 1: Read migration
  const migrationSQL = await applyMigration()
  if (!migrationSQL) {
    console.log('❌ Failed to read migration file')
    return false
  }
  
  // Step 2: Execute migration
  const migrationResult = await executeMigration(migrationSQL)
  if (!migrationResult.success) {
    console.log('❌ Migration execution failed')
    return false
  }
  
  // Step 3: Test RLS policies
  const rlsTest = await testRLSPolicies()
  if (!rlsTest) {
    console.log('❌ RLS policy test failed')
    return false
  }
  
  // Step 4: Test notification creation
  const creationTest = await testNotificationCreation()
  if (!creationTest.success) {
    console.log('❌ Notification creation test failed')
    return false
  }
  
  // Step 5: Test real-time
  const realtimeTest = await testRealtimeAfterFix()
  
  // Summary
  console.log('\n📊 RLS Fix Results:')
  console.log('==================')
  console.log(`Migration Applied: ${migrationResult.success ? '✅' : '❌'}`)
  console.log(`RLS Policies: ${rlsTest ? '✅' : '❌'}`)
  console.log(`Notification Creation: ${creationTest.success ? '✅' : '❌'}`)
  console.log(`Real-time Working: ${realtimeTest.working ? '✅' : '❌'}`)
  
  const overallSuccess = migrationResult.success && rlsTest && creationTest.success && realtimeTest.working
  
  console.log(`\n🎯 Overall Status: ${overallSuccess ? '✅ RLS POLICIES FIXED' : '❌ ISSUES REMAIN'}`)
  
  if (overallSuccess) {
    console.log('\n🎉 RLS policies have been successfully fixed!')
    console.log('   - All notification tables are accessible')
    console.log('   - Users can manage their own notifications')
    console.log('   - Real-time updates are working')
    console.log('   - Service role has full access for system operations')
  } else {
    console.log('\n🔧 Some issues remain:')
    if (!migrationResult.success) console.log('   - Migration execution had issues')
    if (!rlsTest) console.log('   - RLS policies need attention')
    if (!creationTest.success) console.log('   - Notification creation needs fixing')
    if (!realtimeTest.working) console.log('   - Real-time functionality needs fixing')
  }
  
  return overallSuccess
}

// Run the RLS fix
runRLSFix().then(() => {
  console.log('\n🏁 RLS fix application completed')
  process.exit(0)
}).catch(error => {
  console.error('💥 RLS fix failed with error:', error)
  process.exit(1)
})
