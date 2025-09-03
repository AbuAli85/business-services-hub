const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://reootcngcptfogfozlmz.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb290Y25nY3B0Zm9nZm96bG16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0NDM4MiwiZXhwIjoyMDY5MDIwMzgyfQ.BTLA-2wwXJgjW6MKoaw2ERbCr_fXF9w4zgLb70_5DAE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkInvoicesTable() {
  try {
    console.log('🔍 Checking invoices table structure and permissions...')
    
    // First, let's see if we can query the table at all
    console.log('📋 Testing basic table access...')
    const { data: invoices, error: selectError } = await supabase
      .from('invoices')
      .select('*')
      .limit(1)

    if (selectError) {
      console.log('❌ Cannot select from invoices table:', selectError.message)
      console.log('🔧 This suggests the table might not exist or has severe permission issues')
    } else {
      console.log('✅ Can select from invoices table')
      console.log('📊 Sample data:', invoices)
    }

    // Check if we can insert (this should work with service key)
    console.log('\n📋 Testing table insert permissions...')
    const testInvoice = {
      booking_id: 'test-booking-id',
      client_id: 'test-client-id', 
      provider_id: 'test-provider-id',
      amount: 100,
      currency: 'OMR',
      status: 'test'
    }

    const { data: insertResult, error: insertError } = await supabase
      .from('invoices')
      .insert(testInvoice)
      .select()
      .single()

    if (insertError) {
      console.log('❌ Cannot insert into invoices table:', insertError.message)
      console.log('🔧 Error details:', insertError)
    } else {
      console.log('✅ Can insert into invoices table')
      console.log('📊 Insert result:', insertResult)
      
      // Clean up
      await supabase.from('invoices').delete().eq('id', insertResult.id)
      console.log('🧹 Test invoice cleaned up')
    }

    // Check table schema
    console.log('\n📋 Checking table schema...')
    const { data: schema, error: schemaError } = await supabase
      .from('invoices')
      .select('*')
      .limit(0)

    if (schemaError) {
      console.log('❌ Cannot get schema:', schemaError.message)
    } else {
      console.log('✅ Table schema accessible')
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

checkInvoicesTable()
