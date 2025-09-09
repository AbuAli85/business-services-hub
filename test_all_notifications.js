// Test all notification integrations
const { 
  triggerUserRegistered,
  triggerServiceCreated,
  triggerBookingCreated,
  triggerPaymentReceived,
  triggerMessageReceived,
  triggerReviewReceived
} = require('./lib/notification-triggers-comprehensive');

async function testAllNotifications() {
  console.log('🧪 Testing All Notification Integrations...\n');

  const testUserId = 'test-user-123';
  const testProviderId = 'test-provider-456';
  const testBookingId = 'test-booking-789';

  try {
    // Test user registration
    console.log('1. Testing user registration notification...');
    await triggerUserRegistered(testUserId, {
      email: 'test@example.com',
      full_name: 'Test User'
    });

    // Test service creation
    console.log('2. Testing service creation notification...');
    await triggerServiceCreated('service-123', {
      title: 'Test Service',
      provider_id: testProviderId,
      provider_name: 'Test Provider'
    });

    // Test booking creation
    console.log('3. Testing booking creation notification...');
    await triggerBookingCreated(testBookingId, {
      client_id: testUserId,
      client_name: 'Test User',
      provider_id: testProviderId,
      provider_name: 'Test Provider',
      service_name: 'Test Service',
      booking_title: 'Test Booking',
      scheduled_date: '2024-01-15',
      total_amount: 100,
      currency: 'OMR'
    });

    // Test payment received
    console.log('4. Testing payment notification...');
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

    // Test message received
    console.log('5. Testing message notification...');
    await triggerMessageReceived('message-123', {
      receiver_id: testUserId,
      sender_id: testProviderId,
      sender_name: 'Test Provider',
      subject: 'Test Message',
      content: 'This is a test message',
      booking_id: testBookingId
    });

    // Test review received
    console.log('6. Testing review notification...');
    await triggerReviewReceived('review-123', {
      provider_id: testProviderId,
      client_id: testUserId,
      client_name: 'Test User',
      rating: 5,
      service_name: 'Test Service',
      booking_id: testBookingId
    });

    console.log('\n✅ All notification tests completed successfully!');
    console.log('📧 Check your email and notification center for test notifications');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAllNotifications();
