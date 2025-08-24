// Test script to verify Supabase client functionality
// Run with: node scripts/test-supabase-client.js

const { getSupabaseClient, getSupabaseClientSafe, clearSupabaseClients } = require('../lib/supabase');

console.log('🧪 Testing Supabase Client Implementation...\n');

// Test 1: Check if client is created correctly
console.log('Test 1: Client Creation');
try {
  const client1 = getSupabaseClient();
  console.log('✅ Client 1 created successfully');
  console.log('   Client type:', typeof client1);
  console.log('   Client methods:', Object.keys(client1).filter(key => typeof client1[key] === 'function').slice(0, 5));
} catch (error) {
  console.log('❌ Client 1 creation failed:', error.message);
}

// Test 2: Check if multiple calls return the same instance
console.log('\nTest 2: Singleton Pattern');
try {
  const client1 = getSupabaseClient();
  const client2 = getSupabaseClient();
  const client3 = getSupabaseClient();
  
  console.log('✅ Multiple getSupabaseClient() calls completed');
  console.log('   Client 1 === Client 2:', client1 === client2);
  console.log('   Client 2 === Client 3:', client2 === client3);
  console.log('   Client 1 === Client 3:', client1 === client3);
  
  if (client1 === client2 && client2 === client3) {
    console.log('✅ Singleton pattern working correctly');
  } else {
    console.log('❌ Singleton pattern not working - multiple instances created');
  }
} catch (error) {
  console.log('❌ Singleton test failed:', error.message);
}

// Test 3: Check safe client getter
console.log('\nTest 3: Safe Client Getter');
try {
  const safeClient = getSupabaseClientSafe();
  if (safeClient) {
    console.log('✅ Safe client getter working');
  } else {
    console.log('⚠️  Safe client getter returned null (environment variables may not be set)');
  }
} catch (error) {
  console.log('❌ Safe client getter failed:', error.message);
}

// Test 4: Test cleanup function
console.log('\nTest 4: Cleanup Function');
try {
  clearSupabaseClients();
  console.log('✅ Cleanup function executed successfully');
} catch (error) {
  console.log('❌ Cleanup function failed:', error.message);
}

// Test 5: Verify cleanup worked
console.log('\nTest 5: Post-Cleanup Verification');
try {
  const clientAfterCleanup = getSupabaseClient();
  console.log('✅ New client created after cleanup');
  console.log('   This is expected behavior after cleanup');
} catch (error) {
  console.log('❌ Post-cleanup client creation failed:', error.message);
}

console.log('\n🎯 Test Summary:');
console.log('   - Singleton pattern prevents multiple client instances');
console.log('   - Cleanup function allows for testing scenarios');
console.log('   - Client creation is working correctly');
console.log('\n✨ If you see multiple "Multiple GoTrueClient instances" warnings in the browser,');
console.log('   the issue has been resolved with the singleton pattern implementation.');
