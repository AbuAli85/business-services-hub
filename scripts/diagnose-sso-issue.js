/**
 * Comprehensive SSO Diagnostic Script
 * 
 * This script checks ALL possible storage locations and helps diagnose SSO issues.
 * Run this in the browser console on business-services-hub.
 * 
 * Usage:
 * 1. Open browser console (F12)
 * 2. Copy and paste this ENTIRE script
 * 3. Run: diagnoseSSO()
 */

function diagnoseSSO() {
  console.log('%c🔍 Comprehensive SSO Diagnostic', 'font-size: 20px; font-weight: bold; color: #3b82f6;');
  console.log('═'.repeat(70));
  
  const results = {
    localStorage: {},
    cookies: {},
    sessionStorage: {},
    supabaseClient: null,
    recommendations: []
  };
  
  // Check 1: All localStorage keys
  console.log('\n📦 Check 1: localStorage Analysis');
  console.log('─'.repeat(70));
  
  const allLocalStorageKeys = Object.keys(localStorage);
  const supabaseKeys = allLocalStorageKeys.filter(k => 
    k.includes('supabase') || 
    k.includes('sb-') || 
    k.toLowerCase().includes('auth') ||
    k.toLowerCase().includes('session')
  );
  
  console.log(`   Total localStorage keys: ${allLocalStorageKeys.length}`);
  console.log(`   Supabase/auth related keys: ${supabaseKeys.length}`);
  
  if (supabaseKeys.length > 0) {
    console.log('\n   Found keys:');
    supabaseKeys.forEach(key => {
      const value = localStorage.getItem(key);
      let parsed = null;
      let hasSession = false;
      
      try {
        parsed = JSON.parse(value || '{}');
        hasSession = !!(parsed.access_token || parsed.session || parsed.user);
      } catch (e) {
        // Not JSON
      }
      
      const info = {
        key,
        hasValue: !!value,
        isJSON: !!parsed,
        hasSession: hasSession,
        length: value?.length || 0
      };
      
      results.localStorage[key] = info;
      
      console.log(`   ${hasSession ? '✅' : '⚠️'} ${key}:`, {
        hasData: !!value,
        isJSON: !!parsed,
        hasSession: hasSession,
        preview: value ? value.substring(0, 50) + '...' : 'empty'
      });
    });
  } else {
    console.log('   ❌ No Supabase/auth keys found in localStorage');
    results.recommendations.push('No session found in localStorage. You may need to log in.');
  }
  
  // Check 2: Cookies
  console.log('\n🍪 Check 2: Cookie Analysis');
  console.log('─'.repeat(70));
  
  const cookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    if (key) acc[key] = value;
    return acc;
  }, {});
  
  const supabaseCookies = Object.keys(cookies).filter(k => 
    k.includes('supabase') || 
    k.includes('sb-') ||
    k.toLowerCase().includes('auth') ||
    k.toLowerCase().includes('session')
  );
  
  console.log(`   Total cookies: ${Object.keys(cookies).length}`);
  console.log(`   Supabase/auth related cookies: ${supabaseCookies.length}`);
  
  if (supabaseCookies.length > 0) {
    console.log('\n   Found cookies:');
    supabaseCookies.forEach(key => {
      const value = cookies[key];
      results.cookies[key] = {
        hasValue: !!value,
        length: value?.length || 0
      };
      console.log(`   ${value ? '✅' : '⚠️'} ${key}:`, value ? `${value.substring(0, 30)}...` : 'empty');
    });
  } else {
    console.log('   ⚠️ No Supabase/auth cookies found');
  }
  
  // Check 3: sessionStorage
  console.log('\n💾 Check 3: sessionStorage Analysis');
  console.log('─'.repeat(70));
  
  const allSessionStorageKeys = Object.keys(sessionStorage);
  const sessionStorageAuthKeys = allSessionStorageKeys.filter(k => 
    k.includes('supabase') || 
    k.includes('sb-') || 
    k.toLowerCase().includes('auth') ||
    k.toLowerCase().includes('session')
  );
  
  console.log(`   Total sessionStorage keys: ${allSessionStorageKeys.length}`);
  console.log(`   Supabase/auth related keys: ${sessionStorageAuthKeys.length}`);
  
  if (sessionStorageAuthKeys.length > 0) {
    sessionStorageAuthKeys.forEach(key => {
      const value = sessionStorage.getItem(key);
      results.sessionStorage[key] = {
        hasValue: !!value,
        length: value?.length || 0
      };
      console.log(`   ${value ? '✅' : '⚠️'} ${key}:`, value ? 'has data' : 'empty');
    });
  }
  
  // Check 4: Specific SSO key
  console.log('\n🎯 Check 4: SSO Storage Key (sb-auth-token)');
  console.log('─'.repeat(70));
  
  const ssoKey = 'sb-auth-token';
  const ssoValue = localStorage.getItem(ssoKey);
  
  if (ssoValue) {
    try {
      const parsed = JSON.parse(ssoValue);
      const hasAccessToken = !!parsed.access_token;
      const hasRefreshToken = !!parsed.refresh_token;
      const hasUser = !!parsed.user;
      const expiresAt = parsed.expires_at ? new Date(parsed.expires_at * 1000) : null;
      const isExpired = expiresAt && expiresAt < new Date();
      
      console.log('   ✅ SSO key found:', ssoKey);
      console.log('   📋 Session details:');
      console.log('      - Has access_token:', hasAccessToken);
      console.log('      - Has refresh_token:', hasRefreshToken);
      console.log('      - Has user:', hasUser);
      console.log('      - Expires at:', expiresAt ? expiresAt.toLocaleString() : 'N/A');
      console.log('      - Is expired:', isExpired ? '❌ YES' : '✅ NO');
      
      if (isExpired) {
        results.recommendations.push('Session is expired. Please log in again.');
      }
    } catch (e) {
      console.log('   ⚠️ SSO key exists but is not valid JSON:', e.message);
      results.recommendations.push('SSO key exists but is invalid. May need to clear and re-login.');
    }
  } else {
    console.log('   ❌ SSO key NOT found:', ssoKey);
    results.recommendations.push('SSO key (sb-auth-token) not found. You need to log in.');
  }
  
  // Check 5: Try to get session via Supabase client
  console.log('\n🔌 Check 5: Supabase Client Session');
  console.log('─'.repeat(70));
  console.log('   💡 To check session via Supabase client, run:');
  console.log('      checkSupabaseSession()');
  
  // Check 6: Domain/Origin check
  console.log('\n🌐 Check 6: Domain/Origin Check');
  console.log('─'.repeat(70));
  console.log('   Current origin:', window.location.origin);
  console.log('   Current hostname:', window.location.hostname);
  console.log('   Current port:', window.location.port || 'default');
  console.log('\n   ⚠️ Important: SSO only works if platforms are on:');
  console.log('      - Same domain (e.g., both on localhost or both on production)');
  console.log('      - OR using the same localStorage (same origin policy)');
  console.log('\n   💡 If platforms are on different ports/domains:');
  console.log('      - SSO via localStorage won\'t work across different origins');
  console.log('      - You may need to log in on each platform separately');
  console.log('      - Or use a shared domain/subdomain for all platforms');
  
  // Summary and Recommendations
  console.log('\n' + '═'.repeat(70));
  console.log('%c📊 Summary & Recommendations', 'font-size: 18px; font-weight: bold; color: #10b981;');
  console.log('═'.repeat(70));
  
  const hasSSOKey = !!ssoValue;
  const hasAnyStorage = supabaseKeys.length > 0 || supabaseCookies.length > 0;
  const hasSession = hasSSOKey && ssoValue && JSON.parse(ssoValue).access_token;
  
  console.log('\n✅ Status:');
  console.log(`   SSO key (sb-auth-token): ${hasSSOKey ? '✅ Found' : '❌ Missing'}`);
  console.log(`   Any Supabase storage: ${hasAnyStorage ? '✅ Found' : '❌ Missing'}`);
  console.log(`   Valid session: ${hasSession ? '✅ Yes' : '❌ No'}`);
  
  if (!hasSSOKey) {
    console.log('\n❌ Issue: No SSO session found');
    console.log('\n💡 Solution:');
    console.log('   1. Go to /auth/sign-in');
    console.log('   2. Log in with your credentials');
    console.log('   3. After login, run this script again');
    console.log('   4. You should see sb-auth-token with session data');
  } else if (!hasSession) {
    console.log('\n⚠️ Issue: SSO key exists but no valid session');
    console.log('\n💡 Solution:');
    console.log('   1. The session may be expired or invalid');
    console.log('   2. Try logging in again');
    console.log('   3. Clear localStorage if needed: localStorage.clear()');
  } else {
    console.log('\n✅ SSO session is configured correctly!');
    console.log('\n💡 Next steps:');
    console.log('   1. Check other platforms (BusinessHub, Contract-Management-System)');
    console.log('   2. They should also have sb-auth-token with the same session');
    console.log('   3. If not, verify they use storageKey: "sb-auth-token"');
  }
  
  if (results.recommendations.length > 0) {
    console.log('\n📋 Additional Recommendations:');
    results.recommendations.forEach((rec, i) => {
      console.log(`   ${i + 1}. ${rec}`);
    });
  }
  
  return results;
}

