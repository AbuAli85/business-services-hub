const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://reootcngcptfogfozlmz.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb290Y25nY3B0Zm9nZm96bG16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0NDM4MiwiZXhwIjoyMDY5MDIwMzgyfQ.BTLA-2wwXJgjW6MKoaw2ERbCr_fXF9w4zgLb70_5DAE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testServiceKeyRole() {
  try {
    console.log('🔍 Testing service key role and permissions...')
    
    // Test 1: Check what role the service key is using
    console.log('\n📋 Test 1: Checking service key role...')
    
    // Try to create a simple function to check the role
    const { data: roleCheck, error: roleError } = await supabase
      .rpc('exec', { 
        sql: 'SELECT auth.role() as current_role, auth.uid() as current_uid;'
      })

    if (roleError) {
      console.log('❌ Cannot check role directly:', roleError.message)
    } else {
      console.log('✅ Role check result:', roleCheck)
    }

    // Test 2: Try a different approach - check if we can bypass RLS entirely
    console.log('\n📋 Test 2: Testing RLS bypass with service key...')
    
    // Try to insert with a very simple approach
    const simpleInvoice = {
      booking_id: '0d269f5b-b4d3-4fb7-aa54-47c0b054cdb5',
      client_id: '4fedc90a-1c4e-4baa-a42b-2ca85d1daf0b',
      provider_id: '6867a364-e239-4de7-9e07-fc6b5682d92c',
      amount: 100,
      currency: 'OMR',
      status: 'issued'
    }

    console.log('📋 Attempting insert with service key...')
    const { data: result, error: insertError } = await supabase
      .from('invoices')
      .insert(simpleInvoice)
      .select()
      .single()

    if (insertError) {
      console.log('❌ Insert failed:', insertError.message)
      console.log('🔧 Full error:', JSON.stringify(insertError, null, 2))
      
      // Check if it's a different type of error
      if (insertError.code === '42501') {
        console.log('🔍 This is a permission error - RLS is blocking the insert')
        console.log('🔧 The service key might not be recognized as service_role')
      }
    } else {
      console.log('✅ Insert SUCCESS!')
      console.log('📊 Result:', result)
      
      // Clean up
      await supabase.from('invoices').delete().eq('id', result.id)
      console.log('🧹 Test invoice cleaned up')
    }

    // Test 3: Try with a different service key approach
    console.log('\n📋 Test 3: Testing with different service key configuration...')
    
    // Create a new client with explicit service role
    const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey
        }
      }
    })

    const { data: result2, error: insertError2 } = await serviceSupabase
      .from('invoices')
      .insert(simpleInvoice)
      .select()
      .single()

    if (insertError2) {
      console.log('❌ Service key with explicit headers failed:', insertError2.message)
    } else {
      console.log('✅ Service key with explicit headers SUCCESS!')
      console.log('📊 Result:', result2)
      
      // Clean up
      await serviceSupabase.from('invoices').delete().eq('id', result2.id)
      console.log('🧹 Test invoice cleaned up')
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

testServiceKeyRole()
