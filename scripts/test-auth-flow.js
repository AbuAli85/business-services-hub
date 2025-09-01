/**
 * Test script to verify authentication flow
 * This script tests the complete authentication process
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testAuthFlow() {
  console.log('🧪 Testing Authentication Flow...')
  console.log('')

  try {
    // Test 1: Check current session
    console.log('1️⃣ Testing current session...')
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.log('❌ Session error:', sessionError.message)
    } else if (session) {
      console.log('✅ Session found')
      console.log('   User ID:', session.user.id)
      console.log('   Email:', session.user.email)
      console.log('   Access Token:', session.access_token ? 'Present' : 'Missing')
      console.log('   Token Preview:', session.access_token ? session.access_token.substring(0, 20) + '...' : 'N/A')
    } else {
      console.log('⚠️ No active session found')
    }
    
    console.log('')

    // Test 2: Check current user
    console.log('2️⃣ Testing current user...')
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.log('❌ User error:', userError.message)
    } else if (user) {
      console.log('✅ User found')
      console.log('   User ID:', user.id)
      console.log('   Email:', user.email)
      console.log('   Role:', user.user_metadata?.role || 'Not set')
    } else {
      console.log('⚠️ No user found')
    }
    
    console.log('')

    // Test 3: Test API endpoint with current session
    if (session?.access_token) {
      console.log('3️⃣ Testing API endpoint with session...')
      
      try {
        const response = await fetch('http://localhost:3001/api/bookings', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          console.log('✅ API endpoint working')
          console.log('   Response status:', response.status)
          console.log('   Bookings found:', data.bookings?.length || 0)
        } else {
          console.log('❌ API endpoint error:', response.status, response.statusText)
          const errorData = await response.text()
          console.log('   Error details:', errorData)
        }
      } catch (fetchError) {
        console.log('❌ API fetch error:', fetchError.message)
        console.log('   This might be because the dev server is not running')
      }
    } else {
      console.log('3️⃣ Skipping API test (no session token)')
    }
    
    console.log('')

    // Test 4: Check if user needs to sign in
    if (!session || !user) {
      console.log('4️⃣ Authentication Status:')
      console.log('   ❌ User needs to sign in')
      console.log('   💡 Go to: http://localhost:3001/auth/sign-in')
      console.log('   💡 Or create an account: http://localhost:3001/auth/sign-up')
    } else {
      console.log('4️⃣ Authentication Status:')
      console.log('   ✅ User is authenticated and ready to make bookings')
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Run the test
testAuthFlow()