// Helper function to check Supabase client session
async function checkSupabaseSession() {
  console.log('\n🔌 Checking Supabase Client Session...');
  console.log('─'.repeat(70));
  
  try {
    // Try to dynamically import the client
    const module = await import('/utils/supabase/client.js');
    const supabase = module.createClient();
    
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.log('❌ Error getting session:', error.message);
      return { error: error.message };
    }
    
    if (data.session) {
      console.log('✅ Session found via Supabase client');
      console.log('   User ID:', data.session.user?.id);
      console.log('   Email:', data.session.user?.email);
      console.log('   Expires at:', data.session.expires_at ? new Date(data.session.expires_at * 1000).toLocaleString() : 'N/A');
      return { session: data.session };
    } else {
      console.log('❌ No session found via Supabase client');
      console.log('   You are not logged in');
      return { session: null };
    }
  } catch (error) {
    console.log('❌ Could not check Supabase session:', error.message);
    console.log('   This is normal if you\'re not using ES modules');
    return { error: error.message };
  }
}

// Make functions available globally
if (typeof window !== 'undefined') {
  window.diagnoseSSO = diagnoseSSO;
  window.checkSupabaseSession = checkSupabaseSession;
  console.log('SSO Diagnostic Script Loaded');
  console.log('Run: diagnoseSSO() or checkSupabaseSession()');
}

