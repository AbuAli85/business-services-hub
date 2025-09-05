const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkServicesTable() {
  console.log('🔍 CHECKING SERVICES TABLE STRUCTURE\n')
  console.log('=' * 50)

  try {
    // Check if services table exists and its structure
    console.log('\n📋 1. CHECKING SERVICES TABLE')
    console.log('-'.repeat(30))
    
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .limit(1)

    if (servicesError) {
      console.error('❌ Error accessing services table:', servicesError.message)
      
      // Check if it's a column issue
      if (servicesError.message.includes('column') && servicesError.message.includes('does not exist')) {
        console.log('\n🔧 DIAGNOSIS: Column issue detected')
        console.log('The services table exists but has different column names')
        
        // Try to get table structure
        console.log('\n📊 2. CHECKING TABLE STRUCTURE')
        console.log('-'.repeat(30))
        
        try {
          const { data: structure, error: structureError } = await supabase
            .rpc('exec_sql', { 
              sql: `
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'services' 
                ORDER BY ordinal_position
              ` 
            })
          
          if (structureError) {
            console.log('⚠️ Could not get table structure via RPC')
            console.log('Manual step: Check the services table structure in Supabase dashboard')
          } else {
            console.log('✅ Current services table structure:')
            structure?.forEach(col => {
              console.log(`   - ${col.column_name}: ${col.data_type}`)
            })
          }
        } catch (rpcError) {
          console.log('⚠️ RPC not available, manual check required')
        }
      }
    } else {
      console.log('✅ Services table exists and is accessible')
      console.log(`📊 Found ${services?.length || 0} services`)
      if (services && services.length > 0) {
        console.log('📝 Sample service:')
        console.log(JSON.stringify(services[0], null, 2))
      }
    }

    // Check if there's an existing services table with different structure
    console.log('\n🔍 3. CHECKING FOR EXISTING SERVICES TABLE')
    console.log('-'.repeat(30))
    
    try {
      const { data: existingServices, error: existingError } = await supabase
        .from('services')
        .select('id, title, description')
        .limit(1)
      
      if (existingError) {
        console.log('❌ Error with existing structure:', existingError.message)
      } else {
        console.log('✅ Existing services table uses different column names')
        console.log('📝 Sample existing service:')
        console.log(JSON.stringify(existingServices?.[0], null, 2))
      }
    } catch (e) {
      console.log('⚠️ Could not check existing structure')
    }

    console.log('\n' + '='.repeat(50))
    console.log('🎯 DIAGNOSIS COMPLETE')
    console.log('='.repeat(50))
    
    console.log('\n🔧 RECOMMENDED FIX:')
    console.log('1. Check if there\'s an existing services table with different column names')
    console.log('2. If it exists, either:')
    console.log('   a) Drop and recreate with correct structure')
    console.log('   b) Alter the existing table to match the new structure')
    console.log('   c) Use different table name (e.g., service_types)')
    console.log('3. Or check the Supabase dashboard for the current table structure')

  } catch (error) {
    console.error('❌ Check failed:', error.message)
  }
}

checkServicesTable()
