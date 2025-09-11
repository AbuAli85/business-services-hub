import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'

function generateSimplePDF(invoice: any): Buffer {
  // Simple PDF generation - in production, use a proper PDF library like puppeteer or jsPDF
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
>>
endobj

4 0 obj
<<
/Length 200
>>
stream
BT
/F1 12 Tf
100 700 Td
(Invoice #${invoice.id || 'N/A'}) Tj
0 -20 Td
(Amount: ${invoice.amount || 0} ${invoice.currency || 'OMR'}) Tj
0 -20 Td
(Status: ${invoice.status || 'N/A'}) Tj
0 -20 Td
(Created: ${invoice.created_at || 'N/A'}) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000204 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
454
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

    const supabase = await getSupabaseClient()
    
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
    
    // Get the invoice details from database
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        booking:bookings(
          id,
          subtotal,
          currency
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
      console.error('❌ Invoice not found in database:', invoiceId)
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    console.log('✅ Invoice found:', invoice.id, invoice.invoice_number)

    // Generate a simple PDF content (in a real implementation, use a PDF library)
    const pdfContent = generateSimplePDF(invoice)
    
    // Update the invoice with the PDF URL
    const pdfUrl = `/api/invoices/pdf/${invoiceId}.pdf`
    const { error: updateError } = await supabase
      .from('invoices')
      .update({ pdf_url: pdfUrl })
      .eq('id', invoiceId)

    if (updateError) {
      console.warn('Failed to update invoice with PDF URL:', updateError)
    }

    // Return the PDF content as a blob
    return new NextResponse(pdfContent as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoiceId}.pdf"`,
      },
    })

  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
