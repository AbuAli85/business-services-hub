// Debug Vercel environment variable issue
const https = require('https');

async function debugVercelEnvironment() {
  console.log('🔍 Debugging Vercel Environment Variable Issue...\n');

  // Test with a simple request to see what error we get
  const testData = {
    to: 'chairman@falconeyegroup.net',
    subject: `Debug Test - ${new Date().toLocaleString()}`,
    html: '<p>Debug test to check environment variables.</p>',
    text: 'Debug test to check environment variables.',
    from: 'notifications@thedigitalmorph.com',
    replyTo: 'noreply@thedigitalmorph.com',
    notificationId: 'debug-' + Date.now(),
    notificationType: 'test',
    userId: 'debug-user'
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

  console.log('📤 Testing API to get detailed error...');

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
      } else {
        console.log('❌ ERROR: Still getting 500 error');
        
        // The issue is that we're getting {"success":false} without error details
        // This suggests the environment variable check is failing silently
        console.log('\n🔍 ANALYSIS:');
        console.log('The API is returning {"success":false} without error details.');
        console.log('This typically means:');
        console.log('1. RESEND_API_KEY environment variable is not accessible');
        console.log('2. The environment variable name is wrong');
        console.log('3. The API key format is invalid');
        console.log('4. There\'s a caching issue');
        
        console.log('\n🔧 SOLUTIONS TO TRY:');
        console.log('1. Double-check the environment variable name is exactly: RESEND_API_KEY');
        console.log('2. Verify the API key starts with: re_');
        console.log('3. Make sure it\'s set for Production environment');
        console.log('4. Try redeploying the project');
        console.log('5. Wait 5-10 minutes for full propagation');
        
        console.log('\n📋 VERIFICATION STEPS:');
        console.log('1. Go to Vercel Dashboard → Settings → Environment Variables');
        console.log('2. Check if RESEND_API_KEY is listed');
        console.log('3. Verify the value starts with "re_"');
        console.log('4. Make sure "Production" is checked');
        console.log('5. If not, add it and redeploy');
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Request failed:', error.message);
  });

  req.write(postData);
  req.end();
}

// Run the debug
debugVercelEnvironment();
