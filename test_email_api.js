// Node.js test for email API
// This tests the API endpoint directly without needing Supabase client

const fetch = require('node-fetch').default || require('node-fetch')

async function testEmailAPI() {
  console.log('🧪 Testing Email API Directly...\n')

  try {
    // Test the email API endpoint
    const emailResponse = await fetch('http://localhost:3000/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: 'operations@falconeyegroup.net', // Your email
        subject: 'Test Email from Business Services Hub (Node.js)',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Test Email Notification (Node.js)</h2>
            <p>This is a test email to verify the API endpoint is working.</p>
            <p><strong>Test Type:</strong> Node.js API Test</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            <div style="margin-top: 20px; padding: 15px; background-color: #f0f8ff; border-left: 4px solid #007bff;">
              <p style="margin: 0;"><strong>System Status:</strong> API endpoint is working! 🎉</p>
            </div>
          </div>
        `,
        text: `Test Email Notification (Node.js)\n\nThis is a test email to verify the API endpoint is working.\n\nTest Type: Node.js API Test\nTime: ${new Date().toLocaleString()}\n\nSystem Status: API endpoint is working! 🎉`,
        from: 'notifications@yourdomain.com',
        replyTo: 'noreply@yourdomain.com',
        notificationId: 'test-nodejs-' + Date.now(),
        notificationType: 'booking_confirmed',
        userId: 'afd6ae15-28e8-494f-9d79-cbc2f0b04ae0'
      }),
    })

    const emailResult = await emailResponse.json()
    
    if (emailResponse.ok) {
      console.log('✅ Email sent successfully!', emailResult)
      console.log('📧 Check your email inbox for the test message!')
    } else {
      console.error('❌ Email sending failed:', emailResult)
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
    console.log('\n💡 Make sure your development server is running: npm run dev')
  }
}

// Run the test
testEmailAPI()
