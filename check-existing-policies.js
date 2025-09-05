const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkExistingPolicies() {
  console.log('🔍 CHECKING EXISTING POLICIES\n')
  console.log('='.repeat(50))

  try {
    // Check if we can query the policies table
    console.log('📋 1. CHECKING POLICIES TABLE')
    console.log('-'.repeat(40))
    
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .in('tablename', ['milestones', 'tasks'])
    
    if (policiesError) {
      console.log(`❌ Error querying policies: ${policiesError.message}`)
    } else {
      console.log(`✅ Found ${policies.length} policies`)
      policies.forEach(policy => {
        console.log(`   - Table: ${policy.tablename}`)
        console.log(`     Policy: ${policy.policyname}`)
        console.log(`     Command: ${policy.cmd}`)
        console.log(`     Roles: ${policy.roles}`)
        console.log(`     Qual: ${policy.qual}`)
        console.log(`     With Check: ${policy.with_check}`)
        console.log('')
      })
    }

    // Try a different approach - check if we can insert with a different method
    console.log('📋 2. TESTING ALTERNATIVE INSERT METHODS')
    console.log('-'.repeat(40))
    
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, title')
      .limit(1)
    
    if (!bookings || bookings.length === 0) {
      console.log('❌ No bookings found')
      return
    }
    
    const bookingId = bookings[0].id
    console.log(`📋 Testing with booking: ${bookings[0].title} (${bookingId})`)

    // Try using the RPC approach instead
    console.log('\n📋 3. TESTING RPC-BASED INSERT')
    console.log('-'.repeat(40))
    
    // First, let's try to create a milestone using an RPC function
    const { data: rpcInsert, error: rpcError } = await supabase
      .rpc('add_milestone', {
        booking_id: bookingId,
        title: 'RPC Test Milestone',
        description: 'Test milestone via RPC',
        status: 'pending',
        weight: 1.0
      })
    
    if (rpcError) {
      console.log(`❌ RPC insert failed: ${rpcError.message}`)
      console.log(`   Error code: ${rpcError.code}`)
    } else {
      console.log(`✅ RPC insert successful! Result: ${rpcInsert}`)
    }

    // Check if we can at least read the milestones table
    console.log('\n📋 4. TESTING READ ACCESS')
    console.log('-'.repeat(40))
    
    const { data: milestones, error: readError } = await supabase
      .from('milestones')
      .select('*')
      .eq('booking_id', bookingId)
    
    if (readError) {
      console.log(`❌ Read failed: ${readError.message}`)
    } else {
      console.log(`✅ Read successful! Found ${milestones.length} milestones`)
    }

    console.log('\n' + '='.repeat(50))
    console.log('🎯 POLICY CHECK COMPLETE')
    console.log('='.repeat(50))

  } catch (error) {
    console.error('❌ Check failed:', error)
  }
}

checkExistingPolicies()
