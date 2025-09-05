const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testProgressFunctions() {
  console.log('🧪 TESTING PROGRESS TRACKING FUNCTIONS\n')
  console.log('='.repeat(50))

  try {
    // Test 1: Check if RPC functions exist
    console.log('📋 1. CHECKING RPC FUNCTIONS')
    console.log('-'.repeat(30))
    
    const functions = [
      'add_milestone',
      'update_milestone', 
      'delete_milestone',
      'add_task',
      'update_task',
      'delete_task',
      'update_milestone_progress',
      'calculate_booking_progress'
    ]

    for (const funcName of functions) {
      try {
        const { data, error } = await supabase.rpc(funcName, {})
        if (error && error.code === 'PGRST202') {
          console.log(`❌ ${funcName}: Function not found`)
        } else {
          console.log(`✅ ${funcName}: Available`)
        }
      } catch (err) {
        console.log(`❌ ${funcName}: ${err.message}`)
      }
    }

    // Test 2: Check database schema
    console.log('\n📋 2. CHECKING DATABASE SCHEMA')
    console.log('-'.repeat(30))
    
    // Check milestones table
    try {
      const { data: milestones, error } = await supabase
        .from('milestones')
        .select('id, title, progress_percentage, editable, weight')
        .limit(1)
      
      if (error) {
        console.log(`❌ Milestones table: ${error.message}`)
      } else {
        console.log('✅ Milestones table: Available')
        if (milestones && milestones.length > 0) {
          console.log(`   Sample milestone: ${JSON.stringify(milestones[0], null, 2)}`)
        }
      }
    } catch (err) {
      console.log(`❌ Milestones table: ${err.message}`)
    }

    // Check tasks table
    try {
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('id, title, status, editable')
        .limit(1)
      
      if (error) {
        console.log(`❌ Tasks table: ${error.message}`)
      } else {
        console.log('✅ Tasks table: Available')
        if (tasks && tasks.length > 0) {
          console.log(`   Sample task: ${JSON.stringify(tasks[0], null, 2)}`)
        }
      }
    } catch (err) {
      console.log(`❌ Tasks table: ${err.message}`)
    }

    // Test 3: Check if we can find a booking with milestones
    console.log('\n📋 3. CHECKING BOOKING DATA')
    console.log('-'.repeat(30))
    
    try {
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('id, title, project_progress')
        .limit(5)
      
      if (error) {
        console.log(`❌ Bookings query: ${error.message}`)
      } else {
        console.log(`✅ Found ${bookings.length} bookings`)
        for (const booking of bookings) {
          console.log(`   - ${booking.title}: ${booking.project_progress || 0}% progress`)
        }
      }
    } catch (err) {
      console.log(`❌ Bookings query: ${err.message}`)
    }

    // Test 4: Try to find milestones for a specific booking
    console.log('\n📋 4. CHECKING MILESTONES FOR BOOKING')
    console.log('-'.repeat(30))
    
    try {
      const { data: milestones, error } = await supabase
        .from('milestones')
        .select(`
          id, title, progress_percentage, status, weight,
          tasks(id, title, status, editable)
        `)
        .limit(5)
      
      if (error) {
        console.log(`❌ Milestones query: ${error.message}`)
      } else {
        console.log(`✅ Found ${milestones.length} milestones`)
        for (const milestone of milestones) {
          console.log(`   - ${milestone.title}: ${milestone.progress_percentage}% (${milestone.tasks?.length || 0} tasks)`)
        }
      }
    } catch (err) {
      console.log(`❌ Milestones query: ${err.message}`)
    }

    console.log('\n' + '='.repeat(50))
    console.log('🎯 DIAGNOSIS COMPLETE')
    console.log('='.repeat(50))

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testProgressFunctions()
