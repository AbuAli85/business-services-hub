#!/usr/bin/env node

/**
 * Check Bookings Data
 * This script checks the actual bookings data and user roles
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function checkBookingsData() {
  console.log('🔍 Checking Bookings Data and User Roles\n')
  
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
    
    console.log('📊 Checking all bookings...')
    
    // Get all bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (bookingsError) {
      console.log('❌ Error fetching bookings:', bookingsError.message)
      return
    }
    
    console.log(`✅ Found ${bookings?.length || 0} bookings:`)
    
    if (bookings && bookings.length > 0) {
      bookings.forEach((booking, index) => {
        console.log(`\n${index + 1}. Booking ID: ${booking.id}`)
        console.log(`   Status: ${booking.status}`)
        console.log(`   Client ID: ${booking.client_id}`)
        console.log(`   Provider ID: ${booking.provider_id}`)
        console.log(`   Service ID: ${booking.service_id}`)
        console.log(`   Amount: ${booking.amount || booking.subtotal || booking.total_price || 'N/A'}`)
        console.log(`   Currency: ${booking.currency || 'N/A'}`)
        console.log(`   Created: ${new Date(booking.created_at).toLocaleString()}`)
        console.log(`   Scheduled: ${booking.scheduled_date ? new Date(booking.scheduled_date).toLocaleString() : 'Not scheduled'}`)
      })
    }
    
    console.log('\n👥 Checking admin users...')
    
    // Get admin users
    const { data: adminUsers, error: adminError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'admin')
    
    if (adminError) {
      console.log('❌ Error fetching admin users:', adminError.message)
      return
    }
    
    console.log(`✅ Found ${adminUsers?.length || 0} admin users:`)
    
    if (adminUsers && adminUsers.length > 0) {
      adminUsers.forEach((admin, index) => {
        console.log(`\n${index + 1}. Admin User:`)
        console.log(`   ID: ${admin.id}`)
        console.log(`   Email: ${admin.email}`)
        console.log(`   Name: ${admin.full_name || 'No name'}`)
        console.log(`   Role: ${admin.role}`)
        console.log(`   Created: ${new Date(admin.created_at).toLocaleString()}`)
        
        // Check if this admin has any bookings as client or provider
        const clientBookings = bookings?.filter(b => b.client_id === admin.id) || []
        const providerBookings = bookings?.filter(b => b.provider_id === admin.id) || []
        
        console.log(`   Bookings as Client: ${clientBookings.length}`)
        console.log(`   Bookings as Provider: ${providerBookings.length}`)
      })
    }
    
    console.log('\n🔍 Checking services...')
    
    // Get services
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .limit(5)
    
    if (servicesError) {
      console.log('❌ Error fetching services:', servicesError.message)
      return
    }
    
    console.log(`✅ Found ${services?.length || 0} services (showing first 5):`)
    
    if (services && services.length > 0) {
      services.forEach((service, index) => {
        console.log(`\n${index + 1}. Service:`)
        console.log(`   ID: ${service.id}`)
        console.log(`   Title: ${service.title}`)
        console.log(`   Provider ID: ${service.provider_id}`)
        console.log(`   Status: ${service.status}`)
        console.log(`   Approval Status: ${service.approval_status}`)
        console.log(`   Price: ${service.base_price} ${service.currency}`)
      })
    }
    
    console.log('\n💡 Analysis:')
    console.log('The issue is likely that:')
    console.log('1. Admin users should see ALL bookings, not just their own')
    console.log('2. The bookings page is filtering by user role incorrectly')
    console.log('3. Admin role should bypass the client/provider filtering')
    
  } catch (error) {
    console.log('❌ Error checking bookings data:', error.message)
    console.log('Stack:', error.stack)
  }
}

// Run the check
checkBookingsData().catch(console.error)
