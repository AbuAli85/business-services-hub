import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateTemplatePDF } from '@/lib/pdf-template-generator'

export async function POST(request: NextRequest) {
  try {
    const { invoiceId } = await request.json()
    
    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 })
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(invoiceId)) {
      return NextResponse.json({ error: 'Invalid invoice ID format' }, { status: 400 })
    }

    console.log('🔍 Fetching invoice data for template PDF, ID:', invoiceId)

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        invoice_items(*),
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
    console.log('🔍 PDF API - Provider data:', invoice?.provider)
    console.log('🔍 PDF API - Provider company:', invoice?.provider?.company)
    console.log('🔍 PDF API - Client data:', invoice?.client)
    console.log('🔍 PDF API - Client company:', invoice?.client?.company)

    // Fetch invoice_items
    const { data: items, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoice.id)

    if (itemsError) {
      console.warn('⚠️ Could not load invoice_items; continuing without items:', itemsError.message)
    }

    // Attach items to invoice
    const invoiceForPdf = { ...invoice, invoice_items: items || [] }

    // Generate template PDF
    let pdfBuffer: Uint8Array
    try {
      pdfBuffer = await generateTemplatePDF(invoiceForPdf)
    } catch (pdfError) {
      console.error('❌ Error generating template PDF:', pdfError)
      return NextResponse.json({ error: 'Failed to generate template PDF' }, { status: 500 })
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
