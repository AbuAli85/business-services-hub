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
    console.log('Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set')
    return
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  try {
    // Test if enhanced view exists
    const { data: enhancedData, error: enhancedError } = await supabase
      .from('enhanced_bookings')
      .select('*')
      .limit(1)
    
    if (enhancedError) {
      console.error('❌ Enhanced view error:', enhancedError.message)
      return
    }
    
    if (enhancedData && enhancedData.length > 0) {
      const sample = enhancedData[0]
      console.log('✅ Enhanced bookings view is working!')
      console.log('📊 Sample data structure:')
      console.log(`   - ID: ${sample.id}`)
      console.log(`   - Client: ${sample.client_name || 'N/A'} (${sample.client_email || 'No email'})`)
      console.log(`   - Provider: ${sample.provider_name || 'N/A'} (${sample.provider_email || 'No email'})`)
      console.log(`   - Service: ${sample.service_title || 'N/A'}`)
      console.log(`   - Client Company: ${sample.client_company_name || 'N/A'}`)
      console.log(`   - Provider Company: ${sample.client_company_name || 'N/A'}`)
      console.log(`   - Status: ${sample.status}`)
      console.log(`   - Created: ${sample.created_at}`)
      
      // Check if we have the new fields
      const hasNewFields = sample.client_email && sample.provider_email && sample.client_company_name
      if (hasNewFields) {
        console.log('🎉 All new fields are available!')
      } else {
        console.log('⚠️  Some new fields are missing - may need to run migration 044')
      }
    } else {
      console.log('ℹ️  Enhanced view exists but no data found')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
  
  console.log('🎉 Test completed')
}

testEnhancedView()
