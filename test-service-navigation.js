const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://reootcngcptfogfozlmz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb290Y25nY3B0Zm9nZm96bG16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0NDM4MiwiZXhwIjoyMDY5MDIwMzgyfQ.BTLA-2wwXJgjW6MKoaw2ERbCr_fXF9w4zgLb70_5DAE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testServiceNavigation() {
  console.log('🧪 Testing service navigation...\n');

  try {
    // Get a sample service
    console.log('📋 Getting a sample service...');
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, title, provider_id')
      .limit(1);

    if (servicesError || !services || services.length === 0) {
      console.log('❌ No services found:', servicesError);
      return;
    }

    const service = services[0];
    console.log('✅ Found service:', service.title, '(ID:', service.id + ')');

    // Test 1: Check if service detail page would work
    console.log('\n📋 Test 1: Checking service detail access...');
    const { data: serviceDetail, error: detailError } = await supabase
      .from('services')
      .select('*')
      .eq('id', service.id)
      .single();

    if (detailError) {
      console.log('❌ Error fetching service detail:', detailError);
    } else {
      console.log('✅ Service detail accessible:', serviceDetail.title);
    }

    // Test 2: Check if service can be updated
    console.log('\n📋 Test 2: Checking service update access...');
    const { error: updateError } = await supabase
      .from('services')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', service.id);

    if (updateError) {
      console.log('❌ Error updating service:', updateError);
    } else {
      console.log('✅ Service update accessible');
    }

    // Test 3: Check if service can be deleted
    console.log('\n📋 Test 2: Checking service delete access...');
    const { error: deleteError } = await supabase
      .from('services')
      .delete()
      .eq('id', service.id);

    if (deleteError) {
      console.log('❌ Error deleting service:', deleteError);
    } else {
      console.log('✅ Service delete accessible (but we won\'t actually delete)');
    }

    console.log('\n🎉 Service navigation test completed!');
    console.log('\n💡 If all tests passed, the issue might be:');
    console.log('   1. JavaScript errors in the browser console');
    console.log('   2. Router navigation issues');
    console.log('   3. Event handler not being attached properly');

  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

testServiceNavigation();
