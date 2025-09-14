import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing invoice generation fix...')
    
    const supabase = await getSupabaseClient()
    
    // Get a recent approved booking
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        status,
        amount,
        currency,
        service:services(
          id,
          title,
          description,
          base_price,
          provider:profiles(
            id,
            full_name,
            email,
            company:companies(
              name,
              logo_url
            )
          )
        ),
        client:profiles(
          id,
          full_name,
          email
        )
      `)
      .eq('status', 'approved')
      .limit(1)
      .order('created_at', { ascending: false })

    if (bookingsError) {
      console.error('❌ Error fetching bookings:', bookingsError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch bookings',
        details: bookingsError 
      })
    }

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No approved bookings found' 
      })
    }

    const booking = bookings[0]
    console.log('🔍 Found approved booking:', booking.id)

    // Check if invoice already exists
    const { data: existingInvoice } = await supabase
      .from('invoices')
      .select('id, invoice_number')
      .eq('booking_id', booking.id)
      .single()

    if (existingInvoice) {
      console.log('ℹ️ Invoice already exists:', existingInvoice.invoice_number)
      return NextResponse.json({ 
        success: true, 
        message: 'Invoice already exists',
        invoice: existingInvoice
      })
    }

    // Test the SmartInvoiceService
    const { SmartInvoiceService } = await import('@/lib/smart-invoice-service')
    const invoiceService = new SmartInvoiceService()
    
    console.log('🔧 Testing invoice generation for booking:', booking.id)
    const invoice = await invoiceService.generateInvoiceOnApproval(booking.id)
    
    if (invoice) {
      console.log('✅ Invoice generated successfully:', invoice.id)
      return NextResponse.json({ 
        success: true, 
        message: 'Invoice generated successfully',
        invoice: {
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          amount: invoice.amount,
          currency: invoice.currency,
          status: invoice.status
        }
      })
    } else {
      console.log('❌ Invoice generation failed')
      return NextResponse.json({ 
        success: false, 
        error: 'Invoice generation failed' 
      })
    }

  } catch (error) {
    console.error('❌ Test error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
