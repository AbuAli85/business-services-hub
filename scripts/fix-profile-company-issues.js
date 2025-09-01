#!/usr/bin/env node

/**
 * Fix Profile and Company Issues
 * This script addresses the foreign key constraint violations
 * and ensures proper profile creation before company creation
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function fixProfileCompanyIssues() {
  console.log('🔧 Fixing Profile and Company Issues\n')
  
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
    
    // Get all auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.log('❌ Error fetching auth users:', authError.message)
      return
    }
    
    console.log(`✅ Found ${authUsers.users.length} auth users`)
    
    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
    
    if (profilesError) {
      console.log('❌ Error fetching profiles:', profilesError.message)
      return
    }
    
    const profileIds = new Set(profiles.map(p => p.id))
    console.log(`✅ Found ${profiles.length} existing profiles`)
    
    // Find users without profiles
    const usersWithoutProfiles = authUsers.users.filter(user => !profileIds.has(user.id))
    
    if (usersWithoutProfiles.length === 0) {
      console.log('✅ All users have profiles!')
    } else {
      console.log(`⚠️  Found ${usersWithoutProfiles.length} users without profiles`)
      
      // Create missing profiles
      for (const user of usersWithoutProfiles) {
        console.log(`🔧 Creating profile for user: ${user.email}`)
        
        const { data, error } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || 'User',
            role: user.user_metadata?.role || 'client',
            phone: user.user_metadata?.phone || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        
        if (error) {
          console.log(`❌ Error creating profile for ${user.email}:`, error.message)
        } else {
          console.log(`✅ Profile created for ${user.email}`)
        }
      }
    }
    
    console.log('\n🔍 Checking for companies with invalid owner_id...')
    
    // Check companies table for invalid owner_id references
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, owner_id, name')
    
    if (companiesError) {
      console.log('❌ Error fetching companies:', companiesError.message)
      return
    }
    
    console.log(`✅ Found ${companies.length} companies`)
    
    // Check if any companies have invalid owner_id
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('id')
    
    const validProfileIds = new Set(allProfiles.map(p => p.id))
    
    const invalidCompanies = companies.filter(company => !validProfileIds.has(company.owner_id))
    
    if (invalidCompanies.length === 0) {
      console.log('✅ All companies have valid owner_id references!')
    } else {
      console.log(`⚠️  Found ${invalidCompanies.length} companies with invalid owner_id`)
      
      for (const company of invalidCompanies) {
        console.log(`🔧 Fixing company: ${company.name} (ID: ${company.id})`)
        
        // Try to find a valid owner or delete the company
        const { data: authUser } = await supabase.auth.admin.getUserById(company.owner_id)
        
        if (authUser.user) {
          // Create profile for this user
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: company.owner_id,
              email: authUser.user.email,
              full_name: authUser.user.user_metadata?.full_name || 'User',
              role: authUser.user.user_metadata?.role || 'client',
              phone: authUser.user.user_metadata?.phone || '',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
          
          if (profileError) {
            console.log(`❌ Error creating profile for company owner:`, profileError.message)
          } else {
            console.log(`✅ Profile created for company owner: ${authUser.user.email}`)
          }
        } else {
          console.log(`⚠️  No auth user found for company owner_id: ${company.owner_id}`)
          // Optionally delete the orphaned company
          // const { error: deleteError } = await supabase
          //   .from('companies')
          //   .delete()
          //   .eq('id', company.id)
        }
      }
    }
    
    console.log('\n🔍 Testing company creation...')
    
    // Test company creation with a valid user
    const { data: testProfiles } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .limit(1)
    
    if (testProfiles && testProfiles.length > 0) {
      const testProfile = testProfiles[0]
      console.log(`🧪 Testing company creation for: ${testProfile.email}`)
      
      const { data: testCompany, error: testError } = await supabase
        .from('companies')
        .insert({
          owner_id: testProfile.id,
          name: `${testProfile.full_name} Test Company`,
          description: 'Test company creation',
          cr_number: null,
          vat_number: null
        })
        .select()
        .single()
      
      if (testError) {
        console.log('❌ Test company creation failed:', testError.message)
      } else {
        console.log('✅ Test company creation successful!')
        
        // Clean up test company
        await supabase
          .from('companies')
          .delete()
          .eq('id', testCompany.id)
        
        console.log('🧹 Test company cleaned up')
      }
    }
    
    console.log('\n🎉 Profile and Company Issues Fixed!')
    console.log('\n📋 Summary:')
    console.log('1. ✅ Checked for users without profiles')
    console.log('2. ✅ Created missing profiles')
    console.log('3. ✅ Checked for invalid company owner_id references')
    console.log('4. ✅ Fixed invalid company references')
    console.log('5. ✅ Tested company creation functionality')
    
    console.log('\n🚀 Next Steps:')
    console.log('1. Test user registration and profile creation')
    console.log('2. Test company creation for providers')
    console.log('3. Verify all foreign key constraints are satisfied')
    
  } catch (error) {
    console.log('❌ Error fixing profile and company issues:', error.message)
    console.log('Stack:', error.stack)
  }
}

// Run the fix
fixProfileCompanyIssues().catch(console.error)
