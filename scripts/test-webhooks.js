#!/usr/bin/env node

/**
 * Test script for Make.com webhook endpoints
 * Run with: node scripts/test-webhooks.js
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const webhookTests = [
  {
    name: 'Test Webhook Endpoint Status',
    method: 'GET',
    url: `${BASE_URL}/api/webhooks`,
    expectedStatus: 200
  },
  {
    name: 'Test Booking Created Webhook',
    method: 'POST',
    url: `${BASE_URL}/api/webhooks`,
    data: {
      event: 'booking-created',
      webhook_id: 'test-123',
      data: {
        client_id: 'd2ce1fe9-806f-4dbc-8efb-9cf160f19e4b', // Use existing profile ID
        provider_id: 'd2ce1fe9-806f-4dbc-8efb-9cf160f19e4b', // Use existing profile ID
        service_id: '770e8400-e29b-41d4-a716-446655440000', // Use existing service ID
        resource_id: null, // No resource for now
        start_time: '2025-01-20T10:00:00Z',
        end_time: '2025-01-20T11:00:00Z',
        total_cost: 100.00
      }
    },
    expectedStatus: 200
  },
  {
    name: 'Test New Service Created Webhook',
    method: 'POST',
    url: `${BASE_URL}/api/webhooks`,
    data: {
      event: 'new-service-created',
      webhook_id: 'test-456',
      data: {
        service_id: '770e8400-e29b-41d4-a716-446655440000', // Use existing service ID
        provider_id: 'd2ce1fe9-806f-4dbc-8efb-9cf160f19e4b', // Use existing profile ID
        service_name: 'Test Service'
      }
    },
    expectedStatus: 200
  },
  {
    name: 'Test Payment Succeeded Webhook',
    method: 'POST',
    url: `${BASE_URL}/api/webhooks`,
    data: {
      event: 'payment-succeeded',
      webhook_id: 'test-789',
      data: {
        booking_id: '770e8400-e29b-41d4-a716-446655440000', // Use existing service ID as placeholder
        amount: 100.00,
        payment_method: 'credit_card'
      }
    },
    expectedStatus: 200
  },
  {
    name: 'Test Tracking Updated Webhook',
    method: 'POST',
    url: `${BASE_URL}/api/webhooks`,
    data: {
      event: 'tracking-updated',
      webhook_id: 'test-101',
      data: {
        booking_id: '770e8400-e29b-41d4-a716-446655440000', // Use existing service ID as placeholder
        status: 'in_progress',
        tracking_info: 'Service is now in progress'
      }
    },
    expectedStatus: 200
  },
  {
    name: 'Test Weekly Report Webhook',
    method: 'POST',
    url: `${BASE_URL}/api/webhooks`,
    data: {
      event: 'weekly-report',
      webhook_id: 'test-202',
      data: {}
    },
    expectedStatus: 200
  }
];

async function testWebhook(test) {
  try {
    console.log(`\n🧪 Testing: ${test.name}`);
    
    const options = {
      method: test.method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (test.data) {
      options.body = JSON.stringify(test.data);
    }

    const response = await fetch(test.url, options);
    const responseData = await response.json();

    if (response.status === test.expectedStatus) {
      console.log(`✅ PASS: ${test.name}`);
      console.log(`   Status: ${response.status}`);
      if (responseData.message) {
        console.log(`   Response: ${responseData.message}`);
      }
    } else {
      console.log(`❌ FAIL: ${test.name}`);
      console.log(`   Expected: ${test.expectedStatus}, Got: ${response.status}`);
      console.log(`   Response:`, responseData);
    }

    return response.status === test.expectedStatus;
  } catch (error) {
    console.log(`❌ ERROR: ${test.name}`);
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Make.com Webhook Tests...\n');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`⏰ Time: ${new Date().toISOString()}\n`);

  let passed = 0;
  let failed = 0;

  for (const test of webhookTests) {
    const result = await testWebhook(test);
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log('\n📊 Test Results Summary');
  console.log('========================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / webhookTests.length) * 100)}%`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! Your Make.com integration is ready.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests, webhookTests };
