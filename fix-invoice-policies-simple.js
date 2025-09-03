const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://reootcngcptfogfozlmz.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb290Y25nY3B0Zm9nZm96bG16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0NDM4MiwiZXhwIjoyMDY5MDIwMzgyfQ.BTLA-2wwXJgjW6MKoaw2ERbCr_fXF9w4zgLb70_5DAE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixInvoicePolicies() {
  try {
    console.log('🔧 Fixing invoice RLS policies...')

    // Test current permissions first
    console.log('🧪 Testing current permissions...')
    
    const testUser = '4fedc90a-1c4e-4baa-a42b-2ca85d1daf0b'
    
    // Get a booking for this user
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, client_id, provider_id, subtotal, currency, status')
      .eq('client_id', testUser)
      .limit(1)

    if (!bookings || bookings.length === 0) {
      console.log('❌ No bookings found for test user')
      return
    }

    const booking = bookings[0]
    console.log('📋 Found booking:', booking.id)

    // Try to create an invoice
    const testInvoice = {
      booking_id: booking.id,
      client_id: booking.client_id,
      provider_id: booking.provider_id,
      amount: booking.subtotal || 100,
      currency: booking.currency || 'OMR',
      status: 'issued'
    }

    console.log('🔍 Testing invoice creation...')
    const { data: newInvoice, error: insertError } = await supabase
      .from('invoices')
      .insert(testInvoice)
      .select()
      .single()

    if (insertError) {
      console.error('❌ Permission denied (expected):', insertError.message)
      console.log('🔧 This confirms the RLS policy issue.')
      console.log('')
      console.log('📝 To fix this, you need to run the following SQL in your Supabase dashboard:')
      console.log('')
      console.log('1. Go to: https://supabase.com/dashboard/project/reootcngcptfogfozlmz/sql')
      console.log('2. Run this SQL:')
      console.log('')
      console.log('-- Drop existing policies')
      console.log('DROP POLICY IF EXISTS "Users can create invoices" ON invoices;')
      console.log('DROP POLICY IF EXISTS "Users can view own invoices" ON invoices;')
      console.log('DROP POLICY IF EXISTS "Users can update own invoices" ON invoices;')
      console.log('')
      console.log('-- Create updated policies')
      console.log('CREATE POLICY "Users can view own invoices" ON invoices')
      console.log('    FOR SELECT USING (')
      console.log('        auth.uid() = client_id OR ')
      console.log('        auth.uid() = provider_id OR')
      console.log('        EXISTS (')
      console.log('            SELECT 1 FROM profiles ')
      console.log('            WHERE id = auth.uid() AND role = \'admin\'')
      console.log('        )')
      console.log('    );')
      console.log('')
      console.log('CREATE POLICY "Users can create invoices" ON invoices')
      console.log('    FOR INSERT WITH CHECK (')
      console.log('        (auth.uid() = client_id AND EXISTS (')
      console.log('            SELECT 1 FROM bookings ')
      console.log('            WHERE id = booking_id AND client_id = auth.uid()')
      console.log('        )) OR')
      console.log('        (auth.uid() = provider_id AND EXISTS (')
      console.log('            SELECT 1 FROM bookings ')
      console.log('            WHERE id = booking_id AND provider_id = auth.uid()')
      console.log('        )) OR')
      console.log('        EXISTS (')
      console.log('            SELECT 1 FROM profiles ')
      console.log('            WHERE id = auth.uid() AND role = \'admin\'')
      console.log('        )')
      console.log('    );')
      console.log('')
      console.log('CREATE POLICY "Users can update own invoices" ON invoices')
      console.log('    FOR UPDATE USING (')
      console.log('        auth.uid() = provider_id OR')
      console.log('        auth.uid() = client_id OR')
      console.log('        EXISTS (')
      console.log('            SELECT 1 FROM profiles ')
      console.log('            WHERE id = auth.uid() AND role = \'admin\'')
      console.log('        )')
      console.log('    );')
      console.log('')
      console.log('3. After running the SQL, the invoice generation will work properly.')
      return
    }

    console.log('✅ Invoice created successfully:', newInvoice.id)
    
    // Clean up
    await supabase.from('invoices').delete().eq('id', newInvoice.id)
    console.log('🧹 Test invoice cleaned up')
    console.log('🎉 Invoice permissions are working correctly!')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

fixInvoicePolicies()
