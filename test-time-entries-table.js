// Test script to check if time_entries table exists and is accessible
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

async function testTimeEntriesTable() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Missing Supabase environment variables')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  
  try {
    console.log('🔍 Testing time_entries table access...')
    
    // Test 1: Check if table exists by trying to select from it
    const { data, error } = await supabase
      .from('time_entries')
      .select('id')
      .limit(1)
    
    if (error) {
      console.log('❌ Error accessing time_entries table:', error.message)
      console.log('   Error code:', error.code)
      console.log('   Error details:', error.details)
      console.log('   Error hint:', error.hint)
    } else {
      console.log('✅ time_entries table is accessible')
      console.log('   Sample data:', data)
    }
    
    // Test 2: Check table structure
    console.log('\n🔍 Checking table structure...')
    const { data: structure, error: structureError } = await supabase
      .from('time_entries')
      .select('*')
      .limit(0)
    
    if (structureError) {
      console.log('❌ Error checking table structure:', structureError.message)
    } else {
      console.log('✅ Table structure check passed')
    }
    
  } catch (err) {
    console.log('❌ Unexpected error:', err.message)
  }
}

testTimeEntriesTable()
