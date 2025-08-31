const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testDatabaseAccess() {
  console.log('🔍 Testing database access...\n')

  try {
    // Test profiles table
    console.log('📊 Testing profiles table...')
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(5)
    
    if (profilesError) {
      console.error('❌ Profiles error:', profilesError)
    } else {
      console.log('✅ Profiles found:', profiles?.length || 0)
      if (profiles && profiles.length > 0) {
        console.log('   Sample profile:', {
          id: profiles[0].id,
          full_name: profiles[0].full_name,
          role: profiles[0].role,
          email: profiles[0].email
        })
      }
    }

    // Test services table
    console.log('\n📊 Testing services table...')
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .limit(5)
    
    if (servicesError) {
      console.error('❌ Services error:', servicesError)
    } else {
      console.log('✅ Services found:', services?.length || 0)
      if (services && services.length > 0) {
        console.log('   Sample service:', {
          id: services[0].id,
          title: services[0].title,
          status: services[0].status,
          provider_id: services[0].provider_id
        })
      }
    }

    // Test bookings table
    console.log('\n📊 Testing bookings table...')
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .limit(5)
    
    if (bookingsError) {
      console.error('❌ Bookings error:', bookingsError)
    } else {
      console.log('✅ Bookings found:', bookings?.length || 0)
      if (bookings && bookings.length > 0) {
        console.log('   Sample booking:', {
          id: bookings[0].id,
          service_title: bookings[0].service_title,
          status: bookings[0].status,
          client_id: bookings[0].client_id,
          provider_id: bookings[0].provider_id
        })
      }
    }

    // Test messages table
    console.log('\n📊 Testing messages table...')
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .limit(5)
    
    if (messagesError) {
      console.error('❌ Messages error:', messagesError)
    } else {
      console.log('✅ Messages found:', messages?.length || 0)
      if (messages && messages.length > 0) {
        console.log('   Sample message:', {
          id: messages[0].id,
          content: messages[0].content?.substring(0, 50) + '...',
          sender_id: messages[0].sender_id,
          receiver_id: messages[0].receiver_id
        })
      }
    }

    // Test with a specific user ID (if we have one)
    if (profiles && profiles.length > 0) {
      const testUserId = profiles[0].id
      console.log(`\n🔍 Testing RLS policies for user: ${testUserId}`)
      
      // Test services access for this user
      const { data: userServices, error: userServicesError } = await supabase
        .from('services')
        .select('*')
        .limit(3)
      
      if (userServicesError) {
        console.error('❌ User services error:', userServicesError)
      } else {
        console.log('✅ User can access services:', userServices?.length || 0)
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testDatabaseAccess()
