import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase'
import { SmartInvoiceService } from '@/lib/smart-invoice-service'

export async function POST(request: NextRequest) {
  try {
    const { bookingId } = await request.json()
    
    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId is required' }, { status: 400 })
    }

    console.log('🧪 Testing invoice generation for booking:', bookingId)
    
    const supabase = await getSupabaseAdminClient()
    
    // Check if booking exists and is approved
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        status,
        approval_status,
        amount,
        currency,
        client_id,
        provider_id,
        service:services(title),
        client:profiles(full_name, email),
        provider:profiles(full_name, email)
      `)
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ 
        error: 'Booking not found', 
        details: bookingError?.message 
      }, { status: 404 })
    }

    if (booking.status !== 'approved') {
      return NextResponse.json({ 
        error: 'Booking is not approved', 
        status: booking.status 
      }, { status: 400 })
    }

    // Check if invoice already exists
    const { data: existingInvoice } = await supabase
      .from('invoices')
      .select('id, invoice_number, status')
      .eq('booking_id', bookingId)
      .single()

    if (existingInvoice) {
      return NextResponse.json({ 
        message: 'Invoice already exists',
        invoice: existingInvoice
      })
    }

    // Generate invoice using SmartInvoiceService
    const invoiceService = new SmartInvoiceService()
    const invoice = await invoiceService.generateInvoiceOnApproval(bookingId)

    if (invoice) {
      return NextResponse.json({ 
        success: true,
        message: 'Invoice generated successfully',
        invoice: {
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          status: invoice.status,
          amount: invoice.amount,
          currency: invoice.currency
        }
      })
    } else {
      return NextResponse.json({ 
        error: 'Failed to generate invoice',
        details: 'Invoice generation returned null'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ Test invoice generation error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseAdminClient()
    
    // Get recent approved bookings
    const { data: bookings, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        status,
        approval_status,
        amount,
        currency,
        created_at,
        service:services(title),
        client:profiles(full_name),
        provider:profiles(full_name)
      `)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(10)

    if (bookingError) {
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
    }

    // Check which bookings have invoices
    const bookingsWithInvoiceStatus = await Promise.all(
      (bookings || []).map(async (booking) => {
        const { data: invoice } = await supabase
          .from('invoices')
          .select('id, invoice_number, status')
          .eq('booking_id', booking.id)
          .single()

        return {
          ...booking,
          has_invoice: !!invoice,
          invoice: invoice || null
        }
      })
    )

    return NextResponse.json({
      success: true,
      bookings: bookingsWithInvoiceStatus,
      summary: {
        total_approved: bookings?.length || 0,
        with_invoices: bookingsWithInvoiceStatus.filter(b => b.has_invoice).length,
        without_invoices: bookingsWithInvoiceStatus.filter(b => !b.has_invoice).length
      }
    })

  } catch (error) {
    console.error('❌ Error fetching booking status:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
