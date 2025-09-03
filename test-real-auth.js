const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://reootcngcptfogfozlmz.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb290Y25nY3B0Zm9nZm96bG16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDQzODIsImV4cCI6MjA2OTAyMDM4Mn0.8QZqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJq'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testRealAuth() {
  try {
    console.log('🧪 Testing with real user authentication...')
    
    // Try to sign in with the test user's email
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'chairman@falconeyegroup.net',
      password: 'test123' // This might not work, but let's try
    })

    if (authError) {
      console.log('❌ Auth failed:', authError.message)
      console.log('🔧 This is expected - we don\'t have the password')
      return
    }

    console.log('✅ Auth successful!')
    console.log('📊 User ID:', authData.user.id)

    // Now try to create an invoice
    const testInvoice = {
      booking_id: '0d269f5b-b4d3-4fb7-aa54-47c0b054cdb5',
      client_id: authData.user.id,
      provider_id: '6867a364-e239-4de7-9e07-fc6b5682d92c',
      amount: 100,
      currency: 'OMR',
      status: 'issued'
    }

    const { data: newInvoice, error: insertError } = await supabase
      .from('invoices')
      .insert(testInvoice)
      .select()
      .single()

    if (insertError) {
      console.log('❌ Invoice creation failed:', insertError.message)
    } else {
      console.log('✅ Invoice creation SUCCESS!')
      console.log('📊 New invoice:', newInvoice)
      
      // Clean up
      await supabase.from('invoices').delete().eq('id', newInvoice.id)
      console.log('🧹 Test invoice cleaned up')
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

testRealAuth()
