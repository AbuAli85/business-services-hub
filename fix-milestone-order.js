const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixMilestoneOrder() {
  console.log('🔧 FIXING MILESTONE ORDER AND DISPLAY\n')
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

    // Update each milestone with proper order_index
    console.log('\n📋 UPDATING MILESTONE ORDER INDICES')
    console.log('-'.repeat(40))
    
    for (let i = 0; i < milestones.length; i++) {
      const milestone = milestones[i]
      const orderIndex = i + 1
      
      const { error: updateError } = await supabase
        .from('milestones')
        .update({ order_index: orderIndex })
        .eq('id', milestone.id)
      
      if (updateError) {
        console.log(`❌ Error updating milestone "${milestone.title}": ${updateError.message}`)
      } else {
        console.log(`✅ Updated "${milestone.title}" with order_index: ${orderIndex}`)
      }
    }

    // Also ensure the booking progress is up to date
    console.log('\n📋 UPDATING BOOKING PROGRESS')
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

    // Verify the final state
    console.log('\n📋 VERIFYING FINAL STATE')
    console.log('-'.repeat(40))
    
    const { data: finalMilestones, error: finalError } = await supabase
      .from('milestones')
      .select('id, title, order_index, progress_percentage, tasks(id, title, status)')
      .eq('booking_id', correctBookingId)
      .order('order_index', { ascending: true })
    
    if (finalError) {
      console.log(`❌ Error fetching final milestones: ${finalError.message}`)
    } else {
      console.log(`✅ Final milestones (${finalMilestones.length}):`)
      finalMilestones.forEach((m, i) => {
        console.log(`   ${i + 1}. "${m.title}" (order: ${m.order_index}, progress: ${m.progress_percentage}%)`)
        console.log(`      Tasks: ${m.tasks.length}`)
        m.tasks.forEach((t, j) => {
          console.log(`         ${j + 1}. "${t.title}" - ${t.status}`)
        })
      })
    }
    
    console.log('\n' + '='.repeat(50))
    console.log('🎯 MILESTONE ORDER FIX COMPLETE!')
    console.log('='.repeat(50))
    console.log('✅ All milestones now have proper order_index values')
    console.log('✅ Progress tab should now display milestones correctly')
    console.log('✅ Refresh the page to see the updated display!')
    
  } catch (error) {
    console.error('❌ Error fixing milestone order:', error)
  }
}

fixMilestoneOrder()
