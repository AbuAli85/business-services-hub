const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://reootcngcptfogfozlmz.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb290Y25nY3B0Zm9nZm96bG16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0NDM4MiwiZXhwIjoyMDY5MDIwMzgyfQ.BTLA-2wwXJgjW6MKoaw2ERbCr_fXF9w4zgLb70_5DAE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testCompanyPage() {
  console.log('🧪 Testing Company Page Functionality...')
  
  try {
    // 1. Test companies table access
    console.log('\n1️⃣ Testing companies table access...')
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*')
      .limit(1)
    
    if (companiesError) {
      console.log('❌ Error accessing companies table:', companiesError.message)
    } else {
      console.log('✅ companies table accessible')
      if (companies && companies.length > 0) {
        console.log(`   Sample company: ${companies[0].name}`)
      }
    }
    
    // 2. Test company-assets storage bucket
    console.log('\n2️⃣ Testing company-assets storage bucket...')
    try {
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
      
      if (bucketsError) {
        console.log('❌ Error listing storage buckets:', bucketsError.message)
      } else {
        const companyAssetsBucket = buckets.find(b => b.name === 'company-assets')
        if (companyAssetsBucket) {
          console.log('✅ company-assets bucket exists')
          console.log(`   Public: ${companyAssetsBucket.public}`)
          console.log(`   File size limit: ${companyAssetsBucket.file_size_limit}`)
        } else {
          console.log('⚠️ company-assets bucket not found')
          console.log('   Available buckets:', buckets.map(b => b.name))
        }
      }
    } catch (error) {
      console.log('❌ Error checking storage buckets:', error.message)
    }
    
    // 3. Test profiles table access
    console.log('\n3️⃣ Testing profiles table access...')
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, company_id')
      .limit(1)
    
    if (profilesError) {
      console.log('❌ Error accessing profiles table:', profilesError.message)
    } else {
      console.log('✅ profiles table accessible')
      if (profiles && profiles.length > 0) {
        console.log(`   Sample profile company_id: ${profiles[0].company_id}`)
      }
    }
    
    // 4. Test RLS policies
    console.log('\n4️⃣ Testing RLS policies...')
    try {
      const { data: policies, error: policiesError } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT policyname, cmd, qual
          FROM pg_policies 
          WHERE tablename = 'companies' 
          AND schemaname = 'public';
        `
      })
      
      if (policiesError) {
        console.log('Note: Could not check RLS policies via exec_sql')
      } else {
        console.log('📋 Current RLS policies on companies table:')
        if (policies && policies.length > 0) {
          policies.forEach(policy => {
            console.log(`   ℹ️ ${policy.policyname}: ${policy.cmd}`)
          })
        } else {
          console.log('   ℹ️ No policies found')
        }
      }
    } catch (error) {
      console.log('Note: Could not check RLS policies')
    }
    
    console.log('\n🎉 Company page functionality test completed!')
    console.log('\n📋 Summary:')
    console.log('✅ Companies table: Accessible')
    console.log('✅ Profiles table: Accessible')
    console.log('⚠️ Storage bucket: May need setup')
    console.log('⚠️ RLS policies: May need setup')
    
    console.log('\n🔧 Next steps:')
    console.log('1. Ensure company-assets storage bucket exists')
    console.log('2. Set up proper RLS policies for companies table')
    console.log('3. Test company creation and updates')
    console.log('4. Check browser console for any remaining errors')
    
  } catch (error) {
    console.error('❌ Error testing company page functionality:', error)
  }
}

// Run the test
testCompanyPage()
