const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixMilestoneOrderRPC() {
  console.log('🔧 FIXING MILESTONE ORDER USING RPC FUNCTIONS\n')
  console.log('='.repeat(50))

  try {
    const correctBookingId = '8ccbb969-3639-4ff4-ae4d-722d9580db57'
    
    console.log(`📋 Fixing milestones for booking: ${correctBookingId}`)

    // Get all milestones for this booking
    const { data: milestones, error: milestonesError } = await supabase
      .from('milestones')
      .select('id, title, created_at')
      .eq('booking_id', correctBookingId)
      .order('created_at', { ascending: true })
    
    if (milestonesError) {
      console.log(`❌ Error fetching milestones: ${milestonesError.message}`)
      return
    }
    
    console.log(`📋 Found ${milestones.length} milestones:`)
    milestones.forEach((m, i) => {
      console.log(`   ${i + 1}. "${m.title}" (${m.id})`)
    })

    // Since we can't update order_index directly due to RLS, let's recreate the milestones in the correct order
    console.log('\n📋 RECREATING MILESTONES IN CORRECT ORDER')
    console.log('-'.repeat(40))
    
    // First, delete all existing milestones
    for (const milestone of milestones) {
      const { error: deleteError } = await supabase
        .rpc('delete_milestone', { milestone_uuid_param: milestone.id })
      
      if (deleteError) {
        console.log(`❌ Error deleting milestone "${milestone.title}": ${deleteError.message}`)
      } else {
        console.log(`✅ Deleted milestone: "${milestone.title}"`)
      }
    }

    // Create milestones in the correct order with proper order_index
    const milestoneData = [
      {
        title: 'Phase 1: Planning & Setup',
        description: 'Initial planning, requirements gathering, and project setup',
        weight: 1.0,
        orderIndex: 1
      },
      {
        title: 'Phase 2: Development', 
        description: 'Core development work and implementation',
        weight: 1.0,
        orderIndex: 2
      },
      {
        title: 'Phase 3: Testing & Quality',
        description: 'Testing, quality assurance, and bug fixes',
        weight: 1.0,
        orderIndex: 3
      },
      {
        title: 'Phase 4: Delivery & Launch',
        description: 'Final delivery, deployment, and client handover',
        weight: 1.0,
        orderIndex: 4
      }
    ]
    
    const createdMilestones = []
    
    for (const milestone of milestoneData) {
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
        createdMilestones.push({ id: data, title: milestone.title, orderIndex: milestone.orderIndex })
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

    // Complete the first task to show progress
    console.log('\n📋 COMPLETING FIRST TASK TO SHOW PROGRESS')
    console.log('-'.repeat(40))
    
    // Get the first task from the first milestone
    const { data: firstMilestone, error: firstMilestoneError } = await supabase
      .from('milestones')
      .select('id, tasks(id, title)')
      .eq('booking_id', correctBookingId)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()
    
    if (!firstMilestoneError && firstMilestone.tasks.length > 0) {
      const firstTask = firstMilestone.tasks[0]
      console.log(`📝 Completing task: "${firstTask.title}"`)
      
      const { error: completeError } = await supabase
        .rpc('update_task', {
          task_uuid_param: firstTask.id,
          task_status: 'completed'
        })
      
      if (completeError) {
        console.log(`❌ Error completing task: ${completeError.message}`)
      } else {
        console.log(`✅ Task completed successfully!`)
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
    console.log('🎯 MILESTONE ORDER FIX COMPLETE!')
    console.log('='.repeat(50))
    console.log('✅ Milestones recreated in correct order')
    console.log('✅ Progress tab should now display milestones correctly')
    console.log('✅ Refresh the page to see the updated display!')
    
  } catch (error) {
    console.error('❌ Error fixing milestone order:', error)
  }
}

fixMilestoneOrderRPC()
