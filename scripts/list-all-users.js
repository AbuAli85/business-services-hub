#!/usr/bin/env node

/**
 * List All Users
 * This script lists all users in the system with their roles
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function listAllUsers() {
  console.log('🔍 Listing all users in the system...\n')
  
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
    
    console.log('\n🔍 Fetching all users from profiles table...')
    
    // Get all users from profiles table
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (profilesError) {
      console.log('❌ Error fetching profiles:', profilesError.message)
      return
    }
    
    if (!profiles || profiles.length === 0) {
      console.log('❌ No users found in profiles table')
      console.log('📋 This could mean:')
      console.log('  - No users have signed up yet')
      console.log('  - Database connection issue')
      console.log('  - RLS policies blocking access')
      return
    }
    
    console.log(`✅ Found ${profiles.length} users:\n`)
    
    // Group users by role
    const usersByRole = {}
    profiles.forEach(profile => {
      const role = profile.role || 'client'
      if (!usersByRole[role]) {
        usersByRole[role] = []
      }
      usersByRole[role].push(profile)
    })
    
    // Display users grouped by role
    Object.keys(usersByRole).sort().forEach(role => {
      const users = usersByRole[role]
      const roleIcon = getRoleIcon(role)
      const roleColor = getRoleColor(role)
      
      console.log(`${roleIcon} ${role.toUpperCase()} (${users.length} users)`)
      console.log(`${roleColor}${'─'.repeat(50)}`)
      
      users.forEach((profile, index) => {
        const isVerified = profile.is_verified ? '✅' : '❌'
        const hasPhone = profile.phone ? '📱' : '📵'
        const hasCompany = profile.company_name ? '🏢' : '🏠'
        
        console.log(`  ${index + 1}. ${profile.full_name || 'No name'}`)
        console.log(`     📧 ${profile.email}`)
        console.log(`     🆔 ${profile.id}`)
        console.log(`     ${isVerified} Verified: ${profile.is_verified ? 'Yes' : 'No'}`)
        console.log(`     ${hasPhone} Phone: ${profile.phone || 'Not set'}`)
        console.log(`     ${hasCompany} Company: ${profile.company_name || 'Not set'}`)
        console.log(`     📅 Created: ${new Date(profile.created_at).toLocaleDateString()}`)
        console.log(`     🔄 Updated: ${new Date(profile.updated_at).toLocaleDateString()}`)
        console.log('')
      })
    })
    
    // Summary
    console.log('📊 Summary:')
    console.log(`  Total Users: ${profiles.length}`)
    Object.keys(usersByRole).forEach(role => {
      const count = usersByRole[role].length
      const percentage = ((count / profiles.length) * 100).toFixed(1)
      console.log(`  ${getRoleIcon(role)} ${role}: ${count} (${percentage}%)`)
    })
    
    // Check for admin users
    const adminUsers = profiles.filter(p => p.role === 'admin' || p.role === 'super_admin')
    console.log(`\n👑 Admin Users: ${adminUsers.length}`)
    if (adminUsers.length === 0) {
      console.log('⚠️  No admin users found!')
      console.log('💡 To create an admin user:')
      console.log('1. Sign up with the desired email')
      console.log('2. Update the user role in Supabase dashboard')
      console.log('3. Or run: node scripts/grant-admin-access.js <email>')
    } else {
      adminUsers.forEach(admin => {
        console.log(`  - ${admin.email} (${admin.full_name || 'No name'})`)
      })
    }
    
  } catch (error) {
    console.log('❌ Error listing users:', error.message)
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

function getRoleColor(role) {
  switch (role) {
    case 'admin': return '\x1b[31m' // Red
    case 'super_admin': return '\x1b[35m' // Magenta
    case 'moderator': return '\x1b[34m' // Blue
    case 'support': return '\x1b[32m' // Green
    case 'provider': return '\x1b[33m' // Yellow
    case 'client': return '\x1b[37m' // White
    default: return '\x1b[37m' // White
  }
}

// Run the list
listAllUsers().catch(console.error)
