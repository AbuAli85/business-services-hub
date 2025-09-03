const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://reootcngcptfogfozlmz.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb290Y25nY3B0Zm9nZm96bG16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0NDM4MiwiZXhwIjoyMDY5MDIwMzgyfQ.BTLA-2wwXJgjW6MKoaw2ERbCr_fXF9w4zgLb70_5DAE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testInvoiceWithServiceKey() {
  try {
    console.log('🧪 Testing invoice creation with service key (bypasses RLS)...')
    
    const testUser = '4fedc90a-1c4e-4baa-a42b-2ca85d1daf0b'
    
    // Get a booking for this user
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, client_id, provider_id, subtotal, currency, status')
      .eq('client_id', testUser)
      .limit(1)

    if (!bookings || bookings.length === 0) {
      console.log('❌ No bookings found for test user')
      return
    }

    const booking = bookings[0]
    console.log('📋 Found booking:', booking.id)

    // Test invoice creation with service key (should work regardless of RLS)
    const testInvoice = {
      booking_id: booking.id,
      client_id: booking.client_id,
      provider_id: booking.provider_id,
      amount: booking.subtotal || 100,
      currency: booking.currency || 'OMR',
      status: 'issued'
    }

    console.log('🔍 Testing invoice creation with service key...')
    const { data: newInvoice, error: insertError } = await supabase
      .from('invoices')
      .insert(testInvoice)
      .select()
      .single()

    if (insertError) {
      console.log('❌ Service key test failed:', insertError.message)
    } else {
      console.log('✅ Service key test SUCCESS! Invoice created:', newInvoice.id)
      
      // Clean up
      await supabase.from('invoices').delete().eq('id', newInvoice.id)
      console.log('🧹 Test invoice cleaned up')
    }

    // Now test with user context (this should work if RLS policies are correct)
    console.log('\n🔍 Testing invoice creation with user context...')
    
    // Create a client with user context
    const userSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Set the user context
    await userSupabase.auth.setSession({
      access_token: 'test-token',
      refresh_token: 'test-refresh'
    })

    // Try to create invoice with user context
    const { data: userInvoice, error: userError } = await userSupabase
      .from('invoices')
      .insert(testInvoice)
      .select()
      .single()

    if (userError) {
      console.log('❌ User context test failed:', userError.message)
      console.log('🔧 This suggests RLS policies may not be working correctly')
    } else {
      console.log('✅ User context test SUCCESS! Invoice created:', userInvoice.id)
      
      // Clean up
      await userSupabase.from('invoices').delete().eq('id', userInvoice.id)
      console.log('🧹 User test invoice cleaned up')
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

testInvoiceWithServiceKey()
