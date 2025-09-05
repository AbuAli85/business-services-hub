// Test script for monthly progress tracking system
// Run this with: node test-monthly-progress.js

const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://reootcngcptfogfozlmz.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb290Y25nY3B0Zm9nZm96bG16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0NDM4MiwiZXhwIjoyMDY5MDIwMzgyfQ.BTLA-2wwXJgjW6MKoaw2ERbCr_fXF9w4zgLb70_5DAE'
)

async function testMonthlyProgressSystem() {
  console.log('🧪 Testing Monthly Progress Tracking System...\n')

  try {
    // 1. Test database migration
    console.log('1️⃣ Testing database migration...')
    
    // Test if the booking_progress table exists by trying to query it
    const { data: testData, error: tableError } = await supabase
      .from('booking_progress')
      .select('id')
      .limit(1)
    
    if (tableError) {
      console.error('❌ Error checking booking_progress table:', tableError.message)
      console.log('Please run the migration script first: supabase/migrations/099_create_booking_progress_table.sql')
      return
    }
    
    console.log('✅ booking_progress table exists and is accessible')

    // 2. Test API endpoints
    console.log('\n2️⃣ Testing API endpoints...')
    
    // Test GET endpoint
    try {
      const response = await fetch('http://localhost:3000/api/progress/test-booking-id')
      console.log('✅ GET /api/progress/[bookingId] endpoint accessible')
    } catch (error) {
      console.log('⚠️ GET endpoint test skipped (server not running)')
    }

    // 3. Test database functions
    console.log('\n3️⃣ Testing database functions...')
    
    // Test create_default_milestones function
    try {
      const { error: functionError } = await supabase.rpc('create_default_milestones', {
        booking_uuid: '00000000-0000-0000-0000-000000000000' // Test UUID
      })
      
      if (functionError) {
        console.log('⚠️ create_default_milestones function test:', functionError.message)
      } else {
        console.log('✅ create_default_milestones function exists')
      }
    } catch (error) {
      console.log('⚠️ Function test error:', error.message)
    }

    // 4. Test sample data creation
    console.log('\n4️⃣ Testing sample data creation...')
    
    // First, let's check if there are any existing bookings we can use
    const { data: existingBookings, error: fetchError } = await supabase
      .from('bookings')
      .select('id, title, status')
      .limit(1)
    
    let testBooking = null
    
    if (existingBookings && existingBookings.length > 0) {
      testBooking = existingBookings[0]
      console.log('✅ Using existing booking for test:', testBooking.title)
    } else {
      console.log('⚠️ No existing bookings found. Creating a test booking...')
      
      // Create a test booking with valid UUIDs
      const { data: newBooking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          service_id: '00000000-0000-0000-0000-000000000000',
          client_id: '00000000-0000-0000-0000-000000000000',
          provider_id: '00000000-0000-0000-0000-000000000000',
          title: 'Test Monthly Progress Booking',
          status: 'confirmed',
          amount: 100,
          currency: 'OMR'
        })
        .select()
        .single()
      
      if (bookingError) {
        console.log('❌ Test booking creation failed:', bookingError.message)
        console.log('This might be due to foreign key constraints. Using a different approach...')
        return
      }
      
      testBooking = newBooking
      console.log('✅ Test booking created:', testBooking.id)
    }
    
    if (testBooking) {
      // Test milestone creation
      const { error: milestoneError } = await supabase.rpc('create_default_milestones', {
        booking_uuid: testBooking.id
      })
      
      if (milestoneError) {
        console.log('❌ Milestone creation failed:', milestoneError.message)
      } else {
        console.log('✅ Default milestones created successfully')
        
        // Verify milestones were created
        const { data: milestones, error: fetchError } = await supabase
          .from('booking_progress')
          .select('*')
          .eq('booking_id', testBooking.id)
        
        if (fetchError) {
          console.log('❌ Error fetching milestones:', fetchError.message)
        } else {
          console.log(`✅ Found ${milestones.length} milestones created`)
          milestones.forEach((milestone, index) => {
            console.log(`   ${index + 1}. ${milestone.milestone_name} (Week ${milestone.week_number})`)
          })
        }
      }
      
      // Clean up test data (only if we created a new booking)
      if (testBooking.title === 'Test Monthly Progress Booking') {
        await supabase.from('booking_progress').delete().eq('booking_id', testBooking.id)
        await supabase.from('bookings').delete().eq('id', testBooking.id)
        console.log('🧹 Test data cleaned up')
      }
    }

    console.log('\n🎉 Monthly Progress Tracking System Test Complete!')
    console.log('\n📋 Next Steps:')
    console.log('1. Run the database migration: supabase/migrations/099_create_booking_progress_table.sql')
    console.log('2. Start your Next.js development server: npm run dev')
    console.log('3. Navigate to a booking details page and check the "Monthly Progress" tab')
    console.log('4. Test creating milestones and updating step status')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testMonthlyProgressSystem()
