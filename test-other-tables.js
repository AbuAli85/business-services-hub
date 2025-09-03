const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://reootcngcptfogfozlmz.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb290Y25nY3B0Zm9nZm96bG16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0NDM4MiwiZXhwIjoyMDY5MDIwMzgyfQ.BTLA-2wwXJgjW6MKoaw2ERbCr_fXF9w4zgLb70_5DAE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testOtherTables() {
  try {
    console.log('🧪 Testing insert permissions on other tables...')
    
    // Test bookings table
    console.log('\n📋 Testing bookings table...')
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .limit(1)
    
    if (bookingsError) {
      console.log('❌ Cannot read bookings:', bookingsError.message)
    } else {
      console.log('✅ Can read bookings, found:', bookings.length, 'records')
    }

    // Test profiles table
    console.log('\n📋 Testing profiles table...')
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)
    
    if (profilesError) {
      console.log('❌ Cannot read profiles:', profilesError.message)
    } else {
      console.log('✅ Can read profiles, found:', profiles.length, 'records')
    }

    // Test services table
    console.log('\n📋 Testing services table...')
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .limit(1)
    
    if (servicesError) {
      console.log('❌ Cannot read services:', servicesError.message)
    } else {
      console.log('✅ Can read services, found:', services.length, 'records')
    }

    // Try to insert into a simple table (like profiles if it exists)
    console.log('\n📋 Testing insert into profiles table...')
    const testProfile = {
      id: 'test-profile-' + Date.now(),
      email: 'test@example.com',
      role: 'client'
    }

    const { data: insertResult, error: insertError } = await supabase
      .from('profiles')
      .insert(testProfile)
      .select()
      .single()

    if (insertError) {
      console.log('❌ Cannot insert into profiles:', insertError.message)
    } else {
      console.log('✅ Can insert into profiles!')
      console.log('📊 Result:', insertResult)
      
      // Clean up
      await supabase.from('profiles').delete().eq('id', testProfile.id)
      console.log('🧹 Test profile cleaned up')
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

testOtherTables()
