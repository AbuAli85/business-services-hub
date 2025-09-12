import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateProfessionalPDF, shouldRegeneratePDF } from '@/lib/pdf-invoice-generator'

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

    console.log('🔍 Fetching invoice data for ID:', invoiceId)

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

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

    console.log('✅ Invoice data fetched successfully')

    // Check if PDF should be regenerated using smart cache logic
    const shouldRegenerate = shouldRegeneratePDF(invoice)

    if (!shouldRegenerate && invoice.pdf_url) {
      console.log('📄 Using existing PDF:', invoice.pdf_url)
      // Return existing PDF URL
      return NextResponse.json({ 
        pdf_url: invoice.pdf_url,
        message: 'PDF already exists',
        cached: true 
      })
    }

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

    // Generate PDF with error handling
    let pdfBuffer: Uint8Array
    try {
      pdfBuffer = await generateProfessionalPDF(invoiceForPdf)
    } catch (pdfError) {
      console.error('❌ Error generating PDF:', pdfError)
      return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
    }
    
    console.log('✅ PDF generated successfully, size:', pdfBuffer.length, 'bytes')

    // Upload PDF to Supabase Storage for caching
    const invoiceNumber = invoice.invoice_number || `INV-${invoice.id.slice(-8).toUpperCase()}`
    const fileName = `invoice-${invoiceNumber}.pdf`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: true
      })

    let pdfUrl = `/api/invoices/pdf/${invoiceId}` // Fallback URL
    
    if (uploadError) {
      console.warn('⚠️ Could not upload PDF to storage:', uploadError.message)
    } else {
      // Get public URL from storage
      const { data: urlData } = supabase.storage
        .from('invoices')
        .getPublicUrl(fileName)
      pdfUrl = urlData.publicUrl
      console.log('✅ PDF uploaded to storage:', pdfUrl)
    }

    // Store PDF URL in database
    const { error: updateError } = await supabase
      .from('invoices')
      .update({ pdf_url: pdfUrl })
      .eq('id', invoiceId)

    if (updateError) {
      console.warn('⚠️ Could not update PDF URL in database:', updateError.message)
    } else {
      console.log('✅ PDF URL stored in database')
    }

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoiceNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error('❌ API route error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}