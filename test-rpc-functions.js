// Test script to verify RPC functions are working
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testRPCFunctions() {
  console.log('Testing RPC functions...')
  
  // Test with a sample provider ID (you'll need to replace this with an actual provider ID)
  const testProviderId = 'd2ce1fe9-806f-4dbc-8efb-9cf160f19e4b' // From the error logs
  
  try {
    // Test get_provider_dashboard
    console.log('\n1. Testing get_provider_dashboard...')
    const { data: dashboardData, error: dashboardError } = await supabase
      .rpc('get_provider_dashboard', { pid: testProviderId })
    
    if (dashboardError) {
      console.error('Dashboard RPC error:', dashboardError)
    } else {
      console.log('Dashboard RPC success:', dashboardData)
    }
    
    // Test get_provider_recent_bookings
    console.log('\n2. Testing get_provider_recent_bookings...')
    const { data: bookingsData, error: bookingsError } = await supabase
      .rpc('get_provider_recent_bookings', { pid: testProviderId, limit_count: 5 })
    
    if (bookingsError) {
      console.error('Bookings RPC error:', bookingsError)
    } else {
      console.log('Bookings RPC success:', bookingsData)
    }
    
    // Test get_provider_top_services
    console.log('\n3. Testing get_provider_top_services...')
    const { data: servicesData, error: servicesError } = await supabase
      .rpc('get_provider_top_services', { pid: testProviderId, limit_count: 5 })
    
    if (servicesError) {
      console.error('Services RPC error:', servicesError)
    } else {
      console.log('Services RPC success:', servicesData)
    }
    
    // Test get_provider_monthly_earnings
    console.log('\n4. Testing get_provider_monthly_earnings...')
    const { data: earningsData, error: earningsError } = await supabase
      .rpc('get_provider_monthly_earnings', { pid: testProviderId, months_back: 12 })
    
    if (earningsError) {
      console.error('Earnings RPC error:', earningsError)
    } else {
      console.log('Earnings RPC success:', earningsData)
    }
    
    // Test direct services query
    console.log('\n5. Testing direct services query...')
    const { data: directServicesData, error: directServicesError } = await supabase
      .from('services')
      .select('id, title, description, base_price, currency, status')
      .limit(5)
    
    if (directServicesError) {
      console.error('Direct services query error:', directServicesError)
    } else {
      console.log('Direct services query success:', directServicesData)
    }
    
  } catch (error) {
    console.error('Test failed:', error)
  }
}

testRPCFunctions()
