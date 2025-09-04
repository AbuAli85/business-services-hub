const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixStatusOrder() {
  try {
    console.log('🚀 Fixing status column order...')
    
    // Read the simple SQL migration
    const fs = require('fs')
    const sql = fs.readFileSync('supabase/migrations/090_fix_status_column_order.sql', 'utf8')
    
    console.log('📝 SQL to execute:')
    console.log(sql)
    console.log('')
    console.log('⚠️  Since automated execution is not working, please:')
    console.log('1. Go to your Supabase Dashboard')
    console.log('2. Navigate to SQL Editor')
    console.log('3. Copy and paste the SQL above')
    console.log('4. Run it')
    console.log('')
    console.log('This will add the status column FIRST, then you can run the Phase 3 migration!')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

fixStatusOrder()
