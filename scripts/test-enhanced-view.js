#!/usr/bin/env node

/**
 * Simple test script to check if enhanced bookings view exists
 */

const { createClient } = require('@supabase/supabase-js')

// Read environment variables from .env file
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

async function testEnhancedView() {
  console.log('🧪 Testing enhanced bookings view...')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables')
    return
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  try {
    // Test basic connection
    console.log('🔌 Testing connection...')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.log('⚠️  Not authenticated, but continuing...')
    } else {
      console.log('✅ Authenticated as:', user?.email || 'Unknown')
    }
    
    // Test enhanced view
    console.log('🔍 Testing enhanced_bookings view...')
    const { data: enhancedData, error: enhancedError } = await supabase
      .from('enhanced_bookings')
      .select('id, client_name, provider_name, service_title, status')
      .limit(3)
    
    if (enhancedError) {
      console.error('❌ Enhanced view error:', enhancedError.message)
      
      if (enhancedError.message.includes('relation "enhanced_bookings" does not exist')) {
        console.log('📋 Enhanced view does not exist!')
        console.log('Please run the migration: supabase/migrations/043_create_enhanced_bookings_view.sql')
      }
      return
    }
    
    console.log('✅ Enhanced view exists and is accessible!')
    console.log('📊 Sample data:')
    
    if (enhancedData && enhancedData.length > 0) {
      enhancedData.forEach((booking, index) => {
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
    
    // Compare with basic table
    console.log('🔍 Comparing with basic bookings table...')
    const { data: basicData, error: basicError } = await supabase
      .from('bookings')
      .select('id, client_id, provider_id, service_id, status')
      .limit(3)
    
    if (basicError) {
      console.error('❌ Basic table error:', basicError.message)
    } else if (basicData && basicData.length > 0) {
      console.log('📊 Basic table data:')
      basicData.forEach((booking, index) => {
        console.log(`  ${index + 1}. ID: ${booking.id.slice(0, 8)}...`)
        console.log(`     Client ID: ${booking.client_id?.slice(0, 8)}...`)
        console.log(`     Provider ID: ${booking.provider_id?.slice(0, 8)}...`)
        console.log(`     Service ID: ${booking.service_id?.slice(0, 8)}...`)
        console.log(`     Status: ${booking.status}`)
        console.log('')
      })
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testEnhancedView()
  .then(() => {
    console.log('🎉 Test completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Test failed:', error)
    process.exit(1)
  })
