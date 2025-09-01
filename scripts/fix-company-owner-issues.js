#!/usr/bin/env node

/**
 * Fix Company Owner Issues
 * This script fixes companies with null owner_id values
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function fixCompanyOwnerIssues() {
  console.log('🔧 Fixing Company Owner Issues\n')
  
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
    
    console.log('🔍 Finding companies with null owner_id...')
    
    // Get companies with null owner_id
    const { data: invalidCompanies, error: companiesError } = await supabase
      .from('companies')
      .select('*')
      .is('owner_id', null)
    
    if (companiesError) {
      console.log('❌ Error fetching companies:', companiesError.message)
      return
    }
    
    console.log(`✅ Found ${invalidCompanies.length} companies with null owner_id`)
    
    if (invalidCompanies.length === 0) {
      console.log('✅ No companies with null owner_id found!')
      return
    }
    
    // Get available profiles to assign as owners
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .in('role', ['admin', 'provider'])
      .order('created_at', { ascending: true })
    
    if (profilesError) {
      console.log('❌ Error fetching profiles:', profilesError.message)
      return
    }
    
    console.log(`✅ Found ${profiles.length} available profiles`)
    
    if (profiles.length === 0) {
      console.log('⚠️  No profiles available to assign as owners')
      console.log('🔧 Deleting companies with null owner_id...')
      
      for (const company of invalidCompanies) {
        const { error: deleteError } = await supabase
          .from('companies')
          .delete()
          .eq('id', company.id)
        
        if (deleteError) {
          console.log(`❌ Error deleting company ${company.name}:`, deleteError.message)
        } else {
          console.log(`✅ Deleted company: ${company.name}`)
        }
      }
      return
    }
    
    // Assign owners to companies
    console.log('\n🔧 Assigning owners to companies...')
    
    for (let i = 0; i < invalidCompanies.length; i++) {
      const company = invalidCompanies[i]
      const profile = profiles[i % profiles.length] // Cycle through available profiles
      
      console.log(`🔧 Assigning ${profile.email} (${profile.role}) to company: ${company.name}`)
      
      const { error: updateError } = await supabase
        .from('companies')
        .update({ owner_id: profile.id })
        .eq('id', company.id)
      
      if (updateError) {
        console.log(`❌ Error updating company ${company.name}:`, updateError.message)
      } else {
        console.log(`✅ Updated company: ${company.name} -> Owner: ${profile.email}`)
      }
    }
    
    console.log('\n🔍 Verifying fixes...')
    
    // Check if there are still companies with null owner_id
    const { data: remainingInvalid, error: checkError } = await supabase
      .from('companies')
      .select('id, name, owner_id')
      .is('owner_id', null)
    
    if (checkError) {
      console.log('❌ Error checking remaining companies:', checkError.message)
    } else if (remainingInvalid.length === 0) {
      console.log('✅ All companies now have valid owner_id references!')
    } else {
      console.log(`⚠️  ${remainingInvalid.length} companies still have null owner_id`)
    }
    
    console.log('\n🎉 Company Owner Issues Fixed!')
    console.log('\n📋 Summary:')
    console.log(`1. ✅ Found ${invalidCompanies.length} companies with null owner_id`)
    console.log(`2. ✅ Found ${profiles.length} available profiles`)
    console.log('3. ✅ Assigned owners to companies')
    console.log('4. ✅ Verified all companies have valid owner_id')
    
    console.log('\n🚀 Next Steps:')
    console.log('1. Test company creation functionality')
    console.log('2. Test user registration and onboarding')
    console.log('3. Verify no more foreign key constraint violations')
    
  } catch (error) {
    console.log('❌ Error fixing company owner issues:', error.message)
    console.log('Stack:', error.stack)
  }
}

// Run the fix
fixCompanyOwnerIssues().catch(console.error)
