// Test script to verify AWS SES credentials and configuration
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

async function testSESCredentials() {
  console.log('🔍 Testing AWS SES Configuration...\n');

  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? '✅ Set' : '❌ Not set');
  console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '✅ Set' : '❌ Not set');
  console.log('AWS_REGION:', process.env.AWS_REGION || 'us-east-1 (default)');
  console.log('');

  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.log('❌ AWS credentials not configured!');
    console.log('Please set the following environment variables:');
    console.log('- AWS_ACCESS_KEY_ID');
    console.log('- AWS_SECRET_ACCESS_KEY');
    console.log('- AWS_REGION (optional, defaults to us-east-1)');
    return;
  }

  try {
    // Initialize SES client
    const sesClient = new SESClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    console.log('🔗 Testing SES connection...');

    // Test with a simple email
    const testEmail = {
      Source: 'send@marketing.thedigitalmorph.com',
      Destination: {
        ToAddresses: ['operations@falconeyegroup.net'],
      },
      Message: {
        Subject: {
          Data: 'SES Test - ' + new Date().toLocaleString(),
          Charset: 'UTF-8',
        },
        Body: {
          Text: {
            Data: 'This is a test email to verify SES configuration.',
            Charset: 'UTF-8',
          },
          Html: {
            Data: '<p>This is a test email to verify SES configuration.</p>',
            Charset: 'UTF-8',
          },
        },
      },
    };

    const command = new SendEmailCommand(testEmail);
    const response = await sesClient.send(command);

    console.log('✅ SES Test Successful!');
    console.log('📧 Message ID:', response.MessageId);
    console.log('📊 Response:', response);

  } catch (error) {
    console.log('❌ SES Test Failed:');
    console.log('Error:', error.message);
    console.log('Code:', error.name);
    
    if (error.name === 'AccessDeniedException') {
      console.log('\n🔧 Solution: Check IAM permissions for SES');
    } else if (error.name === 'InvalidParameterValueException') {
      console.log('\n🔧 Solution: Verify email addresses and domain');
    } else if (error.name === 'MessageRejected') {
      console.log('\n🔧 Solution: Check domain verification and sending limits');
    } else if (error.name === 'CredentialsProviderError') {
      console.log('\n🔧 Solution: Check AWS credentials');
    }
  }
}

// Run the test
testSESCredentials();
