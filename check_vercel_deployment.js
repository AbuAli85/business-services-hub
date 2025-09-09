// Check if Vercel deployment has the environment variable
const https = require('https');

async function checkVercelDeployment() {
  console.log('🔍 Checking Vercel Deployment Status...\n');

  // Test the API with detailed error logging
  const testData = {
    to: 'chairman@falconeyegroup.net',
    subject: `Vercel Test - ${new Date().toLocaleString()}`,
    html: '<p>Testing if Vercel has the RESEND_API_KEY environment variable.</p>',
    text: 'Testing if Vercel has the RESEND_API_KEY environment variable.',
    from: 'notifications@thedigitalmorph.com',
    replyTo: 'noreply@thedigitalmorph.com',
    notificationId: 'vercel-test-' + Date.now(),
    notificationType: 'test',
    userId: 'vercel-test-user'
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

  console.log('📤 Testing API with detailed error response...');

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log('📊 Response Status:', res.statusCode);
      console.log('📋 Response Headers:', res.headers);
      console.log('📥 Response Body:', data);
      
      if (res.statusCode === 200) {
        console.log('✅ SUCCESS: Email system is working!');
        console.log('📧 Check your inbox for the test email.');
      } else {
        console.log('❌ ERROR: Still getting 500 error');
        
        try {
          const response = JSON.parse(data);
          console.log('🔍 Error Details:', response);
          
          if (response.error) {
            if (response.error.includes('RESEND_API_KEY')) {
              console.log('\n🔧 ISSUE: RESEND_API_KEY environment variable problem');
              console.log('📋 Possible causes:');
              console.log('1. Environment variable not deployed yet');
              console.log('2. Wrong variable name (should be exactly RESEND_API_KEY)');
              console.log('3. API key format issue (should start with re_)');
              console.log('4. Vercel needs to redeploy');
            } else {
              console.log('\n🔧 ISSUE: Other error -', response.error);
            }
          } else {
            console.log('\n🔧 ISSUE: Unknown error format');
          }
        } catch (e) {
          console.log('\n🔧 ISSUE: Cannot parse error response');
        }
        
        console.log('\n📋 Next Steps:');
        console.log('1. Check Vercel dashboard - is the deployment complete?');
        console.log('2. Verify environment variable name is exactly: RESEND_API_KEY');
        console.log('3. Verify API key starts with: re_');
        console.log('4. Try redeploying the project');
        console.log('5. Wait 2-3 minutes after redeploy');
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Request failed:', error.message);
  });

  req.write(postData);
  req.end();
}

// Run the check
checkVercelDeployment();
