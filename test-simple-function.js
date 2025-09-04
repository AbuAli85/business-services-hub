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

async function testSimpleFunction() {
  try {
    console.log('🧪 Testing simple function with status column...')
    
    // Read the test SQL
    const fs = require('fs')
    const sql = fs.readFileSync('supabase/migrations/092_test_simple_function.sql', 'utf8')
    
    console.log('📝 SQL to execute:')
    console.log(sql)
    console.log('')
    console.log('⚠️  Please run this in Supabase Dashboard > SQL Editor to test function creation!')
    console.log('')
    console.log('This will help us understand if the issue is with function creation or something else.')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

testSimpleFunction()
