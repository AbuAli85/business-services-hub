const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function createSampleForCorrectBooking() {
  console.log('🔧 CREATING SAMPLE DATA FOR CORRECT BOOKING\n')
  console.log('='.repeat(50))

  try {
    // Use the booking ID from the URL
    const correctBookingId = '8ccbb969-3639-4ff4-ae4d-722d9580db57'
    
    console.log(`📋 Creating sample data for booking: ${correctBookingId}`)

    // Check if this booking exists
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, title, project_progress')
      .eq('id', correctBookingId)
      .single()
    
    if (bookingError) {
      console.log(`❌ Error fetching booking: ${bookingError.message}`)
      return
    }
    
    console.log(`✅ Found booking: "${booking.title}" (${booking.id})`)
    console.log(`   Current progress: ${booking.project_progress || 0}%`)

    // Check if milestones already exist for this booking
    const { data: existingMilestones, error: milestonesError } = await supabase
      .from('milestones')
      .select('id, title')
      .eq('booking_id', correctBookingId)
    
    if (milestonesError) {
      console.log(`❌ Error checking milestones: ${milestonesError.message}`)
      return
    }
    
    if (existingMilestones.length > 0) {
      console.log(`✅ Found ${existingMilestones.length} existing milestones for this booking`)
      existingMilestones.forEach(m => console.log(`   - ${m.title}`))
    } else {
      console.log('📝 No milestones found. Creating sample milestones...')
    }

    // Create milestones if none exist
    if (existingMilestones.length === 0) {
      console.log('\n📋 CREATING SAMPLE MILESTONES')
      console.log('-'.repeat(40))
      
      const milestones = [
        {
          title: 'Phase 1: Planning & Setup',
          description: 'Initial planning, requirements gathering, and project setup',
          weight: 1.0
        },
        {
          title: 'Phase 2: Development', 
          description: 'Core development work and implementation',
          weight: 1.0
        },
        {
          title: 'Phase 3: Testing & Quality',
          description: 'Testing, quality assurance, and bug fixes',
          weight: 1.0
        },
        {
          title: 'Phase 4: Delivery & Launch',
          description: 'Final delivery, deployment, and client handover',
          weight: 1.0
        }
      ]
      
      for (const milestone of milestones) {
        const { data, error } = await supabase
          .rpc('add_milestone', {
            booking_uuid_param: correctBookingId,
            milestone_title: milestone.title,
            milestone_description: milestone.description,
            milestone_status: 'pending',
            milestone_weight: milestone.weight
          })
        
        if (error) {
          console.log(`❌ Error creating milestone "${milestone.title}": ${error.message}`)
        } else {
          console.log(`✅ Created milestone: "${milestone.title}" (${data})`)
        }
      }
    }

    // Get all milestones for this booking
    const { data: allMilestones, error: allMilestonesError } = await supabase
      .from('milestones')
      .select('id, title')
      .eq('booking_id', correctBookingId)
    
    if (allMilestonesError) {
      console.log(`❌ Error fetching milestones: ${allMilestonesError.message}`)
      return
    }
    
    console.log(`\n📋 FOUND ${allMilestones.length} MILESTONES FOR TASK CREATION`)
    console.log('-'.repeat(40))

    // Create tasks for each milestone
    console.log('\n📋 CREATING SAMPLE TASKS')
    console.log('-'.repeat(40))
    
    const taskTemplates = {
      'Phase 1: Planning & Setup': ['Requirements Analysis', 'Project Timeline', 'Resource Planning'],
      'Phase 2: Development': ['Core Implementation', 'Database Design', 'API Development'],
      'Phase 3: Testing & Quality': ['Unit Testing', 'Integration Testing', 'User Acceptance Testing'],
      'Phase 4: Delivery & Launch': ['Final Review', 'Documentation', 'Client Training']
    }
    
    for (const milestone of allMilestones) {
      const tasks = taskTemplates[milestone.title] || ['Task 1', 'Task 2', 'Task 3']
      
      console.log(`📝 Creating tasks for "${milestone.title}":`)
      
      for (const taskTitle of tasks) {
        const { data, error } = await supabase
          .rpc('add_task', {
            milestone_uuid_param: milestone.id,
            task_title: taskTitle,
            task_status: 'pending'
          })
        
        if (error) {
          console.log(`   ❌ Error creating task "${taskTitle}": ${error.message}`)
        } else {
          console.log(`   ✅ Created task: "${taskTitle}" (${data})`)
        }
      }
    }

    // Update progress
    console.log('\n📋 UPDATING PROGRESS')
    console.log('-'.repeat(40))
    
    try {
      const { data: progressResult, error: progressError } = await supabase.rpc('calculate_booking_progress', {
        booking_uuid_param: correctBookingId
      })
      
      if (progressError) {
        console.log(`❌ Error updating progress: ${progressError.message}`)
      } else {
        console.log(`✅ Updated booking progress: ${progressResult}%`)
      }
    } catch (rpcError) {
      console.log(`❌ RPC function not available: ${rpcError.message}`)
    }
    
    console.log('\n' + '='.repeat(50))
    console.log('🎯 SAMPLE DATA CREATION COMPLETE!')
    console.log('='.repeat(50))
    console.log('✅ Sample milestones and tasks have been created for the correct booking')
    console.log('✅ You can now refresh the booking details page to see the progress!')
    console.log('✅ Go to the booking details page and try toggling tasks!')
    
  } catch (error) {
    console.error('❌ Error creating sample data:', error)
  }
}

createSampleForCorrectBooking()
