// Test script to verify API fix
// Run with: node test-api-fix.js

const API_BASE = 'https://marketing.thedigitalmorph.com/api/tasks';
const TEST_TASK_ID = 'c08ba7e3-3518-4e9f-8802-8193c558856d';

async function testAPI() {
  console.log('🧪 Testing API fixes...\n');

  // Test 1: Missing ID
  console.log('1️⃣ Testing missing ID...');
  try {
    const response = await fetch(`${API_BASE}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'in_progress' })
    });
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Response:`, JSON.stringify(data, null, 2));
  } catch (error) {
    console.log(`   Error:`, error.message);
  }

  console.log('\n2️⃣ Testing invalid JSON...');
  try {
    const response = await fetch(`${API_BASE}?id=${TEST_TASK_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json'
    });
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Response:`, JSON.stringify(data, null, 2));
  } catch (error) {
    console.log(`   Error:`, error.message);
  }

  console.log('\n3️⃣ Testing invalid transition (pending → completed)...');
  try {
    const response = await fetch(`${API_BASE}?id=${TEST_TASK_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' })
    });
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Response:`, JSON.stringify(data, null, 2));
  } catch (error) {
    console.log(`   Error:`, error.message);
  }

  console.log('\n4️⃣ Testing valid transition (pending → in_progress)...');
  try {
    const response = await fetch(`${API_BASE}?id=${TEST_TASK_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'in_progress' })
    });
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Response:`, JSON.stringify(data, null, 2));
  } catch (error) {
    console.log(`   Error:`, error.message);
  }

  console.log('\n✅ API test completed!');
}

testAPI().catch(console.error);
