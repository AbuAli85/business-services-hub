const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://reootcngcptfogfozlmz.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb290Y25nY3B0Zm9nZm96bG16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0NDM4MiwiZXhwIjoyMDY5MDIwMzgyfQ.BTLA-2wwXJgjW6MKoaw2ERbCr_fXF9w4zgLb70_5DAE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function verifyStorageStatus() {
  console.log('🔍 Verifying storage status...')
  console.log('=' * 50)
  
  try {
    // 1. Check Supabase connection
    console.log('1️⃣ Testing Supabase connection...')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) {
      console.error('❌ Auth error:', authError)
      return
    }
    console.log('✅ Supabase connection successful')
    
    // 2. List all storage buckets
    console.log('\n2️⃣ Checking storage buckets...')
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    
    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError)
      return
    }
    
    console.log(`📦 Found ${buckets.length} storage buckets:`)
    buckets.forEach(bucket => {
      console.log(`   • ${bucket.name} (public: ${bucket.public}, size limit: ${bucket.fileSizeLimit || 'default'})`)
    })
    
    // 3. Check specific required buckets
    console.log('\n3️⃣ Checking required buckets...')
    const requiredBuckets = ['service-images', 'avatars', 'message-files']
    const missingBuckets = []
    
    for (const bucketName of requiredBuckets) {
      const bucket = buckets.find(b => b.name === bucketName)
      if (bucket) {
        console.log(`✅ ${bucketName}: Found`)
        console.log(`   - Public: ${bucket.public}`)
        console.log(`   - File size limit: ${bucket.fileSizeLimit || 'default'}`)
        console.log(`   - Allowed MIME types: ${bucket.allowedMimeTypes ? bucket.allowedMimeTypes.join(', ') : 'default'}`)
      } else {
        console.log(`❌ ${bucketName}: Missing`)
        missingBuckets.push(bucketName)
      }
    }
    
    // 4. Test bucket access for each required bucket
    console.log('\n4️⃣ Testing bucket access...')
    for (const bucketName of requiredBuckets) {
      const bucket = buckets.find(b => b.name === bucketName)
      if (!bucket) continue
      
      console.log(`\n🧪 Testing ${bucketName}...`)
      
      try {
        // Test listing files
        const { data: files, error: listError } = await supabase.storage
          .from(bucketName)
          .list('', { limit: 1 })
        
        if (listError) {
          console.log(`   ❌ List files error: ${listError.message}`)
        } else {
          console.log(`   ✅ List files: OK (${files?.length || 0} files)`)
        }
        
        // Test upload (small test file)
        const testContent = `test-${Date.now()}`
        const testBlob = new Blob([testContent], { type: 'text/plain' })
        
        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(`test-${Date.now()}.txt`, testBlob)
        
        if (uploadError) {
          console.log(`   ❌ Upload error: ${uploadError.message}`)
        } else {
          console.log(`   ✅ Upload: OK`)
          
          // Test public URL generation
          const { data: { publicUrl } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(`test-${Date.now()}.txt`)
          
          console.log(`   ✅ Public URL: ${publicUrl}`)
        }
        
      } catch (error) {
        console.log(`   ❌ General error: ${error.message}`)
      }
    }
    
    // 5. Check RLS policies
    console.log('\n5️⃣ Checking RLS policies...')
    try {
      const { data: policies, error: policiesError } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT 
            schemaname,
            tablename,
            policyname,
            permissive,
            roles,
            cmd,
            qual,
            with_check
          FROM pg_policies 
          WHERE tablename = 'objects' 
          AND schemaname = 'storage'
          ORDER BY policyname;
        `
      })
      
      if (policiesError) {
        console.log('Note: Could not check RLS policies via exec_sql')
      } else if (policies && policies.length > 0) {
        console.log(`📋 Found ${policies.length} RLS policies:`)
        policies.forEach(policy => {
          console.log(`   • ${policy.policyname} (${policy.cmd})`)
        })
      } else {
        console.log('⚠️ No RLS policies found for storage.objects')
      }
    } catch (error) {
      console.log('Note: Could not check RLS policies')
    }
    
    // 6. Check services table structure
    console.log('\n6️⃣ Checking services table...')
    try {
      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select('id, title, approval_status')
        .limit(1)
      
      if (servicesError) {
        console.log(`❌ Services table error: ${servicesError.message}`)
      } else {
        console.log('✅ Services table accessible')
        
        // Check for required columns
        const { data: columns, error: columnsError } = await supabase.rpc('exec_sql', {
          sql: `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'services' 
            AND table_schema = 'public'
            ORDER BY ordinal_position;
          `
        })
        
        if (!columnsError && columns) {
          console.log('📋 Services table columns:')
          const requiredColumns = ['terms_conditions', 'cancellation_policy', 'approval_status', 'tags']
          
          columns.forEach(col => {
            const isRequired = requiredColumns.includes(col.column_name)
            const status = isRequired ? '✅' : 'ℹ️'
            console.log(`   ${status} ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`)
          })
          
          const missingColumns = requiredColumns.filter(col => 
            !columns.find(c => c.column_name === col)
          )
          
          if (missingColumns.length > 0) {
            console.log(`⚠️ Missing required columns: ${missingColumns.join(', ')}`)
          }
        }
      }
    } catch (error) {
      console.log(`❌ Services table error: ${error.message}`)
    }
    
    // 7. Summary and recommendations
    console.log('\n' + '=' * 50)
    console.log('📊 STORAGE STATUS SUMMARY')
    console.log('=' * 50)
    
    if (missingBuckets.length > 0) {
      console.log(`❌ Missing buckets: ${missingBuckets.join(', ')}`)
      console.log('💡 Run: node fix-storage-comprehensive.js')
    } else {
      console.log('✅ All required buckets present')
    }
    
    if (buckets.length === 0) {
      console.log('❌ No storage buckets found')
      console.log('💡 Check Supabase dashboard Storage section')
    }
    
    console.log('\n📋 Next steps:')
    console.log('1. If buckets are missing, run the comprehensive fix script')
    console.log('2. Check Supabase dashboard Storage section for bucket status')
    console.log('3. Verify RLS policies are properly configured')
    console.log('4. Test image uploads in your application')
    
  } catch (error) {
    console.error('❌ Verification failed:', error)
  }
}

// Run verification
verifyStorageStatus()
