#!/usr/bin/env node

/**
 * Check Bookings Schema
 * This script checks the actual bookings table schema
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function checkBookingsSchema() {
  console.log('🔍 Checking Bookings Table Schema\n')
  
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
    
    console.log('🔍 Checking existing bookings...')
    
    // Get existing bookings to see the structure
    const { data: existingBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .limit(1)
    
    if (bookingsError) {
      console.log('❌ Error fetching bookings:', bookingsError.message)
      return
    }
    
    if (existingBookings && existingBookings.length > 0) {
      console.log('✅ Existing booking structure:')
      const booking = existingBookings[0]
      Object.keys(booking).forEach(key => {
        console.log(`  ${key}: ${typeof booking[key]} = ${booking[key]}`)
      })
    } else {
      console.log('ℹ️  No existing bookings found')
    }
    
    console.log('\n🔍 Testing simple booking creation...')
    
    // Get a service and users for testing
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .eq('approval_status', 'approved')
      .limit(1)
    
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('*')
      .limit(2)
    
    if (servicesError || usersError || !services || !users || services.length === 0 || users.length < 2) {
      console.log('❌ Cannot test - missing services or users')
      return
    }
    
    const service = services[0]
    const client = users[0]
    const provider = users[1]
    
    console.log(`✅ Using service: ${service.title}`)
    console.log(`✅ Using client: ${client.email}`)
    console.log(`✅ Using provider: ${provider.email}`)
    
    // Try to create a simple booking
    const testBooking = {
      client_id: client.id,
      provider_id: provider.id,
      service_id: service.id,
      status: 'pending',
      subtotal: service.base_price || 100,
      currency: service.currency || 'OMR',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    console.log('\n🔧 Test booking data:')
    Object.keys(testBooking).forEach(key => {
      console.log(`  ${key}: ${testBooking[key]}`)
    })
    
    const { data: newBooking, error: insertError } = await supabase
      .from('bookings')
      .insert(testBooking)
      .select()
      .single()
    
    if (insertError) {
      console.log('❌ Error creating test booking:', insertError.message)
      console.log('Error details:', insertError)
    } else {
      console.log('✅ Test booking created successfully!')
      console.log('New booking ID:', newBooking.id)
      
      // Clean up - delete the test booking
      const { error: deleteError } = await supabase
        .from('bookings')
        .delete()
        .eq('id', newBooking.id)
      
      if (deleteError) {
        console.log('⚠️  Warning: Could not delete test booking:', deleteError.message)
      } else {
        console.log('✅ Test booking cleaned up')
      }
    }
    
  } catch (error) {
    console.log('❌ Error checking bookings schema:', error.message)
    console.log('Stack:', error.stack)
  }
}

// Run the check
checkBookingsSchema().catch(console.error)
