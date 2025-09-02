const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testServiceSuggestionsAuth() {
  try {
    console.log('🧪 Testing Service Suggestions API Authentication...')
    
    // Try to make a request without authentication
    console.log('\n1. Testing without authentication...')
    const response = await fetch('http://localhost:3000/api/service-suggestions?status=&limit=50')
    const data = await response.json()
    
    if (response.status === 401) {
      console.log('✅ Correctly returned 401 without authentication')
    } else {
      console.log('❌ Expected 401 but got:', response.status)
    }
    
    console.log('Response:', data)
    
  } catch (error) {
    console.error('Test error:', error)
  }
}

testServiceSuggestionsAuth()
