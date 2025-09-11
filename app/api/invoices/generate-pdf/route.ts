import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function generateSimplePDF(invoice: any): Buffer {
  // Create a professional PDF using basic PDF structure with better formatting
  const invoiceNumber = invoice.invoice_number || `INV-${invoice.id.slice(-8).toUpperCase()}`
  const createdDate = new Date(invoice.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  
  const dueDate = invoice.due_date ? 
    new Date(invoice.due_date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : 
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

  // Create a professional PDF structure with better spacing and formatting
  const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
  /Font <<
    /F1 5 0 R
    /F2 6 0 R
    /F3 7 0 R
  >>
>>
>>
endobj

4 0 obj
<<
/Length 3000
>>
stream
BT
/F1 28 Tf
50 750 Td
(Business Services Hub) Tj
0 -25 Td
/F2 14 Tf
(Professional Services & Solutions) Tj
0 -60 Td
/F1 32 Tf
(INVOICE) Tj
0 -25 Td
/F2 16 Tf
(${invoiceNumber}) Tj
0 -50 Td
/F3 12 Tf
(Invoice Date: ${createdDate}) Tj
0 -18 Td
(Due Date: ${dueDate}) Tj
0 -18 Td
(Status: ${invoice.status.toUpperCase()}) Tj
0 -40 Td
/F1 14 Tf
(BILL TO:) Tj
0 -20 Td
/F3 12 Tf
(${invoice.booking?.client?.full_name || 'Client Name'}) Tj
0 -15 Td
(${invoice.booking?.client?.company?.name || 'Client Company'}) Tj
0 -15 Td
(${invoice.booking?.client?.email || 'client@email.com'}) Tj
0 -40 Td
/F1 14 Tf
(FROM:) Tj
0 -20 Td
/F3 12 Tf
(Business Services Hub) Tj
0 -15 Td
(123 Business Street, Suite 100) Tj
0 -15 Td
(City, State 12345) Tj
0 -15 Td
(info@businessservices.com) Tj
0 -50 Td
/F1 16 Tf
(FOR SERVICES RENDERED) Tj
0 -30 Td
/F1 12 Tf
(DESCRIPTION) Tj
300 0 Td
(QTY) Tj
50 0 Td
(UNIT PRICE) Tj
80 0 Td
(TOTAL) Tj
-430 -25 Td
/F3 12 Tf
(${invoice.booking?.service?.title || 'Professional Service'}) Tj
300 0 Td
(1) Tj
50 0 Td
(${invoice.amount} ${invoice.currency}) Tj
80 0 Td
(${invoice.amount} ${invoice.currency}) Tj
-430 -40 Td
/F1 14 Tf
(Subtotal: ${invoice.amount} ${invoice.currency}) Tj
0 -20 Td
(Tax (0%): 0.00 ${invoice.currency}) Tj
0 -20 Td
/F1 18 Tf
(TOTAL: ${invoice.amount} ${invoice.currency}) Tj
0 -50 Td
/F1 14 Tf
(PAYMENT INFORMATION) Tj
0 -20 Td
/F3 12 Tf
(Payment Methods: Credit Card, Bank Transfer, PayPal) Tj
0 -15 Td
(Payment Terms: Net 30 days from invoice date) Tj
0 -15 Td
(Questions: billing@businessservices.com) Tj
0 -40 Td
/F1 14 Tf
(Thank you for your business!) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica-Bold
>>
endobj

6 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica-Oblique
>>
endobj

7 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 8
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000204 00000 n 
0000002500 00000 n 
0000002600 00000 n 
0000002700 00000 n 
trailer
<<
/Size 8
/Root 1 0 R
>>
startxref
3600
%%EOF`

  return Buffer.from(pdfContent, 'utf-8')
}

export async function POST(request: NextRequest) {
  try {
    const { invoiceId } = await request.json()
    
    console.log('🔍 PDF generation request for invoice:', invoiceId)
    
    if (!invoiceId) {
      console.error('❌ No invoice ID provided')
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 })
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(invoiceId)) {
      console.error('❌ Invalid invoice ID format:', invoiceId)
      return NextResponse.json({ error: 'Invalid invoice ID format' }, { status: 400 })
    }

    // Create Supabase client with service role for API access
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase credentials')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Check if this is a virtual invoice (starts with 'virtual-')
    if (invoiceId.startsWith('virtual-')) {
      console.log('📄 Generating virtual invoice PDF')
      const pdfUrl = `/api/invoices/pdf/${invoiceId}.pdf`
      return NextResponse.json({ 
        success: true, 
        pdfUrl,
        message: 'Virtual invoice PDF generated successfully' 
      })
    }
    
    console.log('🔍 Fetching invoice from database...')
    
    // Get the invoice details from database with full relationships
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        booking:bookings(
          id,
          status,
          requirements,
          service:services(
            id,
            title,
            description,
            provider:profiles!services_provider_id_fkey(
              id,
              full_name,
              email,
              company:companies(
                id,
                name,
                logo_url
              )
            )
          ),
          client:profiles!bookings_client_id_fkey(
            id,
            full_name,
            email,
            company:companies(
              id,
              name,
              logo_url
            )
          )
        )
      `)
      .eq('id', invoiceId)
      .single()

    if (invoiceError) {
      console.error('❌ Database error:', invoiceError)
      console.error('❌ Error details:', {
        message: invoiceError.message,
        details: invoiceError.details,
        hint: invoiceError.hint,
        code: invoiceError.code
      })
      return NextResponse.json({ 
        error: 'Database error', 
        details: invoiceError.message,
        code: invoiceError.code
      }, { status: 500 })
    }

    if (!invoice) {
      console.error('❌ Invoice not found in database:', invoiceId)
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    console.log('✅ Invoice found:', invoice.id, invoice.invoice_number)
    console.log('📄 Invoice data:', {
      id: invoice.id,
      amount: invoice.amount,
      currency: invoice.currency,
      status: invoice.status,
      invoice_number: invoice.invoice_number
    })

    try {
      // Generate simple PDF
      const pdfContent = generateSimplePDF(invoice)
      
      console.log('✅ PDF content generated, size:', pdfContent.length, 'bytes')
      
      // Update the invoice with the PDF URL (optional, don't fail if this doesn't work)
      const pdfUrl = `/api/invoices/pdf/${invoiceId}.pdf`
      const { error: updateError } = await supabase
        .from('invoices')
        .update({ pdf_url: pdfUrl })
        .eq('id', invoiceId)

      if (updateError) {
        console.warn('⚠️ Failed to update invoice with PDF URL:', updateError)
        // Don't fail the request if PDF URL update fails
      } else {
        console.log('✅ PDF URL updated successfully')
      }

      // Return the actual PDF content
      return new NextResponse(pdfContent as any, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="invoice-${invoice.invoice_number || invoiceId}.pdf"`,
        },
      })
    } catch (pdfError) {
      console.error('❌ PDF generation error:', pdfError)
      return NextResponse.json({ 
        error: 'PDF generation failed', 
        details: pdfError instanceof Error ? pdfError.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
