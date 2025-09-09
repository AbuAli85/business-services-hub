// Debug script to test email API and identify 500 error cause
const https = require('https');

const testEmailAPI = async () => {
  const testData = {
    to: 'operations@falconeyegroup.net',
    subject: `Debug Test - ${new Date().toLocaleString()}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Debug Test Email</h2>
        <p>This is a test email to debug the 500 error.</p>
        <p>Time: ${new Date().toISOString()}</p>
        <p>If you receive this, the API is working correctly.</p>
      </div>
    `,
    text: `Debug Test Email - ${new Date().toISOString()}`,
    from: 'onboarding@resend.dev',
    replyTo: 'noreply@resend.dev',
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
      'User-Agent': 'Debug-Script/1.0'
    }
  };

  console.log('🔍 Testing email API...');
  console.log('📤 Sending request to:', `https://${options.hostname}${options.path}`);
  console.log('📋 Request data:', testData);

  const req = https.request(options, (res) => {
    console.log('📊 Response status:', res.statusCode);
    console.log('📋 Response headers:', res.headers);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log('📥 Response body:', data);
      
      try {
        const response = JSON.parse(data);
        if (res.statusCode === 200) {
          console.log('✅ SUCCESS: Email sent successfully!');
          console.log('📧 Message ID:', response.messageId);
        } else {
          console.log('❌ ERROR: API returned error');
          console.log('🔍 Error details:', response);
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
};

// Run the test
testEmailAPI();
