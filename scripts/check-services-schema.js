#!/usr/bin/env node

/**
 * Check Services Table Schema
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function checkServicesSchema() {
  console.log('🔍 Checking Services Table Schema\n')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('❌ Environment variables not configured!')
    return
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    // Get existing services to see the structure
    const { data: services, error } = await supabase
      .from('services')
      .select('*')
      .limit(1)
    
    if (error) {
      console.log('❌ Error fetching services:', error.message)
      return
    }
    
    if (services && services.length > 0) {
      console.log('✅ Services table structure:')
      const service = services[0]
      Object.keys(service).forEach(key => {
        const value = service[key]
        const type = typeof value
        console.log(`  ${key}: ${type} = ${value}`)
      })
    } else {
      console.log('❌ No services found in database')
    }
    
  } catch (error) {
    console.log('❌ Error checking services schema:', error.message)
  }
}

checkServicesSchema().catch(console.error)
