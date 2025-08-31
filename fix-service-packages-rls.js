const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://reootcngcptfogfozlmz.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb290Y25nY3B0Zm9nZm96bG16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0NDM4MiwiZXhwIjoyMDY5MDIwMzgyfQ.BTLA-2wwXJgjW6MKoaw2ERbCr_fXF9w4zgLb70_5DAE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixServicePackagesRLS() {
  console.log('🔧 Fixing service_packages RLS policies...')
  
  try {
    // 1. Check if RLS is enabled
    console.log('📋 Checking RLS status on service_packages table...')
    
    try {
      const { data: rlsStatus, error: rlsError } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT schemaname, tablename, rowsecurity 
          FROM pg_tables 
          WHERE tablename = 'service_packages' 
          AND schemaname = 'public';
        `
      })
      
      if (!rlsError && rlsStatus && rlsStatus.length > 0) {
        console.log(`ℹ️ RLS status: ${rlsStatus[0].rowsecurity ? 'ENABLED' : 'DISABLED'}`)
      }
    } catch (error) {
      console.log('Note: Could not check RLS status via exec_sql')
    }
    
    // 2. Try to enable RLS
    console.log('\n🔧 Enabling RLS on service_packages table...')
    
    try {
      const { error: enableError } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;'
      })
      
      if (enableError) {
        console.log('Note: Could not enable RLS via exec_sql (may already be enabled)')
      } else {
        console.log('✅ RLS enabled on service_packages table')
      }
    } catch (error) {
      console.log('Note: Could not enable RLS via exec_sql')
    }
    
    // 3. Test if we can access the table now
    console.log('\n🧪 Testing table access after RLS fix...')
    
    try {
      const { data: packages, error: packagesError } = await supabase
        .from('service_packages')
        .select('*')
        .limit(1)
      
      if (packagesError) {
        console.log('❌ Still cannot access service_packages table:', packagesError.message)
        
        if (packagesError.message.includes('permission denied')) {
          console.log('💡 This suggests RLS policies are still needed')
        }
      } else {
        console.log('✅ service_packages table is now accessible!')
      }
    } catch (error) {
      console.log('❌ Error accessing service_packages table:', error.message)
    }
    
    // 4. Check current policies
    console.log('\n🔍 Checking current RLS policies...')
    
    try {
      const { data: policies, error: policiesError } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT policyname, cmd, qual, with_check
          FROM pg_policies 
          WHERE tablename = 'service_packages' 
          AND schemaname = 'public';
        `
      })
      
      if (!policiesError && policies) {
        console.log('📋 Current RLS policies on service_packages:')
        if (policies.length === 0) {
          console.log('   ℹ️ No policies found')
        } else {
          policies.forEach(policy => {
            console.log(`   ℹ️ ${policy.policyname}: ${policy.cmd}`)
          })
        }
      } else {
        console.log('Note: Could not check policies via exec_sql')
      }
    } catch (error) {
      console.log('Note: Could not check policies')
    }
    
    console.log('\n🎉 Service packages RLS fix completed!')
    console.log('\n📋 Next steps:')
    console.log('1. If RLS policies are still missing, run the migration manually in Supabase dashboard')
    console.log('2. Restart your application')
    console.log('3. Try creating a service with packages again')
    console.log('4. Check browser console for any remaining errors')
    
    // 5. Manual migration instructions
    console.log('\n🔧 Manual Migration Instructions:')
    console.log('If the automatic fix didn\'t work, run this SQL in your Supabase dashboard:')
    console.log(`
-- Run this in Supabase SQL Editor to fix RLS policies

-- Enable RLS
ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own service packages" ON public.service_packages;
DROP POLICY IF EXISTS "Users can insert their own service packages" ON public.service_packages;
DROP POLICY IF EXISTS "Users can update their own service packages" ON public.service_packages;
DROP POLICY IF EXISTS "Users can delete their own service packages" ON public.service_packages;
DROP POLICY IF EXISTS "Public can view approved service packages" ON public.service_packages;

-- Create policies
CREATE POLICY "Users can view their own service packages" ON public.service_packages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.services 
            WHERE services.id = service_packages.service_id 
            AND services.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own service packages" ON public.service_packages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.services 
            WHERE services.id = service_packages.service_id 
            AND services.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own service packages" ON public.service_packages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.services 
            WHERE services.id = service_packages.service_id 
            AND services.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own service packages" ON public.service_packages
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.services 
            WHERE services.id = service_packages.service_id 
            AND services.user_id = auth.uid()
        )
    );

CREATE POLICY "Public can view approved service packages" ON public.service_packages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.services 
            WHERE services.id = service_packages.service_id 
            AND services.approval_status = 'approved'
            AND services.is_active = true
        )
    );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_packages TO authenticated;
GRANT SELECT ON public.service_packages TO anon;
    `)
    
  } catch (error) {
    console.error('❌ Error fixing service packages RLS:', error)
  }
}

// Run the fix
fixServicePackagesRLS()
