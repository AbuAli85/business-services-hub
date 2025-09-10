// Simple email test
const fetch = require('node-fetch').default || require('node-fetch');

async function testSimpleEmail() {
  try {
    console.log('Testing simple email...');
    
    const response = await fetch('https://marketing.thedigitalmorph.com/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: 'operations@falconeyegroup.net',
        subject: 'Simple Test',
        html: '<h1>Test</h1>',
        text: 'Test',
        from: 'onboarding@resend.dev'
      })
    });

    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response:', result);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testSimpleEmail();
