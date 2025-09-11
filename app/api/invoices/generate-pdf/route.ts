import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { jsPDF } from 'jspdf'

function generateSimplePDF(invoice: any): Buffer {
  // Create a high-end, professional PDF using jsPDF
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

  // Create a new PDF document
  const doc = new jsPDF('p', 'mm', 'a4')
  
  // Set up premium colors
  const primaryColor = [25, 25, 35] // Dark navy
  const accentColor = [0, 123, 255] // Professional blue
  const successColor = [40, 167, 69] // Green
  const lightGray = [248, 249, 250]
  const darkGray = [73, 80, 87]
  const borderGray = [220, 220, 220]
  
  // Premium header with gradient effect
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.rect(0, 0, 210, 50, 'F')
  
  // Add subtle pattern to header
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2])
  doc.rect(0, 0, 210, 8, 'F')
  
  // Company logo area (placeholder for future logo integration)
  doc.setFillColor(255, 255, 255)
  doc.rect(20, 15, 30, 20, 'F')
  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2])
  doc.setLineWidth(2)
  doc.rect(20, 15, 30, 20, 'S')
  
  // Company name in header
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(28)
  doc.setFont('helvetica', 'bold')
  doc.text('Business Services Hub', 60, 30)
  
  // Tagline with premium styling
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text('Professional Services & Solutions', 60, 36)
  
  // Premium invoice title with accent
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2])
  doc.setFontSize(42)
  doc.setFont('helvetica', 'bold')
  doc.text('INVOICE', 20, 70)
  
  // Invoice number with premium styling
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2])
  doc.rect(20, 75, 60, 12, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(invoiceNumber, 25, 83)
  
  // Premium invoice details box
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2])
  doc.rect(120, 55, 80, 60, 'F')
  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2])
  doc.setLineWidth(2)
  doc.rect(120, 55, 80, 60, 'S')
  
  // Invoice details with premium typography
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('INVOICE DATE', 125, 65)
  doc.setFont('helvetica', 'normal')
  doc.text(createdDate, 125, 70)
  
  doc.setFont('helvetica', 'bold')
  doc.text('DUE DATE', 125, 80)
  doc.setFont('helvetica', 'normal')
  doc.text(dueDate, 125, 85)
  
  doc.setFont('helvetica', 'bold')
  doc.text('STATUS', 125, 95)
  doc.setFont('helvetica', 'normal')
  doc.text(invoice.status.toUpperCase(), 125, 100)
  
  // Premium client information section
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2])
  doc.rect(20, 120, 80, 8, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('BILL TO', 25, 126)
  
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(invoice.booking?.client?.full_name || 'Client Name', 20, 140)
  doc.setFont('helvetica', 'normal')
  doc.text(invoice.booking?.client?.company?.name || 'Client Company', 20, 145)
  doc.text(invoice.booking?.client?.email || 'client@email.com', 20, 150)
  
  // Premium company information section
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2])
  doc.rect(110, 120, 80, 8, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('FROM', 115, 126)
  
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Business Services Hub', 110, 140)
  doc.setFont('helvetica', 'normal')
  doc.text('123 Business Street, Suite 100', 110, 145)
  doc.text('City, State 12345', 110, 150)
  doc.text('info@businessservices.com', 110, 155)
  
  // Premium services section header
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.rect(20, 170, 170, 8, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('SERVICES RENDERED', 25, 176)
  
  // Premium table with enhanced styling
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2])
  doc.rect(20, 185, 170, 20, 'F')
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('DESCRIPTION', 25, 197)
  doc.text('QTY', 120, 197)
  doc.text('UNIT PRICE', 150, 197)
  doc.text('TOTAL', 180, 197)
  
  // Table row with premium styling
  doc.setFillColor(255, 255, 255)
  doc.rect(20, 205, 170, 20, 'F')
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2])
  doc.rect(20, 205, 170, 20, 'S')
  
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')
  doc.text(invoice.booking?.service?.title || 'Professional Service', 25, 217)
  doc.text('1', 120, 217)
  doc.text(`${invoice.amount} ${invoice.currency}`, 150, 217)
  doc.text(`${invoice.amount} ${invoice.currency}`, 180, 217)
  
  // Premium total section with enhanced design
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2])
  doc.rect(120, 235, 70, 50, 'F')
  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2])
  doc.setLineWidth(2)
  doc.rect(120, 235, 70, 50, 'S')
  
  // Total section header
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2])
  doc.rect(120, 235, 70, 12, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL SUMMARY', 125, 243)
  
  // Financial breakdown
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Subtotal:', 125, 255)
  doc.text(`${invoice.amount} ${invoice.currency}`, 160, 255)
  
  doc.text('Tax (0%):', 125, 265)
  doc.text(`0.00 ${invoice.currency}`, 160, 265)
  
  // Total with premium styling
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.rect(120, 270, 70, 15, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('TOTAL:', 125, 280)
  doc.text(`${invoice.amount} ${invoice.currency}`, 160, 280)
  
  // Premium payment information section
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2])
  doc.rect(20, 300, 170, 8, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('PAYMENT INFORMATION', 25, 306)
  
  // Payment details with premium styling
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Payment Methods: Credit Card, Bank Transfer, PayPal', 20, 320)
  doc.text('Payment Terms: Net 30 days from invoice date', 20, 325)
  doc.text('Questions: billing@businessservices.com', 20, 330)
  
  // Premium thank you section
  doc.setFillColor(successColor[0], successColor[1], successColor[2])
  doc.rect(20, 340, 170, 15, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Thank you for your business!', 25, 350)
  
  // Premium footer with enhanced design
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.rect(0, 365, 210, 27, 'F')
  
  // Footer content
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Business Services Hub | 123 Business Street, Suite 100 | info@businessservices.com', 20, 375)
  doc.text('This invoice was generated electronically and is valid without signature.', 20, 382)
  
  // Add subtle border around entire document
  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2])
  doc.setLineWidth(1)
  doc.rect(5, 5, 200, 282, 'S')
  
  // Convert to buffer
  const pdfBuffer = doc.output('arraybuffer')
  return Buffer.from(pdfBuffer)
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
