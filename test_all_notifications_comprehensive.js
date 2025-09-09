// Comprehensive test for all notification integrations
const { 
  triggerUserRegistered,
  triggerServiceCreated,
  triggerBookingCreated,
  triggerPaymentReceived,
  triggerMessageReceived,
  triggerReviewReceived,
  triggerSystemAnnouncement
} = require('./lib/notification-triggers-comprehensive');

async function testAllNotifications() {
  console.log('🧪 Testing All Notification Integrations...\n');

  const testUserId = 'test-user-123';
  const testProviderId = 'test-provider-456';
  const testBookingId = 'test-booking-789';
  const testServiceId = 'test-service-101';

  try {
    console.log('1️⃣ Testing User Registration Notification...');
    await triggerUserRegistered(testUserId, {
      email: 'test@example.com',
      full_name: 'Test User'
    });
    console.log('   ✅ User registration notification sent');

    console.log('\n2️⃣ Testing Service Creation Notification...');
    await triggerServiceCreated(testServiceId, {
      title: 'Test Service',
      provider_id: testProviderId,
      provider_name: 'Test Provider'
    });
    console.log('   ✅ Service creation notification sent');

    console.log('\n3️⃣ Testing Booking Creation Notification...');
    await triggerBookingCreated(testBookingId, {
      client_id: testUserId,
      client_name: 'Test User',
      provider_id: testProviderId,
      provider_name: 'Test Provider',
      service_name: 'Test Service',
      booking_title: 'Test Booking',
      scheduled_date: '2024-01-15T10:00:00Z',
      total_amount: 100,
      currency: 'OMR'
    });
    console.log('   ✅ Booking creation notification sent (both client & provider)');

    console.log('\n4️⃣ Testing Payment Received Notification...');
    await triggerPaymentReceived('payment-123', {
      booking_id: testBookingId,
      client_id: testUserId,
      provider_id: testProviderId,
      amount: 100,
      currency: 'OMR',
      payment_method: 'stripe',
      transaction_id: 'txn_123',
      service_name: 'Test Service'
    });
    console.log('   ✅ Payment notification sent (both client & provider)');

    console.log('\n5️⃣ Testing Message Received Notification...');
    await triggerMessageReceived('message-123', {
      receiver_id: testUserId,
      sender_id: testProviderId,
      sender_name: 'Test Provider',
      subject: 'Test Message',
      content: 'This is a test message about your booking',
      booking_id: testBookingId
    });
    console.log('   ✅ Message notification sent');

    console.log('\n6️⃣ Testing Review Received Notification...');
    await triggerReviewReceived('review-123', {
      provider_id: testProviderId,
      client_id: testUserId,
      client_name: 'Test User',
      rating: 5,
      service_name: 'Test Service',
      booking_id: testBookingId
    });
    console.log('   ✅ Review notification sent');

    console.log('\n7️⃣ Testing System Announcement...');
    await triggerSystemAnnouncement(testUserId, {
      title: 'System Maintenance',
      message: 'Scheduled maintenance on Sunday 2AM-4AM',
      priority: 'high',
      action_url: '/dashboard/help',
      action_label: 'Learn More'
    });
    console.log('   ✅ System announcement sent');

    console.log('\n🎉 All notification tests completed successfully!');
    console.log('\n📧 Check your email and notification center for test notifications');
    console.log('\n📊 Expected notifications:');
    console.log('   • User registration welcome');
    console.log('   • Service creation confirmation');
    console.log('   • Booking creation (client & provider)');
    console.log('   • Payment received (client & provider)');
    console.log('   • Message received');
    console.log('   • Review received');
    console.log('   • System announcement');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', error.message);
  }
}

// Test individual notification types
async function testIndividualNotifications() {
  console.log('\n🔍 Testing Individual Notification Types...\n');

  const testData = {
    userId: 'test-user-123',
    providerId: 'test-provider-456',
    bookingId: 'test-booking-789',
    serviceId: 'test-service-101'
  };

  const tests = [
    {
      name: 'Task Created',
      fn: () => require('./lib/notification-triggers-comprehensive').triggerTaskCreated('task-123', {
        user_id: testData.userId,
        title: 'Test Task',
        description: 'Complete the test task',
        due_date: '2024-01-20',
        priority: 'high',
        assigned_by: testData.providerId,
        assigned_by_name: 'Test Provider'
      })
    },
    {
      name: 'Milestone Created',
      fn: () => require('./lib/notification-triggers-comprehensive').triggerMilestoneCreated('milestone-123', {
        user_id: testData.userId,
        title: 'Test Milestone',
        description: 'Complete the test milestone',
        due_date: '2024-01-18',
        booking_id: testData.bookingId,
        service_name: 'Test Service',
        created_by: testData.providerId,
        created_by_name: 'Test Provider'
      })
    },
    {
      name: 'Document Uploaded',
      fn: () => require('./lib/notification-triggers-comprehensive').triggerDocumentUploaded('document-123', {
        user_id: testData.userId,
        name: 'Test Document.pdf',
        type: 'pdf',
        size: 1024,
        booking_id: testData.bookingId,
        service_name: 'Test Service',
        uploaded_by: testData.providerId,
        uploaded_by_name: 'Test Provider'
      })
    },
    {
      name: 'Invoice Created',
      fn: () => require('./lib/notification-triggers-comprehensive').triggerInvoiceCreated('invoice-123', {
        booking_id: testData.bookingId,
        client_id: testData.userId,
        provider_id: testData.providerId,
        invoice_number: 'INV-123456',
        amount: 100,
        currency: 'OMR',
        due_date: '2024-01-25',
        service_name: 'Test Service'
      })
    }
  ];

  for (const test of tests) {
    try {
      console.log(`Testing ${test.name}...`);
      await test.fn();
      console.log(`   ✅ ${test.name} notification sent`);
    } catch (error) {
      console.log(`   ❌ ${test.name} failed:`, error.message);
    }
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Comprehensive Notification Testing...\n');
  
  await testAllNotifications();
  await testIndividualNotifications();
  
  console.log('\n🎯 Testing Complete!');
  console.log('\n📋 Next Steps:');
  console.log('1. Check your email inbox for test notifications');
  console.log('2. Check the notification center in your app');
  console.log('3. Verify all notifications are being sent automatically');
  console.log('4. Test with real user actions in your application');
}

runAllTests();
