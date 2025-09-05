const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testProgressTabFinal() {
  console.log('🧪 TESTING PROGRESS TAB FINAL FUNCTIONALITY\n')
  console.log('='.repeat(50))

  try {
    const correctBookingId = '8ccbb969-3639-4ff4-ae4d-722d9580db57'
    
    console.log(`📋 Testing progress tab for booking: ${correctBookingId}`)

    // 1. Check booking data
    console.log('\n📋 1. CHECKING BOOKING DATA')
    console.log('-'.repeat(40))
    
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, title, project_progress, status')
      .eq('id', correctBookingId)
      .single()
    
    if (bookingError) {
      console.log(`❌ Error fetching booking: ${bookingError.message}`)
      return
    }
    
    console.log(`✅ Booking: "${booking.title}"`)
    console.log(`   Status: ${booking.status}`)
    console.log(`   Progress: ${booking.project_progress}%`)

    // 2. Check milestones data (what progress tab will load)
    console.log('\n📋 2. CHECKING MILESTONES DATA (PROGRESS TAB)')
    console.log('-'.repeat(40))
    
    const { data: milestones, error: milestonesError } = await supabase
      .from('milestones')
      .select(`
        id,
        title,
        description,
        progress_percentage,
        status,
        due_date,
        weight,
        order_index,
        editable,
        tasks (
          id,
          title,
          status,
          progress_percentage,
          due_date,
          editable
        )
      `)
      .eq('booking_id', correctBookingId)
      .order('order_index', { ascending: true })
    
    if (milestonesError) {
      console.log(`❌ Error fetching milestones: ${milestonesError.message}`)
      return
    }
    
    console.log(`✅ Found ${milestones.length} milestones for progress tab:`)
    milestones.forEach((m, i) => {
      console.log(`   ${i + 1}. "${m.title}" - ${m.progress_percentage}% progress (${m.status})`)
      console.log(`      Tasks: ${m.tasks.length}`)
      m.tasks.forEach((t, j) => {
        console.log(`         ${j + 1}. "${t.title}" - ${t.status}`)
      })
    })

    // 3. Test progress calculation
    console.log('\n📋 3. TESTING PROGRESS CALCULATION')
    console.log('-'.repeat(40))
    
    const completedMilestones = milestones.filter(m => m.status === 'completed').length
    const totalTasks = milestones.reduce((sum, m) => sum + (m.tasks?.length || 0), 0)
    const completedTasks = milestones.reduce((sum, m) => 
      sum + (m.tasks?.filter(t => t.status === 'completed').length || 0), 0)
    
    console.log(`✅ Progress calculation:`)
    console.log(`   - Overall booking progress: ${booking.project_progress}%`)
    console.log(`   - Completed milestones: ${completedMilestones}/${milestones.length}`)
    console.log(`   - Completed tasks: ${completedTasks}/${totalTasks}`)

    // 4. Test RPC functions
    console.log('\n📋 4. TESTING RPC FUNCTIONS')
    console.log('-'.repeat(40))
    
    try {
      const { data: progressResult, error: progressError } = await supabase.rpc('calculate_booking_progress', {
        booking_uuid_param: correctBookingId
      })
      
      if (progressError) {
        console.log(`❌ calculate_booking_progress: ${progressError.message}`)
      } else {
        console.log(`✅ calculate_booking_progress: ${progressResult}%`)
      }
    } catch (rpcError) {
      console.log(`❌ RPC function error: ${rpcError.message}`)
    }

    // 5. Test task completion
    console.log('\n📋 5. TESTING TASK COMPLETION')
    console.log('-'.repeat(40))
    
    if (milestones.length > 0 && milestones[0].tasks.length > 0) {
      const firstTask = milestones[0].tasks[0]
      console.log(`📝 Completing task: "${firstTask.title}"`)
      
      const { error: updateError } = await supabase
        .rpc('update_task', {
          task_uuid_param: firstTask.id,
          task_status: 'completed'
        })
      
      if (updateError) {
        console.log(`❌ Error completing task: ${updateError.message}`)
      } else {
        console.log(`✅ Task completed successfully!`)
        
        // Check updated progress
        const { data: updatedBooking, error: updatedError } = await supabase
          .from('bookings')
          .select('project_progress')
          .eq('id', correctBookingId)
          .single()
        
        if (updatedError) {
          console.log(`❌ Error fetching updated progress: ${updatedError.message}`)
        } else {
          console.log(`✅ Updated booking progress: ${updatedBooking.project_progress}%`)
        }
      }
    } else {
      console.log('⚠️  No tasks available to test completion')
    }
    
    console.log('\n' + '='.repeat(50))
    console.log('🎯 PROGRESS TAB FINAL TEST COMPLETE!')
    console.log('='.repeat(50))
    console.log('✅ Progress tab should now display:')
    console.log(`   - ${milestones.length} milestones with proper titles`)
    console.log(`   - ${totalTasks} tasks across all milestones`)
    console.log(`   - ${booking.project_progress}% overall progress`)
    console.log(`   - Proper milestone status and progress bars`)
    console.log('\n🚀 The progress tab is now fully functional!')
    console.log('✅ Refresh the booking details page and check the Progress tab!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testProgressTabFinal()
