const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkBookingSchema() {
  console.log('🔍 Checking Booking Schema\n')

  try {
    // Get a sample booking to see what fields are available
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .limit(1)

    if (bookingsError) {
      console.error('❌ Error fetching bookings:', bookingsError)
      return
    }

    if (bookings && bookings.length > 0) {
      const booking = bookings[0]
      console.log('📋 Available booking fields:')
      console.log('================================')
      
      Object.keys(booking).forEach(key => {
        const value = booking[key]
        const type = typeof value
        console.log(`${key}: ${type} = ${value}`)
      })
      
      console.log('\n📊 Field Analysis:')
      console.log('==================')
      
      // Check for date fields
      const dateFields = Object.keys(booking).filter(key => 
        key.includes('date') || key.includes('time') || key.includes('scheduled')
      )
      console.log('Date/Time fields:', dateFields)
      
      // Check for amount fields
      const amountFields = Object.keys(booking).filter(key => 
        key.includes('amount') || key.includes('price') || key.includes('cost')
      )
      console.log('Amount/Price fields:', amountFields)
      
      // Check for currency
      const currencyFields = Object.keys(booking).filter(key => 
        key.includes('currency')
      )
      console.log('Currency fields:', currencyFields)
      
    } else {
      console.log('📝 No bookings found')
    }

  } catch (error) {
    console.error('❌ Error checking schema:', error)
  }
}

// Run the check
checkBookingSchema()
  .then(() => {
    console.log('\n🎉 Schema check completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })