const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testSmartInvoiceSimple() {
  console.log('🧪 Testing Smart Invoice System (Simple)...')
  
  try {
    // Test 1: Check existing bookings
    console.log('\n1️⃣ Checking existing bookings...')
    
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, client_id, provider_id, status, subtotal, currency')
      .limit(5)
    
    if (bookingsError) {
      console.error('❌ Error fetching bookings:', bookingsError)
      return
    }
    
    if (!bookings || bookings.length === 0) {
      console.log('ℹ️ No existing bookings found, skipping test')
      return
    }
    
    console.log(`✅ Found ${bookings.length} existing bookings`)
    
    // Test 2: Test smart invoice service
    console.log('\n2️⃣ Testing smart invoice service...')
    
    // Import the smart invoice service
    const { smartInvoiceService } = require('./lib/smart-invoice-service.js')
    
    // Test with first booking
    const testBooking = bookings[0]
    console.log(`📝 Testing with booking: ${testBooking.id}`)
    
    const invoice = await smartInvoiceService.generateInvoiceOnApproval(testBooking.id)
    
    if (invoice) {
      console.log('✅ Invoice generated successfully:', invoice.invoice_number)
      console.log('📋 Invoice details:', {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        amount: invoice.total_amount,
        currency: invoice.currency,
        status: invoice.status,
        due_date: invoice.due_date
      })
    } else {
      console.log('ℹ️ Invoice generation skipped (may already exist)')
    }
    
    // Test 3: Test invoice retrieval
    console.log('\n3️⃣ Testing invoice retrieval...')
    
    const userInvoices = await smartInvoiceService.getUserInvoices(testBooking.client_id, 'client')
    console.log(`✅ Retrieved ${userInvoices.length} invoices for client`)
    
    if (userInvoices.length > 0) {
      console.log('📋 Sample invoice:', {
        invoice_number: userInvoices[0].invoice_number,
        amount: userInvoices[0].total_amount,
        status: userInvoices[0].status
      })
    }
    
    // Test 4: Test provider invoices
    console.log('\n4️⃣ Testing provider invoice retrieval...')
    
    const providerInvoices = await smartInvoiceService.getUserInvoices(testBooking.provider_id, 'provider')
    console.log(`✅ Retrieved ${providerInvoices.length} invoices for provider`)
    
    // Test 5: Test invoice status update
    if (userInvoices.length > 0) {
      console.log('\n5️⃣ Testing invoice status update...')
      
      const testInvoice = userInvoices[0]
      const success = await smartInvoiceService.updateInvoiceStatus(testInvoice.id, 'paid')
      
      if (success) {
        console.log('✅ Invoice status updated to paid')
        
        // Revert the status back
        await smartInvoiceService.updateInvoiceStatus(testInvoice.id, 'issued')
        console.log('🔄 Reverted status back to issued')
      } else {
        console.log('❌ Failed to update invoice status')
      }
    }
    
    console.log('\n🎉 Smart Invoice System test completed successfully!')
    
  } catch (error) {
    console.error('❌ Error testing smart invoice system:', error)
  }
}

testSmartInvoiceSimple()
