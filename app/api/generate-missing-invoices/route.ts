import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
// SmartInvoiceService may be exported differently across builds; resolve dynamically at runtime

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Starting bulk invoice generation for missing invoices...')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get bookings that should have invoices
    const { data: approvedBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        title,
        amount,
        currency,
        approval_status,
        created_at,
        provider_id,
        client_id,
        service_id,
        status
      `)
      .or('approval_status.eq.approved,status.in.(approved,in_progress,completed)')

    if (bookingsError) {
      console.error('❌ Error fetching approved bookings:', bookingsError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch approved bookings',
        details: bookingsError 
      })
    }

    console.log(`📊 Found ${approvedBookings?.length || 0} approved bookings without invoices`)

    if (!approvedBookings || approvedBookings.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No approved bookings found that need invoices',
        generated: 0
      })
    }

    // Check which bookings already have invoices
    const bookingIds = approvedBookings.map(b => b.id)
    const { data: existingInvoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('booking_id')
      .in('booking_id', bookingIds)

    if (invoicesError) {
      console.error('❌ Error checking existing invoices:', invoicesError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to check existing invoices',
        details: invoicesError 
      })
    }

    const existingBookingIds = new Set(existingInvoices?.map(inv => inv.booking_id) || [])
    const bookingsNeedingInvoices = approvedBookings.filter(b => !existingBookingIds.has(b.id))

    // Ensure provider_id exists for each booking by looking up the service if missing
    const bookingsWithProvider = [] as any[]
    for (const b of bookingsNeedingInvoices) {
      if (!b.provider_id) {
        const { data: svc } = await supabase
          .from('services')
          .select('provider_id')
          .eq('id', b.service_id)
          .single()
        bookingsWithProvider.push({ ...b, provider_id: svc?.provider_id || null })
      } else {
        bookingsWithProvider.push(b)
      }
    }

    console.log(`📊 Found ${bookingsNeedingInvoices.length} bookings that need invoices`)

    if (bookingsNeedingInvoices.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'All approved bookings already have invoices',
        generated: 0
      })
    }

    // Try to load SmartInvoiceService; fall back to simple insert if unavailable
    let invoiceService: any = null
    try {
      const mod: any = await import('@/lib/smart-invoice-service')
      const Ctor = mod?.SmartInvoiceService || mod?.default
      if (typeof Ctor === 'function') {
        invoiceService = new Ctor()
      } else if (mod?.smartInvoiceService) {
        invoiceService = mod.smartInvoiceService
      } else {
        invoiceService = null
      }
    } catch (e) {
      console.warn('⚠️ Could not load SmartInvoiceService, will use simple insert fallback')
    }
    const results = []
    let successCount = 0
    let errorCount = 0

    for (const booking of bookingsWithProvider) {
      try {
        console.log(`🔧 Generating invoice for booking: ${booking.id} (${booking.title})`)
        
        let invoice: any = null
        if (invoiceService?.generateInvoiceOnApproval) {
          invoice = await invoiceService.generateInvoiceOnApproval(booking.id)
        } else {
          // Fallback: simple invoice insert using booking fields
          const subtotal = booking.amount || 0
          const vatPercent = 5.0
          const vatAmount = Math.round((subtotal * vatPercent / 100) * 100) / 100
          const totalAmount = subtotal + vatAmount
          const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 30)
          const { data: created, error: insertError } = await supabase
            .from('invoices')
            .insert({
              booking_id: booking.id,
              client_id: booking.client_id,
              provider_id: booking.provider_id,
              amount: totalAmount,
              currency: booking.currency || 'OMR',
              status: 'issued',
              due_date: dueDate.toISOString(),
              subtotal,
              tax_rate: vatPercent,
              tax_amount: vatAmount,
              total_amount: totalAmount
            })
            .select()
            .single()
          if (insertError) {
            throw new Error(insertError.message)
          }
          invoice = created
        }
        
        if (invoice) {
          successCount++
          results.push({
            booking_id: booking.id,
            booking_title: booking.title,
            invoice_id: invoice.id,
            invoice_number: invoice.invoice_number,
            amount: invoice.amount,
            status: 'success'
          })
          console.log(`✅ Generated invoice ${invoice.invoice_number} for booking ${booking.id}`)
        } else {
          errorCount++
          results.push({
            booking_id: booking.id,
            booking_title: booking.title,
            status: 'skipped',
            reason: 'Invoice generation returned null'
          })
          console.log(`⚠️ Invoice generation skipped for booking ${booking.id}`)
        }
      } catch (error) {
        errorCount++
        results.push({
          booking_id: booking.id,
          booking_title: booking.title,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        console.error(`❌ Error generating invoice for booking ${booking.id}:`, error)
      }
    }

    console.log(`📊 Invoice generation completed: ${successCount} success, ${errorCount} errors`)

    return NextResponse.json({ 
      success: true,
      message: `Generated ${successCount} invoices, ${errorCount} errors`,
      generated: successCount,
      errors: errorCount,
      results: results
    })

  } catch (error) {
    console.error('❌ Bulk invoice generation error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Bulk invoice generation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
