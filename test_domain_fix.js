// Test the domain fix
const fetch = require('node-fetch');

async function testDomainFix() {
  console.log('🧪 Testing Domain Fix...\n');

  try {
    const response = await fetch('https://marketing.thedigitalmorph.com/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: 'chairman@falconeyegroup.net',
        subject: 'Domain Fix Test - ' + new Date().toLocaleString(),
        html: '<p>Testing with Resend default domain...</p>',
        text: 'Testing with Resend default domain...',
        from: 'onboarding@resend.dev', // Updated domain
        replyTo: 'noreply@resend.dev', // Updated domain
        notificationId: 'test-' + Date.now(),
        notificationType: 'test',
        userId: 'test-user'
      }),
    });

    const data = await response.json();
    
    console.log('📊 Response Status:', response.status);
    console.log('📥 Response Body:', JSON.stringify(data, null, 2));

    if (data.success) {
      console.log('\n✅ SUCCESS! Domain fix is working!');
      console.log('📧 Message ID:', data.messageId);
    } else {
      console.log('\n❌ Still having issues:');
      console.log('Error:', data.error);
    }

  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

// Run the test
testDomainFix();
