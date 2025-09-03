const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://reootcngcptfogfozlmz.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb290Y25nY3B0Zm9nZm96bG16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0NDM4MiwiZXhwIjoyMDY5MDIwMzgyfQ.BTLA-2wwXJgjW6MKoaw2ERbCr_fXF9w4zgLb70_5DAE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkCurrentPolicies() {
  try {
    console.log('🔍 Checking current RLS policies on invoices table...')
    
    // Query to get current policies
    const { data: policies, error } = await supabase
      .rpc('exec', { 
        sql: `
          SELECT 
            schemaname,
            tablename,
            policyname,
            permissive,
            roles,
            cmd,
            qual,
            with_check
          FROM pg_policies 
          WHERE tablename = 'invoices'
          ORDER BY policyname;
        `
      })

    if (error) {
      console.log('❌ Error checking policies:', error.message)
      
      // Try alternative method
      const { data: policies2, error: error2 } = await supabase
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'invoices')
      
      if (error2) {
        console.log('❌ Alternative method also failed:', error2.message)
        return
      } else {
        console.log('📋 Current policies on invoices table:')
        console.log(JSON.stringify(policies2, null, 2))
      }
    } else {
      console.log('📋 Current policies on invoices table:')
      console.log(JSON.stringify(policies, null, 2))
    }

    // Also check if RLS is enabled
    console.log('\n🔍 Checking if RLS is enabled on invoices table...')
    const { data: rlsStatus, error: rlsError } = await supabase
      .rpc('exec', { 
        sql: `
          SELECT relname, relrowsecurity 
          FROM pg_class 
          WHERE relname = 'invoices';
        `
      })

    if (rlsError) {
      console.log('❌ Error checking RLS status:', rlsError.message)
    } else {
      console.log('📋 RLS status:', JSON.stringify(rlsStatus, null, 2))
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

checkCurrentPolicies()
