// Test script for Supabase Edge Functions
// Run this with: node test-edge-functions.js

const SUPABASE_URL = 'https://reootcngcptfogfozlmz.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb290Y25nY3B0Zm9nZm96bG16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDQzODIsImV4cCI6MjA2OTAyMDM4Mn0.WQwDpYX2M4pyPaliUqTinwy1xWWFKm4OntN2HUfP6n0'

async function testFunction(functionName, action = '') {
  const url = `${SUPABASE_URL}/functions/v1/${functionName}`
  
  try {
    console.log(`\n🧪 Testing ${functionName}...`)
    console.log(`URL: ${url}`)
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY
      },
      body: JSON.stringify({ action })
    })
    
    console.log(`Status: ${response.status}`)
    console.log(`Status Text: ${response.statusText}`)
    
    if (response.ok) {
      const data = await response.json()
      console.log(`✅ Success:`, data)
    } else {
      const error = await response.text()
      console.log(`❌ Error:`, error)
    }
  } catch (error) {
    console.log(`💥 Exception:`, error.message)
  }
}

async function runTests() {
  console.log('🚀 Testing Supabase Edge Functions...\n')
  
  // Test each function
  await testFunction('auth-manager', 'profile')
  await testFunction('service-manager', 'services')
  await testFunction('booking-manager', 'bookings')
  await testFunction('communication-hub', 'messages')
  await testFunction('analytics-engine', 'dashboard')
  
  console.log('\n✨ Testing complete!')
}

// Run the tests
runTests().catch(console.error)
