#!/usr/bin/env node

/**
 * Create Minimal Booking
 * This script creates a minimal booking with only required fields
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function createMinimalBooking() {
  console.log('🔧 Creating Minimal Booking for Testing\n')
  
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
      .limit(1)
    
    if (servicesError) {
      console.log('❌ Error fetching services:', servicesError.message)
      return
    }
    
    // Get users (clients and providers)
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('*')
      .limit(2)
    
    if (usersError) {
      console.log('❌ Error fetching users:', usersError.message)
      return
    }
    
    if (!services || services.length === 0 || !users || users.length < 2) {
      console.log('❌ Not enough data to create booking')
      return
    }
    
    const service = services[0]
    const client = users[0]
    const provider = users[1]
    
    console.log(`✅ Using service: ${service.title}`)
    console.log(`✅ Using client: ${client.email}`)
    console.log(`✅ Using provider: ${provider.email}`)
    
    // Create minimal booking with all required fields based on existing structure
    const now = new Date()
    const timestamp = now.getTime()
    
    const minimalBooking = {
      // Required fields from existing booking structure
      title: 'Test Admin Booking',
      client_id: client.id,
      provider_id: provider.id,
      service_id: service.id,
      status: 'pending',
      subtotal: service.base_price || 100,
      currency: service.currency || 'OMR',
      booking_number: `BK-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(timestamp).slice(-10)}`,
      
      // Required time fields
      start_time: now.toISOString(),
      end_time: new Date(now.getTime() + 3600000).toISOString(), // 1 hour later
      user_id: client.id,
      
      // Required array fields
      attendees: [client.id, provider.id],
      
      // Required numeric fields
      total_cost: service.base_price || 100,
      total_price: service.base_price || 100,
      amount: service.base_price || 100,
      
      // Required string fields
      payment_status: 'pending',
      priority: 'normal',
      approval_status: 'pending',
      operational_status: 'new',
      compliance_status: 'pending',
      
      // Optional but useful fields
      notes: 'Test booking for admin dashboard',
      description: 'Testing admin booking functionality',
      
      // Timestamps
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    }
    
    console.log('\n🔧 Creating minimal booking...')
    console.log('Booking data:', JSON.stringify(minimalBooking, null, 2))
    
    const { data: newBooking, error: insertError } = await supabase
      .from('bookings')
      .insert(minimalBooking)
      .select()
      .single()
    
    if (insertError) {
      console.log('❌ Error creating booking:', insertError.message)
      console.log('Error details:', insertError)
    } else {
      console.log('✅ Booking created successfully!')
      console.log('New booking ID:', newBooking.id)
      console.log('Booking title:', newBooking.title)
      console.log('Status:', newBooking.status)
      console.log('Amount:', newBooking.amount, newBooking.currency)
    }
    
  } catch (error) {
    console.log('❌ Error creating minimal booking:', error.message)
    console.log('Stack:', error.stack)
  }
}

// Run the creation
createMinimalBooking().catch(console.error)
