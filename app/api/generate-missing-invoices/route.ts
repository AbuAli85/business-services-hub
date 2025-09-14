import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'
import { SmartInvoiceService } from '@/lib/smart-invoice-service'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Starting bulk invoice generation for missing invoices...')
    const supabase = await getSupabaseClient()

    // Get all approved bookings that don't have invoices
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
        service_id
      `)
      .eq('approval_status', 'approved')
      .is('service_id', null) // Only bookings with service_id
      .not('service_id', 'is', null)

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

    console.log(`📊 Found ${bookingsNeedingInvoices.length} bookings that need invoices`)

    if (bookingsNeedingInvoices.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'All approved bookings already have invoices',
        generated: 0
      })
    }

    // Generate invoices for each booking
    const invoiceService = new SmartInvoiceService()
    const results = []
    let successCount = 0
    let errorCount = 0

    for (const booking of bookingsNeedingInvoices) {
      try {
        console.log(`🔧 Generating invoice for booking: ${booking.id} (${booking.title})`)
        
        const invoice = await invoiceService.generateInvoiceOnApproval(booking.id)
        
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
