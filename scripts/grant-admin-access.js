#!/usr/bin/env node

/**
 * Grant Admin Access
 * This script grants admin access to a user by email
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function grantAdminAccess(email) {
  console.log(`🔧 Granting admin access to: ${email}\n`)
  
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
      console.log('\n💡 To grant admin access:')
      console.log('1. User must first sign up at your application')
      console.log('2. User must complete the profile creation process')
      console.log('3. Then run this script again')
      return
    }
    
    const profile = profiles[0]
    const currentRole = profile.role || 'client'
    
    console.log(`✅ User found!`)
    console.log(`  ID: ${profile.id}`)
    console.log(`  Email: ${profile.email}`)
    console.log(`  Full Name: ${profile.full_name || 'Not set'}`)
    console.log(`  Current Role: ${currentRole}`)
    
    if (currentRole === 'admin' || currentRole === 'super_admin') {
      console.log('\n🎉 User already has admin access!')
      console.log('✅ No changes needed')
      return
    }
    
    console.log('\n🔧 Updating user role to admin...')
    
    // Update the user's role in profiles table
    const { data: updateData, error: updateError } = await supabase
      .from('profiles')
      .update({ 
        role: 'admin',
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id)
      .select()
    
    if (updateError) {
      console.log('❌ Error updating profile:', updateError.message)
      return
    }
    
    console.log('✅ Profile updated successfully!')
    
    // If we have service key, also update auth metadata
    if (supabaseServiceKey) {
      console.log('\n🔧 Updating auth user metadata...')
      
      const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })
      
      try {
        const { data: authUpdateData, error: authUpdateError } = await adminSupabase.auth.admin.updateUserById(
          profile.id,
          {
            user_metadata: {
              role: 'admin'
            }
          }
        )
        
        if (authUpdateError) {
          console.log('⚠️  Warning: Could not update auth metadata:', authUpdateError.message)
          console.log('✅ Profile role updated, but auth metadata may need manual update')
        } else {
          console.log('✅ Auth metadata updated successfully!')
        }
      } catch (authError) {
        console.log('⚠️  Warning: Auth update failed:', authError.message)
        console.log('✅ Profile role updated, but auth metadata may need manual update')
      }
    } else {
      console.log('\n⚠️  Warning: SUPABASE_SERVICE_ROLE_KEY not configured')
      console.log('✅ Profile role updated, but auth metadata may need manual update')
    }
    
    console.log('\n🎉 Admin access granted successfully!')
    console.log('✅ User now has full admin permissions:')
    console.log('  - User Management (create, read, update, delete, suspend, verify)')
    console.log('  - Service Management (create, approve, reject, feature, delete)')
    console.log('  - Booking Management (create, read, update, delete, refund)')
    console.log('  - System Management (settings, backup, logs, maintenance)')
    console.log('  - Analytics & Reports (view, export, generate)')
    console.log('  - Access to all admin routes: /dashboard/admin/*')
    console.log('  - Access to all admin APIs: /api/admin/*')
    
    console.log('\n🔄 Next Steps:')
    console.log('1. User needs to sign out and sign in again')
    console.log('2. User will now see admin navigation in dashboard')
    console.log('3. User can access all admin features')
    
  } catch (error) {
    console.log('❌ Error granting admin access:', error.message)
    console.log('Stack:', error.stack)
  }
}

// Get email from command line argument
const email = process.argv[2]

if (!email) {
  console.log('❌ Please provide an email address')
  console.log('Usage: node scripts/grant-admin-access.js <email>')
  console.log('Example: node scripts/grant-admin-access.js luxsess2001@gmail.com')
  process.exit(1)
}

// Run the grant
grantAdminAccess(email).catch(console.error)
