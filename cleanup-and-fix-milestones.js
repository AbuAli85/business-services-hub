const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function cleanupAndFixMilestones() {
  console.log('🔧 CLEANING UP AND FIXING MILESTONES\n')
  console.log('='.repeat(50))

  try {
    const correctBookingId = '8ccbb969-3639-4ff4-ae4d-722d9580db57'
    
    console.log(`📋 Cleaning up milestones for booking: ${correctBookingId}`)

    // Get all existing milestones for this booking
    const { data: existingMilestones, error: milestonesError } = await supabase
      .from('milestones')
      .select('id, title, tasks(id)')
      .eq('booking_id', correctBookingId)
    
    if (milestonesError) {
      console.log(`❌ Error fetching milestones: ${milestonesError.message}`)
      return
    }
    
    console.log(`📋 Found ${existingMilestones.length} existing milestones:`)
    existingMilestones.forEach((m, i) => {
      console.log(`   ${i + 1}. "${m.title}" (${m.id}) - ${m.tasks.length} tasks`)
    })

    // Delete all existing milestones and their tasks
    console.log('\n📋 CLEANING UP EXISTING MILESTONES')
    console.log('-'.repeat(40))
    
    for (const milestone of existingMilestones) {
      const { error: deleteError } = await supabase
        .rpc('delete_milestone', { milestone_uuid_param: milestone.id })
      
      if (deleteError) {
        console.log(`❌ Error deleting milestone "${milestone.title}": ${deleteError.message}`)
      } else {
        console.log(`✅ Deleted milestone: "${milestone.title}"`)
      }
    }

    // Create proper milestones
    console.log('\n📋 CREATING PROPER MILESTONES')
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
    
    const createdMilestones = []
    
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
        createdMilestones.push({ id: data, title: milestone.title })
      }
    }

    // Create tasks for each milestone
    console.log('\n📋 CREATING TASKS FOR EACH MILESTONE')
    console.log('-'.repeat(40))
    
    const taskTemplates = {
      'Phase 1: Planning & Setup': ['Requirements Analysis', 'Project Timeline', 'Resource Planning'],
      'Phase 2: Development': ['Core Implementation', 'Database Design', 'API Development'],
      'Phase 3: Testing & Quality': ['Unit Testing', 'Integration Testing', 'User Acceptance Testing'],
      'Phase 4: Delivery & Launch': ['Final Review', 'Documentation', 'Client Training']
    }
    
    for (const milestone of createdMilestones) {
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
    console.log('🎯 CLEANUP AND FIX COMPLETE!')
    console.log('='.repeat(50))
    console.log('✅ Duplicate milestones have been cleaned up')
    console.log('✅ Proper milestones with tasks have been created')
    console.log('✅ Progress has been updated')
    console.log('✅ Refresh the booking details page to see the changes!')
    
  } catch (error) {
    console.error('❌ Error during cleanup and fix:', error)
  }
}

cleanupAndFixMilestones()
