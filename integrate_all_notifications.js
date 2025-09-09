// Script to integrate notifications into all API endpoints
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting comprehensive notification integration...\n');

// List of API files to update
const apiFiles = [
  'app/api/auth/profile-creation/route.ts',
  'app/api/services/route.ts',
  'app/api/services/[id]/route.ts',
  'app/api/bookings/route.ts',
  'app/api/payments/create-intent/route.ts',
  'app/api/invoices/generate-pdf/route.ts',
  'app/api/messages/route.ts',
  'app/api/reviews/route.ts',
  'app/api/secure-milestones/[id]/route.ts'
];

// Notification triggers to add
const notificationIntegrations = {
  'app/api/auth/profile-creation/route.ts': {
    imports: [
      "import { triggerUserRegistered, triggerProfileUpdated } from '@/lib/notification-triggers-comprehensive'"
    ],
    triggers: [
      {
        location: 'after profile creation',
        code: `
        // Send welcome notification
        try {
          await triggerUserRegistered(user.id, {
            email: user.email,
            full_name: profileData.full_name
          });
        } catch (error) {
          console.error('Failed to send welcome notification:', error);
        }`
      }
    ]
  },
  
  'app/api/services/route.ts': {
    imports: [
      "import { triggerServiceCreated, triggerServiceUpdated, triggerServiceDeactivated } from '@/lib/notification-triggers-comprehensive'"
    ],
    triggers: [
      {
        location: 'POST handler after service creation',
        code: `
        // Notify provider about service creation
        try {
          await triggerServiceCreated(service.id, {
            title: serviceData.title,
            provider_id: user.id,
            provider_name: userProfile.full_name
          });
        } catch (error) {
          console.error('Failed to send service creation notification:', error);
        }`
      },
      {
        location: 'PUT handler after service update',
        code: `
        // Notify provider about service update
        try {
          await triggerServiceUpdated(service.id, {
            title: serviceData.title,
            provider_id: user.id,
            changes: Object.keys(serviceData)
          });
        } catch (error) {
          console.error('Failed to send service update notification:', error);
        }`
      }
    ]
  },

  'app/api/bookings/route.ts': {
    imports: [
      "import { triggerBookingUpdated, triggerBookingCancelled, triggerBookingConfirmed, triggerBookingCompleted } from '@/lib/notification-triggers-comprehensive'"
    ],
    triggers: [
      {
        location: 'PUT handler for booking updates',
        code: `
        // Notify about booking updates
        try {
          await triggerBookingUpdated(bookingId, {
            client_id: booking.client_id,
            provider_id: booking.provider_id,
            service_name: service.title,
            changes: Object.keys(updateData),
            updated_by: user.id,
            updated_by_name: userProfile.full_name
          });
        } catch (error) {
          console.error('Failed to send booking update notification:', error);
        }`
      },
      {
        location: 'DELETE handler for booking cancellation',
        code: `
        // Notify about booking cancellation
        try {
          await triggerBookingCancelled(bookingId, {
            client_id: booking.client_id,
            provider_id: booking.provider_id,
            service_name: service.title,
            cancelled_by: user.id,
            cancelled_by_name: userProfile.full_name,
            reason: cancellationReason
          });
        } catch (error) {
          console.error('Failed to send booking cancellation notification:', error);
        }`
      }
    ]
  },

  'app/api/payments/create-intent/route.ts': {
    imports: [
      "import { triggerPaymentReceived, triggerPaymentFailed } from '@/lib/notification-triggers-comprehensive'"
    ],
    triggers: [
      {
        location: 'after successful payment',
        code: `
        // Notify about successful payment
        try {
          await triggerPaymentReceived(paymentIntent.id, {
            booking_id: bookingId,
            client_id: user.id,
            provider_id: booking.provider_id,
            amount: amount,
            currency: currency,
            payment_method: 'stripe',
            transaction_id: paymentIntent.id,
            service_name: service.title
          });
        } catch (error) {
          console.error('Failed to send payment notification:', error);
        }`
      },
      {
        location: 'on payment failure',
        code: `
        // Notify about payment failure
        try {
          await triggerPaymentFailed(paymentIntent.id, {
            booking_id: bookingId,
            client_id: user.id,
            provider_id: booking.provider_id,
            amount: amount,
            currency: currency,
            error_message: error.message,
            service_name: service.title
          });
        } catch (notificationError) {
          console.error('Failed to send payment failure notification:', notificationError);
        }`
      }
    ]
  },

  'app/api/messages/route.ts': {
    imports: [
      "import { triggerMessageReceived } from '@/lib/notification-triggers-comprehensive'"
    ],
    triggers: [
      {
        location: 'after message creation',
        code: `
        // Notify receiver about new message
        try {
          await triggerMessageReceived(message.id, {
            receiver_id: messageData.receiver_id,
            sender_id: user.id,
            sender_name: senderProfile.full_name,
            subject: messageData.subject,
            content: messageData.content,
            booking_id: messageData.booking_id
          });
        } catch (error) {
          console.error('Failed to send message notification:', error);
        }`
      }
    ]
  },

  'app/api/reviews/route.ts': {
    imports: [
      "import { triggerReviewReceived } from '@/lib/notification-triggers-comprehensive'"
    ],
    triggers: [
      {
        location: 'after review creation',
        code: `
        // Notify provider about new review
        try {
          await triggerReviewReceived(review.id, {
            provider_id: booking.provider_id,
            client_id: user.id,
            client_name: userProfile.full_name,
            rating: reviewData.rating,
            service_name: booking.service.title,
            booking_id: bookingId
          });
        } catch (error) {
          console.error('Failed to send review notification:', error);
        }`
      }
    ]
  }
};

