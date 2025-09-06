const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://reootcngcptfogfozlmz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb290Y25nY3B0Zm9nZm96bG16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0NDM4MiwiZXhwIjoyMDY5MDIwMzgyfQ.BTLA-2wwXJgjW6MKoaw2ERbCr_fXF9w4zgLb70_5DAE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRealtimeBookings() {
  console.log('🔍 Testing real-time bookings...\n');

  try {
    // Get a real service ID for testing
    console.log('📋 Getting a real service ID...');
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

    // Get a real client ID
    console.log('\n📋 Getting a real client ID...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('role', 'client')
      .limit(1);

    if (profilesError || !profiles || profiles.length === 0) {
      console.log('❌ No clients found:', profilesError);
      return;
    }

    const client = profiles[0];
    console.log('✅ Found client:', client.full_name, '(ID:', client.id + ')');

    // Test 1: Create a booking
    console.log('\n📝 Test 1: Creating a test booking...');
    const testBooking = {
      client_id: client.id,
      provider_id: service.provider_id,
      service_id: service.id,
      title: 'Test Booking - Realtime',
      status: 'pending',
      currency: 'OMR',
      amount: 100,
      created_at: new Date().toISOString()
    };

    const { data: newBooking, error: createError } = await supabase
      .from('bookings')
      .insert([testBooking])
      .select()
      .single();

    if (createError) {
      console.log('❌ Error creating test booking:', createError);
      return;
    }

    console.log('✅ Test booking created:', newBooking.id);

    // Test 2: Query bookings as client
    console.log('\n📋 Test 2: Querying bookings as client...');
    const { data: clientBookings, error: clientError } = await supabase
      .from('bookings')
      .select('*')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false });

    if (clientError) {
      console.log('❌ Error fetching client bookings:', clientError);
    } else {
      console.log('✅ Client bookings found:', clientBookings.length);
      const testBookingFound = clientBookings.find(b => b.id === newBooking.id);
      console.log('✅ Test booking visible to client:', !!testBookingFound);
    }

    // Test 3: Query bookings as provider
    console.log('\n📋 Test 3: Querying bookings as provider...');
    const { data: providerBookings, error: providerError } = await supabase
      .from('bookings')
      .select('*')
      .eq('provider_id', service.provider_id)
      .order('created_at', { ascending: false });

    if (providerError) {
      console.log('❌ Error fetching provider bookings:', providerError);
    } else {
      console.log('✅ Provider bookings found:', providerBookings.length);
      const testBookingFound = providerBookings.find(b => b.id === newBooking.id);
      console.log('✅ Test booking visible to provider:', !!testBookingFound);
    }

    // Test 4: Test real-time subscription
    console.log('\n📡 Test 4: Testing real-time subscription...');
    const channel = supabase
      .channel('test-bookings')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'bookings',
          filter: `client_id = '${client.id}' OR provider_id = '${service.provider_id}'`
        },
        (payload) => {
          console.log('📡 Real-time event received:', payload.eventType, payload.new?.id);
        }
      )
      .subscribe();

    // Wait a moment for subscription to establish
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update the booking to trigger real-time event
    console.log('📝 Updating booking to trigger real-time event...');
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ status: 'in_progress' })
      .eq('id', newBooking.id);

    if (updateError) {
      console.log('❌ Error updating booking:', updateError);
    } else {
      console.log('✅ Booking updated successfully');
    }

    // Wait for real-time event
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Clean up
    console.log('\n🗑️ Cleaning up...');
    await supabase
      .from('bookings')
      .delete()
      .eq('id', newBooking.id);
    console.log('✅ Test booking cleaned up');

    // Unsubscribe
    await supabase.removeChannel(channel);
    console.log('✅ Real-time subscription cleaned up');

    console.log('\n🎉 Real-time bookings test completed!');

  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

testRealtimeBookings();
