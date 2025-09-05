const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testTaskToggle() {
  console.log('🧪 TESTING TASK TOGGLE FUNCTIONALITY\n')
  console.log('='.repeat(50))

  try {
    // Find a booking with milestones and tasks
    console.log('📋 1. FINDING TEST DATA')
    console.log('-'.repeat(30))
    
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, title, project_progress')
      .limit(5)
    
    if (bookingsError) {
      console.log(`❌ Error fetching bookings: ${bookingsError.message}`)
      return
    }
    
    console.log(`✅ Found ${bookings.length} bookings`)
    
    // Find milestones for the first booking
    const testBookingId = bookings[0]?.id
    if (!testBookingId) {
      console.log('❌ No bookings found to test with')
      return
    }
    
    console.log(`📋 Testing with booking: ${bookings[0].title} (${testBookingId})`)
    
    const { data: milestones, error: milestonesError } = await supabase
      .from('milestones')
      .select(`
        id, title, progress_percentage, status,
        tasks (id, title, status, editable)
      `)
      .eq('booking_id', testBookingId)
    
    if (milestonesError) {
      console.log(`❌ Error fetching milestones: ${milestonesError.message}`)
      return
    }
    
    console.log(`✅ Found ${milestones.length} milestones`)
    
    // Find a task to test with
    let testTask = null
    let testMilestone = null
    
    for (const milestone of milestones) {
      if (milestone.tasks && milestone.tasks.length > 0) {
        testTask = milestone.tasks[0]
        testMilestone = milestone
        break
      }
    }
    
    if (!testTask) {
      console.log('❌ No tasks found to test with')
      return
    }
    
    console.log(`📋 Testing with task: ${testTask.title} (${testTask.id})`)
    console.log(`📋 In milestone: ${testMilestone.title} (${testMilestone.id})`)
    
    // Test the update_task RPC function
    console.log('\n📋 2. TESTING UPDATE_TASK RPC')
    console.log('-'.repeat(30))
    
    const newStatus = testTask.status === 'completed' ? 'pending' : 'completed'
    console.log(`🔄 Changing task status from '${testTask.status}' to '${newStatus}'`)
    
    const { data: updateResult, error: updateError } = await supabase.rpc('update_task', {
      task_id: testTask.id,
      status: newStatus
    })
    
    if (updateError) {
      console.log(`❌ Error updating task: ${updateError.message}`)
      return
    }
    
    console.log('✅ Task updated successfully')
    
    // Check if progress was updated
    console.log('\n📋 3. CHECKING PROGRESS UPDATES')
    console.log('-'.repeat(30))
    
    // Check milestone progress
    const { data: updatedMilestone, error: milestoneError } = await supabase
      .from('milestones')
      .select('id, title, progress_percentage, status')
      .eq('id', testMilestone.id)
      .single()
    
    if (milestoneError) {
      console.log(`❌ Error fetching updated milestone: ${milestoneError.message}`)
    } else {
      console.log(`✅ Milestone progress: ${updatedMilestone.progress_percentage}%`)
    }
    
    // Check booking progress
    const { data: updatedBooking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, title, project_progress')
      .eq('id', testBookingId)
      .single()
    
    if (bookingError) {
      console.log(`❌ Error fetching updated booking: ${bookingError.message}`)
    } else {
      console.log(`✅ Booking progress: ${updatedBooking.project_progress}%`)
    }
    
    console.log('\n' + '='.repeat(50))
    console.log('🎯 TEST COMPLETE')
    console.log('='.repeat(50))
    console.log('✅ If you see progress percentages above, the RPC functions are working!')
    console.log('✅ If you see 0% or errors, the RPC functions need to be applied to the database.')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testTaskToggle()
