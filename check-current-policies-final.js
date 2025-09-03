const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://reootcngcptfogfozlmz.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb290Y25nY3B0Zm9nZm96bG16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0NDM4MiwiZXhwIjoyMDY5MDIwMzgyfQ.BTLA-2wwXJgjW6MKoaw2ERbCr_fXF9w4zgLb70_5DAE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkCurrentPoliciesFinal() {
  try {
    console.log('🔍 Checking current RLS policies on invoices table...')
    
    // Try to query the policies directly
    const { data: policies, error } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'invoices')

    if (error) {
      console.log('❌ Cannot query policies directly:', error.message)
      console.log('')
      console.log('🔧 Manual check required in Supabase dashboard:')
      console.log('1. Go to: https://supabase.com/dashboard/project/reootcngcptfogfozlmz/sql')
      console.log('2. Run this SQL:')
      console.log('   SELECT * FROM pg_policies WHERE tablename = \'invoices\';')
      console.log('')
      console.log('3. Look for policies with "service_role" in the qual or with_check fields')
      return
    }

    console.log('📋 Current policies on invoices table:')
    console.log(JSON.stringify(policies, null, 2))

    // Check if any policy contains 'service_role'
    const hasServiceRole = policies.some(policy => 
      (policy.qual && policy.qual.includes('service_role')) ||
      (policy.with_check && policy.with_check.includes('service_role'))
    )

    if (hasServiceRole) {
      console.log('✅ Found service_role in policies - RLS should be working')
    } else {
      console.log('❌ No service_role found in policies - RLS policies may not be updated')
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

checkCurrentPoliciesFinal()
