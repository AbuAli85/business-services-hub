/**
 * Test booking creation to identify the issue
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testBookingCreation() {
  console.log('🔍 Testing booking creation...')
  console.log('')

  try {
    // First, get a service to test with
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, title, provider_id, base_price, currency, status')
      .eq('status', 'active')
      .limit(1)

    if (servicesError) {
      console.error('❌ Error getting services:', servicesError)
      return
    }

    if (!services || services.length === 0) {
      console.error('❌ No active services found')
      return
    }

    const service = services[0]
    console.log('✅ Found service:', service.title, '(ID:', service.id + ')')

    // Get a user to test with
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .limit(1)

    if (profilesError) {
      console.error('❌ Error getting profiles:', profilesError)
      return
    }

    if (!profiles || profiles.length === 0) {
      console.error('❌ No profiles found')
      return
    }

    const user = profiles[0]
    console.log('✅ Found user:', user.full_name, '(ID:', user.id + ')')

    // Check if user is trying to book their own service
    if (service.provider_id === user.id) {
      console.log('⚠️ User is the provider of this service, skipping test')
      return
    }

    // Test booking data
    const bookingData = {
      service_id: service.id,
      client_id: user.id,
      provider_id: service.provider_id,
      scheduled_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      notes: 'Test booking from script',
      status: 'pending',
      approval_status: 'pending',
      operational_status: 'new',
      amount: service.base_price,
      currency: service.currency || 'OMR',
      payment_status: 'pending',
      location: 'Test Location',
      title: `Booking for ${service.title}`, // Add required title field
      start_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Add required start_time field
      end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(), // Add required end_time field (2 hours later)
      total_price: service.base_price, // Add required total_price field (matches existing schema)
      subtotal: service.base_price, // Add required subtotal field for total_amount generation
      vat_percent: 5.00 // Add required vat_percent field for total_amount generation
    }

    console.log('📝 Test booking data:')
    console.log(JSON.stringify(bookingData, null, 2))
    console.log('')

    // Try to create the booking
    console.log('🔍 Attempting to create booking...')
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select('*')
      .single()

    if (bookingError) {
      console.error('❌ Booking creation failed:')
      console.error('Error code:', bookingError.code)
      console.error('Error message:', bookingError.message)
      console.error('Error details:', bookingError.details)
      console.error('Error hint:', bookingError.hint)
      console.error('Full error:', bookingError)
    } else {
      console.log('✅ Booking created successfully!')
      console.log('Booking ID:', booking.id)
      console.log('Booking data:', JSON.stringify(booking, null, 2))
      
      // Clean up - delete the test booking
      console.log('🧹 Cleaning up test booking...')
      const { error: deleteError } = await supabase
        .from('bookings')
        .delete()
        .eq('id', booking.id)
      
      if (deleteError) {
        console.error('⚠️ Failed to delete test booking:', deleteError)
      } else {
        console.log('✅ Test booking deleted successfully')
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the test
testBookingCreation()
