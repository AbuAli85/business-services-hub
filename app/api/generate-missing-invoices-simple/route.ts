import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Starting simple bulk invoice generation...')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get bookings that should have invoices (approved or active)
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
      .or('approval_status.eq.approved,status.in.(approved,in_progress,completed)')

    if (bookingsError) {
      console.error('❌ Error fetching approved bookings:', bookingsError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch approved bookings',
        details: bookingsError 
      })
    }

    console.log(`📊 Found ${approvedBookings?.length || 0} approved bookings for provider`)

    if (!approvedBookings || approvedBookings.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No approved bookings found for this provider',
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

    // Generate simple invoices for each booking
    const results = []
    let successCount = 0
    let errorCount = 0

    for (const booking of bookingsNeedingInvoices) {
      try {
        console.log(`🔧 Creating simple invoice for booking: ${booking.id} (${booking.title})`)
        
        // Generate invoice number
        const invoiceNumber = `INV-${String(Date.now()).slice(-6)}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
        
        // Calculate amounts
        const subtotal = booking.amount || 0
        const vatPercent = 5.0
        const vatAmount = Math.round((subtotal * vatPercent / 100) * 100) / 100
        const totalAmount = subtotal + vatAmount
        
        // Create due date (30 days from now)
        const dueDate = new Date()
        dueDate.setDate(dueDate.getDate() + 30)

        // Insert invoice with basic fields only
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            booking_id: booking.id,
            client_id: booking.client_id,
            provider_id: booking.provider_id,
            amount: totalAmount,
            currency: booking.currency || 'OMR',
            status: 'issued',
            invoice_number: invoiceNumber,
            due_date: dueDate.toISOString(),
            subtotal: subtotal,
            vat_percent: vatPercent,
            vat_amount: vatAmount,
            total_amount: totalAmount,
            payment_terms: 'Payment due within 30 days',
            notes: `Invoice for ${booking.title} - Booking #${booking.id.slice(0, 8)}`
          })
          .select()
          .single()

        if (invoiceError) {
          throw new Error(`Database error: ${invoiceError.message}`)
        }

        successCount++
        results.push({
          booking_id: booking.id,
          booking_title: booking.title,
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          amount: invoice.amount,
          status: 'success'
        })
        console.log(`✅ Created invoice ${invoice.invoice_number} for booking ${booking.id}`)

      } catch (error) {
        errorCount++
        results.push({
          booking_id: booking.id,
          booking_title: booking.title,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        console.error(`❌ Error creating invoice for booking ${booking.id}:`, error)
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
