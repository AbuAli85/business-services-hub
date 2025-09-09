// Test Resend API credentials and configuration
const { Resend } = require('resend');

async function testResendCredentials() {
  console.log('🔍 Testing Resend API Configuration...\n');

  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? '✅ Set' : '❌ Not set');
  console.log('RESEND_API_KEY length:', process.env.RESEND_API_KEY?.length || 0);
  console.log('');

  if (!process.env.RESEND_API_KEY) {
    console.log('❌ RESEND_API_KEY not configured!');
    console.log('Please set the RESEND_API_KEY environment variable.');
    console.log('\nTo test locally, create a .env.local file with:');
    console.log('RESEND_API_KEY=re_your_api_key_here');
    return;
  }

  try {
    // Initialize Resend client
    const resend = new Resend(process.env.RESEND_API_KEY);

    console.log('🔗 Testing Resend connection...');

    // Test with a simple email
    const testEmail = {
      from: 'notifications@thedigitalmorph.com',
      to: 'chairman@falconeyegroup.net',
      subject: 'Resend Test - ' + new Date().toLocaleString(),
      html: '<p>This is a test email to verify Resend configuration.</p>',
      text: 'This is a test email to verify Resend configuration.',
      replyTo: 'noreply@thedigitalmorph.com',
    };

    console.log('📧 Sending test email...');
    const { data, error } = await resend.emails.send(testEmail);

    if (error) {
      console.log('❌ Resend Test Failed:');
      console.log('Error:', error);
      
      if (error.message.includes('Invalid API key')) {
        console.log('\n🔧 Solution: Check your RESEND_API_KEY is correct');
      } else if (error.message.includes('Domain not verified')) {
        console.log('\n🔧 Solution: Verify your domain in Resend or use their default domain');
      } else if (error.message.includes('Rate limit')) {
        console.log('\n🔧 Solution: Check your Resend plan limits');
      } else {
        console.log('\n🔧 Solution: Check Resend configuration and permissions');
      }
    } else {
      console.log('✅ SUCCESS! Resend API is working!');
      console.log('📧 Message ID:', data?.id);
      console.log('📊 Response:', data);
      console.log('\n🎉 Your email system should now work in production!');
    }

  } catch (error) {
    console.log('❌ Resend Test Failed:');
    console.log('Error:', error.message);
    console.log('\n🔧 Solution: Check your RESEND_API_KEY and Resend account');
  }
}

// Run the test
testResendCredentials();
