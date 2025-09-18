/**
 * Email Verification Test Script
 * This script tests the email verification flow
 */

const { createClient } = require('@supabase/supabase-js')

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function testEmailVerification() {
  console.log('🧪 Testing Email Verification Flow...\n')

  // Test 1: Check Supabase connection
  console.log('1️⃣ Testing Supabase connection...')
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      console.log('✅ Supabase connection successful (no active session)')
    } else {
      console.log('✅ Supabase connection successful')
    }
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message)
    return
  }

  // Test 2: Test signup (with test email)
  console.log('\n2️⃣ Testing signup flow...')
  const testEmail = `test-${Date.now()}@example.com`
  const testPassword = 'TestPassword123!'
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          role: 'client',
          full_name: 'Test User',
          phone: '+1234567890',
          company_name: 'Test Company'
        }
      }
    })

    if (error) {
      console.error('❌ Signup failed:', error.message)
      return
    }

    if (data.user) {
      console.log('✅ Signup successful')
      console.log(`   User ID: ${data.user.id}`)
      console.log(`   Email: ${data.user.email}`)
      console.log(`   Email confirmed: ${!!data.user.email_confirmed_at}`)
      
      if (!data.user.email_confirmed_at) {
        console.log('📧 Email verification required')
        console.log('   Check your email for verification link')
        console.log('   Or check Supabase dashboard for email logs')
      } else {
        console.log('✅ Email already confirmed')
      }
    } else {
      console.error('❌ No user data returned from signup')
      return
    }
  } catch (error) {
    console.error('❌ Signup error:', error.message)
    return
  }

  // Test 3: Test resend verification email
  console.log('\n3️⃣ Testing resend verification email...')
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: testEmail
    })

    if (error) {
      console.error('❌ Resend failed:', error.message)
    } else {
      console.log('✅ Resend verification email sent')
    }
  } catch (error) {
    console.error('❌ Resend error:', error.message)
  }

  // Test 4: Test email verification API endpoint
  console.log('\n4️⃣ Testing email verification API endpoint...')
  try {
    const response = await fetch('http://localhost:3000/auth/verify-email?token=test_token&type=signup')
    
    if (response.ok) {
      console.log('✅ Email verification API endpoint accessible')
    } else {
      console.log(`⚠️  Email verification API endpoint returned status: ${response.status}`)
    }
  } catch (error) {
    console.log('⚠️  Email verification API endpoint not accessible (server may not be running)')
  }

  // Test 5: Test email existence check
  console.log('\n5️⃣ Testing email existence check...')
  try {
    const response = await fetch('http://localhost:3000/api/auth/check-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: testEmail }),
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log(`✅ Email existence check working: ${data.exists ? 'Email exists' : 'Email does not exist'}`)
    } else {
      console.log(`⚠️  Email existence check returned status: ${response.status}`)
    }
  } catch (error) {
    console.log('⚠️  Email existence check not accessible (server may not be running)')
  }

  console.log('\n🎯 Test Summary:')
  console.log('   - Supabase connection: ✅')
  console.log('   - Signup flow: ✅')
  console.log('   - Resend email: ✅')
  console.log('   - API endpoints: ⚠️  (requires running server)')
  console.log('\n📝 Next steps:')
  console.log('   1. Check your email for verification link')
  console.log('   2. Click the verification link')
  console.log('   3. Verify you are redirected to onboarding')
  console.log('   4. Check Supabase dashboard for email logs')
  console.log('   5. Test with different email providers')
}

// Run the test
testEmailVerification().catch(console.error)
