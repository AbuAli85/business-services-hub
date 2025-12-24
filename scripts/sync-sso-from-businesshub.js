/**
 * SSO Session Sync Script
 * 
 * This script helps sync your session from BusinessHub to business-services-hub.
 * 
 * IMPORTANT: This only works if both platforms are on the same domain/origin.
 * If they're on different ports (e.g., localhost:3000 vs localhost:3001),
 * localStorage is separate and SSO won't work automatically.
 * 
 * Usage:
 * 1. Make sure you're logged in on BusinessHub (in another tab)
 * 2. Open business-services-hub in this tab
 * 3. Run this script in the console
 * 4. Or run: syncSSOFromBusinessHub()
 */

async function syncSSOFromBusinessHub() {
  console.log('%c🔄 SSO Session Sync from BusinessHub', 'font-size: 18px; font-weight: bold; color: #3b82f6;');
  console.log('═'.repeat(70));
  
  // Step 1: Check current platform
  console.log('\n📍 Step 1: Current Platform Check');
  console.log('─'.repeat(70));
  console.log('   Current origin:', window.location.origin);
  console.log('   Current hostname:', window.location.hostname);
  console.log('   Current port:', window.location.port || 'default');
  
  // Step 2: Check if session exists here
  console.log('\n🔍 Step 2: Checking Current Session');
  console.log('─'.repeat(70));
  
  const currentSession = localStorage.getItem('sb-auth-token');
  if (currentSession) {
    try {
      const parsed = JSON.parse(currentSession);
      if (parsed.access_token) {
        console.log('   ✅ You already have a session on this platform!');
        console.log('   User:', parsed.user?.email || 'N/A');
        console.log('   Expires:', parsed.expires_at ? new Date(parsed.expires_at * 1000).toLocaleString() : 'N/A');
        return {
          success: true,
          message: 'Session already exists',
          session: parsed
        };
      }
    } catch (e) {
      console.log('   ⚠️ Session exists but is invalid');
    }
  } else {
    console.log('   ❌ No session found on this platform');
  }
  
  // Step 3: Check all localStorage keys for any Supabase session
  console.log('\n🔑 Step 3: Searching for Supabase Sessions');
  console.log('─'.repeat(70));
  
  const allKeys = Object.keys(localStorage);
  const supabaseKeys = allKeys.filter(k => 
    k.includes('supabase') || 
    k.includes('sb-') ||
    (k.toLowerCase().includes('auth') && k.toLowerCase().includes('token'))
  );
  
  console.log(`   Found ${supabaseKeys.length} potential session keys:`);
  
  let foundSession = null;
  let foundSessionKey = null;
  
  for (const key of supabaseKeys) {
    const value = localStorage.getItem(key);
    if (!value) continue;
    
    try {
      const parsed = JSON.parse(value);
      // Check if it looks like a valid Supabase session
      if (parsed.access_token || (parsed.user && parsed.expires_at)) {
        console.log(`   ✅ Found valid session in: ${key}`);
        console.log(`      User: ${parsed.user?.email || 'N/A'}`);
        console.log(`      Has access_token: ${!!parsed.access_token}`);
        
        if (!foundSession || key === 'sb-auth-token') {
          foundSession = parsed;
          foundSessionKey = key;
        }
      }
    } catch (e) {
      // Not JSON, skip
    }
  }
  
  // Step 4: Sync to sb-auth-token if found
  if (foundSession && foundSessionKey) {
    console.log('\n🔄 Step 4: Syncing Session to sb-auth-token');
    console.log('─'.repeat(70));
    
    if (foundSessionKey === 'sb-auth-token') {
      console.log('   ✅ Session is already in sb-auth-token');
      return {
        success: true,
        message: 'Session already in correct location',
        session: foundSession
      };
    }
    
    // Copy to sb-auth-token
    try {
      localStorage.setItem('sb-auth-token', JSON.stringify(foundSession));
      console.log(`   ✅ Copied session from ${foundSessionKey} to sb-auth-token`);
      
      // Verify
      const verify = localStorage.getItem('sb-auth-token');
      if (verify) {
        console.log('   ✅ Verification: sb-auth-token is now set');
        console.log('\n🎉 Success! Session synced for SSO.');
        console.log('   - Refresh the page');
        console.log('   - You should now be logged in');
        
        return {
          success: true,
          message: 'Session synced successfully',
          session: foundSession
        };
      }
    } catch (e) {
      console.error('   ❌ Failed to sync session:', e);
      return {
        success: false,
        error: e.message
      };
    }
  } else {
    console.log('\n❌ Step 4: No Session Found');
    console.log('─'.repeat(70));
    console.log('   No valid Supabase session found in localStorage');
    console.log('\n💡 Solution:');
    console.log('   1. Make sure you are logged in on BusinessHub');
    console.log('   2. If BusinessHub is on a different port/domain, SSO via localStorage won\'t work');
    console.log('   3. You need to log in on this platform separately');
    console.log('   4. Go to /auth/sign-in and log in');
    console.log('\n⚠️ Important:');
    console.log('   - localStorage is separate for each origin (protocol + domain + port)');
    console.log('   - localhost:3000 and localhost:3001 have separate localStorage');
    console.log('   - For SSO to work, platforms must be on the same origin');
    console.log('   - OR use cookies with proper domain configuration');
    
    return {
      success: false,
      message: 'No session found. Please log in.',
      recommendation: 'Log in on this platform at /auth/sign-in'
    };
  }
}

// Helper: Check if logged in via Supabase client
async function checkLoginStatus() {
  console.log('\n🔐 Checking Login Status via Supabase Client...');
  console.log('─'.repeat(70));
  
  try {
    // Try to use the Supabase client from the app
    // This is a simplified check - the actual client might be in a different location
    const response = await fetch('/api/auth/check-email', {
      method: 'GET',
      credentials: 'include'
    });
    
    if (response.ok) {
      console.log('   ✅ You appear to be logged in (API check passed)');
      return { loggedIn: true };
    } else if (response.status === 401) {
      console.log('   ❌ Not logged in (401 Unauthorized)');
      return { loggedIn: false };
    } else {
      console.log('   ⚠️ Could not determine login status');
      return { loggedIn: null };
    }
  } catch (error) {
    console.log('   ⚠️ Could not check login status:', error.message);
    return { loggedIn: null, error: error.message };
  }
}

// Helper: Force login redirect
function redirectToLogin() {
  const currentPath = window.location.pathname;
  const loginUrl = `/auth/sign-in?redirect=${encodeURIComponent(currentPath)}`;
  console.log('   Redirecting to:', loginUrl);
  window.location.href = loginUrl;
}

// Make functions available globally
if (typeof window !== 'undefined') {
  window.syncSSOFromBusinessHub = syncSSOFromBusinessHub;
  window.checkLoginStatus = checkLoginStatus;
  window.redirectToLogin = redirectToLogin;
  console.log('SSO Sync Script Loaded');
  console.log('Run: syncSSOFromBusinessHub() or checkLoginStatus()');
}

