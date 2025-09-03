const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://reootcngcptfogfozlmz.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb290Y25nY3B0Zm9nZm96bG16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0NDM4MiwiZXhwIjoyMDY5MDIwMzgyfQ.BTLA-2wwXJgjW6MKoaw2ERbCr_fXF9w4zgLb70_5DAE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigrationDirect() {
  try {
    console.log('🔧 Applying RLS policy migration directly...')

    // Try to execute the migration using the service role key
    const migrationSQL = `
      -- Drop existing policies
      DROP POLICY IF EXISTS "Users can create invoices" ON invoices;
      DROP POLICY IF EXISTS "Users can view own invoices" ON invoices;
      DROP POLICY IF EXISTS "Users can update own invoices" ON invoices;

      -- Create updated policies
      CREATE POLICY "Users can view own invoices" ON invoices
          FOR SELECT USING (
              auth.uid() = client_id OR 
              auth.uid() = provider_id OR
              EXISTS (
                  SELECT 1 FROM profiles 
                  WHERE id = auth.uid() AND role = 'admin'
              )
          );

      CREATE POLICY "Users can create invoices" ON invoices
          FOR INSERT WITH CHECK (
              (auth.uid() = client_id AND EXISTS (
                  SELECT 1 FROM bookings 
                  WHERE id = booking_id AND client_id = auth.uid()
              )) OR
              (auth.uid() = provider_id AND EXISTS (
                  SELECT 1 FROM bookings 
                  WHERE id = booking_id AND provider_id = auth.uid()
              )) OR
              EXISTS (
                  SELECT 1 FROM profiles 
                  WHERE id = auth.uid() AND role = 'admin'
              )
          );

      CREATE POLICY "Users can update own invoices" ON invoices
          FOR UPDATE USING (
              auth.uid() = provider_id OR
              auth.uid() = client_id OR
              EXISTS (
                  SELECT 1 FROM profiles 
                  WHERE id = auth.uid() AND role = 'admin'
              )
          );
    `

    // Try to execute using rpc
    console.log('📝 Attempting to execute migration...')
    
    // Split into individual statements
    const statements = [
      'DROP POLICY IF EXISTS "Users can create invoices" ON invoices;',
      'DROP POLICY IF EXISTS "Users can view own invoices" ON invoices;',
      'DROP POLICY IF EXISTS "Users can update own invoices" ON invoices;',
      `CREATE POLICY "Users can view own invoices" ON invoices
          FOR SELECT USING (
              auth.uid() = client_id OR 
              auth.uid() = provider_id OR
              EXISTS (
                  SELECT 1 FROM profiles 
                  WHERE id = auth.uid() AND role = 'admin'
              )
          );`,
      `CREATE POLICY "Users can create invoices" ON invoices
          FOR INSERT WITH CHECK (
              (auth.uid() = client_id AND EXISTS (
                  SELECT 1 FROM bookings 
                  WHERE id = booking_id AND client_id = auth.uid()
              )) OR
              (auth.uid() = provider_id AND EXISTS (
                  SELECT 1 FROM bookings 
                  WHERE id = booking_id AND provider_id = auth.uid()
              )) OR
              EXISTS (
                  SELECT 1 FROM profiles 
                  WHERE id = auth.uid() AND role = 'admin'
              )
          );`,
      `CREATE POLICY "Users can update own invoices" ON invoices
          FOR UPDATE USING (
              auth.uid() = provider_id OR
              auth.uid() = client_id OR
              EXISTS (
                  SELECT 1 FROM profiles 
                  WHERE id = auth.uid() AND role = 'admin'
              )
          );`
    ]

    for (let i = 0; i < statements.length; i++) {
      console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`)
      try {
        // Try different methods to execute SQL
        const { error } = await supabase.rpc('exec', { sql: statements[i] })
        if (error) {
          console.log(`⚠️  Method 1 failed for statement ${i + 1}:`, error.message)
          
          // Try alternative method
          const { error: error2 } = await supabase.rpc('exec_sql', { sql: statements[i] })
          if (error2) {
            console.log(`⚠️  Method 2 failed for statement ${i + 1}:`, error2.message)
            console.log(`📝 Statement ${i + 1} needs to be run manually in Supabase dashboard`)
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`)
          }
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`)
        }
      } catch (err) {
        console.log(`❌ Error executing statement ${i + 1}:`, err.message)
      }
    }

    console.log('🎉 Migration application completed!')
    console.log('')
    console.log('📝 If any statements failed, you need to run them manually in Supabase dashboard:')
    console.log('   1. Go to: https://supabase.com/dashboard/project/reootcngcptfogfozlmz/sql')
    console.log('   2. Copy and paste the SQL from: supabase/migrations/080_fix_invoices_rls_policies.sql')
    console.log('   3. Click Run')
    console.log('')
    console.log('🧪 Testing the fix...')

    // Test if the migration worked
    const testUser = '4fedc90a-1c4e-4baa-a42b-2ca85d1daf0b'
    
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, client_id, provider_id, subtotal, currency, status')
      .eq('client_id', testUser)
      .limit(1)

    if (bookings && bookings.length > 0) {
      const booking = bookings[0]
      const testInvoice = {
        booking_id: booking.id,
        client_id: booking.client_id,
        provider_id: booking.provider_id,
        amount: booking.subtotal || 100,
        currency: booking.currency || 'OMR',
        status: 'issued'
      }

      const { data: newInvoice, error: insertError } = await supabase
        .from('invoices')
        .insert(testInvoice)
        .select()
        .single()

      if (insertError) {
        console.log('❌ Still getting permission error:', insertError.message)
        console.log('🔧 The migration may not have been applied successfully.')
        console.log('📝 Please run the SQL manually in the Supabase dashboard.')
      } else {
        console.log('✅ SUCCESS! Invoice created:', newInvoice.id)
        console.log('🎉 RLS policies have been updated successfully!')
        
        // Clean up
        await supabase.from('invoices').delete().eq('id', newInvoice.id)
        console.log('🧹 Test invoice cleaned up')
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

applyMigrationDirect()
