#!/usr/bin/env node

/**
 * Admin Management Script
 * This script provides comprehensive admin management capabilities
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function adminManagement() {
  console.log('🔧 Admin Management System\n')
  
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
    
    console.log('📊 Current System Status:')
    
    // Get all users
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (profilesError) {
      console.log('❌ Error fetching profiles:', profilesError.message)
      return
    }
    
    // Get all services
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (servicesError) {
      console.log('❌ Error fetching services:', servicesError.message)
      return
    }
    
    // Get all bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (bookingsError) {
      console.log('❌ Error fetching bookings:', bookingsError.message)
      return
    }
    
    // Display summary
    console.log(`👥 Users: ${profiles?.length || 0}`)
    console.log(`🏢 Services: ${services?.length || 0}`)
    console.log(`📅 Bookings: ${bookings?.length || 0}`)
    
    // Group by roles
    const usersByRole = {}
    profiles?.forEach(profile => {
      const role = profile.role || 'client'
      if (!usersByRole[role]) {
        usersByRole[role] = []
      }
      usersByRole[role].push(profile)
    })
    
    console.log('\n👥 Users by Role:')
    Object.keys(usersByRole).forEach(role => {
      const count = usersByRole[role].length
      const icon = getRoleIcon(role)
      console.log(`  ${icon} ${role}: ${count}`)
    })
    
    // Services by status
    const servicesByStatus = {}
    services?.forEach(service => {
      const status = service.approval_status || 'pending'
      if (!servicesByStatus[status]) {
        servicesByStatus[status] = []
      }
      servicesByStatus[status].push(service)
    })
    
    console.log('\n🏢 Services by Status:')
    Object.keys(servicesByStatus).forEach(status => {
      const count = servicesByStatus[status].length
      const icon = getStatusIcon(status)
      console.log(`  ${icon} ${status}: ${count}`)
    })
    
    // Bookings by status
    const bookingsByStatus = {}
    bookings?.forEach(booking => {
      const status = booking.status || 'pending'
      if (!bookingsByStatus[status]) {
        bookingsByStatus[status] = []
      }
      bookingsByStatus[status].push(booking)
    })
    
    console.log('\n📅 Bookings by Status:')
    Object.keys(bookingsByStatus).forEach(status => {
      const count = bookingsByStatus[status].length
      const icon = getStatusIcon(status)
      console.log(`  ${icon} ${status}: ${count}`)
    })
    
    // Admin users
    const adminUsers = profiles?.filter(p => p.role === 'admin' || p.role === 'super_admin') || []
    console.log(`\n👑 Admin Users: ${adminUsers.length}`)
    adminUsers.forEach(admin => {
      console.log(`  - ${admin.email} (${admin.full_name || 'No name'})`)
    })
    
    // Pending services
    const pendingServices = services?.filter(s => s.approval_status === 'pending') || []
    if (pendingServices.length > 0) {
      console.log(`\n⏳ Pending Services (${pendingServices.length}):`)
      pendingServices.forEach(service => {
        console.log(`  - ${service.title} (${service.category}) - ${service.provider_id}`)
      })
    }
    
    // Recent activity
    console.log('\n📈 Recent Activity:')
    const recentUsers = profiles?.slice(0, 3) || []
    recentUsers.forEach(user => {
      const date = new Date(user.created_at).toLocaleDateString()
      console.log(`  👤 ${user.email} joined on ${date}`)
    })
    
    const recentServices = services?.slice(0, 3) || []
    recentServices.forEach(service => {
      const date = new Date(service.created_at).toLocaleDateString()
      console.log(`  🏢 ${service.title} created on ${date}`)
    })
    
    console.log('\n🔧 Available Admin Operations:')
    console.log('1. Approve all pending services')
    console.log('2. Create new admin user')
    console.log('3. Grant admin access to existing user')
    console.log('4. View detailed user information')
    console.log('5. View detailed service information')
    console.log('6. View detailed booking information')
    
    console.log('\n💡 To perform operations, use:')
    console.log('  node scripts/approve-all-services.js')
    console.log('  node scripts/grant-admin-access.js <email>')
    console.log('  node scripts/create-admin-user.js <email>')
    
  } catch (error) {
    console.log('❌ Error in admin management:', error.message)
    console.log('Stack:', error.stack)
  }
}

function getRoleIcon(role) {
  switch (role) {
    case 'admin': return '👑'
    case 'super_admin': return '🌟'
    case 'moderator': return '🛡️'
    case 'support': return '🎧'
    case 'provider': return '🏢'
    case 'client': return '👤'
    default: return '❓'
  }
}

function getStatusIcon(status) {
  switch (status) {
    case 'approved': return '✅'
    case 'pending': return '⏳'
    case 'rejected': return '❌'
    case 'confirmed': return '✅'
    case 'cancelled': return '🚫'
    case 'completed': return '🎉'
    default: return '❓'
  }
}

// Run the management
adminManagement().catch(console.error)
