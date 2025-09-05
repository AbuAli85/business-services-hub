const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testRPCWithCorrectSignatures() {
  console.log('🧪 TESTING RPC FUNCTIONS WITH CORRECT SIGNATURES\n')
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

    // Test calculate_booking_progress RPC with correct parameter name
    console.log('\n📋 1. TESTING calculate_booking_progress RPC')
    console.log('-'.repeat(40))
    
    const { data: progressResult, error: progressError } = await supabase
      .rpc('calculate_booking_progress', { booking_uuid_param: bookingId })
    
    if (progressError) {
      console.log(`❌ calculate_booking_progress failed: ${progressError.message}`)
      console.log(`   Error code: ${progressError.code}`)
    } else {
      console.log(`✅ calculate_booking_progress successful! Result: ${progressResult}`)
    }

    // Test add_milestone RPC with correct parameter names
    console.log('\n📋 2. TESTING add_milestone RPC')
    console.log('-'.repeat(40))
    
    const { data: milestoneResult, error: milestoneError } = await supabase
      .rpc('add_milestone', {
        booking_uuid_param: bookingId,
        milestone_title: 'Test Milestone via RPC',
        milestone_description: 'Test milestone created via RPC function',
        milestone_status: 'pending',
        milestone_weight: 1.0
      })
    
    if (milestoneError) {
      console.log(`❌ add_milestone failed: ${milestoneError.message}`)
      console.log(`   Error code: ${milestoneError.code}`)
    } else {
      console.log(`✅ add_milestone successful! Milestone ID: ${milestoneResult}`)
      
      // Test add_task RPC with correct parameter names
      console.log('\n📋 3. TESTING add_task RPC')
      console.log('-'.repeat(40))
      
      const { data: taskResult, error: taskError } = await supabase
        .rpc('add_task', {
          milestone_uuid_param: milestoneResult,
          task_title: 'Test Task via RPC',
          task_status: 'pending'
        })
      
      if (taskError) {
        console.log(`❌ add_task failed: ${taskError.message}`)
        console.log(`   Error code: ${taskError.code}`)
      } else {
        console.log(`✅ add_task successful! Task ID: ${taskResult}`)
        
        // Test update_task RPC with correct parameter names
        console.log('\n📋 4. TESTING update_task RPC')
        console.log('-'.repeat(40))
        
        const { data: updateResult, error: updateError } = await supabase
          .rpc('update_task', {
            task_uuid_param: taskResult,
            task_status: 'completed'
          })
        
        if (updateError) {
          console.log(`❌ update_task failed: ${updateError.message}`)
          console.log(`   Error code: ${updateError.code}`)
        } else {
          console.log(`✅ update_task successful! Result: ${updateResult}`)
        }
        
        // Test final progress calculation
        console.log('\n📋 5. TESTING FINAL PROGRESS CALCULATION')
        console.log('-'.repeat(40))
        
        const { data: finalProgress, error: finalError } = await supabase
          .rpc('calculate_booking_progress', { booking_uuid_param: bookingId })
        
        if (finalError) {
          console.log(`❌ Final progress calculation failed: ${finalError.message}`)
        } else {
          console.log(`✅ Final progress calculation successful! Progress: ${finalProgress}%`)
        }
        
        // Clean up
        console.log('\n📋 6. CLEANING UP')
        console.log('-'.repeat(40))
        
        const { error: deleteError } = await supabase
          .rpc('delete_milestone', { milestone_uuid_param: milestoneResult })
        
        if (deleteError) {
          console.log(`❌ Cleanup failed: ${deleteError.message}`)
        } else {
          console.log(`✅ Cleanup successful!`)
        }
      }
    }

    console.log('\n' + '='.repeat(50))
    console.log('🎯 RPC TEST WITH CORRECT SIGNATURES COMPLETE')
    console.log('='.repeat(50))

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testRPCWithCorrectSignatures()
