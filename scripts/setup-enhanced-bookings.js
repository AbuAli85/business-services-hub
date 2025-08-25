#!/usr/bin/env node

/**
 * Script to set up enhanced bookings view
 * This creates a database view that joins bookings with profiles and services
 * to show actual names instead of IDs
 */

const { createClient } = require('@supabase/supabase-js')

// Try to load environment variables from .env file if it exists
try {
  const fs = require('fs')
  const path = require('path')
  const envPath = path.join(process.cwd(), '.env')
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=')
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim()
        if (value && !process.env[key]) {
          process.env[key] = value
        }
      }
    })
  }
} catch (error) {
  console.log('⚠️  Could not load .env file, using existing environment variables')
}

async function setupEnhancedBookings() {
  console.log('🚀 Setting up enhanced bookings view...')
  
  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables')
    console.log('Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set')
    console.log('')
    console.log('You can either:')
    console.log('1. Set them as environment variables')
    console.log('2. Create a .env file in your project root')
    console.log('3. Run the migration manually in Supabase dashboard')
    return
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  try {
    // Test connection
    console.log('🔌 Testing Supabase connection...')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.log('⚠️  Not authenticated, trying to continue with service role...')
    } else {
      console.log('✅ Authenticated as:', user?.email || 'Unknown user')
    }
    
    // Check if enhanced_bookings view exists
    console.log('🔍 Checking if enhanced_bookings view exists...')
    const { data: viewCheck, error: viewError } = await supabase
      .from('enhanced_bookings')
      .select('id')
      .limit(1)
    
    if (viewError && viewError.message.includes('relation "enhanced_bookings" does not exist')) {
      console.log('📋 Enhanced bookings view does not exist, creating it...')
      
      // Create the view using raw SQL
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE OR REPLACE VIEW public.enhanced_bookings AS
          SELECT 
              b.id,
              b.client_id,
              b.provider_id,
              b.service_id,
              b.status,
              b.created_at,
              b.updated_at,
              b.scheduled_date,
              b.scheduled_time,
              b.notes,
              b.amount,
              b.payment_status,
              b.rating,
              b.review,
              b.estimated_duration,
              b.location,
              b.cancellation_reason,
              -- Client information
              c.full_name as client_name,
              c.phone as client_phone,
              c.company_id as client_company_id,
              -- Provider information
              p.full_name as provider_name,
              p.phone as provider_phone,
              p.company_id as provider_company_id,
              -- Service information
              s.title as service_title,
              s.description as service_description,
              s.category as service_category,
              s.base_price as service_base_price,
              s.currency as service_currency,
              -- Company information
              cc.name as client_company_name,
              pc.name as provider_company_name
          FROM public.bookings b
          LEFT JOIN public.profiles c ON b.client_id = c.id
          LEFT JOIN public.profiles p ON b.provider_id = p.id
          LEFT JOIN public.services s ON b.service_id = s.id
          LEFT JOIN public.companies cc ON c.company_id = cc.id
          LEFT JOIN public.companies pc ON p.company_id = pc.id;
        `
      })
      
      if (createError) {
        console.log('⚠️  Could not create view via RPC, trying alternative method...')
        
        // Try to create via direct SQL execution
        const { error: directError } = await supabase
          .from('bookings')
          .select('id')
          .limit(1)
        
        if (directError) {
          console.error('❌ Cannot access bookings table:', directError.message)
          return
        }
        
        console.log('📝 Please run the migration manually:')
        console.log('1. Go to your Supabase dashboard')
        console.log('2. Navigate to SQL Editor')
        console.log('3. Run the migration from: supabase/migrations/043_create_enhanced_bookings_view.sql')
        return
      }
      
      console.log('✅ Enhanced bookings view created successfully!')
    } else if (viewError) {
      console.error('❌ Error checking view:', viewError.message)
      return
    } else {
      console.log('✅ Enhanced bookings view already exists')
    }
    
    // Test the enhanced view
    console.log('🧪 Testing enhanced bookings view...')
    const { data: testData, error: testError } = await supabase
      .from('enhanced_bookings')
      .select('id, client_name, provider_name, service_title, status')
      .limit(3)
    
    if (testError) {
      console.error('❌ Error testing enhanced view:', testError.message)
      return
    }
    
    console.log('📊 Enhanced view test results:')
    if (testData && testData.length > 0) {
      testData.forEach((booking, index) => {
        console.log(`  ${index + 1}. ID: ${booking.id.slice(0, 8)}...`)
        console.log(`     Client: ${booking.client_name || 'N/A'}`)
        console.log(`     Provider: ${booking.provider_name || 'N/A'}`)
        console.log(`     Service: ${booking.service_title || 'N/A'}`)
        console.log(`     Status: ${booking.status}`)
        console.log('')
      })
    } else {
      console.log('  No data found in enhanced view')
    }
    
    // Check basic bookings table for comparison
    console.log('🔍 Checking basic bookings table for comparison...')
    const { data: basicData, error: basicError } = await supabase
      .from('bookings')
      .select('id, client_id, provider_id, service_id, status')
      .limit(3)
    
    if (basicError) {
      console.error('❌ Error checking basic table:', basicError.message)
    } else if (basicData && basicData.length > 0) {
      console.log('📊 Basic table comparison:')
      basicData.forEach((booking, index) => {
        console.log(`  ${index + 1}. ID: ${booking.id.slice(0, 8)}...`)
        console.log(`     Client ID: ${booking.client_id?.slice(0, 8)}...`)
        console.log(`     Provider ID: ${booking.provider_id?.slice(0, 8)}...`)
        console.log(`     Service ID: ${booking.service_id?.slice(0, 8)}...`)
        console.log(`     Status: ${booking.status}`)
        console.log('')
      })
    }
    
    console.log('✅ Enhanced bookings setup completed!')
    console.log('')
    console.log('📋 Next steps:')
    console.log('1. Restart your Next.js application')
    console.log('2. The bookings page should now show real names instead of IDs')
    console.log('3. Check the console for "Enhanced bookings view is available" message')
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message)
    console.error('Stack trace:', error.stack)
  }
}

// Run the setup
if (require.main === module) {
  setupEnhancedBookings()
    .then(() => {
      console.log('🎉 Setup script completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Setup script failed:', error)
      process.exit(1)
    })
}

module.exports = { setupEnhancedBookings }
