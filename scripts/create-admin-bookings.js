#!/usr/bin/env node

/**
 * Create Admin Bookings
 * This script creates sample bookings with all required fields for admin testing
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function createAdminBookings() {
  console.log('🔧 Creating Admin Bookings with Full Details\n')
  
  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('❌ Environment variables not configured!')
    return
  }
  
  try {
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    console.log('🔍 Getting existing data...')
    
    // Get approved services
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .eq('approval_status', 'approved')
      .limit(5)
    
    if (servicesError) {
      console.log('❌ Error fetching services:', servicesError.message)
      return
    }
    
    // Get users (clients and providers)
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('*')
      .limit(10)
    
    if (usersError) {
      console.log('❌ Error fetching users:', usersError.message)
      return
    }
    
    console.log(`✅ Found ${services?.length || 0} services and ${users?.length || 0} users`)
    
    if (!services || services.length === 0) {
      console.log('❌ No approved services found. Please approve some services first.')
      return
    }
    
    if (!users || users.length < 2) {
      console.log('❌ Not enough users found. Need at least 2 users.')
      return
    }
    
    // Create comprehensive sample bookings with all required fields
    const sampleBookings = [
      {
        // Required fields based on schema
        title: 'Website Development Project',
        client_id: users[0].id,
        provider_id: services[0].provider_id,
        service_id: services[0].id,
        status: 'pending',
        subtotal: services[0].base_price || 500,
        currency: services[0].currency || 'OMR',
        
        // Additional fields for comprehensive admin view
        description: 'Complete website development with modern design',
        start_time: new Date(Date.now() + 86400000 * 7).toISOString(),
        end_time: new Date(Date.now() + 86400000 * 14).toISOString(),
        user_id: users[0].id,
        attendees: [users[0].id, services[0].provider_id],
        total_cost: services[0].base_price || 500,
        scheduled_start: new Date(Date.now() + 86400000 * 7).toISOString(),
        scheduled_end: new Date(Date.now() + 86400000 * 14).toISOString(),
        total_price: services[0].base_price || 500,
        booking_number: `BK-${Date.now()}-001`,
        notes: 'High priority project for new client',
        amount: services[0].base_price || 500,
        payment_status: 'pending',
        priority: 'high',
        approval_status: 'pending',
        operational_status: 'new',
        compliance_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        title: 'Digital Marketing Campaign',
        client_id: users[1]?.id,
        provider_id: services[1]?.provider_id,
        service_id: services[1]?.id,
        status: 'in_progress',
        subtotal: services[1]?.base_price || 300,
        currency: services[1]?.currency || 'OMR',
        
        description: 'Social media marketing and SEO optimization',
        start_time: new Date(Date.now() + 86400000 * 3).toISOString(),
        end_time: new Date(Date.now() + 86400000 * 30).toISOString(),
        user_id: users[1]?.id,
        attendees: [users[1]?.id, services[1]?.provider_id],
        total_cost: services[1]?.base_price || 300,
        scheduled_start: new Date(Date.now() + 86400000 * 3).toISOString(),
        scheduled_end: new Date(Date.now() + 86400000 * 30).toISOString(),
        total_price: services[1]?.base_price || 300,
        booking_number: `BK-${Date.now()}-002`,
        notes: 'Ongoing campaign with monthly reports',
        amount: services[1]?.base_price || 300,
        payment_status: 'paid',
        priority: 'normal',
        approval_status: 'approved',
        operational_status: 'in_review',
        compliance_status: 'compliant',
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        title: 'Graphic Design Services',
        client_id: users[2]?.id,
        provider_id: services[2]?.provider_id,
        service_id: services[2]?.id,
        status: 'completed',
        subtotal: services[2]?.base_price || 200,
        currency: services[2]?.currency || 'OMR',
        
        description: 'Logo design and brand identity package',
        start_time: new Date(Date.now() - 86400000 * 10).toISOString(),
        end_time: new Date(Date.now() - 86400000 * 5).toISOString(),
        user_id: users[2]?.id,
        attendees: [users[2]?.id, services[2]?.provider_id],
        total_cost: services[2]?.base_price || 200,
        scheduled_start: new Date(Date.now() - 86400000 * 10).toISOString(),
        scheduled_end: new Date(Date.now() - 86400000 * 5).toISOString(),
        total_price: services[2]?.base_price || 200,
        booking_number: `BK-${Date.now()}-003`,
        notes: 'Successfully completed with client satisfaction',
        amount: services[2]?.base_price || 200,
        payment_status: 'paid',
        priority: 'normal',
        approval_status: 'approved',
        operational_status: 'approved',
        compliance_status: 'compliant',
        quality_score: 9,
        created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 1).toISOString()
      },
      {
        title: 'Content Writing Project',
        client_id: users[3]?.id,
        provider_id: services[0].provider_id,
        service_id: services[0].id,
        status: 'cancelled',
        subtotal: services[0].base_price || 500,
        currency: services[0].currency || 'OMR',
        
        description: 'Blog content and copywriting services',
        start_time: new Date(Date.now() + 86400000 * 14).toISOString(),
        end_time: new Date(Date.now() + 86400000 * 21).toISOString(),
        user_id: users[3]?.id,
        attendees: [users[3]?.id, services[0].provider_id],
        total_cost: services[0].base_price || 500,
        scheduled_start: new Date(Date.now() + 86400000 * 14).toISOString(),
        scheduled_end: new Date(Date.now() + 86400000 * 21).toISOString(),
        total_price: services[0].base_price || 500,
        booking_number: `BK-${Date.now()}-004`,
        notes: 'Cancelled due to client budget constraints',
        amount: services[0].base_price || 500,
        payment_status: 'refunded',
        priority: 'low',
        approval_status: 'rejected',
        operational_status: 'rejected',
        compliance_status: 'non_compliant',
        cancellation_reason: 'Client budget constraints',
        cancelled_at: new Date(Date.now() - 86400000 * 1).toISOString(),
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 1).toISOString()
      },
      {
        title: 'Consulting Services',
        client_id: users[0].id,
        provider_id: services[1]?.provider_id,
        service_id: services[1]?.id,
        status: 'approved',
        subtotal: services[1]?.base_price || 300,
        currency: services[1]?.currency || 'OMR',
        
        description: 'Business strategy and growth consulting',
        start_time: new Date(Date.now() + 86400000 * 1).toISOString(),
        end_time: new Date(Date.now() + 86400000 * 7).toISOString(),
        user_id: users[0].id,
        attendees: [users[0].id, services[1]?.provider_id],
        total_cost: services[1]?.base_price || 300,
        scheduled_start: new Date(Date.now() + 86400000 * 1).toISOString(),
        scheduled_end: new Date(Date.now() + 86400000 * 7).toISOString(),
        total_price: services[1]?.base_price || 300,
        booking_number: `BK-${Date.now()}-005`,
        notes: 'Urgent consulting for business expansion',
        amount: services[1]?.base_price || 300,
        payment_status: 'pending',
        priority: 'urgent',
        approval_status: 'approved',
        operational_status: 'approved',
        compliance_status: 'pending',
        created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
        updated_at: new Date().toISOString()
      }
    ]
    
    console.log('🔧 Creating comprehensive sample bookings...')
    
    let successCount = 0
    let errorCount = 0
    
    for (const booking of sampleBookings) {
      if (booking.service_id && booking.client_id && booking.provider_id) {
        const { error: insertError } = await supabase
          .from('bookings')
          .insert(booking)
        
        if (insertError) {
          console.log(`❌ Error creating booking:`, insertError.message)
          errorCount++
        } else {
          console.log(`✅ Created booking: ${booking.title} - ${booking.status} - ${booking.amount} ${booking.currency}`)
          successCount++
        }
      } else {
        console.log(`⚠️  Skipping booking - missing required data`)
        errorCount++
      }
    }
    
    console.log('\n🎉 Admin Bookings Creation Complete!')
    console.log(`✅ Successfully created: ${successCount} bookings`)
    console.log(`❌ Errors: ${errorCount} bookings`)
    
    console.log('\n📊 Sample bookings created with full details:')
    console.log('- 1 Pending booking (Website Development)')
    console.log('- 1 In Progress booking (Digital Marketing)')
    console.log('- 1 Completed booking (Graphic Design)')
    console.log('- 1 Cancelled booking (Content Writing)')
    console.log('- 1 Approved booking (Consulting)')
    
    console.log('\n🔍 Each booking includes:')
    console.log('- Provider and client details')
    console.log('- Service information')
    console.log('- Payment status and amounts')
    console.log('- Priority and approval status')
    console.log('- Operational and compliance status')
    console.log('- Scheduling information')
    console.log('- Notes and descriptions')
    
    console.log('\n🚀 Next Steps:')
    console.log('1. Refresh the admin bookings page')
    console.log('2. You should now see all bookings with full details')
    console.log('3. Test filtering by status, priority, and other criteria')
    console.log('4. Verify provider and client information is displayed')
    
  } catch (error) {
    console.log('❌ Error creating admin bookings:', error.message)
    console.log('Stack:', error.stack)
  }
}

// Run the creation
createAdminBookings().catch(console.error)
