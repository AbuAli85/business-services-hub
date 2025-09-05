const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testSimpleInsert() {
  console.log('🧪 TESTING SIMPLE INSERT\n')
  console.log('='.repeat(40))

  try {
    // Get a booking ID
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, title')
      .limit(1)
    
    if (!bookings || bookings.length === 0) {
      console.log('❌ No bookings found')
      return
    }
    
    const bookingId = bookings[0].id
    console.log(`📋 Testing with booking: ${bookings[0].title} (${bookingId})`)
    
    // Try to insert a milestone
    console.log('\n🔄 Attempting to insert milestone...')
    
    const { data, error } = await supabase
      .from('milestones')
      .insert({
        booking_id: bookingId,
        title: 'Test Milestone',
        description: 'Test milestone for permission check',
        status: 'pending',
        progress_percentage: 0,
        weight: 1.0,
        editable: true
      })
      .select()
      .single()
    
    if (error) {
      console.log(`❌ Insert failed: ${error.message}`)
      console.log(`   Error code: ${error.code}`)
      console.log(`   Error details: ${error.details}`)
      console.log(`   Error hint: ${error.hint}`)
    } else {
      console.log(`✅ Insert successful! Milestone ID: ${data.id}`)
      
      // Clean up
      await supabase
        .from('milestones')
        .delete()
        .eq('id', data.id)
      console.log('✅ Test milestone cleaned up')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testSimpleInsert()