/**
 * SSO Session Diagnostic Script
 * 
 * This script checks where the session is stored and helps diagnose SSO issues.
 * Run this in the browser console after logging in.
 * 
 * Usage:
 * 1. Open browser console (F12)
 * 2. Copy and paste this entire script
 * 3. Run: checkSSOSession()
 */

function checkSSOSession() {
  console.log('🔍 SSO Session Diagnostic\n')
  console.log('='.repeat(60))
  
  // Check 1: localStorage
  console.log('\n📦 Check 1: localStorage')
  const storageKey = 'sb-auth-token'
  const localStorageData = localStorage.getItem(storageKey)
  
  if (localStorageData) {
    try {
      const parsed = JSON.parse(localStorageData)
      console.log('✅ Found in localStorage:', storageKey)
      console.log('   Has access_token:', !!parsed.access_token)
      console.log('   Has refresh_token:', !!parsed.refresh_token)
      console.log('   Expires at:', parsed.expires_at ? new Date(parsed.expires_at * 1000).toLocaleString() : 'N/A')
    } catch (e) {
      console.log('⚠️ localStorage data is invalid JSON:', e.message)
    }
  } else {
    console.log('❌ NOT found in localStorage:', storageKey)
  }
  
  // Check 2: All localStorage keys (Supabase related)
  console.log('\n🔑 Check 2: All Supabase localStorage Keys')
  const allLocalStorageKeys = Object.keys(localStorage)
  const supabaseLocalStorageKeys = allLocalStorageKeys.filter(key => 
    key.includes('supabase') || 
    key.includes('sb-') || 
    key.startsWith('supabase')
  )
  
  if (supabaseLocalStorageKeys.length > 0) {
    console.log('   Found Supabase keys in localStorage:')
    supabaseLocalStorageKeys.forEach(key => {
      const value = localStorage.getItem(key)
      try {
        const parsed = JSON.parse(value || '{}')
        console.log(`   - ${key}:`, {
          hasAccessToken: !!parsed.access_token,
          hasRefreshToken: !!parsed.refresh_token,
          expiresAt: parsed.expires_at ? new Date(parsed.expires_at * 1000).toLocaleString() : 'N/A'
        })
      } catch {
        console.log(`   - ${key}:`, value ? 'has data' : 'empty')
      }
    })
  } else {
    console.log('   ⚠️ No Supabase keys found in localStorage')
  }
  
  // Check 3: Cookies (important for @supabase/ssr)
  console.log('\n🍪 Check 3: Cookies (for @supabase/ssr)')
  const cookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=')
    acc[key] = value
    return acc
  }, {})
  
  const supabaseCookies = Object.keys(cookies).filter(key => 
    key.includes('supabase') || 
    key.includes('sb-') ||
    key.startsWith('sb-')
  )
  
  if (supabaseCookies.length > 0) {
    console.log('   Found Supabase cookies:')
    supabaseCookies.forEach(key => {
      console.log(`   - ${key}:`, cookies[key] ? 'present' : 'missing')
    })
  } else {
    console.log('   ⚠️ No Supabase cookies found')
  }
  
  // Check 4: Session via Supabase client
  console.log('\n🧪 Check 4: Session via Supabase Client')
  console.log('   Attempting to get session...')
  
  // Try to dynamically import and check session
  if (typeof window !== 'undefined') {
    // Check if we can access the Supabase client
    console.log('   💡 To check session programmatically:')
    console.log('      1. Make sure you are logged in')
    console.log('      2. Run this in console:')
    console.log('         import("@/utils/supabase/client").then(m => {')
    console.log('           const supabase = m.createClient()')
    console.log('           supabase.auth.getSession().then(({data}) => {')
    console.log('             console.log("Session:", data.session)')
    console.log('           })')
    console.log('         })')
  }
  
  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('\n📊 Summary:')
  
  const hasLocalStorage = !!localStorageData
  const hasCookies = supabaseCookies.length > 0
  const hasAnyStorage = hasLocalStorage || hasCookies
  
  if (hasLocalStorage && localStorageData) {
    console.log('✅ localStorage: Session found with correct key (sb-auth-token)')
  } else if (hasCookies) {
    console.log('⚠️ localStorage: No session, but cookies found')
    console.log('   Note: @supabase/ssr may use cookies instead of localStorage')
  } else {
    console.log('❌ localStorage: No session found')
    console.log('   Possible reasons:')
    console.log('   1. Not logged in yet')
    console.log('   2. Session expired')
    console.log('   3. Storage key mismatch')
    console.log('   4. Browser blocking localStorage')
  }
  
  console.log('\n💡 Next Steps:')
  if (!hasAnyStorage) {
    console.log('   1. Try logging in on this platform')
    console.log('   2. After login, run this script again')
    console.log('   3. Check if session appears in localStorage or cookies')
  } else {
    console.log('   1. Check other platforms using the same method')
    console.log('   2. All platforms should see the same session')
    console.log('   3. If not, verify storageKey configuration')
  }
  
  return {
    hasLocalStorage: !!localStorageData,
    hasCookies: hasCookies,
    localStorageKeys: supabaseLocalStorageKeys,
    cookieKeys: supabaseCookies,
    storageKey: storageKey,
    localStorageData: localStorageData ? 'exists' : 'missing'
  }
}

// Also check if user is logged in
async function checkLoginStatus() {
  console.log('\n🔐 Checking Login Status...')
  
  try {
    // Try to use the Supabase client if available
    if (typeof window !== 'undefined') {
      // Check if we can access session
      const sessionCheck = localStorage.getItem('sb-auth-token')
      if (sessionCheck) {
        console.log('✅ Session data found in localStorage')
        return true
      }
      
      // Check cookies
      const cookies = document.cookie
      if (cookies.includes('sb-') || cookies.includes('supabase')) {
        console.log('✅ Supabase cookies found')
        return true
      }
      
      console.log('❌ No session found')
      return false
    }
  } catch (error) {
    console.error('Error checking login status:', error)
    return false
  }
}

// Make functions available globally
if (typeof window !== 'undefined') {
  window.checkSSOSession = checkSSOSession
  window.checkLoginStatus = checkLoginStatus
  console.log('SSO Diagnostic Script Loaded')
  console.log('Run: checkSSOSession() or checkLoginStatus()')
}

