/**
 * Check booking table triggers and functions
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

async function checkBookingTriggers() {
  console.log('🔍 Checking booking table triggers and functions...')
  console.log('')

  try {
    // Check for triggers on bookings table
    const { data: triggers, error: triggersError } = await supabase
      .rpc('get_table_triggers', { table_name: 'bookings' })

    if (triggersError) {
      console.log('⚠️ Could not get triggers (function may not exist):', triggersError.message)
    } else {
      console.log('🔧 Triggers on bookings table:')
      triggers.forEach(trigger => {
        console.log(`  - ${trigger.trigger_name}: ${trigger.event_manipulation} ${trigger.action_timing}`)
      })
    }

    console.log('')

    // Try to get existing bookings to see what fields are actually used
    const { data: existingBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .limit(3)

    if (bookingsError) {
      console.error('❌ Error getting existing bookings:', bookingsError)
    } else if (existingBookings && existingBookings.length > 0) {
      console.log('📄 Existing booking structure (first booking):')
      console.log(JSON.stringify(existingBookings[0], null, 2))
    } else {
      console.log('📄 No existing bookings found')
    }

    console.log('')

    // Try a simple insert to see what happens
    console.log('🧪 Testing minimal booking insert...')
    const testBookingData = {
      service_id: '770e8400-e29b-41d4-a716-446655440005', // Use existing service
      client_id: '11111111-1111-1111-1111-111111111111', // Use existing user
      provider_id: 'd2ce1fe9-806f-4dbc-8efb-9cf160f19e4b', // Use existing provider
      scheduled_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      notes: 'Minimal test booking',
      status: 'pending',
      approval_status: 'pending',
      operational_status: 'new',
      amount: 100,
      currency: 'OMR',
      payment_status: 'pending',
      title: 'Test Booking',
      start_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString()
    }

    console.log('📝 Minimal test data:')
    console.log(JSON.stringify(testBookingData, null, 2))
    console.log('')

    const { data: testBooking, error: testError } = await supabase
      .from('bookings')
      .insert(testBookingData)
      .select('*')
      .single()

    if (testError) {
      console.error('❌ Minimal booking test failed:')
      console.error('Error code:', testError.code)
      console.error('Error message:', testError.message)
      console.error('Error details:', testError.details)
      console.error('Error hint:', testError.hint)
    } else {
      console.log('✅ Minimal booking test succeeded!')
      console.log('Created booking ID:', testBooking.id)
      
      // Clean up
      const { error: deleteError } = await supabase
        .from('bookings')
        .delete()
        .eq('id', testBooking.id)
      
      if (deleteError) {
        console.error('⚠️ Failed to delete test booking:', deleteError)
      } else {
        console.log('🧹 Test booking cleaned up')
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the check
checkBookingTriggers()
