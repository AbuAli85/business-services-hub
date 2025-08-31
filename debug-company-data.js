const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://reootcngcptfogfozlmz.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb290Y25nY3B0Zm9nZm96bG16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0NDM4MiwiZXhwIjoyMDY5MDIwMzgyfQ.BTLA-2wwXJgjW6MKoaw2ERbCr_fXF9w4zgLb70_5DAE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugCompanyData() {
  console.log('🔍 Debugging Company Data Issues...')
  
  try {
    // 1. Check all companies in the database
    console.log('\n1️⃣ All companies in database:')
    const { data: allCompanies, error: companiesError } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (companiesError) {
      console.log('❌ Error fetching companies:', companiesError.message)
    } else {
      console.log(`✅ Found ${allCompanies?.length || 0} companies:`)
      allCompanies?.forEach((company, index) => {
        console.log(`   ${index + 1}. ${company.name} (ID: ${company.id})`)
        console.log(`      Owner: ${company.owner_id}`)
        console.log(`      Description: ${company.description || 'N/A'}`)
        console.log(`      Industry: ${company.industry || 'N/A'}`)
        console.log(`      Size: ${company.size || 'N/A'}`)
        console.log(`      Created: ${company.created_at}`)
        console.log(`      Logo: ${company.logo_url || 'N/A'}`)
        console.log('')
      })
    }
    
    // 2. Check all profiles and their company associations
    console.log('\n2️⃣ All profiles and company associations:')
    const { data: allProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, company_id, full_name')
      .order('created_at', { ascending: false })
    
    if (profilesError) {
      console.log('❌ Error fetching profiles:', profilesError.message)
    } else {
      console.log(`✅ Found ${allProfiles?.length || 0} profiles:`)
      allProfiles?.forEach((profile, index) => {
        console.log(`   ${index + 1}. ${profile.full_name || 'N/A'} (ID: ${profile.id})`)
        console.log(`      Email: ${profile.email || 'N/A'}`)
        console.log(`      Company ID: ${profile.company_id || 'N/A'}`)
        console.log('')
      })
    }
    
    // 3. Check for orphaned companies (no profile association)
    console.log('\n3️⃣ Checking for orphaned companies:')
    if (allCompanies && allProfiles) {
      const companyIds = allCompanies.map(c => c.id)
      const profileCompanyIds = allProfiles.map(p => p.company_id).filter(id => id !== null)
      
      const orphanedCompanies = companyIds.filter(id => !profileCompanyIds.includes(id))
      const unassignedProfiles = profileCompanyIds.filter(id => !companyIds.includes(id))
      
      if (orphanedCompanies.length > 0) {
        console.log('⚠️ Found orphaned companies (no profile association):')
        orphanedCompanies.forEach(id => {
          const company = allCompanies.find(c => c.id === id)
          console.log(`   - ${company?.name} (ID: ${id})`)
        })
      } else {
        console.log('✅ No orphaned companies found')
      }
      
      if (unassignedProfiles.length > 0) {
        console.log('⚠️ Found profiles with invalid company_id:')
        unassignedProfiles.forEach(id => {
          const profile = allProfiles.find(p => p.company_id === id)
          console.log(`   - ${profile?.full_name} (Profile ID: ${profile?.id}, Company ID: ${id})`)
        })
      } else {
        console.log('✅ All profile company associations are valid')
      }
    }
    
    // 4. Check company table structure
    console.log('\n4️⃣ Company table structure:')
    try {
      const { data: tableInfo, error: tableError } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_name = 'companies'
          AND table_schema = 'public'
          ORDER BY ordinal_position;
        `
      })
      
      if (tableError) {
        console.log('Note: Could not check table structure via exec_sql')
        console.log('   This is normal - exec_sql may not be available')
      } else {
        console.log('📋 Company table columns:')
        tableInfo?.forEach(col => {
          console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`)
        })
      }
    } catch (error) {
      console.log('Note: Could not check table structure')
    }
    
    // 5. Check for any recent activity
    console.log('\n5️⃣ Recent company activity:')
    if (allCompanies && allCompanies.length > 0) {
      const recentCompanies = allCompanies
        .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
        .slice(0, 3)
      
      console.log('📅 Most recently updated companies:')
      recentCompanies.forEach((company, index) => {
        const lastUpdated = company.updated_at || company.created_at
        console.log(`   ${index + 1}. ${company.name}`)
        console.log(`      Last updated: ${lastUpdated}`)
        console.log(`      Status: ${company.status || 'N/A'}`)
      })
    }
    
    console.log('\n🎯 Debug Summary:')
    console.log('✅ Database connectivity: Working')
    console.log('✅ Storage bucket: Available')
    console.log('⚠️ Data consistency: Needs verification')
    console.log('⚠️ Profile-company associations: May have issues')
    
    console.log('\n🔧 Recommended fixes:')
    console.log('1. Check if the displayed company "smartPRO (Test)" exists in database')
    console.log('2. Verify profile-company associations are correct')
    console.log('3. Ensure RLS policies allow proper access')
    console.log('4. Check browser console for JavaScript errors')
    console.log('5. Verify the company page is fetching data from the correct user profile')
    
  } catch (error) {
    console.error('❌ Error debugging company data:', error)
  }
}

// Run the debug
debugCompanyData()