// Function to update a file with notification integration
function updateFileWithNotifications(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return false;
  }

  const integration = notificationIntegrations[filePath];
  if (!integration) {
    console.log(`⚠️  No integration defined for: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let updated = false;

  // Add imports
  integration.imports.forEach(importStatement => {
    if (!content.includes(importStatement)) {
      // Find the last import statement and add after it
      const importRegex = /import\s+.*?from\s+['"][^'"]+['"];?\s*$/gm;
      const imports = content.match(importRegex);
      if (imports && imports.length > 0) {
        const lastImport = imports[imports.length - 1];
        const lastImportIndex = content.lastIndexOf(lastImport);
        const insertIndex = lastImportIndex + lastImport.length;
        content = content.slice(0, insertIndex) + '\n' + importStatement + content.slice(insertIndex);
        updated = true;
      }
    }
  });

  // Add triggers (this is a simplified approach - manual integration recommended)
  console.log(`📝 Integration plan for ${filePath}:`);
  integration.triggers.forEach((trigger, index) => {
    console.log(`   ${index + 1}. ${trigger.location}`);
    console.log(`      Code: ${trigger.code.trim()}`);
  });

  if (updated) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated: ${filePath}`);
    return true;
  }

  console.log(`ℹ️  No changes needed for: ${filePath}`);
  return false;
}

// Process all files
let updatedCount = 0;
apiFiles.forEach(filePath => {
  console.log(`\n🔍 Processing: ${filePath}`);
  if (updateFileWithNotifications(filePath)) {
    updatedCount++;
  }
});

console.log(`\n🎉 Integration complete!`);
console.log(`📊 Files processed: ${apiFiles.length}`);
console.log(`✅ Files updated: ${updatedCount}`);
console.log(`⚠️  Files need manual integration: ${apiFiles.length - updatedCount}`);

console.log(`\n📋 Next Steps:`);
console.log(`1. Review the integration plans above`);
console.log(`2. Manually add the notification triggers to each API endpoint`);
console.log(`3. Test each endpoint to ensure notifications work`);
console.log(`4. Deploy and monitor notification delivery`);

console.log(`\n🧪 Test your integrations with:`);
console.log(`   node test_all_notifications.js`);

// Create a test script
const testScript = `// Test all notification integrations
const { 
  triggerUserRegistered,
  triggerServiceCreated,
  triggerBookingCreated,
  triggerPaymentReceived,
  triggerMessageReceived,
  triggerReviewReceived
} = require('./lib/notification-triggers-comprehensive');

async function testAllNotifications() {
  console.log('🧪 Testing All Notification Integrations...\\n');

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

    console.log('\\n✅ All notification tests completed successfully!');
    console.log('📧 Check your email and notification center for test notifications');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAllNotifications();
`;

fs.writeFileSync('test_all_notifications.js', testScript);
console.log(`\n📄 Created test script: test_all_notifications.js`);
