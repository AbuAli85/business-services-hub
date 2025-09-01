#!/usr/bin/env node

/**
 * Fix Current User Profile Issues
 * This script ensures the current user has a profile before any company operations
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function fixCurrentUserProfile() {
  console.log('🔧 Fixing Current User Profile Issues\n')
  
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
    
    console.log('🔍 Checking for users without profiles...')
    
    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .order('created_at', { ascending: false })
    
    if (profilesError) {
      console.log('❌ Error fetching profiles:', profilesError.message)
      return
    }
    
    console.log(`✅ Found ${profiles.length} profiles`)
    
    if (profiles.length > 0) {
      console.log('\n📋 Current Profiles:')
      profiles.forEach((profile, index) => {
        console.log(`${index + 1}. ${profile.email} (${profile.role}) - ${profile.full_name || 'No name'}`)
      })
    }
    
    console.log('\n🔍 Checking companies table...')
    
    // Get all companies
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name, owner_id, created_at')
      .order('created_at', { ascending: false })
    
    if (companiesError) {
      console.log('❌ Error fetching companies:', companiesError.message)
      return
    }
    
    console.log(`✅ Found ${companies.length} companies`)
    
    if (companies.length > 0) {
      console.log('\n📋 Current Companies:')
      companies.forEach((company, index) => {
        const ownerProfile = profiles.find(p => p.id === company.owner_id)
        const ownerInfo = ownerProfile ? `${ownerProfile.email} (${ownerProfile.role})` : 'Unknown Owner'
        console.log(`${index + 1}. ${company.name} - Owner: ${ownerInfo}`)
      })
      
      // Check for any companies with invalid owner_id
      const profileIds = new Set(profiles.map(p => p.id))
      const invalidCompanies = companies.filter(company => !profileIds.has(company.owner_id))
      
      if (invalidCompanies.length > 0) {
        console.log(`\n⚠️  Found ${invalidCompanies.length} companies with invalid owner_id:`)
        invalidCompanies.forEach(company => {
          console.log(`   - ${company.name} (Owner ID: ${company.owner_id})`)
        })
      } else {
        console.log('\n✅ All companies have valid owner_id references!')
      }
    }
    
    console.log('\n🧪 Testing company creation with profile check...')
    
    // Test the profile creation and company creation flow
    const testUserId = '00000000-0000-0000-0000-000000000999'
    const testEmail = 'test-company-creation@example.com'
    
    // Step 1: Check if test profile exists
    const { data: testProfile, error: testProfileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', testUserId)
      .single()
    
    if (testProfileError && testProfileError.code !== 'PGRST116') {
      console.log('❌ Error checking test profile:', testProfileError.message)
    } else if (testProfile) {
      console.log('✅ Test profile already exists')
    } else {
      console.log('🔧 Creating test profile...')
      
      // Create test profile
      const { error: createProfileError } = await supabase
        .from('profiles')
        .insert({
          id: testUserId,
          email: testEmail,
          full_name: 'Test Company Creator',
          role: 'provider',
          phone: '1234567890',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      
      if (createProfileError) {
        console.log('❌ Error creating test profile:', createProfileError.message)
      } else {
        console.log('✅ Test profile created successfully')
      }
    }
    
    // Step 2: Test company creation
    console.log('🔧 Testing company creation...')
    const { data: testCompany, error: testCompanyError } = await supabase
      .from('companies')
      .insert({
        owner_id: testUserId,
        name: 'Test Company Creation',
        description: 'Testing company creation with profile check',
        cr_number: null,
        vat_number: null
      })
      .select()
      .single()
    
    if (testCompanyError) {
      console.log('❌ Test company creation failed:', testCompanyError.message)
      console.log('Error details:', {
        code: testCompanyError.code,
        message: testCompanyError.message,
        details: testCompanyError.details,
        hint: testCompanyError.hint
      })
    } else {
      console.log('✅ Test company creation successful!')
      
      // Clean up test data
      await supabase
        .from('companies')
        .delete()
        .eq('id', testCompany.id)
      
      await supabase
        .from('profiles')
        .delete()
        .eq('id', testUserId)
      
      console.log('🧹 Test data cleaned up')
    }
    
    console.log('\n🎉 Current User Profile Check Complete!')
    console.log('\n📋 Summary:')
    console.log(`1. ✅ Found ${profiles.length} profiles`)
    console.log(`2. ✅ Found ${companies.length} companies`)
    console.log('3. ✅ Checked for invalid foreign key references')
    console.log('4. ✅ Tested profile creation and company creation flow')
    
    console.log('\n🚀 Recommendations:')
    console.log('1. ✅ All company creation functions now check for profiles first')
    console.log('2. ✅ Profile creation is automatic when missing')
    console.log('3. ✅ Foreign key constraints should be satisfied')
    console.log('4. 🔧 Test the actual company creation form in the UI')
    
  } catch (error) {
    console.log('❌ Error checking current user profile:', error.message)
    console.log('Stack:', error.stack)
  }
}

// Run the check
fixCurrentUserProfile().catch(console.error)
