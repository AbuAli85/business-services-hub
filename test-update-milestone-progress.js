const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testUpdateMilestoneProgress() {
  console.log('🧪 TESTING UPDATE_MILESTONE_PROGRESS FUNCTION\n')
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

    // First, create a milestone
    console.log('\n📋 1. CREATING MILESTONE')
    console.log('-'.repeat(40))
    
    const { data: milestoneResult, error: milestoneError } = await supabase
      .rpc('add_milestone', {
        booking_uuid_param: bookingId,
        milestone_title: 'Test Milestone for Progress',
        milestone_description: 'Test milestone for progress testing',
        milestone_status: 'pending',
        milestone_weight: 1.0
      })
    
    if (milestoneError) {
      console.log(`❌ add_milestone failed: ${milestoneError.message}`)
      return
    }
    
    console.log(`✅ Milestone created! ID: ${milestoneResult}`)

    // Test update_milestone_progress directly
    console.log('\n📋 2. TESTING update_milestone_progress DIRECTLY')
    console.log('-'.repeat(40))
    
    const { data: progressResult, error: progressError } = await supabase
      .rpc('update_milestone_progress', { milestone_uuid_param: milestoneResult })
    
    if (progressError) {
      console.log(`❌ update_milestone_progress failed: ${progressError.message}`)
      console.log(`   Error code: ${progressError.code}`)
    } else {
      console.log(`✅ update_milestone_progress successful! Result: ${progressResult}`)
    }

    // Try to add a task directly to the database to see if that works
    console.log('\n📋 3. TESTING DIRECT TASK INSERT')
    console.log('-'.repeat(40))
    
    const { data: taskResult, error: taskError } = await supabase
      .from('tasks')
      .insert({
        milestone_id: milestoneResult,
        title: 'Direct Task Insert',
        status: 'pending',
        editable: true
      })
      .select()
      .single()
    
    if (taskError) {
      console.log(`❌ Direct task insert failed: ${taskError.message}`)
      console.log(`   Error code: ${taskError.code}`)
    } else {
      console.log(`✅ Direct task insert successful! Task ID: ${taskResult.id}`)
      
      // Now test update_milestone_progress again
      console.log('\n📋 4. TESTING update_milestone_progress AFTER TASK INSERT')
      console.log('-'.repeat(40))
      
      const { data: progressResult2, error: progressError2 } = await supabase
        .rpc('update_milestone_progress', { milestone_uuid_param: milestoneResult })
      
      if (progressError2) {
        console.log(`❌ update_milestone_progress after task insert failed: ${progressError2.message}`)
        console.log(`   Error code: ${progressError2.code}`)
      } else {
        console.log(`✅ update_milestone_progress after task insert successful! Result: ${progressResult2}`)
      }
    }

    // Clean up
    console.log('\n📋 5. CLEANING UP')
    console.log('-'.repeat(40))
    
    const { error: deleteError } = await supabase
      .rpc('delete_milestone', { milestone_uuid_param: milestoneResult })
    
    if (deleteError) {
      console.log(`❌ Cleanup failed: ${deleteError.message}`)
    } else {
      console.log(`✅ Cleanup successful!`)
    }

    console.log('\n' + '='.repeat(50))
    console.log('🎯 UPDATE_MILESTONE_PROGRESS TEST COMPLETE')
    console.log('='.repeat(50))

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testUpdateMilestoneProgress()
