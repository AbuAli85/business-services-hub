const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugRLSPolicies() {
  console.log('🔍 DEBUGGING RLS POLICIES\n')
  console.log('='.repeat(50))

  try {
    // Check if we can query the information_schema to see policies
    console.log('📋 1. CHECKING EXISTING POLICIES')
    console.log('-'.repeat(40))
    
    const { data: policies, error: policiesError } = await supabase
      .from('information_schema.table_privileges')
      .select('*')
      .eq('table_name', 'milestones')
    
    if (policiesError) {
      console.log(`❌ Error checking policies: ${policiesError.message}`)
    } else {
      console.log(`✅ Found ${policies.length} policies for milestones table`)
      policies.forEach(policy => {
        console.log(`   - ${policy.grantor} → ${policy.grantee}: ${policy.privilege_type}`)
      })
    }

    // Try a different approach - check if we can insert with service role
    console.log('\n📋 2. TESTING INSERT WITH SERVICE ROLE')
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
    
    // Try to insert a milestone
    const { data, error } = await supabase
      .from('milestones')
      .insert({
        booking_id: bookingId,
        title: 'Debug Test Milestone',
        description: 'Test milestone for debugging',
        status: 'pending',
        progress_percentage: 0,
        weight: 1.0,
        editable: true
      })
      .select()
      .single()
    
    if (error) {
      console.log(`❌ Insert failed: ${error.message}`)
      console.log(`   Error code: ${error.code}`)
      console.log(`   Error details: ${error.details}`)
      console.log(`   Error hint: ${error.hint}`)
      
      // Check if it's a specific RLS error
      if (error.code === '42501') {
        console.log('   → This is a permission denied error - RLS is blocking the insert')
      }
    } else {
      console.log(`✅ Insert successful! Milestone ID: ${data.id}`)
      
      // Clean up
      await supabase
        .from('milestones')
        .delete()
        .eq('id', data.id)
      console.log('✅ Test milestone cleaned up')
    }

    // Check RLS status
    console.log('\n📋 3. CHECKING RLS STATUS')
    console.log('-'.repeat(40))
    
    const { data: rlsStatus, error: rlsError } = await supabase
      .from('pg_tables')
      .select('tablename, rowsecurity')
      .eq('tablename', 'milestones')
    
    if (rlsError) {
      console.log(`❌ Error checking RLS status: ${rlsError.message}`)
    } else {
      console.log(`✅ RLS status for milestones: ${rlsStatus[0]?.rowsecurity ? 'ENABLED' : 'DISABLED'}`)
    }

    console.log('\n' + '='.repeat(50))
    console.log('🎯 DEBUGGING COMPLETE')
    console.log('='.repeat(50))
    
    if (error && error.code === '42501') {
      console.log('❌ ISSUE: RLS is still blocking inserts')
      console.log('📋 POSSIBLE SOLUTIONS:')
      console.log('1. The SQL might not have executed properly')
      console.log('2. There might be existing conflicting policies')
      console.log('3. Try running the SQL again in Supabase Dashboard')
      console.log('4. Check if there are any error messages in Supabase SQL Editor')
    } else if (error) {
      console.log(`❌ ISSUE: ${error.message}`)
    } else {
      console.log('✅ INSERT IS WORKING! The RLS policies are working correctly.')
    }

  } catch (error) {
    console.error('❌ Debug failed:', error)
  }
}

debugRLSPolicies()
