const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://reootcngcptfogfozlmz.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb290Y25nY3B0Zm9nZm96bG16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0NDM4MiwiZXhwIjoyMDY5MDIwMzgyfQ.BTLA-2wwXJgjW6MKoaw2ERbCr_fXF9w4zgLb70_5DAE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixServicePackagesSchema() {
  console.log('🔧 Fixing service_packages table schema...')
  
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
    
    // 2. Try to add missing columns using direct SQL
    console.log('\n🔧 Adding missing columns to service_packages table...')
    
    const columnsToAdd = [
      {
        name: 'description',
        sql: `ALTER TABLE public.service_packages ADD COLUMN IF NOT EXISTS description TEXT;`
      },
      {
        name: 'delivery_days',
        sql: `ALTER TABLE public.service_packages ADD COLUMN IF NOT EXISTS delivery_days INTEGER DEFAULT 1;`
      },
      {
        name: 'revisions',
        sql: `ALTER TABLE public.service_packages ADD COLUMN IF NOT EXISTS revisions INTEGER DEFAULT 1;`
      },
      {
        name: 'features',
        sql: `ALTER TABLE public.service_packages ADD COLUMN IF NOT EXISTS features TEXT[];`
      }
    ]
    
    for (const column of columnsToAdd) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: column.sql })
        if (error) {
          console.log(`Note: Could not add ${column.name} column via exec_sql (may need manual setup)`)
        } else {
          console.log(`✅ Added ${column.name} column`)
        }
      } catch (e) {
        console.log(`Note: Could not add ${column.name} column via exec_sql (may need manual setup)`)
      }
    }
    
    // 3. Test the table structure by trying to insert a test record
    console.log('\n🧪 Testing table structure with test insert...')
    
    try {
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
        
        // If it's a column issue, let's try to identify which columns are missing
        if (insertError.message.includes('column')) {
          console.log('💡 This suggests missing columns. You may need to run the migration manually.')
        }
      } else {
        console.log('✅ Test insert successful - table structure is correct')
        
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
    
    // 4. Check if we can query the table with all expected columns
    console.log('\n🔍 Verifying table structure...')
    
    try {
      const { data: columns, error: columnsError } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = 'service_packages' 
          AND table_schema = 'public'
          ORDER BY ordinal_position;
        `
      })
      
      if (!columnsError && columns) {
        console.log('📋 Current service_packages table columns:')
        const expectedColumns = ['id', 'service_id', 'name', 'description', 'price', 'delivery_days', 'revisions', 'features', 'created_at']
        
        columns.forEach(col => {
          const isExpected = expectedColumns.includes(col.column_name)
          const status = isExpected ? '✅' : 'ℹ️'
          console.log(`   ${status} ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`)
        })
        
        const missingColumns = expectedColumns.filter(col => 
          !columns.find(c => c.column_name === col)
        )
        
        if (missingColumns.length > 0) {
          console.log(`⚠️ Missing expected columns: ${missingColumns.join(', ')}`)
        } else {
          console.log('✅ All expected columns are present')
        }
      } else {
        console.log('Note: Could not check table structure via exec_sql')
      }
    } catch (error) {
      console.log('Note: Could not check table structure')
    }
    
    console.log('\n🎉 Service packages schema fix completed!')
    console.log('\n📋 Next steps:')
    console.log('1. If columns are still missing, run the migration manually in Supabase dashboard')
    console.log('2. Restart your application')
    console.log('3. Try creating a service with packages again')
    console.log('4. Check browser console for any remaining errors')
    
    // 5. Manual migration instructions
    console.log('\n🔧 Manual Migration Instructions:')
    console.log('If the automatic fix didn\'t work, run this SQL in your Supabase dashboard:')
    console.log(`
-- Run this in Supabase SQL Editor
ALTER TABLE public.service_packages ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.service_packages ADD COLUMN IF NOT EXISTS delivery_days INTEGER DEFAULT 1;
ALTER TABLE public.service_packages ADD COLUMN IF NOT EXISTS revisions INTEGER DEFAULT 1;
ALTER TABLE public.service_packages ADD COLUMN IF NOT EXISTS features TEXT[];

-- Update existing records
UPDATE public.service_packages SET delivery_days = 1 WHERE delivery_days IS NULL;
UPDATE public.service_packages SET revisions = 1 WHERE revisions IS NULL;
UPDATE public.service_packages SET features = '{}' WHERE features IS NULL;
    `)
    
  } catch (error) {
    console.error('❌ Error fixing service packages schema:', error)
  }
}

// Run the fix
fixServicePackagesSchema()
