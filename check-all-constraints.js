const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://reootcngcptfogfozlmz.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb290Y25nY3B0Zm9nZm96bG16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0NDM4MiwiZXhwIjoyMDY5MDIwMzgyfQ.BTLA-2wwXJgjW6MKoaw2ERbCr_fXF9w4zgLb70_5DAE'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAllConstraints() {
  try {
    console.log('Checking all constraints on bookings table...\n')
    
    // Try to get a booking and see what fields it has
    const { data: bookings, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .limit(1)
    
    if (fetchError) {
      console.error('Error fetching bookings:', fetchError)
      return
    }
    
    if (!bookings || bookings.length === 0) {
      console.log('No bookings found to test with')
      return
    }
    
    const booking = bookings[0]
    console.log('Sample booking fields:', Object.keys(booking))
    console.log('Sample booking data:', JSON.stringify(booking, null, 2))
    
    // Test updating with the exact same data to see if there's a constraint issue
    console.log('\nTesting update with same data...')
    const { error: sameDataError } = await supabase
      .from('bookings')
      .update({ 
        status: booking.status,
        approval_status: booking.approval_status || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', booking.id)
    
    if (sameDataError) {
      console.log('❌ Error updating with same data:', sameDataError.message)
    } else {
      console.log('✅ Update with same data works')
    }
    
    // Test updating with approved status
    console.log('\nTesting update with approved status...')
    const { error: approvedError } = await supabase
      .from('bookings')
      .update({ 
        status: 'approved',
        approval_status: 'approved',
        updated_at: new Date().toISOString()
      })
      .eq('id', booking.id)
    
    if (approvedError) {
      console.log('❌ Error updating with approved status:', approvedError.message)
    } else {
      console.log('✅ Update with approved status works')
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
}

checkAllConstraints()
