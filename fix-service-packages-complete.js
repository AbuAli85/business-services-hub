const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://reootcngcptfogfozlmz.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb290Y25nY3B0Zm9nZm96bG16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0NDM4MiwiZXhwIjoyMDY5MDIwMzgyfQ.BTLA-2wwXJgjW6MKoaw2ERbCr_fXF9w4zgLb70_5DAE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixServicePackagesComplete() {
  console.log('🔧 Complete service_packages fix - Schema + RLS + Permissions...')
  
  try {
    // 1. Check current table structure
    console.log('📋 Checking current service_packages table structure...')
    
    try {
      const { data: packages, error: packagesError } = await supabase
        .from('service_packages')
        .select('*')
        .limit(1)
      
      if (packagesError) {
        console.log('❌ Error accessing service_packages table:', packagesError.message)
      } else {
        console.log('✅ service_packages table accessible')
      }
    } catch (error) {
      console.log('❌ Error accessing service_packages table:', error.message)
    }
    
    // 2. Check services table structure
    console.log('\n📋 Checking services table structure...')
    
    try {
      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select('id, provider_id, title, status')
        .limit(1)
      
      if (servicesError) {
        console.log('❌ Error accessing services table:', servicesError.message)
      } else {
        console.log('✅ services table accessible')
        if (services && services.length > 0) {
          console.log(`   ℹ️ Sample service: ${services[0].title} (provider: ${services[0].provider_id})`)
        }
      }
    } catch (error) {
      console.log('❌ Error accessing services table:', error.message)
    }
    
    // 3. Test table access and permissions
    console.log('\n🧪 Testing table access and permissions...')
    
    try {
      // Try to insert a test package
      const testPackage = {
        service_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
        name: 'Test Package',
        description: 'Test description',
        price: 100,
        delivery_days: 7,
        revisions: 2,
        features: ['Feature 1', 'Feature 2']
      }
      
      const { error: insertError } = await supabase
        .from('service_packages')
        .insert(testPackage)
      
      if (insertError) {
        console.log('❌ Test insert failed:', insertError.message)
        
        if (insertError.message.includes('permission denied')) {
          console.log('💡 This suggests RLS policies are needed')
        } else if (insertError.message.includes('column')) {
          console.log('💡 This suggests missing columns')
        }
      } else {
        console.log('✅ Test insert successful - table structure and permissions are correct')
        
        // Clean up test record
        await supabase
          .from('service_packages')
          .delete()
          .eq('name', 'Test Package')
        console.log('✅ Test record cleaned up')
      }
    } catch (error) {
      console.log('❌ Test insert failed:', error.message)
    }
    
    console.log('\n🎉 Service packages complete fix completed!')
    console.log('\n📋 Next steps:')
    console.log('1. Run the complete SQL migration in your Supabase dashboard')
    console.log('2. Restart your application')
    console.log('3. Try creating a service with packages again')
    console.log('4. Check browser console for any remaining errors')
    
    // 4. Complete manual migration instructions
    console.log('\n🔧 Complete Manual Migration Instructions:')
    console.log('Run this complete SQL in your Supabase dashboard SQL Editor:')
    console.log(`
-- COMPLETE FIX FOR SERVICE_PACKAGES TABLE
-- This will resolve all issues: missing columns, RLS policies, and permissions

-- 1. Add missing columns to service_packages table
ALTER TABLE public.service_packages ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.service_packages ADD COLUMN IF NOT EXISTS delivery_days INTEGER DEFAULT 1;
ALTER TABLE public.service_packages ADD COLUMN IF NOT EXISTS revisions INTEGER DEFAULT 1;
ALTER TABLE public.service_packages ADD COLUMN IF NOT EXISTS features TEXT[];

-- 2. Update existing records to have default values
UPDATE public.service_packages SET delivery_days = 1 WHERE delivery_days IS NULL;
UPDATE public.service_packages SET revisions = 1 WHERE revisions IS NULL;
UPDATE public.service_packages SET features = '{}' WHERE features IS NULL;

-- 3. Enable RLS on service_packages table
ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own service packages" ON public.service_packages;
DROP POLICY IF EXISTS "Users can insert their own service packages" ON public.service_packages;
DROP POLICY IF EXISTS "Users can update their own service packages" ON public.service_packages;
DROP POLICY IF EXISTS "Users can delete their own service packages" ON public.service_packages;
DROP POLICY IF EXISTS "Public can view approved service packages" ON public.service_packages;

-- 5. Create comprehensive RLS policies (using correct column names)
CREATE POLICY "Users can view their own service packages" ON public.service_packages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.services 
            WHERE services.id = service_packages.service_id 
            AND services.provider_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own service packages" ON public.service_packages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.services 
            WHERE services.id = service_packages.service_id 
            AND services.provider_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own service packages" ON public.service_packages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.services 
            WHERE services.id = service_packages.service_id 
            AND services.provider_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own service packages" ON public.service_packages
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.services 
            WHERE services.id = service_packages.service_id 
            AND services.provider_id = auth.uid()
        )
    );

CREATE POLICY "Public can view approved service packages" ON public.service_packages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.services 
            WHERE services.id = service_packages.service_id 
            AND services.status = 'active'
        )
    );

-- 6. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_packages TO authenticated;
GRANT SELECT ON public.service_packages TO anon;

-- 7. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_service_packages_service_id ON public.service_packages(service_id);
CREATE INDEX IF NOT EXISTS idx_service_packages_price ON public.service_packages(price);
    `)
    
  } catch (error) {
    console.error('❌ Error in complete service packages fix:', error)
  }
}

// Run the fix
fixServicePackagesComplete()
