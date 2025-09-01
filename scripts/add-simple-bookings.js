#!/usr/bin/env node

/**
 * Add Simple Bookings
 * This script adds simple bookings with correct format for admin testing
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function addSimpleBookings() {
  console.log('🔧 Adding Simple Bookings for Admin Testing\n')
  
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
      .limit(3)
    
    if (servicesError) {
      console.log('❌ Error fetching services:', servicesError.message)
      return
    }
    
    // Get users (clients and providers)
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('*')
      .limit(5)
    
    if (usersError) {
      console.log('❌ Error fetching users:', usersError.message)
      return
    }
    
    console.log(`✅ Found ${services?.length || 0} services and ${users?.length || 0} users`)
    
    if (!services || services.length === 0 || !users || users.length < 2) {
      console.log('❌ Not enough data to create bookings')
      return
    }
    
    // Create simple bookings with correct format
    const now = new Date()
    const timestamp = now.getTime()
    
    const simpleBookings = [
      {
        title: 'Website Development',
        client_id: users[0].id,
        provider_id: services[0].provider_id,
        service_id: services[0].id,
        status: 'pending',
        subtotal: services[0].base_price || 500,
        currency: services[0].currency || 'OMR',
        booking_number: `BK-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${timestamp}`,
        notes: 'New website development project',
        priority: 'normal',
        payment_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        title: 'Digital Marketing',
        client_id: users[1]?.id,
        provider_id: services[1]?.provider_id,
        service_id: services[1]?.id,
        status: 'approved',
        subtotal: services[1]?.base_price || 300,
        currency: services[1]?.currency || 'OMR',
        booking_number: `BK-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${timestamp + 1}`,
        notes: 'Social media marketing campaign',
        priority: 'high',
        payment_status: 'paid',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        title: 'Content Writing',
        client_id: users[2]?.id,
        provider_id: services[0].provider_id,
        service_id: services[0].id,
        status: 'in_progress',
        subtotal: services[0].base_price || 500,
        currency: services[0].currency || 'OMR',
        booking_number: `BK-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${timestamp + 2}`,
        notes: 'Blog content and copywriting',
        priority: 'normal',
        payment_status: 'pending',
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        updated_at: new Date().toISOString()
      }
    ]
    
    console.log('🔧 Creating simple bookings...')
    
    let successCount = 0
    let errorCount = 0
    
    for (const booking of simpleBookings) {
      if (booking.service_id && booking.client_id && booking.provider_id) {
        const { error: insertError } = await supabase
          .from('bookings')
          .insert(booking)
        
        if (insertError) {
          console.log(`❌ Error creating booking:`, insertError.message)
          errorCount++
        } else {
          console.log(`✅ Created booking: ${booking.title} - ${booking.status} - ${booking.subtotal} ${booking.currency}`)
          successCount++
        }
      } else {
        console.log(`⚠️  Skipping booking - missing required data`)
        errorCount++
      }
    }
    
    console.log('\n🎉 Simple Bookings Creation Complete!')
    console.log(`✅ Successfully created: ${successCount} bookings`)
    console.log(`❌ Errors: ${errorCount} bookings`)
    
    console.log('\n🚀 Next Steps:')
    console.log('1. Refresh the admin bookings page')
    console.log('2. You should now see all bookings with provider/client details')
    console.log('3. Test the admin filtering and management features')
    
  } catch (error) {
    console.log('❌ Error creating simple bookings:', error.message)
    console.log('Stack:', error.stack)
  }
}

// Run the creation
addSimpleBookings().catch(console.error)
