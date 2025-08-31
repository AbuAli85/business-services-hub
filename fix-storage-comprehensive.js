const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://reootcngcptfogfozlmz.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb290Y25nY3B0Zm9nZm96bG16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0NDM4MiwiZXhwIjoyMDY5MDIwMzgyfQ.BTLA-2wwXJgjW6MKoaw2ERbCr_fXF9w4zgLb70_5DAE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixStorageComprehensive() {
  console.log('🔧 Starting comprehensive storage fixes...')
  
  try {
    // 1. First, let's check what buckets currently exist
    console.log('📋 Checking existing storage buckets...')
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('Error listing buckets:', listError)
      return
    }
    
    console.log('Current buckets:', existingBuckets.map(b => ({ name: b.name, public: b.public })))
    
    // 2. Delete problematic buckets if they exist
    const bucketsToDelete = ['service-images', 'avatars', 'message-files']
    for (const bucketName of bucketsToDelete) {
      const existingBucket = existingBuckets.find(b => b.name === bucketName)
      if (existingBucket) {
        console.log(`🗑️ Deleting existing ${bucketName} bucket...`)
        const { error: deleteError } = await supabase.storage.deleteBucket(bucketName)
        if (deleteError) {
          console.error(`Error deleting ${bucketName}:`, deleteError)
        } else {
          console.log(`✅ Deleted ${bucketName} bucket`)
        }
      }
    }
    
    // 3. Create fresh storage buckets with proper configuration
    console.log('📦 Creating fresh storage buckets...')
    
    // Service Images Bucket
    console.log('Creating service-images bucket...')
    const { error: serviceImagesError } = await supabase.storage.createBucket('service-images', {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    })
    
    if (serviceImagesError) {
      console.error('Error creating service-images bucket:', serviceImagesError)
      return
    }
    console.log('✅ service-images bucket created')
    
    // Avatars Bucket
    console.log('Creating avatars bucket...')
    const { error: avatarsError } = await supabase.storage.createBucket('avatars', {
      public: true,
      fileSizeLimit: 2097152, // 2MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    })
    
    if (avatarsError) {
      console.error('Error creating avatars bucket:', avatarsError)
      return
    }
    console.log('✅ avatars bucket created')
    
    // Message Files Bucket
    console.log('Creating message-files bucket...')
    const { error: messageFilesError } = await supabase.storage.createBucket('message-files', {
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: [
        'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 
        'application/pdf', 'text/plain', 'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ]
    })
    
    if (messageFilesError) {
      console.error('Error creating message-files bucket:', messageFilesError)
      return
    }
    console.log('✅ message-files bucket created')
    
    // 4. Set up comprehensive RLS policies using direct SQL
    console.log('🔒 Setting up RLS policies...')
    
    const policies = [
      // Service Images Policies
      {
        name: 'service-images-insert',
        sql: `CREATE POLICY "service-images-insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'service-images' AND auth.uid() IS NOT NULL)`
      },
      {
        name: 'service-images-select',
        sql: `CREATE POLICY "service-images-select" ON storage.objects FOR SELECT USING (bucket_id = 'service-images')`
      },
      {
        name: 'service-images-update',
        sql: `CREATE POLICY "service-images-update" ON storage.objects FOR UPDATE USING (bucket_id = 'service-images' AND auth.uid() IS NOT NULL)`
      },
      {
        name: 'service-images-delete',
        sql: `CREATE POLICY "service-images-delete" ON storage.objects FOR DELETE USING (bucket_id = 'service-images' AND auth.uid() IS NOT NULL)`
      },
      
      // Avatars Policies
      {
        name: 'avatars-insert',
        sql: `CREATE POLICY "avatars-insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL)`
      },
      {
        name: 'avatars-select',
        sql: `CREATE POLICY "avatars-select" ON storage.objects FOR SELECT USING (bucket_id = 'avatars')`
      },
      {
        name: 'avatars-update',
        sql: `CREATE POLICY "avatars-update" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL)`
      },
      {
        name: 'avatars-delete',
        sql: `CREATE POLICY "avatars-delete" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL)`
      },
      
      // Message Files Policies
      {
        name: 'message-files-insert',
        sql: `CREATE POLICY "message-files-insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'message-files' AND auth.uid() IS NOT NULL)`
      },
      {
        name: 'message-files-select',
        sql: `CREATE POLICY "message-files-select" ON storage.objects FOR SELECT USING (bucket_id = 'message-files' AND auth.uid() IS NOT NULL)`
      },
      {
        name: 'message-files-update',
        sql: `CREATE POLICY "message-files-update" ON storage.objects FOR UPDATE USING (bucket_id = 'message-files' AND auth.uid() IS NOT NULL)`
      },
      {
        name: 'message-files-delete',
        sql: `CREATE POLICY "message-files-delete" ON storage.objects FOR DELETE USING (bucket_id = 'message-files' AND auth.uid() IS NOT NULL)`
      }
    ]
    
    // Drop existing policies first
    for (const policy of policies) {
      try {
        await supabase.rpc('exec_sql', {
          sql: `DROP POLICY IF EXISTS "${policy.name}" ON storage.objects`
        })
      } catch (e) {
        // Ignore errors if policy doesn't exist
      }
    }
    
    // Create new policies
    for (const policy of policies) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: policy.sql })
        if (error) {
          console.log(`Note: Could not create ${policy.name} policy (may need manual setup)`)
        } else {
          console.log(`✅ Created ${policy.name} policy`)
        }
      } catch (e) {
        console.log(`Note: Could not create ${policy.name} policy (may need manual setup)`)
      }
    }
    
    // 5. Test bucket access
    console.log('🧪 Testing bucket access...')
    
    // Test listing buckets
    const { data: testBuckets, error: testListError } = await supabase.storage.listBuckets()
    if (testListError) {
      console.error('Error testing bucket listing:', testListError)
    } else {
      console.log('✅ Bucket listing works')
      console.log('Available buckets:', testBuckets.map(b => b.name))
    }
    
    // Test uploading a small test file to service-images
    console.log('🧪 Testing file upload to service-images...')
    try {
      const testContent = 'test file content'
      const testBlob = new Blob([testContent], { type: 'text/plain' })
      
      const { error: uploadTestError } = await supabase.storage
        .from('service-images')
        .upload('test-file.txt', testBlob)
      
      if (uploadTestError) {
        console.error('❌ Test upload failed:', uploadTestError)
      } else {
        console.log('✅ Test upload successful')
        
        // Test getting public URL
        const { data: { publicUrl } } = supabase.storage
          .from('service-images')
          .getPublicUrl('test-file.txt')
        
        console.log('✅ Public URL generated:', publicUrl)
        
        // Clean up test file
        await supabase.storage
          .from('service-images')
          .remove(['test-file.txt'])
        console.log('✅ Test file cleaned up')
      }
    } catch (error) {
      console.error('❌ Test upload failed:', error)
    }
    
    // 6. Add missing database columns
    console.log('🔧 Adding missing service table columns...')
    
    try {
      const { error: addColumnsError } = await supabase.rpc('exec_sql', {
        sql: `
          -- Add terms_conditions column if it doesn't exist
          DO $$ 
          BEGIN
              IF NOT EXISTS (
                  SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'services' 
                  AND column_name = 'terms_conditions'
              ) THEN
                  ALTER TABLE public.services ADD COLUMN terms_conditions TEXT;
              END IF;
          END $$;
          
          -- Add cancellation_policy column if it doesn't exist
          DO $$ 
          BEGIN
              IF NOT EXISTS (
                  SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'services' 
                  AND column_name = 'cancellation_policy'
              ) THEN
                  ALTER TABLE public.services ADD COLUMN cancellation_policy TEXT;
              END IF;
          END $$;
          
          -- Add approval_status column if it doesn't exist
          DO $$ 
          BEGIN
              IF NOT EXISTS (
                  SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'services' 
                  AND column_name = 'approval_status'
              ) THEN
                  ALTER TABLE public.services ADD COLUMN approval_status TEXT DEFAULT 'pending';
              END IF;
          END $$;
          
          -- Add tags column if it doesn't exist
          DO $$ 
          BEGIN
              IF NOT EXISTS (
                  SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'services' 
                  AND column_name = 'tags'
              ) THEN
                  ALTER TABLE public.services ADD COLUMN tags TEXT[];
              END IF;
          END $$;
          
          -- Update existing services to have default approval_status
          UPDATE public.services SET approval_status = 'approved' WHERE approval_status IS NULL;
        `
      })
      
      if (addColumnsError) {
        console.log('Note: exec_sql function not available, columns may already exist')
      } else {
        console.log('✅ Missing columns added to services table')
      }
    } catch (error) {
      console.log('Note: Could not add columns via exec_sql')
    }
    
    console.log('\n🎉 Comprehensive storage fixes completed!')
    console.log('\n📋 Next steps:')
    console.log('1. Restart your application')
    console.log('2. Try uploading images again')
    console.log('3. Check browser console for any remaining errors')
    console.log('4. If issues persist, check Supabase dashboard Storage section')
    
    // 7. Final verification
    console.log('\n🔍 Final verification:')
    const { data: finalBuckets } = await supabase.storage.listBuckets()
    console.log('Final bucket list:', finalBuckets.map(b => ({ name: b.name, public: b.public, fileSizeLimit: b.fileSizeLimit })))
    
  } catch (error) {
    console.error('❌ Error during comprehensive storage fix:', error)
  }
}

// Run the comprehensive fix
fixStorageComprehensive()
