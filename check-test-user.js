const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://reootcngcptfogfozlmz.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb290Y25nY3B0Zm9nZm96bG16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0NDM4MiwiZXhwIjoyMDY5MDIwMzgyfQ.BTLA-2wwXJgjW6MKoaw2ERbCr_fXF9w4zgLb70_5DAE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkTestUser() {
  try {
    console.log('🔍 Checking test user and their profile...')
    
    const testUser = '4fedc90a-1c4e-4baa-a42b-2ca85d1daf0b'
    
    // Check if user profile exists
    console.log('📋 Checking user profile...')
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', testUser)
      .single()

    if (profileError) {
      console.log('❌ Profile not found:', profileError.message)
    } else {
      console.log('✅ Profile found:')
      console.log('📊 Profile data:', JSON.stringify(profile, null, 2))
    }

    // Check user's bookings
    console.log('\n📋 Checking user bookings...')
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, client_id, provider_id, subtotal, currency, status')
      .eq('client_id', testUser)

    if (bookingsError) {
      console.log('❌ Bookings error:', bookingsError.message)
    } else {
      console.log('✅ Bookings found:', bookings.length)
      if (bookings.length > 0) {
        console.log('📊 First booking:', JSON.stringify(bookings[0], null, 2))
      }
    }

    // Check if there are any existing invoices for this user
    console.log('\n📋 Checking existing invoices...')
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('*')
      .or(`client_id.eq.${testUser},provider_id.eq.${testUser}`)

    if (invoicesError) {
      console.log('❌ Invoices error:', invoicesError.message)
    } else {
      console.log('✅ Invoices found:', invoices.length)
      if (invoices.length > 0) {
        console.log('📊 First invoice:', JSON.stringify(invoices[0], null, 2))
      }
    }

    // Test with a real user context (simulate auth)
    console.log('\n🔍 Testing with simulated user context...')
    
    // Create a client that simulates being logged in as the test user
    const userSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`
        }
      }
    })

    // Try to create an invoice with the user context
    if (bookings && bookings.length > 0) {
      const booking = bookings[0]
      const testInvoice = {
        booking_id: booking.id,
        client_id: booking.client_id,
        provider_id: booking.provider_id,
        amount: booking.subtotal || 100,
        currency: booking.currency || 'OMR',
        status: 'issued'
      }

      console.log('📋 Attempting invoice creation with user context...')
      const { data: newInvoice, error: insertError } = await userSupabase
        .from('invoices')
        .insert(testInvoice)
        .select()
        .single()

      if (insertError) {
        console.log('❌ User context insert failed:', insertError.message)
        console.log('🔧 Full error:', insertError)
      } else {
        console.log('✅ User context insert SUCCESS!')
        console.log('📊 New invoice:', JSON.stringify(newInvoice, null, 2))
        
        // Clean up
        await userSupabase.from('invoices').delete().eq('id', newInvoice.id)
        console.log('🧹 Test invoice cleaned up')
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

checkTestUser()
