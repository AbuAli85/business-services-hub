#!/usr/bin/env node

/**
 * Check User Role
 * This script checks a user's role through the profiles table
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function checkUserRole(email) {
  console.log(`🔍 Checking user role for: ${email}\n`)
  
  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  console.log('📋 Environment Check:')
  console.log(`  Supabase URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`)
  console.log(`  Supabase Anon Key: ${supabaseAnonKey ? '✅ Set' : '❌ Missing'}`)
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('\n❌ Environment variables not configured!')
    return
  }
  
  try {
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    console.log('\n🔍 Searching for user in profiles table...')
    
    // Search for user by email in profiles table
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
    
    if (profilesError) {
      console.log('❌ Error searching profiles:', profilesError.message)
      return
    }
    
    if (!profiles || profiles.length === 0) {
      console.log(`❌ User with email ${email} not found in profiles table`)
      console.log('\n📋 This could mean:')
      console.log('  - User has not signed up yet')
      console.log('  - User has not completed profile creation')
      console.log('  - Email is incorrect')
      return
    }
    
    const profile = profiles[0]
    
    console.log(`✅ User found in profiles!`)
    console.log(`  ID: ${profile.id}`)
    console.log(`  Email: ${profile.email}`)
    console.log(`  Full Name: ${profile.full_name || 'Not set'}`)
    console.log(`  Role: ${profile.role || 'Not set'}`)
    console.log(`  Phone: ${profile.phone || 'Not set'}`)
    console.log(`  Company: ${profile.company_name || 'Not set'}`)
    console.log(`  Verified: ${profile.is_verified ? 'Yes' : 'No'}`)
    console.log(`  Created: ${new Date(profile.created_at).toLocaleString()}`)
    console.log(`  Updated: ${new Date(profile.updated_at).toLocaleString()}`)
    
    const userRole = profile.role || 'client'
    
    console.log('\n🔐 Role Analysis:')
    if (userRole === 'admin') {
      console.log('🎉 User has ADMIN access!')
      console.log('✅ Full admin permissions:')
      console.log('  - User Management (create, read, update, delete, suspend, verify)')
      console.log('  - Service Management (create, approve, reject, feature, delete)')
      console.log('  - Booking Management (create, read, update, delete, refund)')
      console.log('  - System Management (settings, backup, logs, maintenance)')
      console.log('  - Analytics & Reports (view, export, generate)')
      console.log('  - Access to all admin routes: /dashboard/admin/*')
      console.log('  - Access to all admin APIs: /api/admin/*')
    } else if (userRole === 'super_admin') {
      console.log('👑 User has SUPER ADMIN access!')
      console.log('✅ Highest level permissions (same as admin + system management)')
    } else if (userRole === 'moderator') {
      console.log('🛡️  User has MODERATOR access!')
      console.log('✅ Moderate permissions:')
      console.log('  - User moderation (read, suspend, verify)')
      console.log('  - Service approval and updates')
      console.log('  - Booking management')
      console.log('  - Analytics viewing')
    } else if (userRole === 'support') {
      console.log('🎧 User has SUPPORT access!')
      console.log('✅ Support permissions:')
      console.log('  - User management (read, update)')
      console.log('  - Service viewing')
      console.log('  - Booking management')
      console.log('  - Analytics viewing')
    } else if (userRole === 'provider') {
      console.log('🏢 User has PROVIDER access!')
      console.log('✅ Provider permissions:')
      console.log('  - Service creation and management')
      console.log('  - Own booking management')
      console.log('  - Company management')
      console.log('  - Invoice management')
    } else {
      console.log(`👤 User has ${userRole.toUpperCase()} access!`)
      console.log('✅ Basic client permissions:')
      console.log('  - Service browsing')
      console.log('  - Booking creation and management')
      console.log('  - Invoice viewing')
      console.log('  - Review creation')
    }
    
    // Check if user can access admin features
    console.log('\n🚪 Admin Access Check:')
    if (userRole === 'admin' || userRole === 'super_admin') {
      console.log('✅ Can access admin dashboard: /dashboard/admin/*')
      console.log('✅ Can access admin APIs: /api/admin/*')
      console.log('✅ Can manage users, services, bookings, and system settings')
    } else {
      console.log('❌ Cannot access admin dashboard')
      console.log('❌ Cannot access admin APIs')
      console.log('❌ Limited to role-specific features only')
    }
    
  } catch (error) {
    console.log('❌ Error checking user role:', error.message)
    console.log('Stack:', error.stack)
  }
  
  console.log('\n📋 How to Grant Admin Access:')
  console.log('1. Update user role in Supabase dashboard:')
  console.log('   - Go to Authentication > Users')
  console.log('   - Find the user by email')
  console.log('   - Edit user metadata')
  console.log('   - Set role: "admin"')
  console.log('2. Or update in profiles table:')
  console.log('   - Go to Table Editor > profiles')
  console.log('   - Find user by email')
  console.log('   - Update role column to "admin"')
  console.log('3. User needs to sign out and sign in again')
}

// Get email from command line argument
const email = process.argv[2]

if (!email) {
  console.log('❌ Please provide an email address')
  console.log('Usage: node scripts/check-user-role.js <email>')
  console.log('Example: node scripts/check-user-role.js luxsess2001@gmail.com')
  process.exit(1)
}

// Run the check
checkUserRole(email).catch(console.error)
