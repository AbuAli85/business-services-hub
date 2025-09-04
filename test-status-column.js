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

async function testStatusColumn() {
  try {
    console.log('🧪 Testing status column functionality...')
    
    // Read the test SQL
    const fs = require('fs')
    const sql = fs.readFileSync('supabase/migrations/091_test_status_column.sql', 'utf8')
    
    console.log('📝 SQL to execute:')
    console.log(sql)
    console.log('')
    console.log('⚠️  Please run this in Supabase Dashboard > SQL Editor to test the status column!')
    console.log('')
    console.log('This will help us understand why the status column is not being recognized.')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

testStatusColumn()
