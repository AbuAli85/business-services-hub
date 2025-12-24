/**
 * SSO Configuration Verification Script
 * 
 * This script helps verify that all platforms are configured correctly for Single Sign-On.
 * Run this in the browser console on each platform to check SSO configuration.
 * 
 * Usage:
 * 1. Open browser console (F12)
 * 2. Copy and paste this entire script
 * 3. Run: verifySSOConfig()
 */

function verifySSOConfig() {
  console.log('🔍 SSO Configuration Verification\n')
  console.log('=' .repeat(50))
  
  // Check 1: Storage Key
  console.log('\n📦 Check 1: Storage Key Configuration')
  const storageKey = 'sb-auth-token'
  const sessionData = localStorage.getItem(storageKey)
  
  if (sessionData) {
    try {
      const parsed = JSON.parse(sessionData)
      console.log('✅ Storage key found:', storageKey)
      console.log('   Session data exists:', !!parsed)
      console.log('   Has access token:', !!parsed.access_token)
      console.log('   Has refresh token:', !!parsed.refresh_token)
      console.log('   Expires at:', parsed.expires_at ? new Date(parsed.expires_at * 1000).toLocaleString() : 'N/A')
    } catch (e) {
      console.log('⚠️ Storage key found but data is invalid:', e.message)
    }
  } else {
    console.log('❌ Storage key NOT found:', storageKey)
    console.log('   This platform is NOT configured for SSO!')
    console.log('   Fix: Add storageKey: "sb-auth-token" to Supabase client config')
  }
  
  // Check 2: Supabase URL
  console.log('\n🌐 Check 2: Supabase Project Configuration')
  const supabaseUrl = process?.env?.NEXT_PUBLIC_SUPABASE_URL || window?.location?.origin
  console.log('   Current origin:', window.location.origin)
  console.log('   Expected Supabase project: reootcngcptfogfozlmz')
  
  // Check 3: All localStorage keys
  console.log('\n🔑 Check 3: All Supabase-related Storage Keys')
  const allKeys = Object.keys(localStorage)
  const supabaseKeys = allKeys.filter(key => key.includes('supabase') || key.includes('sb-'))
  console.log('   Found Supabase keys:', supabaseKeys)
  
  if (supabaseKeys.length === 0) {
    console.log('   ⚠️ No Supabase storage keys found')
  } else if (supabaseKeys.includes('sb-auth-token')) {
    console.log('   ✅ Correct storage key found: sb-auth-token')
  } else {
    console.log('   ❌ Wrong storage key! Should be: sb-auth-token')
    console.log('   Found:', supabaseKeys)
  }
  
  // Check 4: Session Test
  console.log('\n🧪 Check 4: Session Test')
  if (typeof window !== 'undefined' && window.fetch) {
    // Try to get session using the storage key
    console.log('   Testing session retrieval...')
    
    // This would require Supabase client, but we can check if the key exists
    if (sessionData) {
      console.log('   ✅ Session data is available in localStorage')
      console.log('   💡 To test full SSO:')
      console.log('      1. Login on BusinessHub')
      console.log('      2. Open this platform in another tab')
      console.log('      3. Run this script again')
      console.log('      4. If session data appears, SSO is working!')
    } else {
      console.log('   ❌ No session data found')
      console.log('   💡 Login on this platform first, then check again')
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('\n📊 Summary:')
  
  const hasStorageKey = !!sessionData
  const hasCorrectKey = supabaseKeys.includes('sb-auth-token')
  
  if (hasStorageKey && hasCorrectKey) {
    console.log('✅ SSO Configuration: CORRECT')
    console.log('   This platform should work with SSO')
  } else if (hasCorrectKey && !hasStorageKey) {
    console.log('⚠️ SSO Configuration: PARTIAL')
    console.log('   Storage key is configured, but no session found')
    console.log('   Try logging in first')
  } else {
    console.log('❌ SSO Configuration: INCORRECT')
    console.log('   This platform needs to be updated!')
    console.log('   Required: Add storageKey: "sb-auth-token" to Supabase client')
  }
  
  console.log('\n💡 Next Steps:')
  console.log('   1. Check other platforms using the same method')
  console.log('   2. All platforms should use storageKey: "sb-auth-token"')
  console.log('   3. All platforms should use the same Supabase project')
  console.log('   4. Login on one platform, then check others')
  
  return {
    hasStorageKey,
    hasCorrectKey,
    storageKeys: supabaseKeys,
    sessionData: sessionData ? 'exists' : 'missing'
  }
}

// Auto-run if in browser console
if (typeof window !== 'undefined') {
  console.log('SSO Verification Script Loaded')
  console.log('Run: verifySSOConfig()')
  
  // Make it available globally
  window.verifySSOConfig = verifySSOConfig
}

