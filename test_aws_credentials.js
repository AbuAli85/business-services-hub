// Test AWS credentials and SES configuration
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

async function testAWSCredentials() {
  console.log('🔍 Testing AWS Credentials and SES Configuration...\n');

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
    console.log('\nTo test locally, create a .env.local file with these variables.');
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

    console.log('🔗 Testing AWS connection...');

    // Test with a simple email
    const testEmail = {
      Source: 'notifications@thedigitalmorph.com',
      Destination: {
        ToAddresses: ['chairman@falconeyegroup.net'],
      },
      Message: {
        Subject: {
          Data: 'AWS Credentials Test - ' + new Date().toLocaleString(),
          Charset: 'UTF-8',
        },
        Body: {
          Text: {
            Data: 'This is a test email to verify AWS credentials and SES configuration.',
            Charset: 'UTF-8',
          },
          Html: {
            Data: '<p>This is a test email to verify AWS credentials and SES configuration.</p>',
            Charset: 'UTF-8',
          },
        },
      },
      ReplyToAddresses: ['noreply@thedigitalmorph.com'],
    };

    console.log('📧 Sending test email...');
    const command = new SendEmailCommand(testEmail);
    const response = await sesClient.send(command);

    console.log('✅ SUCCESS! AWS Credentials are working!');
    console.log('📧 Message ID:', response.MessageId);
    console.log('📊 Response:', response);
    console.log('\n🎉 Your email system should now work in production!');

  } catch (error) {
    console.log('❌ AWS Test Failed:');
    console.log('Error Name:', error.name);
    console.log('Error Message:', error.message);
    
    if (error.name === 'InvalidUserPoolConfigurationException') {
      console.log('\n🔧 Solution: Check your AWS region configuration');
    } else if (error.name === 'AccessDeniedException') {
      console.log('\n🔧 Solution: Check IAM permissions for SES');
    } else if (error.name === 'InvalidParameterValueException') {
      console.log('\n🔧 Solution: Verify email addresses and domain');
    } else if (error.name === 'MessageRejected') {
      console.log('\n🔧 Solution: Check domain verification and sending limits');
    } else if (error.name === 'CredentialsProviderError') {
      console.log('\n🔧 Solution: Check AWS credentials are correct');
    } else if (error.message.includes('security token')) {
      console.log('\n🔧 Solution: Your AWS credentials are invalid or expired');
      console.log('   - Go to AWS IAM Console');
      console.log('   - Create new access keys');
      console.log('   - Update your environment variables');
    } else {
      console.log('\n🔧 Solution: Check AWS configuration and permissions');
    }
  }
}

// Run the test
testAWSCredentials();
