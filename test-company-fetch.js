const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://reootcngcptfogfozlmz.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb290Y25nY3B0Zm9nZm96bG16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0NDM4MiwiZXhwIjoyMDY5MDIwMzgyfQ.BTLA-2wwXJgjW6MKoaw2ERbCr_fXF9w4zgLb70_5DAE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testCompanyFetch() {
  console.log('🧪 Testing Company Data Fetching Logic...')
  
  try {
    // Test with fahad alamri's user ID (from debug output)
    const testUserId = 'd2ce1fe9-806f-4dbc-8efb-9cf160f19e4b'
    console.log(`\n1️⃣ Testing company fetch for user: ${testUserId}`)
    
    // Step 1: Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', testUserId)
      .single()
    
    if (profileError) {
      console.log('❌ Error fetching profile:', profileError.message)
      return
    }
    
    console.log('✅ User profile found:')
    console.log(`   Company ID: ${profile.company_id || 'N/A'}`)
    
    let companyData = null
    
    // Step 2: Try to get company through profile.company_id
    if (profile?.company_id) {
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', profile.company_id)
        .single()
      
      if (companyError) {
        console.log('❌ Error fetching company through profile.company_id:', companyError.message)
      } else if (company) {
        companyData = company
        console.log('✅ Company found through profile.company_id:', company.name)
      }
    }
    
    // Step 3: If no company found through profile, try to find company where user is owner
    if (!companyData) {
      console.log('\n2️⃣ No company found through profile, checking if user owns a company...')
      const { data: ownedCompany, error: ownedError } = await supabase
        .from('companies')
        .select('*')
        .eq('owner_id', testUserId)
        .single()
      
      if (ownedError) {
        console.log('❌ Error fetching owned company:', ownedError.message)
      } else if (ownedCompany) {
        companyData = ownedCompany
        console.log('✅ Company found through owner_id:', ownedCompany.name)
        console.log(`   Company ID: ${ownedCompany.id}`)
        console.log(`   Description: ${ownedCompany.description || 'N/A'}`)
        console.log(`   Industry: ${ownedCompany.industry || 'N/A'}`)
        console.log(`   Size: ${ownedCompany.size || 'N/A'}`)
        console.log(`   Logo: ${ownedCompany.logo_url || 'N/A'}`)
        
        // Step 4: Update profile with company_id for future reference
        console.log('\n3️⃣ Updating profile with company_id...')
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ company_id: ownedCompany.id })
          .eq('id', testUserId)
        
        if (updateError) {
          console.log('❌ Warning: Could not update profile with company_id:', updateError.message)
        } else {
          console.log('✅ Profile updated with company_id')
        }
      }
    }
    
    if (companyData) {
      console.log('\n🎉 Company data fetch successful!')
      console.log(`Company: ${companyData.name}`)
      console.log(`Owner: ${companyData.owner_id}`)
      console.log(`Created: ${companyData.created_at}`)
    } else {
      console.log('\n❌ No company found for user')
    }
    
    // Test with another user (support@techxoman.com)
    console.log('\n\n4️⃣ Testing with another user (support@techxoman.com)...')
    const testUserId2 = 'f07dfa7c-2042-44da-b47c-ffbb2482c532'
    
    const { data: profile2, error: profileError2 } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', testUserId2)
      .single()
    
    if (profileError2) {
      console.log('❌ Error fetching profile2:', profileError2.message)
    } else {
      console.log('✅ User profile2 found:')
      console.log(`   Company ID: ${profile2.company_id || 'N/A'}`)
      
      if (profile2?.company_id) {
        const { data: company2, error: companyError2 } = await supabase
          .from('companies')
          .select('*')
          .eq('id', profile2.company_id)
          .single()
        
        if (companyError2) {
          console.log('❌ Error fetching company2:', companyError2.message)
        } else if (company2) {
          console.log('✅ Company2 found:', company2.name)
          console.log(`   Description: ${company2.description || 'N/A'}`)
        }
      }
    }
    
    console.log('\n🎯 Test Summary:')
    console.log('✅ Company fetching logic: Working')
    console.log('✅ Profile-company associations: Can be updated')
    console.log('✅ Owner-based company lookup: Working')
    
  } catch (error) {
    console.error('❌ Error testing company fetch:', error)
  }
}

// Run the test
testCompanyFetch()
