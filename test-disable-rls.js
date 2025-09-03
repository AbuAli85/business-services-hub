const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://reootcngcptfogfozlmz.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb290Y25nY3B0Zm9nZm96bG16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0NDM4MiwiZXhwIjoyMDY5MDIwMzgyfQ.BTLA-2wwXJgjW6MKoaw2ERbCr_fXF9w4zgLb70_5DAE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testDisableRLS() {
  try {
    console.log('🧪 Testing invoice creation with RLS temporarily disabled...')
    
    // First, let's try to disable RLS on the invoices table
    console.log('📋 Attempting to disable RLS on invoices table...')
    
    // Try to execute the disable RLS command
    const { data: disableResult, error: disableError } = await supabase
      .rpc('exec', { 
        sql: 'ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;'
      })

    if (disableError) {
      console.log('❌ Cannot disable RLS programmatically:', disableError.message)
      console.log('🔧 You need to run this manually in Supabase dashboard:')
      console.log('   ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;')
      return
    }

    console.log('✅ RLS disabled successfully!')

    // Now try to create an invoice
    const testInvoice = {
      booking_id: '0d269f5b-b4d3-4fb7-aa54-47c0b054cdb5',
      client_id: '4fedc90a-1c4e-4baa-a42b-2ca85d1daf0b',
      provider_id: '6867a364-e239-4de7-9e07-fc6b5682d92c',
      amount: 100,
      currency: 'OMR',
      status: 'issued'
    }

    console.log('📋 Attempting invoice creation with RLS disabled...')
    const { data: newInvoice, error: insertError } = await supabase
      .from('invoices')
      .insert(testInvoice)
      .select()
      .single()

    if (insertError) {
      console.log('❌ Invoice creation still failed:', insertError.message)
    } else {
      console.log('✅ Invoice creation SUCCESS!')
      console.log('📊 New invoice:', newInvoice)
      
      // Clean up
      await supabase.from('invoices').delete().eq('id', newInvoice.id)
      console.log('🧹 Test invoice cleaned up')
    }

    // Re-enable RLS
    console.log('📋 Re-enabling RLS...')
    const { error: enableError } = await supabase
      .rpc('exec', { 
        sql: 'ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;'
      })

    if (enableError) {
      console.log('❌ Cannot re-enable RLS programmatically:', enableError.message)
      console.log('🔧 You need to run this manually in Supabase dashboard:')
      console.log('   ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;')
    } else {
      console.log('✅ RLS re-enabled successfully!')
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

testDisableRLS()
