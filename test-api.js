// Simple test script to verify the API is working
// Run this with: node test-api.js

const testTaskId = 'c08ba7e3-3518-4e9f-8802-8193c558856d';

async function testAPI() {
  try {
    console.log('Testing API endpoint...');
    
    // Test GET first (should work without auth for some endpoints)
    console.log('\n1. Testing GET /api/tasks...');
    const getResponse = await fetch(`http://localhost:3002/api/tasks?taskId=${testTaskId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    console.log('GET Response status:', getResponse.status);
    const getData = await getResponse.text();
    console.log('GET Response body (first 200 chars):', getData.substring(0, 200));
    
    // Test PATCH (should require auth)
    console.log('\n2. Testing PATCH /api/tasks...');
    const patchResponse = await fetch(`http://localhost:3002/api/tasks?id=${testTaskId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'in_progress'
      })
    });

    console.log('PATCH Response status:', patchResponse.status);
    const patchData = await patchResponse.text();
    console.log('PATCH Response body (first 200 chars):', patchData.substring(0, 200));
    
    // Check if it's HTML (redirect to sign-in)
    if (patchData.includes('<!DOCTYPE html>')) {
      console.log('\n❌ API is redirecting to sign-in page - authentication required');
      console.log('This is expected behavior. The API requires authentication.');
    } else if (patchResponse.status === 401) {
      console.log('\n✅ API is working correctly - returning 401 Unauthorized as expected');
    } else {
      console.log('\n✅ API response:', patchData);
    }
    
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testAPI();
