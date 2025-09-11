import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { jsPDF } from 'jspdf'

function generateSimplePDF(invoice: any): Buffer {
  // Create a modern, professional PDF using jsPDF
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
  
  // Set up colors
  const primaryColor = [44, 90, 160] // Blue
  const secondaryColor = [108, 117, 125] // Gray
  const accentColor = [40, 167, 69] // Green
  
  // Header Section
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.rect(0, 0, 210, 40, 'F')
  
  // Company name in header
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('Business Services Hub', 20, 25)
  
  // Tagline
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text('Professional Services & Solutions', 20, 32)
  
  // Invoice title
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(36)
  doc.setFont('helvetica', 'bold')
  doc.text('INVOICE', 20, 60)
  
  // Invoice number
  doc.setFontSize(16)
  doc.setFont('helvetica', 'normal')
  doc.text(invoiceNumber, 20, 70)
  
  // Invoice details box
  doc.setFillColor(248, 249, 250)
  doc.rect(120, 50, 80, 50, 'F')
  doc.setDrawColor(220, 220, 220)
  doc.rect(120, 50, 80, 50, 'S')
  
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Invoice Date:', 125, 60)
  doc.setFont('helvetica', 'normal')
  doc.text(createdDate, 125, 65)
  
  doc.setFont('helvetica', 'bold')
  doc.text('Due Date:', 125, 75)
  doc.setFont('helvetica', 'normal')
  doc.text(dueDate, 125, 80)
  
  doc.setFont('helvetica', 'bold')
  doc.text('Status:', 125, 90)
  doc.setFont('helvetica', 'normal')
  doc.text(invoice.status.toUpperCase(), 125, 95)
  
  // Bill To section
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('BILL TO:', 20, 120)
  
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(invoice.booking?.client?.full_name || 'Client Name', 20, 130)
  doc.text(invoice.booking?.client?.company?.name || 'Client Company', 20, 135)
  doc.text(invoice.booking?.client?.email || 'client@email.com', 20, 140)
  
  // From section
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('FROM:', 20, 160)
  
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text('Business Services Hub', 20, 170)
  doc.text('123 Business Street, Suite 100', 20, 175)
  doc.text('City, State 12345', 20, 180)
  doc.text('info@businessservices.com', 20, 185)
  
  // Services section
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('FOR SERVICES RENDERED', 20, 210)
  
  // Table header
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.rect(20, 220, 170, 15, 'F')
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('DESCRIPTION', 25, 230)
  doc.text('QTY', 120, 230)
  doc.text('UNIT PRICE', 150, 230)
  doc.text('TOTAL', 180, 230)
  
  // Table row
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')
  doc.text(invoice.booking?.service?.title || 'Professional Service', 25, 245)
  doc.text('1', 120, 245)
  doc.text(`${invoice.amount} ${invoice.currency}`, 150, 245)
  doc.text(`${invoice.amount} ${invoice.currency}`, 180, 245)
  
  // Total section
  doc.setFillColor(248, 249, 250)
  doc.rect(120, 260, 70, 40, 'F')
  doc.setDrawColor(220, 220, 220)
  doc.rect(120, 260, 70, 40, 'S')
  
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text('Subtotal:', 125, 275)
  doc.text(`${invoice.amount} ${invoice.currency}`, 160, 275)
  
  doc.text('Tax (0%):', 125, 285)
  doc.text(`0.00 ${invoice.currency}`, 160, 285)
  
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('TOTAL:', 125, 295)
  doc.text(`${invoice.amount} ${invoice.currency}`, 160, 295)
  
  // Payment information
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('PAYMENT INFORMATION', 20, 320)
  
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text('Payment Methods: Credit Card, Bank Transfer, PayPal', 20, 330)
  doc.text('Payment Terms: Net 30 days from invoice date', 20, 335)
  doc.text('Questions: billing@businessservices.com', 20, 340)
  
  // Thank you message
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Thank you for your business!', 20, 360)
  
  // Footer line
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.setLineWidth(2)
  doc.line(20, 380, 190, 380)
  
  // Footer text
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Business Services Hub | 123 Business Street, Suite 100 | info@businessservices.com', 20, 390)
  
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
