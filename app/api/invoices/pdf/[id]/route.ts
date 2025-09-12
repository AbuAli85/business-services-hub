import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateProfessionalPDF, shouldRegeneratePDF } from '@/lib/pdf-invoice-generator'

export async function GET(
  request: NextRequest, 
  { params }: { params: { id: string } }
) {
  console.log('🚀 GET /api/invoices/pdf/[id] route called')
  console.log('📋 Params:', params)
  console.log('🔗 URL:', request.url)
  
  try {
    const invoiceId = params.id.replace('.pdf', '')
    console.log('🔍 GET /api/invoices/pdf/[id] called with ID:', invoiceId)
    
    // Use service role key for elevated permissions
    // SECURITY NOTE: This should be moved to Supabase Edge Functions for production
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase environment variables')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check if PDF already exists in storage first
    console.log('🔍 Checking for existing invoice in database...')
    const { data: existingInvoice, error: existingError } = await supabase
      .from('invoices')
      .select('pdf_url, status, updated_at, created_at')
      .eq('id', invoiceId)
      .single()

    if (existingError) {
      console.error('❌ Error fetching existing invoice:', existingError)
      return NextResponse.json({ error: 'Database error', details: existingError.message }, { status: 500 })
    }

    console.log('📄 Existing invoice data:', existingInvoice)

    if (existingInvoice?.pdf_url && existingInvoice.pdf_url.includes('storage')) {
      // Check if we should regenerate using smart cache logic
      const shouldRegenerate = shouldRegeneratePDF(existingInvoice.pdf_url)
      
      if (!shouldRegenerate) {
        console.log('📄 Redirecting to existing PDF in storage:', existingInvoice.pdf_url)
        return NextResponse.redirect(existingInvoice.pdf_url)
      }
    }
    
    // Get the invoice details from database (without invoice_items relationship)
    console.log('🔍 Fetching full invoice details...')
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        client:profiles!invoices_client_id_fkey(
          id,
          full_name,
          email,
          company:companies(id, name, address)
        ),
        provider:profiles!invoices_provider_id_fkey(
          id,
          full_name,
          email,
          company:companies(id, name, address, phone, email, logo_url, vat_number, cr_number)
        ),
        booking:bookings(
          id,
          service:services(title, description, price)
        )
      `)
      .eq('id', invoiceId)
      .single()

    if (invoiceError) {
      console.error('❌ Error fetching invoice details:', invoiceError)
      return NextResponse.json({ error: 'Database error', details: invoiceError.message }, { status: 500 })
    }

    if (!invoice) {
      console.error('❌ Invoice not found in database')
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    console.log('✅ Invoice found:', invoice.id, invoice.invoice_number)

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

    let pdfBuffer: Uint8Array
    try {
      console.log('🔍 Generating PDF...')
      pdfBuffer = await generateProfessionalPDF(invoiceForPdf)
      console.log('✅ PDF generated successfully, size:', pdfBuffer.length, 'bytes')
    } catch (pdfError) {
      console.error('❌ Error generating PDF:', pdfError)
      return NextResponse.json({ error: 'Failed to generate PDF', details: pdfError instanceof Error ? pdfError.message : 'Unknown error' }, { status: 500 })
    }

    const invoiceNumber = invoice.invoice_number || `INV-${invoice.id.slice(-8).toUpperCase()}`

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoiceNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error('API route error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}