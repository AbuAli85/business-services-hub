import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { invoiceId } = await request.json()
    
    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 })
    }

    const supabase = await getSupabaseClient()
    
    // Check if this is a virtual invoice (starts with 'virtual-')
    if (invoiceId.startsWith('virtual-')) {
      // For virtual invoices, we'll create a simple PDF URL
      const pdfUrl = `/api/invoices/pdf/${invoiceId}.pdf`
      return NextResponse.json({ 
        success: true, 
        pdfUrl,
        message: 'Virtual invoice PDF generated successfully' 
      })
    }
    
    // Get the invoice details from database
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        bookings:booking_id (
          id,
          title,
          subtotal,
          currency,
          services:service_id (
            title,
            description
          )
        ),
        clients:client_id (
          full_name,
          email,
          phone
        ),
        providers:provider_id (
          full_name,
          email,
          phone,
          company_name
        )
      `)
      .eq('id', invoiceId)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // For now, we'll create a simple PDF URL placeholder
    // In a real implementation, you would generate an actual PDF using a library like puppeteer or jsPDF
    const pdfUrl = `/api/invoices/pdf/${invoiceId}.pdf`
    
    // Update the invoice with the PDF URL
    const { error: updateError } = await supabase
      .from('invoices')
      .update({ pdf_url: pdfUrl })
      .eq('id', invoiceId)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      pdfUrl,
      message: 'PDF generated successfully' 
    })

  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
