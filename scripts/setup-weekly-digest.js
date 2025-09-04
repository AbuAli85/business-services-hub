#!/usr/bin/env node

/**
 * Setup Weekly Digest Automation
 * This script sets up the weekly digest system with cron jobs
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupWeeklyDigest() {
  console.log('🚀 Setting up Weekly Digest Automation...')

  try {
    // 1. Enable pg_cron extension (if not already enabled)
    console.log('📅 Enabling pg_cron extension...')
    const { error: cronError } = await supabase.rpc('sql', {
      query: 'CREATE EXTENSION IF NOT EXISTS pg_cron;'
    })

    if (cronError) {
      console.warn('⚠️  Could not enable pg_cron:', cronError.message)
      console.log('💡 You may need to enable pg_cron manually in your Supabase dashboard')
    } else {
      console.log('✅ pg_cron extension enabled')
    }

    // 2. Create cron jobs for overdue detection and notifications
    console.log('⏰ Setting up cron jobs...')
    
    // Overdue detection - runs daily at 9 AM
    const { error: overdueCronError } = await supabase.rpc('sql', {
      query: `
        SELECT cron.schedule(
          'overdue-detection',
          '0 9 * * *',
          'SELECT update_overdue_tasks();'
        );
      `
    })

    if (overdueCronError) {
      console.warn('⚠️  Could not create overdue detection cron job:', overdueCronError.message)
    } else {
      console.log('✅ Overdue detection cron job created (daily at 9 AM)')
    }

    // Overdue notifications - runs daily at 10 AM
    const { error: notifCronError } = await supabase.rpc('sql', {
      query: `
        SELECT cron.schedule(
          'overdue-notifications',
          '0 10 * * *',
          'SELECT send_overdue_notifications();'
        );
      `
    })

    if (notifCronError) {
      console.warn('⚠️  Could not create overdue notifications cron job:', notifCronError.message)
    } else {
      console.log('✅ Overdue notifications cron job created (daily at 10 AM)')
    }

    // Weekly digest - runs every Monday at 8 AM
    const { error: digestCronError } = await supabase.rpc('sql', {
      query: `
        SELECT cron.schedule(
          'weekly-digest',
          '0 8 * * 1',
          'SELECT send_weekly_digest(auth.uid());'
        );
      `
    })

    if (digestCronError) {
      console.warn('⚠️  Could not create weekly digest cron job:', digestCronError.message)
    } else {
      console.log('✅ Weekly digest cron job created (Mondays at 8 AM)')
    }

    // 3. Test the functions
    console.log('🧪 Testing functions...')
    
    // Test overdue detection
    const { error: testOverdueError } = await supabase.rpc('update_overdue_tasks')
    if (testOverdueError) {
      console.warn('⚠️  Overdue detection test failed:', testOverdueError.message)
    } else {
      console.log('✅ Overdue detection function working')
    }

    // Test overdue notifications
    const { error: testNotifError } = await supabase.rpc('send_overdue_notifications')
    if (testNotifError) {
      console.warn('⚠️  Overdue notifications test failed:', testNotifError.message)
    } else {
      console.log('✅ Overdue notifications function working')
    }

    // 4. Create a test endpoint for manual triggering
    console.log('🔧 Creating test endpoints...')
    
    // Test weekly digest for a specific user
    const { data: testUser } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .single()

    if (testUser) {
      console.log(`📧 Test weekly digest endpoint: GET /api/notifications/weekly-digest?user_id=${testUser.id}`)
    }

    console.log('🎉 Weekly Digest setup completed!')
    console.log('')
    console.log('📋 Next Steps:')
    console.log('1. Verify cron jobs in Supabase Dashboard > Database > Extensions > pg_cron')
    console.log('2. Test the system by creating some tasks with past due dates')
    console.log('3. Monitor notifications in the notifications table')
    console.log('4. Check email delivery in your email service logs')
    console.log('')
    console.log('🔧 Manual Testing:')
    console.log('- Overdue detection: Call update_overdue_tasks() function')
    console.log('- Overdue notifications: Call send_overdue_notifications() function')
    console.log('- Weekly digest: GET /api/notifications/weekly-digest?user_id=USER_ID')
    console.log('- Send to all users: POST /api/notifications/weekly-digest')

  } catch (error) {
    console.error('❌ Setup failed:', error)
    process.exit(1)
  }
}

// Run the setup
setupWeeklyDigest()
