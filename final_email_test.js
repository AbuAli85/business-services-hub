// Final test to confirm the issue and provide solution
const https = require('https');

async function finalEmailTest() {
  console.log('🔍 Final Email System Test...\n');

  const testData = {
    to: 'chairman@falconeyegroup.net',
    subject: `Final Test - ${new Date().toLocaleString()}`,
    html: '<p>This is the final test to confirm the email system status.</p>',
    text: 'This is the final test to confirm the email system status.',
    from: 'notifications@thedigitalmorph.com',
    replyTo: 'noreply@thedigitalmorph.com',
    notificationId: 'final-test-' + Date.now(),
    notificationType: 'test',
    userId: 'final-test-user'
  };

  const postData = JSON.stringify(testData);

  const options = {
    hostname: 'marketing.thedigitalmorph.com',
    port: 443,
    path: '/api/send-email',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    }
  };

  console.log('📤 Testing production email API...');

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log('📊 Response Status:', res.statusCode);
      console.log('📥 Response Body:', data);
      
      if (res.statusCode === 200) {
        console.log('✅ SUCCESS: Email system is working!');
        console.log('📧 Check your inbox for the test email.');
      } else {
        console.log('❌ ERROR: Email system still not working');
        
        try {
          const response = JSON.parse(data);
          if (response.error && response.error.includes('RESEND_API_KEY')) {
            console.log('\n🔧 SOLUTION: RESEND_API_KEY is missing!');
            console.log('📋 Steps to fix:');
            console.log('1. Go to https://resend.com/');
            console.log('2. Login to your account');
            console.log('3. Go to API Keys section');
            console.log('4. Create a new API key (starts with re_)');
            console.log('5. Copy the key');
            console.log('6. Go to Vercel Dashboard');
            console.log('7. Select your project: business-services-hub');
            console.log('8. Go to Settings → Environment Variables');
            console.log('9. Add: RESEND_API_KEY = re_your_key_here');
            console.log('10. Save and redeploy');
          } else {
            console.log('\n🔧 SOLUTION: Check the error details above');
          }
        } catch (e) {
          console.log('\n🔧 SOLUTION: Check server logs for details');
        }
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Request failed:', error.message);
  });

  req.write(postData);
  req.end();
}

// Run the test
finalEmailTest();
