const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function createSampleMilestones() {
  console.log('🔧 CREATING SAMPLE MILESTONES AND TASKS\n')
  console.log('='.repeat(50))

  try {
    // Step 1: Find a booking to add milestones to
    console.log('📋 1. FINDING A BOOKING TO ADD MILESTONES TO')
    console.log('-'.repeat(40))
    
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, title, project_progress')
      .limit(5)
    
    if (bookingsError) {
      console.log(`❌ Error fetching bookings: ${bookingsError.message}`)
      return
    }
    
    if (bookings.length === 0) {
      console.log('❌ No bookings found. Please create a booking first.')
      return
    }
    
    const testBooking = bookings[0]
    console.log(`✅ Using booking: "${testBooking.title}" (${testBooking.id})`)
    console.log(`   Current progress: ${testBooking.project_progress || 0}%`)
    
    // Step 2: Check if milestones already exist
    console.log('\n📋 2. CHECKING EXISTING MILESTONES')
    console.log('-'.repeat(40))
    
    const { data: existingMilestones, error: milestonesError } = await supabase
      .from('milestones')
      .select('id, title')
      .eq('booking_id', testBooking.id)
    
    if (milestonesError) {
      console.log(`❌ Error checking milestones: ${milestonesError.message}`)
      return
    }
    
    if (existingMilestones.length > 0) {
      console.log(`✅ Found ${existingMilestones.length} existing milestones:`)
      existingMilestones.forEach(m => console.log(`   - ${m.title}`))
      
      const createMore = existingMilestones.length < 4
      if (!createMore) {
        console.log('✅ Sufficient milestones already exist. Creating tasks instead...')
      }
    } else {
      console.log('📝 No milestones found. Creating sample milestones...')
    }
    
    // Step 3: Create milestones if needed
    if (existingMilestones.length === 0) {
      console.log('\n📋 3. CREATING SAMPLE MILESTONES')
      console.log('-'.repeat(40))
      
      const milestones = [
        {
          title: 'Week 1: Planning',
          description: 'Initial planning and setup phase',
          weight: 1.0
        },
        {
          title: 'Week 2: Development', 
          description: 'Core development work',
          weight: 1.0
        },
        {
          title: 'Week 3: Testing',
          description: 'Testing and quality assurance', 
          weight: 1.0
        },
        {
          title: 'Week 4: Delivery',
          description: 'Final delivery and handover',
          weight: 1.0
        }
      ]
      
      for (const milestone of milestones) {
        const { data, error } = await supabase
          .rpc('add_milestone', {
            booking_uuid_param: testBooking.id,
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
    
    // Step 4: Get all milestones for this booking
    console.log('\n📋 4. GETTING MILESTONES FOR TASK CREATION')
    console.log('-'.repeat(40))
    
    const { data: allMilestones, error: allMilestonesError } = await supabase
      .from('milestones')
      .select('id, title')
      .eq('booking_id', testBooking.id)
    
    if (allMilestonesError) {
      console.log(`❌ Error fetching milestones: ${allMilestonesError.message}`)
      return
    }
    
    console.log(`✅ Found ${allMilestones.length} milestones for task creation`)
    
    // Step 5: Create tasks for each milestone
    console.log('\n📋 5. CREATING SAMPLE TASKS')
    console.log('-'.repeat(40))
    
    const taskTemplates = {
      'Week 1: Planning': ['Brief Review', 'Calendar Setup', 'Strategy Review'],
      'Week 2: Development': ['Code Implementation', 'Database Setup', 'API Integration'],
      'Week 3: Testing': ['Unit Testing', 'Integration Testing', 'User Acceptance Testing'],
      'Week 4: Delivery': ['Final Review', 'Documentation', 'Client Handover']
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
    
    // Step 6: Update progress
    console.log('\n📋 6. UPDATING PROGRESS')
    console.log('-'.repeat(40))
    
    try {
      const { data: progressResult, error: progressError } = await supabase.rpc('calculate_booking_progress', {
        booking_uuid_param: testBooking.id
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
    console.log('✅ Sample milestones and tasks have been created')
    console.log('✅ You can now test the progress tracking system')
    console.log('✅ Go to the booking details page and try toggling tasks!')
    
  } catch (error) {
    console.error('❌ Error creating sample data:', error)
  }
}

createSampleMilestones()
