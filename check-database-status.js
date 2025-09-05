const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDatabaseStatus() {
  console.log('🔍 CHECKING DATABASE STATUS\n')
  console.log('='.repeat(50))

  try {
    // Test 1: Check if we can read from milestones table
    console.log('📋 1. TESTING MILESTONES TABLE ACCESS')
    console.log('-'.repeat(40))
    
    const { data: milestones, error: milestonesError } = await supabase
      .from('milestones')
      .select('id, title')
      .limit(1)
    
    if (milestonesError) {
      console.log(`❌ Milestones table access: ${milestonesError.message}`)
      console.log('   → RLS policies need to be applied')
    } else {
      console.log(`✅ Milestones table access: OK (${milestones.length} records)`)
    }

    // Test 2: Check if we can read from tasks table
    console.log('\n📋 2. TESTING TASKS TABLE ACCESS')
    console.log('-'.repeat(40))
    
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title')
      .limit(1)
    
    if (tasksError) {
      console.log(`❌ Tasks table access: ${tasksError.message}`)
      console.log('   → RLS policies need to be applied')
    } else {
      console.log(`✅ Tasks table access: OK (${tasks.length} records)`)
    }

    // Test 3: Try to insert a test milestone
    console.log('\n📋 3. TESTING MILESTONE INSERT PERMISSION')
    console.log('-'.repeat(40))
    
    const testBookingId = '595a9720-c590-4ab0-8ee4-f11a99d8e372' // From your output
    
    const { data: insertResult, error: insertError } = await supabase
      .from('milestones')
      .insert({
        booking_id: testBookingId,
        title: 'Test Milestone',
        description: 'Test milestone for permission check',
        status: 'pending',
        progress_percentage: 0,
        weight: 1.0,
        editable: true
      })
      .select()
      .single()
    
    if (insertError) {
      console.log(`❌ Milestone insert permission: ${insertError.message}`)
      console.log('   → RLS policies need to be applied')
    } else {
      console.log(`✅ Milestone insert permission: OK`)
      
      // Clean up test data
      await supabase
        .from('milestones')
        .delete()
        .eq('id', insertResult.id)
      console.log('   → Test milestone cleaned up')
    }

    // Test 4: Check RPC functions
    console.log('\n📋 4. TESTING RPC FUNCTIONS')
    console.log('-'.repeat(40))
    
    const rpcFunctions = [
      'update_task',
      'update_milestone_progress', 
      'calculate_booking_progress'
    ]
    
    for (const funcName of rpcFunctions) {
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

    console.log('\n' + '='.repeat(50))
    console.log('🎯 DIAGNOSIS COMPLETE')
    console.log('='.repeat(50))
    
    if (milestonesError || tasksError || insertError) {
      console.log('❌ ISSUE: RLS policies need to be applied')
      console.log('📋 SOLUTION:')
      console.log('1. Go to Supabase Dashboard → SQL Editor')
      console.log('2. Run the RLS policies SQL I provided earlier')
      console.log('3. Run the RPC functions SQL')
      console.log('4. Then run: node create-sample-milestones.js')
    } else {
      console.log('✅ DATABASE IS READY!')
      console.log('📋 NEXT STEPS:')
      console.log('1. Run: node create-sample-milestones.js')
      console.log('2. Test the progress tracking in the UI')
    }

  } catch (error) {
    console.error('❌ Check failed:', error)
  }
}

checkDatabaseStatus()