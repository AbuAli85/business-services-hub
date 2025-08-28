const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing environment variables')
    console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
    console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', !!supabaseKey)
    return
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  try {
    // Test basic connection
    console.log('🔍 Testing basic connection...')
    const { data, error } = await supabase.from('bookings').select('count').limit(1)
    
    if (error) {
      console.error('❌ Database connection failed:', error)
      return
    }
    
    console.log('✅ Database connection successful')
    
    // Check if bookings table exists and has data
    console.log('🔍 Checking bookings table...')
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, client_id, provider_id, status, created_at')
      .limit(5)
    
    if (bookingsError) {
      console.error('❌ Error fetching bookings:', bookingsError)
      return
    }
    
    console.log('✅ Bookings table accessible')
    console.log(`📊 Found ${bookings.length} bookings`)
    
    if (bookings.length > 0) {
      console.log('📋 Sample booking:', bookings[0])
    }
    
    // Check services table
    console.log('🔍 Checking services table...')
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, title, provider_id, status, created_at')
      .limit(5)
    
    if (servicesError) {
      console.error('❌ Error fetching services:', servicesError)
    } else {
      console.log(`📊 Found ${services.length} services`)
      if (services.length > 0) {
        console.log('📋 Sample service:', services[0])
      }
    }
    
    // Check profiles table
    console.log('🔍 Checking profiles table...')
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, created_at')
      .limit(5)
    
    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError)
    } else {
      console.log(`📊 Found ${profiles.length} profiles`)
      if (profiles.length > 0) {
        console.log('📋 Sample profile:', profiles[0])
      }
    }
    
    // Check table structure
    console.log('🔍 Checking table structure...')
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'bookings' })
    
    if (columnsError) {
      console.log('⚠️ Could not get table columns via RPC, trying alternative method...')
      // Try to get a single row to see what columns exist
      const { data: sample, error: sampleError } = await supabase
        .from('bookings')
        .select('*')
        .limit(1)
      
      if (sampleError) {
        console.error('❌ Error getting sample data:', sampleError)
      } else if (sample && sample.length > 0) {
        console.log('📋 Available columns:', Object.keys(sample[0]))
      }
    } else {
      console.log('📋 Table columns:', columns)
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

testDatabaseConnection() 