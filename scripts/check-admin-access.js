#!/usr/bin/env node

/**
 * Check and Grant Admin Access
 * This script checks if a user has admin access and can grant it if needed
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function checkAdminAccess(email) {
  console.log(`🔍 Checking admin access for: ${email}\n`)
  
  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  console.log('📋 Environment Check:')
  console.log(`  Supabase URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`)
  console.log(`  Supabase Anon Key: ${supabaseAnonKey ? '✅ Set' : '❌ Missing'}`)
  console.log(`  Supabase Service Key: ${supabaseServiceKey ? '✅ Set' : '❌ Missing'}`)
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('\n❌ Environment variables not configured!')
    return
  }
  
  try {
    // Create Supabase client with service role for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    console.log('\n🔍 Searching for user...')
    
    // Search for user by email
    const { data: users, error: searchError } = await supabase.auth.admin.listUsers()
    
    if (searchError) {
      console.log('❌ Error searching users:', searchError.message)
      return
    }
    
    const user = users.users.find(u => u.email === email)
    
    if (!user) {
      console.log(`❌ User with email ${email} not found in the system`)
      console.log('\n📋 Available users:')
      users.users.forEach(u => {
        console.log(`  - ${u.email} (ID: ${u.id}) - Role: ${u.user_metadata?.role || 'Not set'}`)
      })
      return
    }
    
    console.log(`✅ User found!`)
    console.log(`  ID: ${user.id}`)
    console.log(`  Email: ${user.email}`)
    console.log(`  Created: ${new Date(user.created_at).toLocaleString()}`)
    console.log(`  Last Sign In: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}`)
    console.log(`  Current Role: ${user.user_metadata?.role || 'Not set'}`)
    console.log(`  Email Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`)
    
    const currentRole = user.user_metadata?.role || 'client'
    
    if (currentRole === 'admin') {
      console.log('\n🎉 User already has ADMIN access!')
      console.log('✅ Full admin permissions granted:')
      console.log('  - User Management (create, read, update, delete, suspend, verify)')
      console.log('  - Service Management (create, approve, reject, feature, delete)')
      console.log('  - Booking Management (create, read, update, delete, refund)')
      console.log('  - System Management (settings, backup, logs, maintenance)')
      console.log('  - Analytics & Reports (view, export, generate)')
      console.log('  - Access to all admin routes: /dashboard/admin/*')
      console.log('  - Access to all admin APIs: /api/admin/*')
    } else {
      console.log(`\n⚠️  User currently has '${currentRole}' role`)
      console.log('❌ No admin access - limited permissions')
      
      if (supabaseServiceKey) {
        console.log('\n🔧 Granting admin access...')
        
        const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
          user.id,
          {
            user_metadata: {
              ...user.user_metadata,
              role: 'admin'
            }
          }
        )
        
        if (updateError) {
          console.log('❌ Error updating user role:', updateError.message)
        } else {
          console.log('✅ Admin access granted successfully!')
          console.log('🎉 User now has full admin permissions')
          console.log('\n📋 Admin Capabilities:')
          console.log('  - Complete user management')
          console.log('  - Service approval and moderation')
          console.log('  - Booking oversight and management')
          console.log('  - System configuration access')
          console.log('  - Analytics and reporting')
          console.log('  - Permission management')
          console.log('\n🔄 User needs to sign out and sign in again for changes to take effect')
        }
      } else {
        console.log('\n⚠️  Cannot grant admin access - SUPABASE_SERVICE_ROLE_KEY not configured')
        console.log('💡 To grant admin access:')
        console.log('1. Add SUPABASE_SERVICE_ROLE_KEY to your .env.local file')
        console.log('2. Run this script again')
        console.log('3. Or manually update user role in Supabase dashboard')
      }
    }
    
    // Check profile information
    console.log('\n👤 Checking profile information...')
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (profileError) {
      console.log('⚠️  No profile found - user may need to complete onboarding')
    } else {
      console.log('✅ Profile found:')
      console.log(`  Full Name: ${profile.full_name || 'Not set'}`)
      console.log(`  Phone: ${profile.phone || 'Not set'}`)
      console.log(`  Company: ${profile.company_name || 'Not set'}`)
      console.log(`  Verified: ${profile.is_verified ? 'Yes' : 'No'}`)
    }
    
  } catch (error) {
    console.log('❌ Error checking admin access:', error.message)
    console.log('Stack:', error.stack)
  }
  
  console.log('\n📋 Admin Access Summary:')
  console.log('✅ Admin users have access to:')
  console.log('  - /dashboard/admin/* (all admin pages)')
  console.log('  - /api/admin/* (all admin APIs)')
  console.log('  - User management and role assignment')
  console.log('  - Service approval and moderation')
  console.log('  - System settings and configuration')
  console.log('  - Analytics and reporting')
  console.log('  - Permission management')
}

// Get email from command line argument
const email = process.argv[2]

if (!email) {
  console.log('❌ Please provide an email address')
  console.log('Usage: node scripts/check-admin-access.js <email>')
  console.log('Example: node scripts/check-admin-access.js luxsess2001@gmail.com')
  process.exit(1)
}

// Run the check
checkAdminAccess(email).catch(console.error)
