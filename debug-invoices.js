const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://reootcngcptfogfozlmz.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb290Y25nY3B0Zm9nZm96bG16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0NDM4MiwiZXhwIjoyMDY5MDIwMzgyfQ.BTLA-2wwXJgjW6MKoaw2ERbCr_fXF9w4zgLb70_5DAE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugInvoices() {
  try {
    console.log('🔍 Debugging invoice system...')

    const testUser = '4fedc90a-1c4e-4baa-a42b-2ca85d1daf0b'
    
    // Check what invoices exist in the database
    console.log('📋 Checking existing invoices in database...')
    const { data: existingInvoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('id, booking_id, client_id, provider_id, amount, status, created_at')
      .or(`client_id.eq.${testUser},provider_id.eq.${testUser}`)

    if (invoicesError) {
      console.error('❌ Error fetching invoices:', invoicesError)
    } else {
      console.log(`📊 Found ${existingInvoices?.length || 0} invoices in database:`)
      existingInvoices?.forEach(invoice => {
        console.log(`  - ID: ${invoice.id}`)
        console.log(`    Booking: ${invoice.booking_id}`)
        console.log(`    Client: ${invoice.client_id}`)
        console.log(`    Provider: ${invoice.provider_id}`)
        console.log(`    Amount: ${invoice.amount}`)
        console.log(`    Status: ${invoice.status}`)
        console.log(`    Created: ${invoice.created_at}`)
        console.log('')
      })
    }

    // Check what bookings exist for this user
    console.log('📋 Checking bookings for test user...')
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, client_id, provider_id, subtotal, currency, status, created_at')
      .eq('client_id', testUser)
      .in('status', ['paid', 'in_progress', 'completed'])

    if (bookingsError) {
      console.error('❌ Error fetching bookings:', bookingsError)
    } else {
      console.log(`📊 Found ${bookings?.length || 0} bookings for user:`)
      bookings?.forEach(booking => {
        console.log(`  - ID: ${booking.id}`)
        console.log(`    Client: ${booking.client_id}`)
        console.log(`    Provider: ${booking.provider_id}`)
        console.log(`    Amount: ${booking.subtotal}`)
        console.log(`    Status: ${booking.status}`)
        console.log(`    Created: ${booking.created_at}`)
        console.log('')
      })
    }

    // Try to create a test invoice
    if (bookings && bookings.length > 0) {
      const booking = bookings[0]
      console.log('🧪 Testing invoice creation...')
      
      const testInvoice = {
        booking_id: booking.id,
        client_id: booking.client_id,
        provider_id: booking.provider_id,
        amount: booking.subtotal || 100,
        currency: booking.currency || 'OMR',
        status: 'issued'
      }

      const { data: newInvoice, error: insertError } = await supabase
        .from('invoices')
        .insert(testInvoice)
        .select()
        .single()

      if (insertError) {
        console.error('❌ Error creating test invoice:', insertError)
      } else {
        console.log('✅ Test invoice created successfully:', newInvoice.id)
        
        // Test the PDF generation API
        console.log('🧪 Testing PDF generation API...')
        try {
          const response = await fetch('http://localhost:3000/api/invoices/generate-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invoiceId: newInvoice.id })
          })
          
          const result = await response.json()
          console.log('📄 PDF generation result:', result)
        } catch (error) {
          console.error('❌ Error testing PDF generation:', error.message)
        }
        
        // Clean up test invoice
        await supabase.from('invoices').delete().eq('id', newInvoice.id)
        console.log('🧹 Test invoice cleaned up')
      }
    }

    console.log('🎉 Invoice debugging completed!')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

debugInvoices()
