// Test the production API directly to see what error we get
const https = require('https');

async function testProductionAPI() {
  console.log('🔍 Testing Production API...\n');

  const testData = {
    to: 'chairman@falconeyegroup.net',
    subject: `Production API Test - ${new Date().toLocaleString()}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Production API Test</h2>
        <p>This is a test to see what error the production API returns.</p>
        <p>Time: ${new Date().toISOString()}</p>
      </div>
    `,
    text: `Production API Test - ${new Date().toISOString()}`,
    from: 'notifications@thedigitalmorph.com',
    replyTo: 'noreply@thedigitalmorph.com',
    notificationId: 'prod-test-' + Date.now(),
    notificationType: 'test',
    userId: 'prod-test-user'
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
      'User-Agent': 'Production-Test/1.0'
    }
  };

  console.log('📤 Sending request to production API...');
  console.log('URL:', `https://${options.hostname}${options.path}`);
  console.log('Data:', testData);

  const req = https.request(options, (res) => {
    console.log('📊 Response Status:', res.statusCode);
    console.log('📋 Response Headers:', res.headers);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log('📥 Response Body:', data);
      
      try {
        const response = JSON.parse(data);
        
        if (res.statusCode === 200) {
          console.log('✅ SUCCESS: Email sent successfully!');
          console.log('📧 Message ID:', response.messageId);
        } else {
          console.log('❌ ERROR: API returned error');
          console.log('🔍 Error details:', response);
          
          // Analyze the error
          if (response.error && response.error.includes('RESEND_API_KEY')) {
            console.log('\n🔧 SOLUTION: RESEND_API_KEY is not set in production!');
            console.log('1. Go to https://resend.com/');
            console.log('2. Get your API key');
            console.log('3. Add RESEND_API_KEY to your production environment');
          } else if (response.error && response.error.includes('Invalid API key')) {
            console.log('\n🔧 SOLUTION: RESEND_API_KEY is invalid!');
            console.log('1. Check your API key is correct');
            console.log('2. Make sure it starts with "re_"');
          } else if (response.error && response.error.includes('Domain not verified')) {
            console.log('\n🔧 SOLUTION: Domain verification issue!');
            console.log('1. Check Resend dashboard for domain status');
            console.log('2. Update DNS records if needed');
          } else {
            console.log('\n🔧 SOLUTION: Check server logs for more details');
          }
        }
      } catch (e) {
        console.log('❌ ERROR: Invalid JSON response');
        console.log('📄 Raw response:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ REQUEST ERROR:', error);
  });

  req.write(postData);
  req.end();
}

// Run the test
testProductionAPI();
