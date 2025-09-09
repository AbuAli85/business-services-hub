// Test Resend with default domain
const { Resend } = require('resend');

async function testResendDefaultDomain() {
  console.log('🧪 Testing Resend with Default Domain...\n');

  // Check if we have the API key
  if (!process.env.RESEND_API_KEY) {
    console.log('❌ RESEND_API_KEY not found in environment');
    console.log('Please set RESEND_API_KEY in your .env.local file');
    return;
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    console.log('📧 Testing with Resend default domain...');

    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev', // Resend's default domain
      to: 'chairman@falconeyegroup.net',
      subject: 'Resend Default Domain Test - ' + new Date().toLocaleString(),
      html: '<p>This is a test using Resend\'s default domain.</p>',
      text: 'This is a test using Resend\'s default domain.',
      replyTo: 'noreply@resend.dev',
    });

    if (error) {
      console.log('❌ Test failed:', error);
    } else {
      console.log('✅ SUCCESS! Email sent with default domain!');
      console.log('📧 Message ID:', data?.id);
      console.log('📊 Response:', data);
      console.log('\n🎉 This confirms the fix will work in production!');
    }

  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

// Run the test
testResendDefaultDomain();
