const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigrations() {
  try {
    console.log('🚀 Applying Phase 3 Smart Features migrations...')
    
    // First, apply the status column migration
    console.log('📝 Step 1: Adding status column to bookings table...')
    const statusSql = require('fs').readFileSync('supabase/migrations/085_add_status_column_first.sql', 'utf8')
    
    const { error: statusError } = await supabase.rpc('exec_sql', { sql: statusSql })
    if (statusError) {
      console.log('⚠️ Status column migration result:', statusError.message)
    } else {
      console.log('✅ Status column migration completed')
    }
    
    // Then, apply the Phase 3 features migration
    console.log('📝 Step 2: Adding Phase 3 smart features...')
    const featuresSql = require('fs').readFileSync('supabase/migrations/086_phase3_smart_features_simplified.sql', 'utf8')
    
    const { error: featuresError } = await supabase.rpc('exec_sql', { sql: featuresSql })
    if (featuresError) {
      console.log('⚠️ Phase 3 features migration result:', featuresError.message)
    } else {
      console.log('✅ Phase 3 features migration completed')
    }
    
    console.log('🎉 Phase 3 migration process completed!')
    console.log('')
    console.log('📋 Next Steps:')
    console.log('1. Test the notification system')
    console.log('2. Create some tasks with past due dates to test overdue detection')
    console.log('3. Test the export functionality')
    console.log('4. Set up weekly digest automation')
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  }
}

applyMigrations()
