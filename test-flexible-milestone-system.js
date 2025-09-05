const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testFlexibleMilestoneSystem() {
  console.log('🧪 TESTING FLEXIBLE MILESTONE SYSTEM\n')
  console.log('=' * 50)

  try {
    // 1. Test Services Table
    console.log('\n📋 1. TESTING SERVICES TABLE')
    console.log('-'.repeat(30))
    
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .order('name')

    if (servicesError) {
      console.error('❌ Error fetching services:', servicesError.message)
    } else {
      console.log(`✅ Found ${services?.length || 0} services`)
      services?.forEach(service => {
        console.log(`   - ${service.name}: ${service.description}`)
      })
    }

    // 2. Test Service Milestone Templates
    console.log('\n🎯 2. TESTING SERVICE MILESTONE TEMPLATES')
    console.log('-'.repeat(30))
    
    const { data: templates, error: templatesError } = await supabase
      .from('service_milestone_templates')
      .select(`
        *,
        services(name)
      `)
      .order('service_id, default_order')

    if (templatesError) {
      console.error('❌ Error fetching templates:', templatesError.message)
    } else {
      console.log(`✅ Found ${templates?.length || 0} milestone templates`)
      const groupedTemplates = templates?.reduce((acc, template) => {
        const serviceName = template.services?.name || 'Unknown Service'
        if (!acc[serviceName]) acc[serviceName] = []
        acc[serviceName].push(template)
        return acc
      }, {})
      
      Object.entries(groupedTemplates || {}).forEach(([serviceName, serviceTemplates]) => {
        console.log(`\n   📦 ${serviceName}:`)
        serviceTemplates.forEach(template => {
          console.log(`     - ${template.title} (Order: ${template.default_order}, Weight: ${template.default_weight})`)
        })
      })
    }

    // 3. Test Milestone Generation Function
    console.log('\n⚙️ 3. TESTING MILESTONE GENERATION FUNCTION')
    console.log('-'.repeat(30))
    
    // Get a booking with service_id
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, service_id, title')
      .not('service_id', 'is', null)
      .limit(1)

    if (bookingsError) {
      console.error('❌ Error fetching bookings:', bookingsError.message)
    } else if (bookings && bookings.length > 0) {
      const testBooking = bookings[0]
      console.log(`🧪 Testing with booking: ${testBooking.title} (ID: ${testBooking.id})`)
      
      // Test the milestone generation function
      const { data: result, error: funcError } = await supabase.rpc('generate_milestones_from_templates', {
        booking_uuid: testBooking.id
      })
      
      if (funcError) {
        console.error(`❌ generate_milestones_from_templates failed:`, funcError.message)
      } else {
        console.log(`✅ generate_milestones_from_templates completed`)
        
        // Check if milestones were created
        const { data: createdMilestones, error: milestonesError } = await supabase
          .from('milestones')
          .select('*')
          .eq('booking_id', testBooking.id)
          .order('order_index')
        
        if (milestonesError) {
          console.error('❌ Error fetching created milestones:', milestonesError.message)
        } else {
          console.log(`✅ Created ${createdMilestones?.length || 0} milestones for booking`)
          createdMilestones?.forEach(milestone => {
            console.log(`   - ${milestone.title} (${milestone.progress_percentage}%, Order: ${milestone.order_index})`)
          })
        }
      }
    } else {
      console.log('⚠️ No bookings with service_id found for testing')
    }

    // 4. Test Progress Calculation Functions
    console.log('\n📊 4. TESTING PROGRESS CALCULATION FUNCTIONS')
    console.log('-'.repeat(30))
    
    if (bookings && bookings.length > 0) {
      const testBooking = bookings[0]
      
      // Test calculate_booking_progress
      console.log(`🧪 Testing calculate_booking_progress with booking: ${testBooking.id}`)
      const { data: progressResult, error: progressError } = await supabase.rpc('calculate_booking_progress', {
        booking_id: testBooking.id
      })
      
      if (progressError) {
        console.error(`❌ calculate_booking_progress failed:`, progressError.message)
      } else {
        console.log(`✅ calculate_booking_progress returned: ${progressResult}%`)
      }

      // Test update_milestone_progress
      const { data: milestones, error: milestonesError } = await supabase
        .from('milestones')
        .select('id')
        .eq('booking_id', testBooking.id)
        .limit(1)

      if (milestones && milestones.length > 0) {
        const testMilestone = milestones[0]
        console.log(`🧪 Testing update_milestone_progress with milestone: ${testMilestone.id}`)
        
        const { data: milestoneResult, error: milestoneError } = await supabase.rpc('update_milestone_progress', {
          milestone_uuid: testMilestone.id
        })
        
        if (milestoneError) {
          console.error(`❌ update_milestone_progress failed:`, milestoneError.message)
        } else {
          console.log(`✅ update_milestone_progress completed`)
        }
      }
    }

    // 5. Test Database Schema Updates
    console.log('\n🗄️ 5. TESTING DATABASE SCHEMA UPDATES')
    console.log('-'.repeat(30))
    
    // Check if new columns exist
    const { data: milestonesSchema, error: milestonesSchemaError } = await supabase
      .from('milestones')
      .select('editable, weight, order_index')
      .limit(1)

    if (milestonesSchemaError) {
      console.error('❌ Error checking milestones schema:', milestonesSchemaError.message)
    } else {
      console.log('✅ Milestones table has new columns: editable, weight, order_index')
    }

    const { data: tasksSchema, error: tasksSchemaError } = await supabase
      .from('tasks')
      .select('editable')
      .limit(1)

    if (tasksSchemaError) {
      console.error('❌ Error checking tasks schema:', tasksSchemaError.message)
    } else {
      console.log('✅ Tasks table has new column: editable')
    }

    const { data: bookingsSchema, error: bookingsSchemaError } = await supabase
      .from('bookings')
      .select('service_id')
      .limit(1)

    if (bookingsSchemaError) {
      console.error('❌ Error checking bookings schema:', bookingsSchemaError.message)
    } else {
      console.log('✅ Bookings table has new column: service_id')
    }

    console.log('\n' + '='.repeat(50))
    console.log('🎯 FLEXIBLE MILESTONE SYSTEM TEST COMPLETE')
    console.log('='.repeat(50))

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testFlexibleMilestoneSystem()
