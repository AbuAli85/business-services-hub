const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

async function createTestData() {
  console.log('🚀 Creating test data for the business services hub...')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables')
    console.log('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set')
    return
  }
  
  // Use service role key to bypass RLS policies
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
  
  try {
    // Test connection
    console.log('🔌 Testing Supabase connection with service role...')
    
    // Check if we have any existing data
    console.log('🔍 Checking existing data...')
    const { data: existingProfiles } = await supabase.from('profiles').select('id').limit(1)
    const { data: existingServices } = await supabase.from('services').select('id').limit(1)
    const { data: existingBookings } = await supabase.from('bookings').select('id').limit(1)
    
    if (existingProfiles?.length > 0 || existingServices?.length > 0 || existingBookings?.length > 0) {
      console.log('⚠️  Database already has some data. Skipping test data creation.')
      console.log(`   Profiles: ${existingProfiles?.length || 0}`)
      console.log(`   Services: ${existingServices?.length || 0}`)
      console.log(`   Bookings: ${existingBookings?.length || 0}`)
      return
    }
    
    console.log('📝 Creating test profiles...')
    
    // Create test profiles
    const testProfiles = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        full_name: 'John Smith',
        email: 'john.smith@example.com',
        phone: '+968 1234 5678',
        role: 'provider',
        company_name: 'Digital Solutions Co.',
        bio: 'Experienced digital marketing professional with 5+ years in the industry.',
        created_at: new Date().toISOString()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        full_name: 'Sarah Johnson',
        email: 'sarah.johnson@example.com',
        phone: '+968 9876 5432',
        role: 'client',
        company_name: 'Tech Startup Inc.',
        bio: 'Looking for professional digital marketing services.',
        created_at: new Date().toISOString()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        full_name: 'Ahmed Al-Rashid',
        email: 'ahmed.alrashid@example.com',
        phone: '+968 5555 1234',
        role: 'provider',
        company_name: 'Creative Agency Oman',
        bio: 'Creative designer and marketing specialist.',
        created_at: new Date().toISOString()
      }
    ]
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .insert(testProfiles)
      .select()
    
    if (profilesError) {
      console.error('❌ Error creating profiles:', profilesError)
      return
    }
    
    console.log(`✅ Created ${profiles.length} profiles`)
    
    // Create test services
    console.log('📝 Creating test services...')
    
    const testServices = [
      {
        id: '660e8400-e29b-41d4-a716-446655440001',
        title: 'Digital Marketing Strategy',
        description: 'Comprehensive digital marketing strategy development including SEO, social media, and content marketing.',
        category: 'Digital Marketing',
        base_price: 500.00,
        currency: 'OMR',
        provider_id: '550e8400-e29b-41d4-a716-446655440001',
        status: 'active',
        created_at: new Date().toISOString()
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440002',
        title: 'Website Design & Development',
        description: 'Professional website design and development services with modern UI/UX.',
        category: 'Web Development',
        base_price: 800.00,
        currency: 'OMR',
        provider_id: '550e8400-e29b-41d4-a716-446655440003',
        status: 'active',
        created_at: new Date().toISOString()
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440003',
        title: 'Social Media Management',
        description: 'Monthly social media management including content creation, posting, and engagement.',
        category: 'Social Media',
        base_price: 300.00,
        currency: 'OMR',
        provider_id: '550e8400-e29b-41d4-a716-446655440001',
        status: 'active',
        created_at: new Date().toISOString()
      }
    ]
    
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .insert(testServices)
      .select()
    
    if (servicesError) {
      console.error('❌ Error creating services:', servicesError)
      return
    }
    
    console.log(`✅ Created ${services.length} services`)
    
    // Create test bookings
    console.log('📝 Creating test bookings...')
    
    const testBookings = [
      {
        id: '770e8400-e29b-41d4-a716-446655440001',
        client_id: '550e8400-e29b-41d4-a716-446655440002',
        provider_id: '550e8400-e29b-41d4-a716-446655440001',
        service_id: '660e8400-e29b-41d4-a716-446655440001',
        status: 'pending',
        approval_status: 'pending',
        operational_status: 'new',
        amount: 500.00,
        currency: 'OMR',
        payment_status: 'pending',
        scheduled_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
        notes: 'Need help with our startup marketing strategy',
        estimated_duration: '2 weeks',
        location: 'Muscat, Oman',
        created_at: new Date().toISOString()
      },
      {
        id: '770e8400-e29b-41d4-a716-446655440002',
        client_id: '550e8400-e29b-41d4-a716-446655440002',
        provider_id: '550e8400-e29b-41d4-a716-446655440003',
        service_id: '660e8400-e29b-41d4-a716-446655440002',
        status: 'approved',
        approval_status: 'approved',
        operational_status: 'in_progress',
        amount: 800.00,
        currency: 'OMR',
        payment_status: 'paid',
        scheduled_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 days from now
        notes: 'Website redesign for our tech startup',
        estimated_duration: '4 weeks',
        location: 'Remote',
        created_at: new Date().toISOString()
      }
    ]
    
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .insert(testBookings)
      .select()
    
    if (bookingsError) {
      console.error('❌ Error creating bookings:', bookingsError)
      return
    }
    
    console.log(`✅ Created ${bookings.length} bookings`)
    
    // Verify the data was created
    console.log('🔍 Verifying created data...')
    
    const { data: finalProfiles } = await supabase.from('profiles').select('id, full_name, role')
    const { data: finalServices } = await supabase.from('services').select('id, title, provider_id')
    const { data: finalBookings } = await supabase.from('bookings').select('id, status, client_id, provider_id')
    
    console.log('📊 Final data count:')
    console.log(`   Profiles: ${finalProfiles?.length || 0}`)
    console.log(`   Services: ${finalServices?.length || 0}`)
    console.log(`   Bookings: ${finalBookings?.length || 0}`)
    
    if (finalBookings && finalBookings.length > 0) {
      console.log('📋 Sample booking for testing:')
      console.log(`   ID: ${finalBookings[0].id}`)
      console.log(`   Status: ${finalBookings[0].status}`)
      console.log(`   Client ID: ${finalBookings[0].client_id}`)
      console.log(`   Provider ID: ${finalBookings[0].provider_id}`)
    }
    
    console.log('✅ Test data creation completed successfully!')
    console.log('')
    console.log('🎯 You can now test the booking functionality:')
    console.log('1. The PATCH /api/bookings endpoint should work')
    console.log('2. Try updating a booking status using one of the created booking IDs')
    console.log('3. Check the dashboard to see the test data')
    
  } catch (error) {
    console.error('❌ Test data creation failed:', error.message)
    console.error('Stack trace:', error.stack)
  }
}

// Run the script
if (require.main === module) {
  createTestData()
    .then(() => {
      console.log('🎉 Script completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Script failed:', error)
      process.exit(1)
    })
}

module.exports = { createTestData }
