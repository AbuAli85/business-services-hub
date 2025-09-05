const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testDirectInsert() {
  console.log('🧪 TESTING DIRECT INSERT\n')
  console.log('='.repeat(50))

  try {
    // Get a booking to test with
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

    // Try to insert a milestone directly
    console.log('\n📋 1. TESTING MILESTONE INSERT')
    console.log('-'.repeat(40))
    
    const { data: milestone, error: milestoneError } = await supabase
      .from('milestones')
      .insert({
        booking_id: bookingId,
        title: 'Test Milestone',
        description: 'Test milestone for direct insert',
        status: 'pending',
        progress_percentage: 0,
        weight: 1.0,
        editable: true
      })
      .select()
      .single()
    
    if (milestoneError) {
      console.log(`❌ Milestone insert failed: ${milestoneError.message}`)
      console.log(`   Error code: ${milestoneError.code}`)
      console.log(`   Error details: ${milestoneError.details}`)
      console.log(`   Error hint: ${milestoneError.hint}`)
      
      // Try to get more specific error info
      if (milestoneError.code === '42501') {
        console.log('\n🔍 DEBUGGING RLS ISSUE:')
        console.log('- Checking if RLS is enabled...')
        
        // Try to check RLS status using a different approach
        const { data: rlsCheck, error: rlsError } = await supabase
          .rpc('exec_sql', { 
            sql: `SELECT relrowsecurity FROM pg_class WHERE relname = 'milestones'` 
          })
        
        if (rlsError) {
          console.log(`   RLS check failed: ${rlsError.message}`)
        } else {
          console.log(`   RLS status: ${rlsCheck}`)
        }
      }
    } else {
      console.log(`✅ Milestone insert successful! ID: ${milestone.id}`)
      
      // Try to insert a task
      console.log('\n📋 2. TESTING TASK INSERT')
      console.log('-'.repeat(40))
      
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          milestone_id: milestone.id,
          title: 'Test Task',
          status: 'pending',
          editable: true
        })
        .select()
        .single()
      
      if (taskError) {
        console.log(`❌ Task insert failed: ${taskError.message}`)
      } else {
        console.log(`✅ Task insert successful! ID: ${task.id}`)
      }
      
      // Clean up
      console.log('\n📋 3. CLEANING UP')
      console.log('-'.repeat(40))
      
      if (task) {
        await supabase.from('tasks').delete().eq('id', task.id)
        console.log('✅ Task cleaned up')
      }
      
      await supabase.from('milestones').delete().eq('id', milestone.id)
      console.log('✅ Milestone cleaned up')
    }

    // Test RPC functions
    console.log('\n📋 4. TESTING RPC FUNCTIONS')
    console.log('-'.repeat(40))
    
    const { data: rpcTest, error: rpcError } = await supabase
      .rpc('calculate_booking_progress', { booking_id: bookingId })
    
    if (rpcError) {
      console.log(`❌ RPC test failed: ${rpcError.message}`)
      console.log(`   Error code: ${rpcError.code}`)
    } else {
      console.log(`✅ RPC test successful! Result: ${rpcTest}`)
    }

    console.log('\n' + '='.repeat(50))
    console.log('🎯 DIRECT INSERT TEST COMPLETE')
    console.log('='.repeat(50))

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testDirectInsert()
