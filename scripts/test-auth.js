#!/usr/bin/env node

/**
 * Test Supabase Authentication
 * This script helps debug authentication issues
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function testAuthentication() {
  console.log('🔍 Testing Supabase Authentication...\n')
  
  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  console.log('📋 Environment Check:')
  console.log(`  Supabase URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`)
  console.log(`  Supabase Key: ${supabaseAnonKey ? '✅ Set' : '❌ Missing'}`)
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('\n❌ Environment variables not configured!')
    console.log('Please run: node scripts/setup-env.js')
    return
  }
  
  try {
    // Create Supabase client
    console.log('\n🔧 Creating Supabase client...')
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: false
      }
    })
    
    // Test connection
    console.log('📡 Testing connection...')
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.log('❌ Session error:', sessionError.message)
    } else if (session) {
      console.log('✅ Active session found!')
      console.log(`  User ID: ${session.user.id}`)
      console.log(`  Email: ${session.user.email}`)
      console.log(`  Role: ${session.user.user_metadata?.role || 'Not set'}`)
      console.log(`  Expires: ${new Date(session.expires_at * 1000).toLocaleString()}`)
    } else {
      console.log('ℹ️  No active session (this is normal if not signed in)')
    }
    
    // Test RLS policies
    console.log('\n🔒 Testing Row Level Security...')
    try {
      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select('id, title')
        .limit(1)
      
      if (servicesError) {
        console.log('❌ Services query failed:', servicesError.message)
        if (servicesError.code === 'PGRST116') {
          console.log('💡 This suggests an RLS policy issue')
        }
      } else {
        console.log('✅ Services query successful!')
        console.log(`  Found ${services.length} services`)
      }
    } catch (rlsError) {
      console.log('❌ RLS test error:', rlsError.message)
    }
    
    // Test profiles table
    console.log('\n👤 Testing profiles table...')
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .limit(1)
      
      if (profilesError) {
        console.log('❌ Profiles query failed:', profilesError.message)
      } else {
        console.log('✅ Profiles query successful!')
        console.log(`  Found ${profiles.length} profiles`)
      }
    } catch (profilesError) {
      console.log('❌ Profiles test error:', profilesError.message)
    }
    
  } catch (error) {
    console.log('❌ Authentication test failed:', error.message)
    console.log('Stack:', error.stack)
  }
  
  console.log('\n📋 Troubleshooting Tips:')
  console.log('1. Check your Supabase project is active')
  console.log('2. Verify API keys are correct')
  console.log('3. Check RLS policies in Supabase dashboard')
  console.log('4. Ensure your user has the correct role')
  console.log('5. Try signing out and signing in again')
}

// Run the test
testAuthentication().catch(console.error)
