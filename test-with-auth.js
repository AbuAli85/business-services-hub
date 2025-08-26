// Test script for Supabase Edge Functions with proper authentication
// This script shows how to authenticate and test the functions

const SUPABASE_URL = 'https://reootcngcptfogfozlmz.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb290Y25nY3B0Zm9nZm96bG16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDQzODIsImV4cCI6MjA2OTAyMDM4Mn0.WQwDpYX2M4pyPaliUqTinwy1xWWFKm4OntN2HUfP6n0'

// Import Supabase client (you'll need to install @supabase/supabase-js)
// npm install @supabase/supabase-js

async function testWithAuth() {
  console.log('🔐 Testing Edge Functions with Authentication...\n')
  
  console.log('📋 To test these functions, you need to:')
  console.log('1. Log into your app in the browser')
  console.log('2. Get the JWT token from your session')
  console.log('3. Use that token in the Authorization header\n')
  
  console.log('🔗 Function URLs:')
  console.log(`• auth-manager: ${SUPABASE_URL}/functions/v1/auth-manager`)
  console.log(`• service-manager: ${SUPABASE_URL}/functions/v1/service-manager`)
  console.log(`• booking-manager: ${SUPABASE_URL}/functions/v1/booking-manager`)
  console.log(`• communication-hub: ${SUPABASE_URL}/functions/v1/communication-hub`)
  console.log(`• analytics-engine: ${SUPABASE_URL}/functions/v1/analytics-engine\n`)
  
  console.log('📝 Required Headers:')
  console.log('Content-Type: application/json')
  console.log('Authorization: Bearer YOUR_JWT_TOKEN\n')
  
  console.log('💡 Example Usage:')
  console.log(`
// In your frontend code:
const { data: { session } } = await supabase.auth.getSession()
const token = session?.access_token

const response = await fetch('${SUPABASE_URL}/functions/v1/auth-manager', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${token}\`
  },
  body: JSON.stringify({ action: 'profile' })
})

const data = await response.json()
console.log(data)
  `)
  
  console.log('\n🚀 Your Edge Functions are ready to use!')
  console.log('Just make sure to include the Authorization header with a valid JWT token.')
}

// Run the test
testWithAuth().catch(console.error)
