/**
 * Test script to verify bookings API authentication
 * This script tests the /api/bookings endpoint to ensure authentication works
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

async function testBookingsAPI() {
  console.log('🧪 Testing Bookings API Authentication...')
  console.log('')

  try {
    // Test 1: Check if we can get a user session
    console.log('1️⃣ Testing user authentication...')
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.log('⚠️ No authenticated user found (this is expected if not logged in)')
      console.log('   Error:', userError.message)
    } else if (user) {
      console.log('✅ User authenticated:', user.email)
      console.log('   User ID:', user.id)
      console.log('   Role:', user.user_metadata?.role || 'Not set')
    } else {
      console.log('⚠️ No user session found')
    }
    
    console.log('')

    // Test 2: Try to fetch bookings directly from database
    console.log('2️⃣ Testing direct database access...')
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, status, created_at, client_id, provider_id')
      .limit(5)
    
    if (bookingsError) {
      console.log('❌ Database access error:', bookingsError.message)
    } else {
      console.log('✅ Database access successful')
      console.log('   Found', bookings?.length || 0, 'bookings')
      if (bookings && bookings.length > 0) {
        console.log('   Sample booking:', {
          id: bookings[0].id,
          status: bookings[0].status,
          created_at: bookings[0].created_at
        })
      }
    }
    
    console.log('')

    // Test 3: Test API endpoint (if user is authenticated)
    if (user) {
      console.log('3️⃣ Testing API endpoint...')
      
      // Get the session token
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.access_token) {
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
        console.log('⚠️ No session token available for API testing')
      }
    } else {
      console.log('3️⃣ Skipping API test (no authenticated user)')
    }
    
    console.log('')

    // Test 4: Check profiles table
    console.log('4️⃣ Testing profiles table access...')
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .limit(5)
    
    if (profilesError) {
      console.log('❌ Profiles access error:', profilesError.message)
    } else {
      console.log('✅ Profiles access successful')
      console.log('   Found', profiles?.length || 0, 'profiles')
      if (profiles && profiles.length > 0) {
        console.log('   Sample profile:', {
          id: profiles[0].id,
          name: profiles[0].full_name,
          email: profiles[0].email,
          role: profiles[0].role
        })
      }
    }

    console.log('')
    console.log('🎯 Summary:')
    console.log('   - User authentication:', user ? '✅ Working' : '⚠️ No user')
    console.log('   - Database access:', bookingsError ? '❌ Failed' : '✅ Working')
    console.log('   - Profiles access:', profilesError ? '❌ Failed' : '✅ Working')
    
    if (user) {
      console.log('')
      console.log('💡 To test the API endpoint:')
      console.log('   1. Make sure the dev server is running: npm run dev')
      console.log('   2. The API should be accessible at: http://localhost:3001/api/bookings')
      console.log('   3. Authentication should work with the current user session')
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Run the test
testBookingsAPI()
