/**
 * Debug Invoice Generation Issues
 * 
 * This script helps diagnose why invoice generation is failing
 * Run this to check your booking data structure
 */

import { createClient } from '@supabase/supabase-js'

async function debugInvoiceGeneration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials')
    return
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  console.log('🔍 Finding approved bookings without invoices...\n')
  
  // Find approved bookings
  const { data: approvedBookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('id, status, amount, service_id, client_id, provider_id')
    .in('status', ['approved', 'completed'])
  
  if (bookingsError) {
    console.error('❌ Error fetching bookings:', bookingsError)
    return
  }
  
  console.log(`📊 Found ${approvedBookings?.length || 0} approved bookings\n`)
  
  // Find existing invoices
  const { data: existingInvoices } = await supabase
    .from('invoices')
    .select('booking_id')
  
  const existingBookingIds = new Set(existingInvoices?.map(inv => inv.booking_id) || [])
  const bookingsNeedingInvoices = approvedBookings?.filter(b => !existingBookingIds.has(b.id)) || []
  
  console.log(`💡 ${bookingsNeedingInvoices.length} bookings need invoices\n`)
  
  if (bookingsNeedingInvoices.length === 0) {
    console.log('✅ All approved bookings have invoices!')
    return
  }
  
  // Check each booking in detail
  for (const booking of bookingsNeedingInvoices) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`📋 Booking ID: ${booking.id}`)
    console.log(`   Status: ${booking.status}`)
    console.log(`   Amount: ${booking.amount}`)
    
    const issues: string[] = []
    
    // Check service
    if (!booking.service_id) {
      issues.push('❌ Missing service_id')
    } else {
      const { data: service, error: serviceError } = await supabase
        .from('services')
        .select(`
          id,
          title,
          description,
          base_price,
          provider_id,
          provider:profiles!services_provider_id_fkey(
            id,
            full_name,
            email,
            phone,
            company_id,
            company:companies(
              name,
              address,
              phone,
              email,
              website,
              logo_url
            )
          )
        `)
        .eq('id', booking.service_id)
        .single()
      
      if (serviceError || !service) {
        issues.push(`❌ Service not found: ${serviceError?.message || 'Unknown error'}`)
      } else {
        console.log(`   ✅ Service: ${service.title}`)
        
        if (!service.provider || service.provider.length === 0) {
          issues.push('❌ Service has no provider')
        } else {
          const provider = Array.isArray(service.provider) ? service.provider[0] : service.provider
          console.log(`   ✅ Provider: ${provider.full_name || 'No name'}`)
          
          if (!provider.full_name) {
            issues.push('⚠️ Provider missing full_name')
          }
          if (!provider.email) {
            issues.push('⚠️ Provider missing email')
          }
          
          const company = Array.isArray(provider.company) ? provider.company[0] : provider.company
          if (!company) {
            issues.push('⚠️ Provider has no company (optional but recommended)')
          } else {
            console.log(`   ✅ Provider Company: ${company.name || 'No name'}`)
          }
        }
      }
    }
    
    // Check client
    if (!booking.client_id) {
      issues.push('❌ Missing client_id')
    } else {
      const { data: client, error: clientError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          phone,
          company_id,
          company:companies(
            name,
            address,
            phone,
            email,
            website
          )
        `)
        .eq('id', booking.client_id)
        .single()
      
      if (clientError || !client) {
        issues.push(`❌ Client not found: ${clientError?.message || 'Unknown error'}`)
      } else {
        console.log(`   ✅ Client: ${client.full_name || 'No name'}`)
        
        if (!client.full_name) {
          issues.push('⚠️ Client missing full_name')
        }
        if (!client.email) {
          issues.push('⚠️ Client missing email')
        }
        
        const company = Array.isArray(client.company) ? client.company[0] : client.company
        if (company) {
          console.log(`   ✅ Client Company: ${company.name || 'No name'}`)
        }
      }
    }
    
    // Check amount
    if (!booking.amount || booking.amount <= 0) {
      issues.push('❌ Invalid or missing amount')
    }
    
    // Summary
    if (issues.length > 0) {
      console.log('\n   🚨 ISSUES FOUND:')
      issues.forEach(issue => console.log(`      ${issue}`))
      console.log('\n   💡 Fix these issues before generating invoice')
    } else {
      console.log('\n   ✅ All data looks good! Should be able to generate invoice.')
    }
    
    console.log('')
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  console.log('📝 RECOMMENDATIONS:\n')
  console.log('1. Ensure all services have a valid provider_id')
  console.log('2. Ensure all profiles have full_name and email')
  console.log('3. Ensure all bookings have a valid amount')
  console.log('4. Consider adding company data for better invoices')
  console.log('\n📚 For more help, see AUTOMATED_INVOICE_SYSTEM.md')
}

// Run if called directly
if (require.main === module) {
  debugInvoiceGeneration().then(() => {
    console.log('\n✅ Debug complete')
    process.exit(0)
  }).catch(error => {
    console.error('\n❌ Debug failed:', error)
    process.exit(1)
  })
}

export { debugInvoiceGeneration }

