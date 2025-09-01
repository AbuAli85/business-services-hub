/**
 * Check booking table schema and constraints
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

async function checkBookingSchema() {
  console.log('🔍 Checking booking table schema...')
  console.log('')

  try {
    // Check if bookings table exists and get its structure
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'bookings')

    if (tablesError) {
      console.error('❌ Error checking tables:', tablesError)
      return
    }

    if (!tables || tables.length === 0) {
      console.error('❌ Bookings table does not exist!')
      return
    }

    console.log('✅ Bookings table exists')

    // Get table columns
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', 'bookings')
      .order('ordinal_position')

    if (columnsError) {
      console.error('❌ Error getting columns:', columnsError)
      return
    }

    console.log('📋 Bookings table columns:')
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULLABLE)'} ${col.column_default ? `DEFAULT: ${col.column_default}` : ''}`)
    })

    console.log('')

    // Check constraints
    const { data: constraints, error: constraintsError } = await supabase
      .from('information_schema.table_constraints')
      .select('constraint_name, constraint_type')
      .eq('table_schema', 'public')
      .eq('table_name', 'bookings')

    if (constraintsError) {
      console.error('❌ Error getting constraints:', constraintsError)
      return
    }

    console.log('🔒 Table constraints:')
    constraints.forEach(constraint => {
      console.log(`  - ${constraint.constraint_name}: ${constraint.constraint_type}`)
    })

    console.log('')

    // Try to get a sample booking to see the structure
    const { data: sampleBooking, error: sampleError } = await supabase
      .from('bookings')
      .select('*')
      .limit(1)

    if (sampleError) {
      console.error('❌ Error getting sample booking:', sampleError)
    } else if (sampleBooking && sampleBooking.length > 0) {
      console.log('📄 Sample booking structure:')
      console.log(JSON.stringify(sampleBooking[0], null, 2))
    } else {
      console.log('📄 No bookings found in table')
    }

    console.log('')

    // Check if there are any services to test with
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, title, provider_id, base_price, currency, status')
      .eq('status', 'active')
      .limit(5)

    if (servicesError) {
      console.error('❌ Error getting services:', servicesError)
    } else {
      console.log('🛠️ Available services for testing:')
      services.forEach(service => {
        console.log(`  - ${service.id}: ${service.title} (Provider: ${service.provider_id}, Price: ${service.base_price} ${service.currency})`)
      })
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the check
checkBookingSchema()
