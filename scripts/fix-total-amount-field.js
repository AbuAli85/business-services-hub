/**
 * Fix total_amount field issue for bookings table
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixTotalAmountField() {
  console.log('🔧 Fixing total_amount field issue...')
  console.log('')

  try {
    // First, let's try to add the total_amount column
    console.log('📝 Adding total_amount column to bookings table...')
    
    // We'll use a raw SQL query to add the column
    const { data: addColumnResult, error: addColumnError } = await supabase
      .rpc('exec_sql', { 
        sql: `
          DO $$
          BEGIN
              IF NOT EXISTS (
                  SELECT FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'bookings' 
                  AND column_name = 'total_amount'
              ) THEN
                  ALTER TABLE public.bookings ADD COLUMN total_amount NUMERIC(12,3) DEFAULT 0;
                  RAISE NOTICE 'Added total_amount column to bookings table';
              ELSE
                  RAISE NOTICE 'total_amount column already exists in bookings table';
              END IF;
          END $$;
        `
      })

    if (addColumnError) {
      console.error('❌ Error adding total_amount column:', addColumnError)
      console.log('⚠️ Trying alternative approach...')
      
      // Alternative approach: try to update existing bookings to set total_amount
      console.log('📝 Updating existing bookings to set total_amount...')
      
      const { data: updateResult, error: updateError } = await supabase
        .from('bookings')
        .update({ total_amount: 0 }) // Set a default value
        .neq('id', '00000000-0000-0000-0000-000000000000') // Update all records

      if (updateError) {
        console.error('❌ Error updating bookings:', updateError)
        console.log('⚠️ The total_amount column might not exist in the current schema')
        console.log('💡 This suggests the database schema is different from the migration files')
        return
      } else {
        console.log('✅ Successfully updated existing bookings')
      }
    } else {
      console.log('✅ Successfully added total_amount column')
    }

    // Now let's test booking creation
    console.log('')
    console.log('🧪 Testing booking creation after fix...')
    
    const testBookingData = {
      service_id: '770e8400-e29b-41d4-a716-446655440005',
      client_id: '11111111-1111-1111-1111-111111111111',
      provider_id: 'd2ce1fe9-806f-4dbc-8efb-9cf160f19e4b',
      scheduled_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      notes: 'Test booking after total_amount fix',
      status: 'pending',
      approval_status: 'pending',
      operational_status: 'new',
      amount: 100,
      currency: 'OMR',
      payment_status: 'pending',
      title: 'Test Booking After Fix',
      start_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
      total_price: 100,
      subtotal: 100,
      total_amount: 100 // Add the total_amount field
    }

    const { data: testBooking, error: testError } = await supabase
      .from('bookings')
      .insert(testBookingData)
      .select('*')
      .single()

    if (testError) {
      console.error('❌ Booking creation test failed:')
      console.error('Error code:', testError.code)
      console.error('Error message:', testError.message)
      console.error('Error details:', testError.details)
    } else {
      console.log('✅ Booking creation test succeeded!')
      console.log('Created booking ID:', testBooking.id)
      
      // Clean up
      const { error: deleteError } = await supabase
        .from('bookings')
        .delete()
        .eq('id', testBooking.id)
      
      if (deleteError) {
        console.error('⚠️ Failed to delete test booking:', deleteError)
      } else {
        console.log('🧹 Test booking cleaned up')
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the fix
fixTotalAmountField()
