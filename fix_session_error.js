// Fix for "Could not fetch session" error
console.log('🔍 Session Error Troubleshooting...\n');

// Check if we're in a browser environment
if (typeof window !== 'undefined') {
  console.log('🌐 Browser Environment Detected');
  
  // Check for Supabase client
  if (window.supabase) {
    console.log('✅ Supabase client found');
  } else {
    console.log('❌ Supabase client not found');
  }
  
  // Check for authentication state
  if (localStorage.getItem('sb-access-token')) {
    console.log('✅ Access token found in localStorage');
  } else {
    console.log('❌ No access token in localStorage');
  }
  
  // Check for session cookies
  const cookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {});
  
  console.log('🍪 Available cookies:', Object.keys(cookies));
  
  // Check for Supabase auth cookies
  const supabaseCookies = Object.keys(cookies).filter(key => 
    key.includes('supabase') || key.includes('sb-')
  );
  
  if (supabaseCookies.length > 0) {
    console.log('✅ Supabase cookies found:', supabaseCookies);
  } else {
    console.log('❌ No Supabase cookies found');
  }
  
} else {
  console.log('🖥️ Server Environment Detected');
}

console.log('\n🔧 Common Solutions:');
console.log('1. Clear browser cache and cookies');
console.log('2. Sign out and sign back in');
console.log('3. Check if Supabase environment variables are set');
console.log('4. Verify Supabase project is active');
console.log('5. Check browser console for more detailed errors');

console.log('\n📋 Environment Variables to Check:');
console.log('NEXT_PUBLIC_SUPABASE_URL');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY');

console.log('\n🧪 Quick Test:');
console.log('1. Open browser console');
console.log('2. Run: localStorage.clear()');
console.log('3. Refresh the page');
console.log('4. Try signing in again');
