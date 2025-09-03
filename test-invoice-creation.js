const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://reootcngcptfogfozlmz.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb290Y25nY3B0Zm9nZm96bG16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0NDM4MiwiZXhwIjoyMDY5MDIwMzgyfQ.BTLA-2wwXJgjW6MKoaw2ERbCr_fXF9w4zgLb70_5DAE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testInvoiceCreation() {
  try {
    console.log('🧪 Testing invoice creation after RLS policy update...')

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

    // Try to create an invoice
    const testInvoice = {
      booking_id: booking.id,
      client_id: booking.client_id,
      provider_id: booking.provider_id,
      amount: booking.subtotal || 100,
      currency: booking.currency || 'OMR',
      status: 'issued'
    }

    console.log('🔍 Testing invoice creation...')
    const { data: newInvoice, error: insertError } = await supabase
      .from('invoices')
      .insert(testInvoice)
      .select()
      .single()

    if (insertError) {
      console.error('❌ Still getting permission error:', insertError.message)
      console.log('🔧 The RLS policies may not have been updated yet.')
      console.log('📝 Please make sure you ran the SQL in the Supabase dashboard.')
      return
    }

    console.log('✅ SUCCESS! Invoice created:', newInvoice.id)
    console.log('🎉 RLS policies have been updated successfully!')
    
    // Clean up
    await supabase.from('invoices').delete().eq('id', newInvoice.id)
    console.log('🧹 Test invoice cleaned up')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

testInvoiceCreation()
