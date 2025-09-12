import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { jsPDF } from 'jspdf'

function generateSimplePDF(invoice: any): Uint8Array {
  // Create an enterprise-grade professional PDF invoice
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
  
  // Enterprise color palette
  const navyBlue = [15, 23, 42] // Navy-900
  const darkBlue = [30, 41, 59] // Slate-800
  const mediumBlue = [51, 65, 85] // Slate-700
  const lightBlue = [71, 85, 105] // Slate-600
  const accentBlue = [59, 130, 246] // Blue-500
  const successGreen = [16, 185, 129] // Emerald-500
  const warningOrange = [245, 158, 11] // Amber-500
  const lightGray = [248, 250, 252] // Slate-50
  const mediumGray = [241, 245, 249] // Slate-100
  const darkGray = [15, 23, 42] // Slate-900
  const textGray = [71, 85, 105] // Slate-600
  const borderGray = [226, 232, 240] // Slate-200
  const white = [255, 255, 255] // White

  // Get company information
  const companyName = invoice.booking?.service?.provider?.company?.name || 
    (invoice.provider as any)?.company?.name || 'Business Services Hub'
  const companyTagline = 'Professional Services & Solutions'
  const companyAddress = invoice.booking?.service?.provider?.company?.address || 
    (invoice.provider as any)?.company?.address || '123 Business Street, Suite 100, City, State 12345'
  const companyPhone = invoice.booking?.service?.provider?.company?.phone || 
    (invoice.provider as any)?.company?.phone || '(555) 555-5555'
  const companyEmail = invoice.booking?.service?.provider?.company?.email || 
    (invoice.provider as any)?.company?.email || 'info@businessservices.com'

  // Get client information
  const clientName = (invoice.client as any)?.full_name || invoice.booking?.client?.full_name || 'Client Name'
  const clientCompany = (invoice.client as any)?.company?.name || invoice.booking?.client?.company?.name || 'Client Company'
  const clientEmail = (invoice.client as any)?.email || invoice.booking?.client?.email || 'client@email.com'

  // Get service information
  const serviceTitle = invoice.booking?.service?.title || 'Professional Service'
  const serviceDescription = invoice.booking?.service?.description || 'High-quality professional service delivered with excellence'
  const serviceQuantity = 1
  const servicePrice = invoice.amount || 0
  const serviceTotal = servicePrice * serviceQuantity

  // Calculate financial breakdown
  const subtotal = invoice.subtotal || invoice.amount || 0
  const taxRate = invoice.tax_rate || 0
  const taxAmount = invoice.tax_amount || (subtotal * taxRate / 100)
  const total = invoice.total_amount || (subtotal + taxAmount)
  
  // Helper function to split text into multiple lines
  const splitText = (text: string, maxWidth: number, fontSize: number) => {
    const words = text.split(' ')
    const lines = []
    let currentLine = ''
    
    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word
      const textWidth = doc.getTextWidth(testLine)
      
      if (textWidth <= maxWidth) {
        currentLine = testLine
      } else {
        if (currentLine) {
          lines.push(currentLine)
          currentLine = word
        } else {
          lines.push(word)
        }
      }
    }
    
    if (currentLine) {
      lines.push(currentLine)
    }
    
    return lines
  }

  // Set default font
  doc.setFont('helvetica')
  
  // Create enterprise header with gradient effect
  doc.setFillColor(navyBlue[0], navyBlue[1], navyBlue[2])
  doc.rect(0, 0, 210, 60, 'F')
  
  // Add subtle gradient overlay
  doc.setFillColor(darkBlue[0], darkBlue[1], darkBlue[2])
  doc.rect(0, 0, 210, 5, 'F')
  
  // Company logo area - professional design
  doc.setFillColor(white[0], white[1], white[2])
  doc.rect(20, 20, 35, 25, 'F')
  doc.setDrawColor(accentBlue[0], accentBlue[1], accentBlue[2])
  doc.setLineWidth(3)
  doc.rect(20, 20, 35, 25, 'S')
  
  // Logo placeholder with professional styling
  doc.setTextColor(accentBlue[0], accentBlue[1], accentBlue[2])
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('LOGO', 30, 35)
  
  // Company branding section
  doc.setTextColor(white[0], white[1], white[2])
  doc.setFontSize(28)
  doc.setFont('helvetica', 'bold')
  doc.text(companyName, 65, 30)
  
  // Professional tagline
  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.text(companyTagline, 65, 37)
  
  // Company contact information - properly formatted
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  
  // Address with proper line breaks
  const addressLines = splitText(companyAddress, 90, 11)
  addressLines.forEach((line, index) => {
    doc.text(line, 65, 44 + (index * 5))
  })
  
  // Contact details
  const contactY = 44 + (addressLines.length * 5) + 3
  doc.text(`Phone: ${companyPhone}`, 65, contactY)
  doc.text(`Email: ${companyEmail}`, 65, contactY + 5)
  
  // Professional invoice details panel
  doc.setFillColor(white[0], white[1], white[2])
  doc.rect(140, 20, 60, 40, 'F')
  doc.setDrawColor(accentBlue[0], accentBlue[1], accentBlue[2])
  doc.setLineWidth(2)
  doc.rect(140, 20, 60, 40, 'S')
  
  // Invoice title with professional styling
  doc.setTextColor(accentBlue[0], accentBlue[1], accentBlue[2])
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('INVOICE', 155, 30)
  
  // Invoice number
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(`#${invoiceNumber}`, 145, 35)
  
  // Invoice details with proper spacing
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Issue Date:', 145, 42)
  doc.setFont('helvetica', 'normal')
  doc.text(createdDate, 145, 46)
  
  doc.setFont('helvetica', 'bold')
  doc.text('Due Date:', 145, 50)
  doc.setFont('helvetica', 'normal')
  doc.text(dueDate, 145, 54)
  
  // Professional status indicator
  const statusColor = invoice.status === 'paid' ? successGreen : 
                     invoice.status === 'overdue' ? warningOrange : accentBlue
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2])
  doc.rect(145, 56, 30, 8, 'F')
  doc.setTextColor(white[0], white[1], white[2])
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(invoice.status.toUpperCase(), 150, 61)
  
  // Professional Bill To section
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Bill To:', 20, 85)
  
  // Client information with professional styling
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2])
  doc.rect(20, 90, 85, 35, 'F')
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2])
  doc.setLineWidth(1)
  doc.rect(20, 90, 85, 35, 'S')
  
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(clientName, 25, 100)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(clientCompany, 25, 107)
  doc.text(clientEmail, 25, 114)
  
  // Professional Services section
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Services Provided', 20, 140)
  
  // Professional services table
  doc.setFillColor(navyBlue[0], navyBlue[1], navyBlue[2])
  doc.rect(20, 145, 170, 15, 'F')
  
  doc.setTextColor(white[0], white[1], white[2])
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Description', 25, 155)
  doc.text('Qty', 120, 155)
  doc.text('Unit Price', 140, 155)
  doc.text('Total', 160, 155)
  
  // Service row with professional styling
  doc.setFillColor(white[0], white[1], white[2])
  doc.rect(20, 160, 170, 25, 'F')
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2])
  doc.setLineWidth(1)
  doc.rect(20, 160, 170, 25, 'S')
  
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(serviceTitle, 25, 170)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  
  // Service description with proper wrapping
  const descLines = splitText(serviceDescription, 85, 10)
  descLines.forEach((line, index) => {
    doc.text(line, 25, 175 + (index * 4))
  })
  
  // Quantity with professional styling
  doc.setFillColor(accentBlue[0], accentBlue[1], accentBlue[2])
  doc.rect(115, 165, 15, 15, 'F')
  doc.setTextColor(white[0], white[1], white[2])
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(serviceQuantity.toString(), 120, 174)
  
  // Rate and Amount
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`${servicePrice.toFixed(2)} ${invoice.currency}`, 140, 170)
  doc.setFont('helvetica', 'bold')
  doc.text(`${serviceTotal.toFixed(2)} ${invoice.currency}`, 160, 170)
  
  // Professional totals section
  doc.setFillColor(mediumGray[0], mediumGray[1], mediumGray[2])
  doc.rect(120, 200, 70, 45, 'F')
  doc.setDrawColor(accentBlue[0], accentBlue[1], accentBlue[2])
  doc.setLineWidth(2)
  doc.rect(120, 200, 70, 45, 'S')
  
  // Totals header
  doc.setFillColor(navyBlue[0], navyBlue[1], navyBlue[2])
  doc.rect(120, 200, 70, 15, 'F')
  doc.setTextColor(white[0], white[1], white[2])
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL SUMMARY', 125, 210)
  
  // Financial breakdown with professional spacing
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text('Subtotal:', 125, 220)
  doc.text(`${subtotal.toFixed(2)} ${invoice.currency}`, 160, 220)
  
  if (taxRate > 0) {
    doc.text(`Tax (${taxRate}%):`, 125, 228)
    doc.text(`${taxAmount.toFixed(2)} ${invoice.currency}`, 160, 228)
  }
  
  // Professional total with emphasis
  doc.setFillColor(accentBlue[0], accentBlue[1], accentBlue[2])
  doc.rect(120, 235, 70, 10, 'F')
  doc.setTextColor(white[0], white[1], white[2])
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('TOTAL:', 125, 242)
  doc.text(`${total.toFixed(2)} ${invoice.currency}`, 160, 242)
  
  // Professional footer
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2])
  doc.rect(0, 260, 210, 30, 'F')
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2])
  doc.setLineWidth(1)
  doc.rect(0, 260, 210, 30, 'S')
  
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Thank you for your business!', 20, 275)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('This invoice was generated electronically and is valid without signature.', 20, 280)
  
  doc.setTextColor(accentBlue[0], accentBlue[1], accentBlue[2])
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Business Services Hub', 150, 275)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Professional Services & Solutions', 150, 280)
  
  // Professional document border
  doc.setDrawColor(accentBlue[0], accentBlue[1], accentBlue[2])
  doc.setLineWidth(2)
  doc.rect(10, 10, 190, 280, 'S')
  
  // Add subtle inner border
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2])
  doc.setLineWidth(1)
  doc.rect(11, 11, 188, 278, 'S')
  
  const arrayBuffer = doc.output('arraybuffer') as ArrayBuffer
  return new Uint8Array(arrayBuffer)
}

export async function POST(request: NextRequest) {
  try {
    const { invoiceId } = await request.json()
    
    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 })
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(invoiceId)) {
      return NextResponse.json({ error: 'Invalid invoice ID format' }, { status: 400 })
    }

    console.log('🔍 Fetching invoice data for ID:', invoiceId)

    // Use service role key for elevated permissions
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch invoice with explicit relationships
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
          company:companies(id, name, address, phone, email, logo_url)
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

    // Generate PDF
    const pdfBuffer = generateSimplePDF(invoiceForPdf)
    
    console.log('✅ PDF generated successfully, size:', pdfBuffer.length, 'bytes')

    // Store PDF URL in database
    const pdfUrl = `/api/invoices/pdf/${invoiceId}`
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
        'Content-Disposition': `attachment; filename="invoice-${invoice.invoice_number || invoiceId}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })

  } catch (error) {
    console.error('❌ PDF generation error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
