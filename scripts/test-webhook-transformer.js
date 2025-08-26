#!/usr/bin/env node

/**
 * Test script for Webhook Transformer Edge Function
 * Run with: node scripts/test-webhook-transformer.js
 */

const BASE_URL = process.env.SUPABASE_FUNCTION_URL || 'https://reootcngcptfogfozlmz.supabase.co/functions/v1/webhook-transformer';

const testCases = [
  {
    name: 'Test Service Creation Webhook',
    data: {
      table: 'services',
      type: 'INSERT',
      record: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        provider_id: '987fcdeb-51a2-43d1-9f12-345678901234',
        title: 'Test Service',
        description: 'A test service for webhook testing',
        category: 'Web Development',
        base_price: 100.00,
        currency: 'OMR',
        status: 'draft',
        approval_status: 'pending'
      }
    },
    expectedEvent: 'new-service-created'
  },
  {
    name: 'Test Booking Creation Webhook',
    data: {
      table: 'bookings',
      type: 'INSERT',
      record: {
        id: '456e7890-e89b-12d3-a456-426614174001',
        client_id: '111fcdeb-51a2-43d1-9f12-345678901234',
        provider_id: '222fcdeb-51a2-43d1-9f12-345678901234',
        service_id: '333fcdeb-51a2-43d1-9f12-345678901234',
        status: 'draft',
        subtotal: 150.00,
        currency: 'OMR'
      }
    },
    expectedEvent: 'booking-created'
  },
  {
    name: 'Test Profile Creation Webhook',
    data: {
      table: 'profiles',
      type: 'INSERT',
      record: {
        id: '789e0123-e89b-12d3-a456-426614174002',
        full_name: 'John Doe',
        role: 'provider',
        phone: '+96812345678',
        is_verified: false
      }
    },
    expectedEvent: 'user-registered'
  },
  {
    name: 'Test Invalid UUID (should fail)',
    data: {
      table: 'services',
      type: 'INSERT',
      record: {
        id: 'create', // Invalid UUID - should cause error
        provider_id: '987fcdeb-51a2-43d1-9f12-345678901234',
        title: 'Invalid Service'
      }
    },
    shouldFail: true,
    expectedError: 'Invalid service_id'
  }
];

async function testWebhookTransformer(testCase) {
  console.log(`\n🧪 Testing: ${testCase.name}`);
  console.log('─'.repeat(50));

  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Webhook-Transformer-Test/1.0'
      },
      body: JSON.stringify(testCase.data)
    });

    const result = await response.text();
    let jsonResult;

    try {
      jsonResult = JSON.parse(result);
    } catch (e) {
      console.log('📄 Raw response:', result);
      return;
    }

    if (testCase.shouldFail) {
      if (response.ok) {
        console.log('❌ Test failed: Expected error but got success');
        console.log('Response:', jsonResult);
      } else {
        console.log('✅ Test passed: Correctly returned error');
        if (jsonResult.message && jsonResult.message.includes(testCase.expectedError)) {
          console.log('✅ Error message matches expected:', testCase.expectedError);
        } else {
          console.log('⚠️  Error message different than expected');
          console.log('Expected:', testCase.expectedError);
          console.log('Got:', jsonResult.message);
        }
      }
    } else {
      if (response.ok) {
        console.log('✅ Test passed: Successfully processed webhook');
        console.log('📊 Event:', jsonResult.transformed_payload?.event);
        console.log('📊 Webhook ID:', jsonResult.transformed_payload?.webhook_id);
        
        if (jsonResult.transformed_payload?.event === testCase.expectedEvent) {
          console.log('✅ Event type matches expected:', testCase.expectedEvent);
        } else {
          console.log('⚠️  Event type mismatch');
          console.log('Expected:', testCase.expectedEvent);
          console.log('Got:', jsonResult.transformed_payload?.event);
        }

        // Validate UUIDs
        const data = jsonResult.transformed_payload?.data;
        if (data) {
          const uuidFields = Object.keys(data).filter(key => key.includes('_id') || key.includes('id'));
          uuidFields.forEach(field => {
            const value = data[field];
            const isValid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(value);
            if (isValid) {
              console.log(`✅ ${field}: Valid UUID`);
            } else {
              console.log(`❌ ${field}: Invalid UUID - ${value}`);
            }
          });
        }
      } else {
        console.log('❌ Test failed: Unexpected error');
        console.log('Status:', response.status);
        console.log('Response:', jsonResult);
      }
    }

  } catch (error) {
    console.log('❌ Test failed with exception:', error.message);
  }
}

async function runAllTests() {
  console.log('🚀 Webhook Transformer Edge Function Test Suite');
  console.log('='.repeat(60));
  console.log(`🔗 Testing URL: ${BASE_URL}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);

  for (const testCase of testCases) {
    await testWebhookTransformer(testCase);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🏁 Test suite completed');
  console.log(`⏰ Finished at: ${new Date().toISOString()}`);
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { testWebhookTransformer, runAllTests };
