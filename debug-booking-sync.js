const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://reootcngcptfogfozlmz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb290Y25nY3B0Zm9nZm96bG16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0NDM4MiwiZXhwIjoyMDY5MDIwMzgyfQ.BTLA-2wwXJgjW6MKoaw2ERbCr_fXF9w4zgLb70_5DAE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugBookingSync() {
  console.log('🔍 Debugging booking synchronization...\n');

  try {
    // Step 1: Check all recent bookings
    console.log('📋 Step 1: Checking all recent bookings...');
    const { data: allBookings, error: allBookingsError } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (allBookingsError) {
      console.log('❌ Error fetching all bookings:', allBookingsError);
      return;
    }

    console.log('✅ Found', allBookings.length, 'recent bookings');
    allBookings.forEach((booking, index) => {
      console.log(`  ${index + 1}. ID: ${booking.id}, Status: ${booking.status}, Client: ${booking.client_id}, Provider: ${booking.provider_id}, Created: ${booking.created_at}`);
    });

    // Step 2: Check bookings by client
    console.log('\n📋 Step 2: Checking bookings by client...');
    const clientIds = [...new Set(allBookings.map(b => b.client_id).filter(Boolean))];
    console.log('Client IDs found:', clientIds);

    for (const clientId of clientIds.slice(0, 3)) { // Check first 3 clients
      const { data: clientBookings, error: clientError } = await supabase
        .from('bookings')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (clientError) {
        console.log(`❌ Error fetching bookings for client ${clientId}:`, clientError);
      } else {
        console.log(`✅ Client ${clientId} has ${clientBookings.length} bookings`);
      }
    }

    // Step 3: Check bookings by provider
    console.log('\n📋 Step 3: Checking bookings by provider...');
    const providerIds = [...new Set(allBookings.map(b => b.provider_id).filter(Boolean))];
    console.log('Provider IDs found:', providerIds);

    for (const providerId of providerIds.slice(0, 3)) { // Check first 3 providers
      const { data: providerBookings, error: providerError } = await supabase
        .from('bookings')
        .select('*')
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (providerError) {
        console.log(`❌ Error fetching bookings for provider ${providerId}:`, providerError);
      } else {
        console.log(`✅ Provider ${providerId} has ${providerBookings.length} bookings`);
      }
    }

    // Step 4: Check profiles to understand user roles
    console.log('\n📋 Step 4: Checking user profiles...');
    const allUserIds = [...new Set([...clientIds, ...providerIds])];
    console.log('All user IDs:', allUserIds);

    for (const userId of allUserIds.slice(0, 5)) { // Check first 5 users
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.log(`❌ Error fetching profile for user ${userId}:`, profileError);
      } else {
        console.log(`✅ User ${userId}: ${profile.full_name} (${profile.role})`);
      }
    }

    // Step 5: Check if there are any RLS issues
    console.log('\n📋 Step 5: Checking RLS policies on bookings table...');
    const { data: policies, error: policiesError } = await supabase
      .rpc('exec_sql', { 
        sql: `SELECT policyname, cmd, roles, qual FROM pg_policies WHERE tablename = 'bookings';` 
      });

    if (policiesError) {
      console.log('❌ Error checking RLS policies:', policiesError);
    } else {
      console.log('✅ RLS policies for bookings:');
      policies.forEach(policy => {
        console.log(`  - ${policy.policyname}: ${policy.cmd} for ${policy.roles}`);
      });
    }

    // Step 6: Test creating a sample booking
    console.log('\n📋 Step 6: Testing booking creation...');
    if (clientIds.length > 0 && providerIds.length > 0) {
      const testBooking = {
        client_id: clientIds[0],
        provider_id: providerIds[0],
        service_id: '00000000-0000-0000-0000-000000000000', // dummy service ID
        title: 'Test Booking - Debug',
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
      } else {
        console.log('✅ Test booking created:', newBooking.id);
        
        // Clean up
        await supabase
          .from('bookings')
          .delete()
          .eq('id', newBooking.id);
        console.log('✅ Test booking cleaned up');
      }
    }

    console.log('\n🎉 Booking sync debug completed!');

  } catch (error) {
    console.error('❌ Error during debug:', error);
  }
}

debugBookingSync();
