// Script to apply RPC function fixes
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function applyMigrations() {
  console.log('Applying RPC function fixes...')
  
  try {
    // Read the migration files
    const migration102 = fs.readFileSync(path.join(__dirname, 'supabase/migrations/102_fix_provider_dashboard_rpc_complete.sql'), 'utf8')
    const migration103 = fs.readFileSync(path.join(__dirname, 'supabase/migrations/103_fix_services_rls_policies.sql'), 'utf8')
    
    // Apply migration 102
    console.log('\n1. Applying migration 102 (RPC functions)...')
    const { error: error102 } = await supabase.rpc('exec_sql', { sql: migration102 })
    if (error102) {
      console.error('Migration 102 error:', error102)
    } else {
      console.log('Migration 102 applied successfully')
    }
    
    // Apply migration 103
    console.log('\n2. Applying migration 103 (RLS policies)...')
    const { error: error103 } = await supabase.rpc('exec_sql', { sql: migration103 })
    if (error103) {
      console.error('Migration 103 error:', error103)
    } else {
      console.log('Migration 103 applied successfully')
    }
    
    // Test the RPC functions
    console.log('\n3. Testing RPC functions...')
    const testProviderId = 'd2ce1fe9-806f-4dbc-8efb-9cf160f19e4b'
    
    // Test get_provider_dashboard
    const { data: dashboardData, error: dashboardError } = await supabase
      .rpc('get_provider_dashboard', { pid: testProviderId })
    
    if (dashboardError) {
      console.error('Dashboard RPC error:', dashboardError)
    } else {
      console.log('✅ Dashboard RPC working:', dashboardData)
    }
    
    // Test get_provider_recent_bookings
    const { data: bookingsData, error: bookingsError } = await supabase
      .rpc('get_provider_recent_bookings', { pid: testProviderId, limit_count: 5 })
    
    if (bookingsError) {
      console.error('Bookings RPC error:', bookingsError)
    } else {
      console.log('✅ Bookings RPC working:', bookingsData)
    }
    
    // Test get_provider_top_services
    const { data: servicesData, error: servicesError } = await supabase
      .rpc('get_provider_top_services', { pid: testProviderId, limit_count: 5 })
    
    if (servicesError) {
      console.error('Services RPC error:', servicesError)
    } else {
      console.log('✅ Services RPC working:', servicesData)
    }
    
    // Test get_provider_monthly_earnings
    const { data: earningsData, error: earningsError } = await supabase
      .rpc('get_provider_monthly_earnings', { pid: testProviderId, months_back: 12 })
    
    if (earningsError) {
      console.error('Earnings RPC error:', earningsError)
    } else {
      console.log('✅ Earnings RPC working:', earningsData)
    }
    
    console.log('\n🎉 All RPC functions are now working!')
    
  } catch (error) {
    console.error('Error applying migrations:', error)
  }
}

applyMigrations()
