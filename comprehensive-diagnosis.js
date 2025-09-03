const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://reootcngcptfogfozlmz.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb290Y25nY3B0Zm9nZm96bG16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0NDM4MiwiZXhwIjoyMDY5MDIwMzgyfQ.BTLA-2wwXJgjW6MKoaw2ERbCr_fXF9w4zgLb70_5DAE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function comprehensiveDiagnosis() {
  try {
    console.log('🔍 Comprehensive diagnosis of invoice permissions...')
    
    // Test 1: Check if we can read from invoices table
    console.log('\n📋 Test 1: Reading from invoices table...')
    const { data: invoices, error: readError } = await supabase
      .from('invoices')
      .select('*')
      .limit(1)
    
    if (readError) {
      console.log('❌ Cannot read from invoices:', readError.message)
    } else {
      console.log('✅ Can read from invoices, found:', invoices.length, 'records')
    }

    // Test 2: Check if we can insert into a simple table (like profiles)
    console.log('\n📋 Test 2: Testing insert into profiles table...')
    const testProfile = {
      id: 'test-' + Date.now(),
      email: 'test@example.com',
      role: 'client'
    }

    const { data: profileResult, error: profileError } = await supabase
      .from('profiles')
      .insert(testProfile)
      .select()
      .single()

    if (profileError) {
      console.log('❌ Cannot insert into profiles:', profileError.message)
    } else {
      console.log('✅ Can insert into profiles!')
      // Clean up
      await supabase.from('profiles').delete().eq('id', testProfile.id)
      console.log('🧹 Test profile cleaned up')
    }

    // Test 3: Check if we can insert into bookings table
    console.log('\n📋 Test 3: Testing insert into bookings table...')
    const testBooking = {
      id: 'test-booking-' + Date.now(),
      client_id: '4fedc90a-1c4e-4baa-a42b-2ca85d1daf0b',
      provider_id: '6867a364-e239-4de7-9e07-fc6b5682d92c',
      subtotal: 100,
      currency: 'OMR',
      status: 'test'
    }

    const { data: bookingResult, error: bookingError } = await supabase
      .from('bookings')
      .insert(testBooking)
      .select()
      .single()

    if (bookingError) {
      console.log('❌ Cannot insert into bookings:', bookingError.message)
    } else {
      console.log('✅ Can insert into bookings!')
      // Clean up
      await supabase.from('bookings').delete().eq('id', testBooking.id)
      console.log('🧹 Test booking cleaned up')
    }

    // Test 4: Try to insert into invoices with minimal data
    console.log('\n📋 Test 4: Testing insert into invoices with minimal data...')
    const minimalInvoice = {
      booking_id: '0d269f5b-b4d3-4fb7-aa54-47c0b054cdb5',
      client_id: '4fedc90a-1c4e-4baa-a42b-2ca85d1daf0b',
      provider_id: '6867a364-e239-4de7-9e07-fc6b5682d92c',
      amount: 100,
      currency: 'OMR',
      status: 'issued'
    }

    const { data: invoiceResult, error: invoiceError } = await supabase
      .from('invoices')
      .insert(minimalInvoice)
      .select()
      .single()

    if (invoiceError) {
      console.log('❌ Cannot insert into invoices:', invoiceError.message)
      console.log('🔧 Full error details:', JSON.stringify(invoiceError, null, 2))
    } else {
      console.log('✅ Can insert into invoices!')
      console.log('📊 Invoice created:', invoiceResult)
      // Clean up
      await supabase.from('invoices').delete().eq('id', invoiceResult.id)
      console.log('🧹 Test invoice cleaned up')
    }

    // Test 5: Check current RLS policies
    console.log('\n📋 Test 5: Checking current RLS policies...')
    console.log('🔧 This would require manual SQL execution in Supabase dashboard:')
    console.log('   SELECT * FROM pg_policies WHERE tablename = \'invoices\';')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

comprehensiveDiagnosis()
