// Check DNS propagation for SPF record
const dns = require('dns').promises;

async function checkDNSPropagation() {
  console.log('🔍 Checking DNS Propagation for SPF Record...\n');

  const domain = 'marketing.thedigitalmorph.com';
  const spfRecord = 'send.marketing.thedigitalmorph.com';

  try {
    console.log(`📋 Checking TXT records for: ${spfRecord}`);
    
    const records = await dns.resolveTxt(spfRecord);
    
    console.log('📊 Current DNS Records:');
    records.forEach((record, index) => {
      const value = record.join('');
      console.log(`${index + 1}. ${value}`);
      
      if (value.includes('include:resend.com')) {
        console.log('   ✅ RESEND SPF RECORD FOUND!');
      } else if (value.includes('include:amazonses.com')) {
        console.log('   ❌ Still showing Amazon SES');
      } else if (value.includes('v=spf1')) {
        console.log('   ⚠️  SPF record found but not Resend');
      }
    });

    // Check if we found the Resend SPF record
    const hasResendSPF = records.some(record => 
      record.join('').includes('include:resend.com')
    );

    if (hasResendSPF) {
      console.log('\n✅ SUCCESS: Resend SPF record is live!');
      console.log('📧 Your email system should now work.');
      console.log('🧪 Test it at: https://marketing.thedigitalmorph.com/test-email');
    } else {
      console.log('\n⏳ DNS propagation still in progress...');
      console.log('⏱️  This can take 5-60 minutes depending on your DNS provider.');
      console.log('🔄 Check again in a few minutes.');
    }

  } catch (error) {
    console.log('❌ DNS lookup failed:', error.message);
    console.log('\n🔧 Possible reasons:');
    console.log('1. DNS record not updated yet');
    console.log('2. Wrong subdomain name');
    console.log('3. DNS provider caching');
    console.log('4. Network issues');
  }

  console.log('\n📋 What to check:');
  console.log('1. Verify you updated the correct subdomain');
  console.log('2. Check if your DNS provider has propagation delays');
  console.log('3. Try using a different DNS checker online');
  console.log('4. Wait a bit longer and check again');
}

// Run the check
checkDNSPropagation();
