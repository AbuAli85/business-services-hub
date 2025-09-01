#!/usr/bin/env node

/**
 * Create Sample Bookings
 * This script creates sample bookings for testing the admin dashboard
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function createSampleBookings() {
  console.log('🔧 Creating Sample Bookings for Testing\n')
  
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
      .limit(10)
    
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
    
    // Create sample bookings
    const sampleBookings = [
      {
        service_id: services[0].id,
        client_id: users[0].id,
        provider_id: services[0].provider_id,
        status: 'pending',
        priority: 'normal',
        amount: services[0].base_price,
        currency: services[0].currency || 'OMR',
        scheduled_date: new Date(Date.now() + 86400000 * 7).toISOString(),
        notes: 'Sample booking for testing',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        service_id: services[1]?.id,
        client_id: users[1]?.id,
        provider_id: services[1]?.provider_id,
        status: 'in_progress',
        priority: 'high',
        amount: services[1]?.base_price,
        currency: services[1]?.currency || 'OMR',
        scheduled_date: new Date(Date.now() + 86400000 * 3).toISOString(),
        notes: 'High priority booking',
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        service_id: services[2]?.id,
        client_id: users[2]?.id,
        provider_id: services[2]?.provider_id,
        status: 'completed',
        priority: 'normal',
        amount: services[2]?.base_price,
        currency: services[2]?.currency || 'OMR',
        scheduled_date: new Date(Date.now() - 86400000 * 5).toISOString(),
        notes: 'Completed booking',
        created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 1).toISOString()
      },
      {
        service_id: services[0].id,
        client_id: users[3]?.id,
        provider_id: services[0].provider_id,
        status: 'cancelled',
        priority: 'low',
        amount: services[0].base_price,
        currency: services[0].currency || 'OMR',
        scheduled_date: new Date(Date.now() + 86400000 * 14).toISOString(),
        notes: 'Cancelled booking',
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 1).toISOString()
      },
      {
        service_id: services[1]?.id,
        client_id: users[0].id,
        provider_id: services[1]?.provider_id,
        status: 'approved',
        priority: 'urgent',
        amount: services[1]?.base_price,
        currency: services[1]?.currency || 'OMR',
        scheduled_date: new Date(Date.now() + 86400000 * 1).toISOString(),
        notes: 'Urgent approved booking',
        created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
        updated_at: new Date().toISOString()
      }
    ]
    
    console.log('🔧 Creating sample bookings...')
    
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
          console.log(`✅ Created booking: ${booking.status} - ${booking.amount} ${booking.currency}`)
          successCount++
        }
      } else {
        console.log(`⚠️  Skipping booking - missing required data`)
        errorCount++
      }
    }
    
    console.log('\n🎉 Sample Bookings Creation Complete!')
    console.log(`✅ Successfully created: ${successCount} bookings`)
    console.log(`❌ Errors: ${errorCount} bookings`)
    
    console.log('\n📊 Sample bookings created:')
    console.log('- 1 Pending booking')
    console.log('- 1 In Progress booking')
    console.log('- 1 Completed booking')
    console.log('- 1 Cancelled booking')
    console.log('- 1 Approved booking')
    
    console.log('\n🚀 Next Steps:')
    console.log('1. Refresh the bookings page in your admin dashboard')
    console.log('2. You should now see all the sample bookings')
    console.log('3. Test the filtering and search functionality')
    console.log('4. Verify that admin users can see all bookings')
    
  } catch (error) {
    console.log('❌ Error creating sample bookings:', error.message)
    console.log('Stack:', error.stack)
  }
}

// Run the creation
createSampleBookings().catch(console.error)
