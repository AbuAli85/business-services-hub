// Test script to check what the API returns for the specific client
// Run this in the browser console on the invoice template page

async function testClientAPI() {
  const clientId = '4fedc90a-1c4e-4baa-a42b-2ca85d1daf0b';
  
  try {
    console.log('🔍 Testing API call for client ID:', clientId);
    
    const response = await fetch(`/api/profiles/search?id=${clientId}`);
    const data = await response.json();
    
    console.log('📊 API Response:', data);
    
    if (data.profiles && data.profiles.length > 0) {
      const profile = data.profiles[0];
      console.log('👤 Profile data:', profile);
      console.log('🏢 Companies array:', profile.companies);
      
      if (profile.companies && profile.companies.length > 0) {
        const company = profile.companies[0];
        console.log('🏢 Company data:', company);
        console.log('📍 Company address:', company.address);
        console.log('🌐 Company website:', company.website);
      } else {
        console.log('❌ No companies found in profile');
      }
    } else {
      console.log('❌ No profiles found');
    }
  } catch (error) {
    console.error('❌ API test failed:', error);
  }
}

// Run the test
testClientAPI();
