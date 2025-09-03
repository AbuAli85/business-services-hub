const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://reootcngcptfogfozlmz.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb290Y25nY3B0Zm9nZm96bG16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0NDM4MiwiZXhwIjoyMDY5MDIwMzgyfQ.BTLA-2wwXJgjW6MKoaw2ERbCr_fXF9w4zgLb70_5DAE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testSimpleInsert() {
  try {
    console.log('🧪 Testing simple insert with minimal data...')
    
    // Try with minimal required fields
    const minimalInvoice = {
      booking_id: '00000000-0000-0000-0000-000000000000', // dummy UUID
      client_id: '00000000-0000-0000-0000-000000000000', // dummy UUID  
      provider_id: '00000000-0000-0000-0000-000000000000', // dummy UUID
      amount: 1,
      currency: 'OMR',
      status: 'issued'
    }

    console.log('📋 Attempting insert with minimal data...')
    const { data: result, error } = await supabase
      .from('invoices')
      .insert(minimalInvoice)
      .select()
      .single()

    if (error) {
      console.log('❌ Minimal insert failed:', error.message)
      console.log('🔧 Full error:', error)
      
      // Try to get more details about the table structure
      console.log('\n📋 Checking if we can get table info...')
      const { data: tableInfo, error: infoError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_name', 'invoices')
        .eq('table_schema', 'public')

      if (infoError) {
        console.log('❌ Cannot get table info:', infoError.message)
      } else {
        console.log('📊 Table structure:')
        console.log(JSON.stringify(tableInfo, null, 2))
      }
    } else {
      console.log('✅ Minimal insert SUCCESS!')
      console.log('📊 Result:', result)
      
      // Clean up
      await supabase.from('invoices').delete().eq('id', result.id)
      console.log('🧹 Test invoice cleaned up')
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

testSimpleInsert()
