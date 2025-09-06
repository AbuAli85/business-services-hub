const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixBookingDetails() {
  console.log('🔧 Fixing Booking Details Display\n')

  try {
    // Get all existing bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .limit(10)

    if (bookingsError) {
      console.error('❌ Error fetching bookings:', bookingsError)
      return
    }

    if (!bookings || bookings.length === 0) {
      console.log('📝 No bookings found, creating sample booking...')
      
      // Get a service and user to create a sample booking
      const { data: services } = await supabase
        .from('services')
        .select('*')
        .limit(1)

      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .limit(2)

      if (!services || services.length === 0 || !profiles || profiles.length < 2) {
        console.error('❌ Need at least one service and two profiles to create sample booking')
        return
      }

      const service = services[0]
      const client = profiles[0]
      const provider = profiles[1]

      const now = new Date()
      const startDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      const endDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000) // 14 days from now

      const sampleBooking = {
        title: 'PRO services',
        description: 'Professional services project',
        client_id: client.id,
        provider_id: provider.id,
        service_id: service.id,
        status: 'in_progress',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        total_amount: 1500,
        amount: 1500,
        total_price: 1500,
        currency: 'OMR',
        payment_status: 'pending',
        approval_status: 'approved',
        operational_status: 'in_progress',
        priority: 'high',
        notes: 'Sample booking for testing display',
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      }

      const { data: newBooking, error: insertError } = await supabase
        .from('bookings')
        .insert(sampleBooking)
        .select()
        .single()

      if (insertError) {
        console.error('❌ Error creating sample booking:', insertError)
        return
      }

      console.log('✅ Sample booking created successfully')
      console.log('Booking ID:', newBooking.id)
      console.log('Title:', newBooking.title)
      console.log('Start Date:', newBooking.start_date)
      console.log('End Date:', newBooking.end_date)
      console.log('Total Amount:', newBooking.total_amount, newBooking.currency)
      return
    }

    // Update existing bookings to have proper date and amount fields
    console.log(`📝 Found ${bookings.length} bookings, updating them...`)

    for (const booking of bookings) {
      const updates = {}
      
      // Add start_date if missing
      if (!booking.start_date && booking.start_time) {
        updates.start_date = booking.start_time
      } else if (!booking.start_date && !booking.start_time) {
        const startDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        updates.start_date = startDate.toISOString()
        updates.start_time = startDate.toISOString()
      }

      // Add end_date if missing
      if (!booking.end_date && booking.end_time) {
        updates.end_date = booking.end_time
      } else if (!booking.end_date && !booking.end_time) {
        const endDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        updates.end_date = endDate.toISOString()
        updates.end_time = endDate.toISOString()
      }

      // Add total_amount if missing
      if (!booking.total_amount) {
        updates.total_amount = booking.amount || booking.total_price || 500
      }

      // Add currency if missing
      if (!booking.currency) {
        updates.currency = 'OMR'
      }

      // Add title if missing
      if (!booking.title) {
        updates.title = 'Service Booking'
      }

      // Only update if there are changes
      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString()
        
        const { error: updateError } = await supabase
          .from('bookings')
          .update(updates)
          .eq('id', booking.id)

        if (updateError) {
          console.error(`❌ Error updating booking ${booking.id}:`, updateError)
        } else {
          console.log(`✅ Updated booking ${booking.id}`)
          console.log('  Updates:', Object.keys(updates).join(', '))
        }
      } else {
        console.log(`ℹ️  Booking ${booking.id} already has all required fields`)
      }
    }

    console.log('\n✅ Booking details fix completed!')
    console.log('\n📊 Summary:')
    console.log('- Start dates: Added or mapped from start_time')
    console.log('- End dates: Added or mapped from end_time')
    console.log('- Total amounts: Added or mapped from amount/total_price')
    console.log('- Currency: Set to OMR if missing')
    console.log('- Titles: Added if missing')

  } catch (error) {
    console.error('❌ Error fixing booking details:', error)
  }
}

// Run the fix
fixBookingDetails()
  .then(() => {
    console.log('\n🎉 Booking details fix completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
