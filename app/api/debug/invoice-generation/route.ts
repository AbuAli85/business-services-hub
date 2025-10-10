/**
 * API Route: Debug Invoice Generation
 * 
 * GET /api/debug/invoice-generation
 * 
 * Returns detailed diagnostic information about bookings that need invoices
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      )
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Find approved bookings with service_id
    const { data: approvedBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, status, amount, service_id, client_id, provider_id')
      .in('status', ['approved', 'completed'])
    
    console.log('Found approved bookings:', approvedBookings?.length)
    
    if (bookingsError) {
      throw bookingsError
    }
    
    // Find existing invoices
    const { data: existingInvoices } = await supabase
      .from('invoices')
      .select('booking_id')
    
    const existingBookingIds = new Set(existingInvoices?.map(inv => inv.booking_id) || [])
    const bookingsNeedingInvoices = approvedBookings?.filter(b => !existingBookingIds.has(b.id)) || []
    
    // Detailed diagnostics for each booking
    const diagnostics = await Promise.all(
      bookingsNeedingInvoices.map(async (booking) => {
        const issues: string[] = []
        const details: any = {
          bookingId: booking.id,
          status: booking.status,
          amount: booking.amount
        }
        
        // Check service with provider
        console.log('Checking booking service_id:', booking.service_id, 'for booking:', booking.id)
        
        if (!booking.service_id) {
          issues.push('Missing service_id')
        } else {
          const { data: service, error: serviceError } = await supabase
            .from('services')
            .select(`
              id,
              title,
              provider_id,
              provider:profiles!services_provider_id_fkey(
                id,
                full_name,
                email,
                company_id
              )
            `)
            .eq('id', booking.service_id)
            .single()
          
          console.log('Service query result:', { service, error: serviceError })
          
          if (serviceError) {
            issues.push(`Service query error: ${serviceError.message}`)
          } else if (!service) {
            issues.push('Service not found')
          } else {
            details.service = service.title
            
            if (!service.provider || (Array.isArray(service.provider) && service.provider.length === 0)) {
              issues.push('Service has no provider linked')
            } else {
              const provider = Array.isArray(service.provider) ? service.provider[0] : service.provider
              details.provider = provider.full_name || provider.email
              
              if (!provider.full_name) issues.push('Provider missing full_name')
              if (!provider.email) issues.push('Provider missing email')
            }
          }
        }
        
        // Check client
        if (booking.client_id) {
          const { data: client, error: clientError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('id', booking.client_id)
            .single()
          
          if (clientError || !client) {
            issues.push('Client not found')
          } else {
            details.client = client.full_name
            
            if (!client.full_name) issues.push('Client missing full_name')
            if (!client.email) issues.push('Client missing email')
          }
        } else {
          issues.push('Missing client_id')
        }
        
        // Check amount
        if (!booking.amount || booking.amount <= 0) {
          issues.push('Invalid or missing amount')
        }
        
        return {
          ...details,
          issues,
          canGenerate: issues.length === 0
        }
      })
    )
    
    return NextResponse.json({
      summary: {
        totalApproved: approvedBookings?.length || 0,
        needingInvoices: bookingsNeedingInvoices.length,
        withIssues: diagnostics.filter(d => d.issues.length > 0).length,
        readyToGenerate: diagnostics.filter(d => d.canGenerate).length
      },
      bookings: diagnostics
    })
    
  } catch (error) {
    console.error('❌ Debug API error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

