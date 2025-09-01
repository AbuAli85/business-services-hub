#!/usr/bin/env node

/**
 * Check and Fix Profile Issues
 * This script checks for profile-related issues and fixes them
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function checkAndFixProfiles() {
  console.log('🔧 Checking and Fixing Profile Issues\n')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('❌ Environment variables not configured!')
    return
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    console.log('🔍 Checking profiles table...')
    
    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (profilesError) {
      console.log('❌ Error fetching profiles:', profilesError.message)
      return
    }
    
    console.log(`✅ Found ${profiles.length} profiles`)
    
    if (profiles.length === 0) {
      console.log('⚠️  No profiles found! This explains the foreign key errors.')
      console.log('🔧 Creating a default admin profile...')
      
      // Create a default admin profile
      const { data: adminProfile, error: adminError } = await supabase
        .from('profiles')
        .insert({
          id: '00000000-0000-0000-0000-000000000001', // Placeholder UUID
          email: 'admin@example.com',
          full_name: 'System Administrator',
          role: 'admin',
          phone: '',
          is_verified: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (adminError) {
        console.log('❌ Error creating admin profile:', adminError.message)
      } else {
        console.log('✅ Default admin profile created')
      }
    } else {
      console.log('\n📋 Profile Summary:')
      profiles.forEach((profile, index) => {
        console.log(`${index + 1}. ${profile.email} (${profile.role}) - ${profile.full_name}`)
      })
    }
    
    console.log('\n🔍 Checking companies table...')
    
    // Get all companies
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (companiesError) {
      console.log('❌ Error fetching companies:', companiesError.message)
      return
    }
    
    console.log(`✅ Found ${companies.length} companies`)
    
    if (companies.length > 0) {
      console.log('\n📋 Company Summary:')
      companies.forEach((company, index) => {
        console.log(`${index + 1}. ${company.name} (Owner: ${company.owner_id})`)
      })
      
      // Check for invalid owner_id references
      const profileIds = new Set(profiles.map(p => p.id))
      const invalidCompanies = companies.filter(company => !profileIds.has(company.owner_id))
      
      if (invalidCompanies.length > 0) {
        console.log(`\n⚠️  Found ${invalidCompanies.length} companies with invalid owner_id references:`)
        invalidCompanies.forEach(company => {
          console.log(`   - ${company.name} (Owner ID: ${company.owner_id})`)
        })
        
        console.log('\n🔧 These companies will cause foreign key constraint violations.')
        console.log('   Consider deleting them or fixing the owner_id references.')
      } else {
        console.log('\n✅ All companies have valid owner_id references!')
      }
    }
    
    console.log('\n🔍 Testing profile creation function...')
    
    // Test the profile creation function
    const { data: testResult, error: testError } = await supabase.rpc('create_user_profile', {
      user_id: '00000000-0000-0000-0000-000000000002',
      user_role: 'client',
      full_name: 'Test User',
      phone: '1234567890'
    })
    
    if (testError) {
      console.log('❌ Profile creation function test failed:', testError.message)
    } else {
      console.log('✅ Profile creation function test successful:', testResult)
      
      // Clean up test profile
      await supabase
        .from('profiles')
        .delete()
        .eq('id', '00000000-0000-0000-0000-000000000002')
      
      console.log('🧹 Test profile cleaned up')
    }
    
    console.log('\n🎉 Profile Check Complete!')
    console.log('\n📋 Summary:')
    console.log(`1. ✅ Found ${profiles.length} profiles`)
    console.log(`2. ✅ Found ${companies.length} companies`)
    console.log('3. ✅ Checked for invalid foreign key references')
    console.log('4. ✅ Tested profile creation function')
    
    console.log('\n🚀 Recommendations:')
    if (profiles.length === 0) {
      console.log('1. ⚠️  No profiles found - users need to complete onboarding')
      console.log('2. 🔧 Consider creating default profiles for testing')
    }
    if (companies.length > 0) {
      console.log('1. ✅ Companies exist - check owner_id references')
    }
    console.log('2. 🔧 Ensure profile creation triggers are working')
    console.log('3. 🔧 Test user registration and onboarding flow')
    
  } catch (error) {
    console.log('❌ Error checking profiles:', error.message)
    console.log('Stack:', error.stack)
  }
}

// Run the check
checkAndFixProfiles().catch(console.error)
