/**
 * SSO Configuration Test Script
 * 
 * This script tests if the SSO configuration is working correctly.
 * Run this BEFORE logging in to verify the setup.
 * 
 * Usage:
 * 1. Open browser console (F12)
 * 2. Copy and paste this ENTIRE script
 * 3. Run: testSSOConfig()
 */

async function testSSOConfig() {
  console.log('%c🧪 SSO Configuration Test', 'font-size: 18px; font-weight: bold; color: #8b5cf6;');
  console.log('═'.repeat(70));
  
  const results = {
    configCheck: false,
    clientCreation: false,
    storageKey: false,
    recommendations: []
  };
  
  // Test 1: Check if Supabase client can be created
  console.log('\n🔧 Test 1: Supabase Client Creation');
  console.log('─'.repeat(70));
  
  try {
    // Try to import and create the client
    const module = await import('/utils/supabase/client.js');
    const supabase = module.createClient();
    
    if (supabase) {
      console.log('   ✅ Supabase client created successfully');
      results.clientCreation = true;
      
      // Test 2: Check if we can get session (will be null if not logged in)
      console.log('\n🔐 Test 2: Session Check');
      console.log('─'.repeat(70));
      
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.log('   ⚠️ Error getting session:', error.message);
        results.recommendations.push('Error getting session: ' + error.message);
      } else if (data.session) {
        console.log('   ✅ Session found! You are logged in.');
        console.log('   User:', data.session.user?.email);
        console.log('   Expires:', data.session.expires_at ? new Date(data.session.expires_at * 1000).toLocaleString() : 'N/A');
        
        // Check if session is in localStorage with correct key
        const storedSession = localStorage.getItem('sb-auth-token');
        if (storedSession) {
          console.log('   ✅ Session is stored in sb-auth-token');
          results.storageKey = true;
        } else {
          console.log('   ⚠️ Session exists but NOT in sb-auth-token');
          console.log('   This might mean @supabase/ssr is using cookies instead');
          results.recommendations.push('Session exists but not in localStorage. Check cookies.');
        }
      } else {
        console.log('   ℹ️ No session found - you are not logged in');
        console.log('   This is normal if you haven\'t logged in yet');
        results.recommendations.push('Not logged in. Go to /auth/sign-in to log in.');
      }
    } else {
      console.log('   ❌ Failed to create Supabase client');
      results.recommendations.push('Failed to create Supabase client. Check configuration.');
    }
  } catch (error) {
    console.log('   ❌ Error creating client:', error.message);
    console.log('   This might be because:');
    console.log('   - Module path is incorrect');
    console.log('   - Environment variables are missing');
    console.log('   - Build/compilation issue');
    results.recommendations.push('Error creating client: ' + error.message);
  }
  
  // Test 3: Check localStorage configuration
  console.log('\n📦 Test 3: localStorage Configuration');
  console.log('─'.repeat(70));
  
  const ssoKey = 'sb-auth-token';
  const hasSSOKey = !!localStorage.getItem(ssoKey);
  
  console.log(`   Checking for key: ${ssoKey}`);
  console.log(`   Found: ${hasSSOKey ? '✅ Yes' : '❌ No'}`);
  
  if (hasSSOKey) {
    results.storageKey = true;
    try {
      const parsed = JSON.parse(localStorage.getItem(ssoKey));
      console.log('   ✅ Key contains valid JSON');
      console.log('   Has access_token:', !!parsed.access_token);
      console.log('   Has user:', !!parsed.user);
    } catch (e) {
      console.log('   ⚠️ Key exists but is not valid JSON');
    }
  } else {
    console.log('   ℹ️ Key not found (this is normal if not logged in)');
  }
  
  // Test 4: Check all Supabase-related storage
  console.log('\n🔍 Test 4: All Supabase Storage Keys');
  console.log('─'.repeat(70));
  
  const allKeys = Object.keys(localStorage);
  const supabaseKeys = allKeys.filter(k => 
    k.includes('supabase') || 
    k.includes('sb-') ||
    (k.toLowerCase().includes('auth') && k.toLowerCase().includes('token'))
  );
  
  console.log(`   Found ${supabaseKeys.length} Supabase-related keys:`);
  supabaseKeys.forEach(key => {
    const value = localStorage.getItem(key);
    console.log(`   - ${key}: ${value ? 'has data' : 'empty'}`);
  });
  
  // Test 5: Check cookies (important for @supabase/ssr)
  console.log('\n🍪 Test 5: Cookie Check (for @supabase/ssr)');
  console.log('─'.repeat(70));
  
  const cookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    if (key) acc[key] = value;
    return acc;
  }, {});
  
  const supabaseCookies = Object.keys(cookies).filter(k => 
    k.includes('supabase') || 
    k.includes('sb-') ||
    k.toLowerCase().includes('auth')
  );
  
  console.log(`   Found ${supabaseCookies.length} Supabase-related cookies:`);
  if (supabaseCookies.length > 0) {
    supabaseCookies.forEach(key => {
      console.log(`   - ${key}: present`);
    });
    console.log('   ⚠️ Note: @supabase/ssr may use cookies instead of localStorage');
    results.recommendations.push('Cookies found. @supabase/ssr might be using cookies for storage.');
  } else {
    console.log('   ℹ️ No Supabase cookies found');
  }
  
  // Summary
  console.log('\n' + '═'.repeat(70));
  console.log('%c📊 Test Summary', 'font-size: 18px; font-weight: bold; color: #10b981;');
  console.log('═'.repeat(70));
  
  console.log('\n✅ Results:');
  console.log(`   Client Creation: ${results.clientCreation ? '✅ Pass' : '❌ Fail'}`);
  console.log(`   Storage Key (sb-auth-token): ${results.storageKey ? '✅ Found' : '❌ Not Found'}`);
  console.log(`   Logged In: ${hasSSOKey ? '✅ Yes' : '❌ No'}`);
  
  if (!results.clientCreation) {
    console.log('\n❌ Issue: Cannot create Supabase client');
    console.log('   Check:');
    console.log('   - Environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)');
    console.log('   - Build/compilation errors');
    console.log('   - Module imports');
  } else if (!hasSSOKey) {
    console.log('\nℹ️ Status: Configuration looks correct, but you\'re not logged in');
    console.log('\n💡 Next Steps:');
    console.log('   1. Go to /auth/sign-in');
    console.log('   2. Log in with your credentials');
    console.log('   3. After login, run this test again');
    console.log('   4. You should see sb-auth-token with session data');
  } else {
    console.log('\n✅ Configuration is working correctly!');
    console.log('   Session is stored in sb-auth-token');
    console.log('   SSO should work across platforms (if same origin)');
  }
  
  if (results.recommendations.length > 0) {
    console.log('\n📋 Recommendations:');
    results.recommendations.forEach((rec, i) => {
      console.log(`   ${i + 1}. ${rec}`);
    });
  }
  
  return results;
}

// Make function available globally
if (typeof window !== 'undefined') {
  window.testSSOConfig = testSSOConfig;
  console.log('SSO Configuration Test Script Loaded');
  console.log('Run: testSSOConfig()');
}

