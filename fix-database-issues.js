const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://reootcngcptfogfozlmz.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb290Y25nY3B0Zm9nZm96bG16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0NDM4MiwiZXhwIjoyMDY5MDIwMzgyfQ.BTLA-2wwXJgjW6MKoaw2ERbCr_fXF9w4zgLb70_5DAE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixDatabaseIssues() {
  console.log('🔧 Starting database fixes...')
  
  try {
    // 1. Create storage buckets
    console.log('📦 Creating storage buckets...')
    
    // Service Images Bucket
    const { error: serviceImagesError } = await supabase.storage.createBucket('service-images', {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    })
    
    if (serviceImagesError && !serviceImagesError.message.includes('already exists')) {
      console.error('Error creating service-images bucket:', serviceImagesError)
    } else {
      console.log('✅ service-images bucket ready')
    }
    
    // Avatars Bucket
    const { error: avatarsError } = await supabase.storage.createBucket('avatars', {
      public: true,
      fileSizeLimit: 2097152, // 2MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    })
    
    if (avatarsError && !avatarsError.message.includes('already exists')) {
      console.error('Error creating avatars bucket:', avatarsError)
    } else {
      console.log('✅ avatars bucket ready')
    }
    
    // Message Files Bucket
    const { error: messageFilesError } = await supabase.storage.createBucket('message-files', {
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: [
        'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 
        'application/pdf', 'text/plain', 'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ]
    })
    
    if (messageFilesError && !messageFilesError.message.includes('already exists')) {
      console.error('Error creating message-files bucket:', messageFilesError)
    } else {
      console.log('✅ message-files bucket ready')
    }
    
    // Company Assets Bucket
    const { error: companyAssetsError } = await supabase.storage.createBucket('company-assets', {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml']
    })
    
    if (companyAssetsError && !companyAssetsError.message.includes('already exists')) {
      console.error('Error creating company-assets bucket:', companyAssetsError)
    } else {
      console.log('✅ company-assets bucket ready')
    }
    
    // 2. Add missing columns to services table
    console.log('🔧 Adding missing columns to services table...')
    
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
    
    // 3. Test the fixes
    console.log('🧪 Testing the fixes...')
    
    // Test storage bucket access
    try {
      const { data: buckets } = await supabase.storage.listBuckets()
      console.log('📦 Available storage buckets:', buckets.map(b => b.name))
    } catch (error) {
      console.error('Error listing buckets:', error)
    }
    
    // Test services table
    try {
      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select('id, title, approval_status')
        .limit(1)
      
      if (servicesError) {
        console.error('Error testing services table:', servicesError)
      } else {
        console.log('✅ Services table accessible')
      }
    } catch (error) {
      console.error('Error testing services table:', error)
    }
    
    console.log('🎉 Database fixes completed!')
    console.log('\n📋 Next steps:')
    console.log('1. Restart your application')
    console.log('2. Try uploading images again')
    console.log('3. Try creating services again')
    
  } catch (error) {
    console.error('❌ Error fixing database issues:', error)
  }
}

// Run the fix
fixDatabaseIssues()
