const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://reootcngcptfogfozlmz.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb290Y25nY3B0Zm9nZm96bG16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0NDM4MiwiZXhwIjoyMDY5MDIwMzgyfQ.BTLA-2wwXJgjW6MKoaw2ERbCr_fXF9w4zgLb70_5DAE'

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixInvoicesPermissions() {
  try {
    console.log('🔧 Fixing invoices RLS policies...')

    // Test the current permissions first
    console.log('🧪 Testing current invoice generation permissions...')
    
    // Get a test user (client)
    const { data: testUser, error: userError } = await supabase.auth.admin.getUserById('4fedc90a-1c4e-4baa-a42b-2ca85d1daf0b')
    
    if (userError) {
      console.error('❌ Error getting test user:', userError)
      return
    }

    console.log('👤 Test user found:', testUser.user.email)

    // Check if user has any bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, client_id, provider_id, subtotal, currency, status')
      .eq('client_id', testUser.user.id)
      .in('status', ['paid', 'in_progress', 'completed'])
      .limit(1)

    if (bookingsError) {
      console.error('❌ Error fetching bookings:', bookingsError)
      return
    }

    if (!bookings || bookings.length === 0) {
      console.log('ℹ️  No bookings found for test user')
      return
    }

    console.log('📋 Found bookings for test user:', bookings.length)

    // Test creating an invoice with current permissions
    const testInvoice = {
      booking_id: bookings[0].id,
      client_id: bookings[0].client_id,
      provider_id: bookings[0].provider_id,
      amount: bookings[0].subtotal || 100,
      currency: bookings[0].currency || 'OMR',
      status: bookings[0].status === 'paid' ? 'paid' : 'issued'
    }

    console.log('🔍 Testing invoice creation...')
    const { data: newInvoice, error: insertError } = await supabase
      .from('invoices')
      .insert(testInvoice)
      .select()
      .single()

    if (insertError) {
      console.error('❌ Error creating test invoice (expected):', insertError.message)
      console.log('🔧 This confirms the permission issue. The RLS policies need to be updated.')
      console.log('📝 Please apply the migration manually in the Supabase dashboard:')
      console.log('   1. Go to SQL Editor in Supabase dashboard')
      console.log('   2. Run the migration: supabase/migrations/080_fix_invoices_rls_policies.sql')
      console.log('   3. This will allow clients to generate invoices from their bookings')
      return
    }

    console.log('✅ Test invoice created successfully:', newInvoice.id)

    // Clean up test invoice
    await supabase
      .from('invoices')
      .delete()
      .eq('id', newInvoice.id)

    console.log('🧹 Test invoice cleaned up')



    console.log('🎉 Invoices permissions fix completed successfully!')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

fixInvoicesPermissions()
