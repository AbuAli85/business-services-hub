const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://reootcngcptfogfozlmz.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb290Y25nY3B0Zm9nZm96bG16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0NDM4MiwiZXhwIjoyMDY5MDIwMzgyfQ.BTLA-2wwXJgjW6MKoaw2ERbCr_fXF9w4zgLb70_5DAE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testDisableRLSTemporarily() {
  try {
    console.log('🔍 Testing with RLS temporarily disabled...')
    console.log('')
    console.log('📋 This test will help us determine if the issue is with RLS or something else.')
    console.log('')
    console.log('🔧 You need to run this SQL in Supabase dashboard first:')
    console.log('   ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;')
    console.log('')
    console.log('📋 Then come back here and run this script again.')
    console.log('')
    console.log('🧪 Testing invoice creation with RLS disabled...')
    
    const testInvoice = {
      booking_id: '0d269f5b-b4d3-4fb7-aa54-47c0b054cdb5',
      client_id: '4fedc90a-1c4e-4baa-a42b-2ca85d1daf0b',
      provider_id: '6867a364-e239-4de7-9e07-fc6b5682d92c',
      amount: 100,
      currency: 'OMR',
      status: 'issued'
    }

    const { data: result, error: insertError } = await supabase
      .from('invoices')
      .insert(testInvoice)
      .select()
      .single()

    if (insertError) {
      console.log('❌ Insert still failed with RLS disabled:', insertError.message)
      console.log('🔧 This suggests the issue is NOT with RLS policies')
      console.log('🔧 The problem might be:')
      console.log('   - Service key is not valid')
      console.log('   - Table permissions are restricted at database level')
      console.log('   - There are other constraints on the table')
    } else {
      console.log('✅ Insert SUCCESS with RLS disabled!')
      console.log('📊 Result:', result)
      console.log('')
      console.log('🎯 This confirms the issue IS with RLS policies')
      console.log('🔧 The service key is working, but RLS is blocking it')
      console.log('')
      console.log('🧹 Cleaning up test invoice...')
      await supabase.from('invoices').delete().eq('id', result.id)
      console.log('✅ Test invoice cleaned up')
      console.log('')
      console.log('📋 Now re-enable RLS with this SQL:')
      console.log('   ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;')
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

testDisableRLSTemporarily()
