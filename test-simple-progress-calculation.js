const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testSimpleProgressCalculation() {
  console.log('🧪 TESTING SIMPLE PROGRESS CALCULATION\n')
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

    // Create a milestone first
    console.log('\n📋 1. CREATING MILESTONE')
    console.log('-'.repeat(40))
    
    const { data: milestoneResult, error: milestoneError } = await supabase
      .rpc('add_milestone', {
        booking_uuid_param: bookingId,
        milestone_title: 'Simple Test Milestone',
        milestone_description: 'Test milestone for simple progress calculation',
        milestone_status: 'pending',
        milestone_weight: 1.0
      })
    
    if (milestoneError) {
      console.log(`❌ add_milestone failed: ${milestoneError.message}`)
      return
    }
    
    console.log(`✅ Milestone created! ID: ${milestoneResult}`)

    // Try to manually calculate progress using raw SQL
    console.log('\n📋 2. TESTING MANUAL PROGRESS CALCULATION')
    console.log('-'.repeat(40))
    
    // First, let's see what's in the milestones table
    const { data: milestoneData, error: milestoneDataError } = await supabase
      .from('milestones')
      .select('*')
      .eq('id', milestoneResult)
    
    if (milestoneDataError) {
      console.log(`❌ Error fetching milestone data: ${milestoneDataError.message}`)
    } else {
      console.log(`✅ Milestone data:`, milestoneData[0])
    }

    // Try to insert a task directly using the service role
    console.log('\n📋 3. TESTING DIRECT TASK INSERT WITH SERVICE ROLE')
    console.log('-'.repeat(40))
    
    const { data: taskResult, error: taskError } = await supabase
      .from('tasks')
      .insert({
        milestone_id: milestoneResult,
        title: 'Direct Task Insert Test',
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
      
      // Now try to update the milestone progress manually
      console.log('\n📋 4. TESTING MANUAL MILESTONE UPDATE')
      console.log('-'.repeat(40))
      
      const { data: updateResult, error: updateError } = await supabase
        .from('milestones')
        .update({ 
          progress_percentage: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', milestoneResult)
        .select()
      
      if (updateError) {
        console.log(`❌ Manual milestone update failed: ${updateError.message}`)
        console.log(`   Error code: ${updateError.code}`)
      } else {
        console.log(`✅ Manual milestone update successful!`)
        console.log(`   Updated milestone:`, updateResult[0])
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
    console.log('🎯 SIMPLE PROGRESS CALCULATION TEST COMPLETE')
    console.log('='.repeat(50))

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testSimpleProgressCalculation()
