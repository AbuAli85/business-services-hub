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

async function addStatusColumn() {
  try {
    console.log('🚀 Adding status column to bookings table...')
    
    // Read the simple SQL migration
    const fs = require('fs')
    const sql = fs.readFileSync('supabase/migrations/087_add_status_column_only.sql', 'utf8')
    
    console.log('📝 SQL to execute:')
    console.log(sql)
    console.log('')
    console.log('⚠️  Since automated execution is not working, please:')
    console.log('1. Go to your Supabase Dashboard')
    console.log('2. Navigate to SQL Editor')
    console.log('3. Copy and paste the SQL above')
    console.log('4. Run it')
    console.log('')
    console.log('This will add the missing status column and fix the error!')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

addStatusColumn()
