// Comprehensive email troubleshooting script
const { Resend } = require('resend');

async function troubleshootEmailFailure() {
  console.log('🔍 Comprehensive Email Troubleshooting...\n');

  // Check environment variables
  console.log('📋 Environment Check:');
  console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? '✅ Set' : '❌ Not set');
  console.log('RESEND_API_KEY length:', process.env.RESEND_API_KEY?.length || 0);
  console.log('');

  if (!process.env.RESEND_API_KEY) {
    console.log('❌ RESEND_API_KEY not found!');
    console.log('Please set RESEND_API_KEY in your environment variables.');
    return;
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Test 1: Basic API connection
    console.log('🧪 Test 1: Basic API Connection');
    try {
      // Try to send a simple test email
      const { data, error } = await resend.emails.send({
        from: 'notifications@thedigitalmorph.com',
        to: 'chairman@falconeyegroup.net',
        subject: 'Troubleshooting Test - ' + new Date().toLocaleString(),
        html: '<p>This is a troubleshooting test email.</p>',
        text: 'This is a troubleshooting test email.',
      });

      if (error) {
        console.log('❌ Test 1 Failed:');
        console.log('Error:', error);
        
        // Analyze the error
        if (error.message.includes('Invalid API key')) {
          console.log('\n🔧 Solution: Check your RESEND_API_KEY is correct');
        } else if (error.message.includes('Domain not verified')) {
          console.log('\n🔧 Solution: Verify your domain in Resend dashboard');
        } else if (error.message.includes('SPF')) {
          console.log('\n🔧 Solution: Update SPF record to include:resend.com');
        } else if (error.message.includes('rate limit')) {
          console.log('\n🔧 Solution: Check your Resend plan limits');
        } else {
          console.log('\n🔧 Solution: Check Resend configuration');
        }
      } else {
        console.log('✅ Test 1 Passed: API connection working');
        console.log('Message ID:', data?.id);
      }
    } catch (apiError) {
      console.log('❌ Test 1 Failed: API Error');
      console.log('Error:', apiError.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 2: Check domain verification
    console.log('🧪 Test 2: Domain Verification Check');
    console.log('Please verify in Resend dashboard:');
    console.log('1. Go to https://resend.com/domains');
    console.log('2. Check if marketing.thedigitalmorph.com is verified');
    console.log('3. Look for any red X marks or warnings');
    console.log('4. Check if SPF record shows include:resend.com');

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 3: DNS Record Check
    console.log('🧪 Test 3: DNS Record Requirements');
    console.log('Required DNS records for marketing.thedigitalmorph.com:');
    console.log('');
    console.log('SPF Record (TXT):');
    console.log('Name: send.marketing');
    console.log('Value: v=spf1 include:resend.com ~all');
    console.log('');
    console.log('DKIM Record (TXT):');
    console.log('Name: resend._domainkey.marketing');
    console.log('Value: (provided by Resend dashboard)');
    console.log('');
    console.log('Current Issue: SPF record likely still points to amazonses.com');

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 4: Alternative email addresses
    console.log('🧪 Test 4: Alternative Email Test');
    console.log('Trying with Resend\'s default domain...');
    
    try {
      const { data: altData, error: altError } = await resend.emails.send({
        from: 'onboarding@resend.dev', // Use Resend's default domain
        to: 'chairman@falconeyegroup.net',
        subject: 'Alternative Domain Test - ' + new Date().toLocaleString(),
        html: '<p>This is a test using Resend\'s default domain.</p>',
        text: 'This is a test using Resend\'s default domain.',
      });

      if (altError) {
        console.log('❌ Alternative domain test failed:', altError);
      } else {
        console.log('✅ Alternative domain test passed!');
        console.log('Message ID:', altData?.id);
        console.log('\n💡 This means Resend API is working, but your domain needs DNS fixes.');
      }
    } catch (altApiError) {
      console.log('❌ Alternative domain test failed:', altApiError.message);
    }

  } catch (error) {
    console.log('❌ Troubleshooting failed:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');
  console.log('📋 Next Steps:');
  console.log('1. Update SPF record to include:resend.com');
  console.log('2. Wait 5-10 minutes for DNS propagation');
  console.log('3. Test again using the test email page');
  console.log('4. Check Resend dashboard for domain verification status');
}

// Run the troubleshooting
troubleshootEmailFailure();
