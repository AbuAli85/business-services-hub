#!/usr/bin/env node

/**
 * Fix Notification Tables
 * Creates missing notification tables and sets up real-time
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

console.log('🔧 Fixing Notification Tables...\n')

async function checkTables() {
  console.log('1️⃣ Checking existing tables...')
  
  try {
    // Check notifications table
    const { data: notifications, error: notificationsError } = await supabase
      .from('notifications')
      .select('*')
      .limit(1)
    
    console.log(`Notifications table: ${notificationsError ? '❌' : '✅'}`)
    
    // Check notification_settings table
    const { data: settings, error: settingsError } = await supabase
      .from('notification_settings')
      .select('*')
      .limit(1)
    
    console.log(`Notification settings table: ${settingsError ? '❌' : '✅'}`)
    
    // Check email_notification_logs table
    const { data: logs, error: logsError } = await supabase
      .from('email_notification_logs')
      .select('*')
      .limit(1)
    
    console.log(`Email notification logs table: ${logsError ? '❌' : '✅'}`)
    
    return {
      notifications: !notificationsError,
      settings: !settingsError,
      logs: !logsError
    }
  } catch (error) {
    console.error('❌ Error checking tables:', error.message)
    return { notifications: false, settings: false, logs: false }
  }
}

async function createNotificationSettingsTable() {
  console.log('\n2️⃣ Creating notification_settings table...')
  
  const sql = `
    CREATE TABLE IF NOT EXISTS notification_settings (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      email_notifications BOOLEAN DEFAULT TRUE,
      push_notifications BOOLEAN DEFAULT TRUE,
      sms_notifications BOOLEAN DEFAULT FALSE,
      notification_types JSONB DEFAULT '{}',
      quiet_hours_start TIME,
      quiet_hours_end TIME,
      digest_frequency VARCHAR(20) DEFAULT 'immediate' CHECK (digest_frequency IN ('immediate', 'hourly', 'daily', 'weekly')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id)
    );
    
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);
    
    -- Enable RLS
    ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
    
    -- RLS Policies
    CREATE POLICY "Users can view their own notification settings" ON notification_settings
      FOR SELECT USING (auth.uid() = user_id);
    
    CREATE POLICY "Users can insert their own notification settings" ON notification_settings
      FOR INSERT WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "Users can update their own notification settings" ON notification_settings
      FOR UPDATE USING (auth.uid() = user_id);
    
    CREATE POLICY "Users can delete their own notification settings" ON notification_settings
      FOR DELETE USING (auth.uid() = user_id);
    
    -- Grant permissions
    GRANT SELECT, INSERT, UPDATE, DELETE ON notification_settings TO authenticated;
  `
  
  try {
    const { error } = await supabase.rpc('exec_sql', { sql })
    if (error) throw error
    console.log('✅ notification_settings table created successfully')
    return true
  } catch (error) {
    console.error('❌ Error creating notification_settings table:', error.message)
    return false
  }
}

async function createEmailLogsTable() {
  console.log('\n3️⃣ Creating email_notification_logs table...')
  
  const sql = `
    CREATE TABLE IF NOT EXISTS email_notification_logs (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      notification_type TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'pending')),
      sent_at TIMESTAMPTZ,
      error_message TEXT,
      provider TEXT DEFAULT 'supabase',
      provider_message_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_email_notification_logs_notification_id ON email_notification_logs(notification_id);
    CREATE INDEX IF NOT EXISTS idx_email_notification_logs_email ON email_notification_logs(email);
    CREATE INDEX IF NOT EXISTS idx_email_notification_logs_status ON email_notification_logs(status);
    CREATE INDEX IF NOT EXISTS idx_email_notification_logs_sent_at ON email_notification_logs(sent_at);
    
    -- Enable RLS
    ALTER TABLE email_notification_logs ENABLE ROW LEVEL SECURITY;
    
    -- RLS Policies
    CREATE POLICY "Users can view their own email logs" ON email_notification_logs
      FOR SELECT USING (
        notification_id IN (
          SELECT id FROM notifications WHERE user_id = auth.uid()
        )
      );
    
    CREATE POLICY "Service role can manage email logs" ON email_notification_logs
      FOR ALL USING (auth.role() = 'service_role');
    
    -- Grant permissions
    GRANT SELECT, INSERT, UPDATE, DELETE ON email_notification_logs TO authenticated;
  `
  
  try {
    const { error } = await supabase.rpc('exec_sql', { sql })
    if (error) throw error
    console.log('✅ email_notification_logs table created successfully')
    return true
  } catch (error) {
    console.error('❌ Error creating email_notification_logs table:', error.message)
    return false
  }
}

async function enableRealtime() {
  console.log('\n4️⃣ Enabling real-time for notifications...')
  
  const sql = `
    -- Enable real-time for notifications table
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    
    -- Enable real-time for notification_settings table
    ALTER PUBLICATION supabase_realtime ADD TABLE notification_settings;
  `
  
  try {
    const { error } = await supabase.rpc('exec_sql', { sql })
    if (error) throw error
    console.log('✅ Real-time enabled for notification tables')
    return true
  } catch (error) {
    console.error('❌ Error enabling real-time:', error.message)
    return false
  }
}

async function testRealtime() {
  console.log('\n5️⃣ Testing real-time functionality...')
  
  return new Promise((resolve) => {
    const channel = supabase.channel('test-realtime-fix')
    
    let received = false
    const timeout = setTimeout(() => {
      if (!received) {
        console.log('⚠️ Real-time test timeout')
        channel.unsubscribe()
        resolve(false)
      }
    }, 10000)
    
    channel
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications' 
        }, 
        (payload) => {
          console.log('✅ Real-time notification received!')
          received = true
          clearTimeout(timeout)
          channel.unsubscribe()
          resolve(true)
        }
      )
      .subscribe((status) => {
        console.log(`📡 Real-time status: ${status}`)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time subscription active')
          // Create a test notification
          supabase.from('notifications').insert({
            user_id: '00000000-0000-0000-0000-000000000000',
            type: 'test',
            title: 'Real-time Test',
            message: 'Testing real-time functionality',
            priority: 'normal'
          }).then(() => {
            console.log('📤 Test notification sent')
          })
        } else if (status === 'CHANNEL_ERROR') {
          console.log('❌ Real-time subscription failed')
          clearTimeout(timeout)
          resolve(false)
        }
      })
  })
}

async function runFix() {
  const tableStatus = await checkTables()
  
  let settingsCreated = true
  let logsCreated = true
  let realtimeEnabled = true
  
  if (!tableStatus.settings) {
    settingsCreated = await createNotificationSettingsTable()
  }
  
  if (!tableStatus.logs) {
    logsCreated = await createEmailLogsTable()
  }
  
  realtimeEnabled = await enableRealtime()
  
  const realtimeWorking = await testRealtime()
  
  console.log('\n📊 Fix Results:')
  console.log('===============')
  console.log(`Notification Settings Table: ${settingsCreated ? '✅' : '❌'}`)
  console.log(`Email Logs Table: ${logsCreated ? '✅' : '❌'}`)
  console.log(`Real-time Enabled: ${realtimeEnabled ? '✅' : '❌'}`)
  console.log(`Real-time Working: ${realtimeWorking ? '✅' : '❌'}`)
  
  const overallSuccess = settingsCreated && logsCreated && realtimeEnabled && realtimeWorking
  
  console.log(`\n🎯 Overall Status: ${overallSuccess ? '✅ FIXED' : '❌ ISSUES REMAIN'}`)
  
  if (overallSuccess) {
    console.log('\n🎉 Notification system is now fully functional!')
  } else {
    console.log('\n🔧 Some issues remain. Check the logs above for details.')
  }
  
  return overallSuccess
}

// Run the fix
runFix().then(() => {
  console.log('\n🏁 Notification table fix completed')
  process.exit(0)
}).catch(error => {
  console.error('💥 Fix failed with error:', error)
  process.exit(1)
})
