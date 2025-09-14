import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateTemplatePDF } from '@/lib/pdf-template-generator'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 PDF API - Starting request processing')
    
    // Check environment variables first
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ PDF API - Missing environment variables')
      return NextResponse.json({ 
        error: 'Server configuration error',
        details: 'Missing Supabase credentials'
      }, { status: 500 })
    }
    
    const body = await request.json()
    console.log('🔍 PDF API - Request body:', body)
    
    const { invoiceId } = body
    
    if (!invoiceId) {
      console.error('❌ PDF API - No invoice ID provided')
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 })
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(invoiceId)) {
      console.error('❌ PDF API - Invalid invoice ID format:', invoiceId)
      return NextResponse.json({ error: 'Invalid invoice ID format' }, { status: 400 })
    }

    console.log('🔍 Fetching invoice data for template PDF, ID:', invoiceId)
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        booking:bookings(
          id,
          status,
          requirements,
          client:profiles!bookings_client_id_fkey(
            id,
            full_name,
            email,
            phone,
            company:companies(
              id,
              name,
              address,
              phone,
              email,
              website,
              logo_url
            )
          ),
          service:services(
            id,
            title,
            description,
            provider:profiles!services_provider_id_fkey(
              id,
              full_name,
              email,
              phone,
              company:companies(
                id,
                name,
                address,
                phone,
                email,
                website,
                logo_url
              )
            )
          )
        )
      `)
      .eq('id', invoiceId)
      .single()

    if (invoiceError) {
      console.error('❌ Database error:', invoiceError)
      return NextResponse.json({ 
        error: 'Database error', 
        details: invoiceError.message 
      }, { status: 500 })
    }

    if (!invoice) {
      console.error('❌ Invoice not found')
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    console.log('✅ Invoice data fetched successfully for template PDF')
    console.log('🔍 PDF API - Booking data:', invoice?.booking)
    console.log('🔍 PDF API - Provider data:', invoice?.booking?.service?.provider)
    console.log('🔍 PDF API - Provider company:', invoice?.booking?.service?.provider?.company)
    console.log('🔍 PDF API - Client data:', invoice?.booking?.client)
    console.log('🔍 PDF API - Client company:', invoice?.booking?.client?.company)

    // Generate template PDF directly (no invoice_items table exists)
    const invoiceForPdf = { ...invoice }

    // Generate template PDF
    let pdfBuffer: Uint8Array
    try {
      console.log('🔍 PDF API - Starting PDF generation')
      console.log('🔍 PDF API - Invoice ID:', invoiceForPdf.id)
      console.log('🔍 PDF API - Booking exists:', !!invoiceForPdf.booking)
      console.log('🔍 PDF API - Service exists:', !!invoiceForPdf.booking?.service)
      console.log('🔍 PDF API - Provider exists:', !!invoiceForPdf.booking?.service?.provider)
      console.log('🔍 PDF API - Client exists:', !!invoiceForPdf.booking?.client)
      
      pdfBuffer = await generateTemplatePDF(invoiceForPdf)
      console.log('✅ PDF API - PDF generated successfully, size:', pdfBuffer.length)
    } catch (pdfError) {
      console.error('❌ PDF generation error:', pdfError)
      console.error('❌ PDF generation error stack:', pdfError instanceof Error ? pdfError.stack : 'No stack trace')
      
      // Return more detailed error information
      const errorMessage = pdfError instanceof Error ? pdfError.message : 'Unknown PDF generation error'
      const errorDetails = {
        message: errorMessage,
        invoiceId: invoiceForPdf.id,
        hasBooking: !!invoiceForPdf.booking,
        hasService: !!invoiceForPdf.booking?.service,
        hasProvider: !!invoiceForPdf.booking?.service?.provider,
        hasClient: !!invoiceForPdf.booking?.client
      }
      
      return NextResponse.json({ 
        error: 'Failed to generate template PDF', 
        details: errorMessage,
        debug: errorDetails
      }, { status: 500 })
    }
    
    console.log('✅ Template PDF generated successfully, size:', pdfBuffer.length, 'bytes')

    const invoiceNumber = invoice.invoice_number || `INV-${invoice.id.slice(-8).toUpperCase()}`

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-template-${invoiceNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error('❌ Template PDF API route error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
