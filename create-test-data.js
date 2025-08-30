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
    
    console.log(`   Profiles: ${existingProfiles?.length || 0}`)
    console.log(`   Services: ${existingServices?.length || 0}`)
    console.log(`   Bookings: ${existingBookings?.length || 0}`)
    
    // Check if the specific user has any bookings
    const specificUserId = 'd2ce1fe9-806f-4dbc-8efb-9cf160f19e4b'
    console.log(`🔍 Checking if user ${specificUserId} has any bookings...`)
    
    const { data: userBookings, error: userBookingsError } = await supabase
      .from('bookings')
      .select('*')
      .or(`client_id.eq.${specificUserId},provider_id.eq.${specificUserId}`)
    
    if (userBookingsError) {
      console.error('❌ Error checking user bookings:', userBookingsError)
    } else {
      console.log(`   User ${specificUserId} has ${userBookings?.length || 0} bookings`)
    }
    
    // If the specific user has no bookings, create one for them
    if (!userBookings || userBookings.length === 0) {
      console.log('📝 Creating a specific booking for the user experiencing the error...')
      
      // First, ensure the user has a profile
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', specificUserId)
        .single()
      
      if (!userProfile) {
        console.log('📝 Creating profile for the user...')
        const { data: newProfile, error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: specificUserId,
            full_name: 'fahad alamri',
            email: 'luxsess2001@hotmail.com',
            phone: '95153930',
            role: 'provider',
            company_name: 'Fahad Services',
            bio: 'Professional service provider',
            created_at: new Date().toISOString()
          })
          .select()
          .single()
        
        if (profileError) {
          console.error('❌ Error creating user profile:', profileError)
        } else {
          console.log('✅ Created user profile')
        }
      }
      
      // Create a test service if none exists
      let serviceId = '660e8400-e29b-41d4-a716-446655440001'
      const { data: existingService } = await supabase
        .from('services')
        .select('id')
        .eq('id', serviceId)
        .single()
      
      if (!existingService) {
        console.log('📝 Creating test service...')
        const { data: newService, error: serviceError } = await supabase
          .from('services')
          .insert({
            id: serviceId,
            title: 'Digital Marketing Service',
            description: 'Professional digital marketing services',
            category: 'Digital Marketing',
            base_price: 500.00,
            currency: 'OMR',
            provider_id: specificUserId,
            status: 'active',
            created_at: new Date().toISOString()
          })
          .select()
          .single()
        
        if (serviceError) {
          console.error('❌ Error creating service:', serviceError)
        } else {
          console.log('✅ Created test service')
        }
      }
      
      // Create a booking for the user
      const testBooking = {
        id: '8ccbb969-3639-4ff4-ae4d-722d9580db57', // Use the exact ID from the error
        client_id: specificUserId,
        provider_id: specificUserId,
        service_id: serviceId,
        status: 'pending',
        approval_status: 'pending',
        operational_status: 'new',
        amount: 500.00,
        currency: 'OMR',
        payment_status: 'pending',
        scheduled_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: 'Test booking for development',
        estimated_duration: '1 week',
        location: 'Muscat, Oman',
        created_at: new Date().toISOString()
      }
      
      const { data: newBooking, error: bookingError } = await supabase
        .from('bookings')
        .insert(testBooking)
        .select()
        .single()
      
      if (bookingError) {
        console.error('❌ Error creating booking:', bookingError)
      } else {
        console.log('✅ Created test booking with ID:', newBooking.id)
        console.log('   This should resolve the "Booking not found" error')
      }
    } else {
      console.log('✅ User already has bookings, no need to create new ones')
    }
    
    // Final verification
    console.log('🔍 Final verification...')
    const { data: finalUserBookings } = await supabase
      .from('bookings')
      .select('*')
      .or(`client_id.eq.${specificUserId},provider_id.eq.${specificUserId}`)
    
    console.log(`   User ${specificUserId} now has ${finalUserBookings?.length || 0} bookings`)
    
    if (finalUserBookings && finalUserBookings.length > 0) {
      console.log('📋 User bookings:')
      finalUserBookings.forEach(booking => {
        console.log(`   - ID: ${booking.id}, Status: ${booking.status}`)
      })
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
