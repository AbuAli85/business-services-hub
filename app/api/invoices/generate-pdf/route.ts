import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { jsPDF } from 'jspdf'

function generateSimplePDF(invoice: any): Uint8Array {
  // Create an ultra-premium, high-end PDF using jsPDF matching the enhanced template
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
  
  // Enhanced ultra-premium color palette matching the template
  const primaryColor = [15, 23, 42] // Deep slate
  const secondaryColor = [30, 41, 59] // Slate
  const accentColor = [59, 130, 246] // Blue-500
  const accentLight = [147, 197, 253] // Blue-300
  const purpleColor = [147, 51, 234] // Purple-600
  const indigoColor = [79, 70, 229] // Indigo-600
  const successColor = [34, 197, 94] // Green-500
  const warningColor = [251, 191, 36] // Amber-400
  const lightGray = [248, 250, 252] // Slate-50
  const mediumGray = [241, 245, 249] // Slate-100
  const darkGray = [51, 65, 85] // Slate-700
  const textGray = [71, 85, 105] // Slate-600
  const borderGray = [226, 232, 240] // Slate-200

  // Get company information from the invoice data
  const companyName = invoice.booking?.service?.provider?.company?.name || 'Business Services Hub'
  const companyTagline = 'Professional Services & Solutions'
  const companyAddress = invoice.booking?.service?.provider?.company?.address || '123 Business Street, Suite 100\nCity, State 12345'
  const companyPhone = invoice.booking?.service?.provider?.company?.phone || '(555) 555-5555'
  const companyEmail = invoice.booking?.service?.provider?.company?.email || 'info@businessservices.com'

  // Get client information from the invoice data
  const clientName = invoice.booking?.client?.full_name || 'Client Name'
  const clientCompany = invoice.booking?.client?.company?.name || 'Client Company'
  const clientEmail = invoice.booking?.client?.email || 'client@email.com'

  // Get service information from the invoice data
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
  
  // Create ultra-premium gradient header matching the enhanced template
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.rect(0, 0, 210, 80, 'F')
  
  // Add advanced gradient overlay
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2])
  doc.rect(0, 0, 210, 8, 'F')
  
  // Add purple accent
  doc.setFillColor(purpleColor[0], purpleColor[1], purpleColor[2])
  doc.rect(0, 6, 210, 2, 'F')
  
  // Enhanced company logo area with glass morphism effect
  doc.setFillColor(255, 255, 255)
  doc.rect(20, 25, 40, 30, 'F')
  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2])
  doc.setLineWidth(4)
  doc.rect(20, 25, 40, 30, 'S')
  
  // Add inner glow effect
  doc.setDrawColor(accentLight[0], accentLight[1], accentLight[2])
  doc.setLineWidth(2)
  doc.rect(22, 27, 36, 26, 'S')
  
  // Add logo placeholder with enhanced styling
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2])
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('LOGO', 35, 42)
  
  // Ultra-premium company branding
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(36)
  doc.setFont('helvetica', 'bold')
  doc.text(companyName, 70, 40)
  
  // Enhanced tagline
  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.text(companyTagline, 70, 48)
  
  // Company address
  doc.setFontSize(10)
  doc.text(companyAddress, 70, 56)
  
  // Contact information
  doc.setFontSize(10)
  doc.text(`${companyPhone} | ${companyEmail}`, 70, 64)
  
  // Ultra-premium invoice details box
  doc.setFillColor(255, 255, 255)
  doc.rect(120, 20, 80, 60, 'F')
  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2])
  doc.setLineWidth(3)
  doc.rect(120, 20, 80, 60, 'S')
  
  // Add inner glow
  doc.setDrawColor(accentLight[0], accentLight[1], accentLight[2])
  doc.setLineWidth(1)
  doc.rect(121, 21, 78, 58, 'S')
  
  // Invoice title with icon
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2])
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('INVOICE', 140, 35)
  
  // Invoice number
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(invoiceNumber, 140, 42)
  
  // Invoice details
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Issued Date:', 125, 52)
  doc.setFont('helvetica', 'normal')
  doc.text(createdDate, 125, 58)
  
  doc.setFont('helvetica', 'bold')
  doc.text('Due Date:', 125, 66)
  doc.setFont('helvetica', 'normal')
  doc.text(dueDate, 125, 72)
  
  // Status badge
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2])
  doc.rect(125, 75, 30, 8, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text(invoice.status.toUpperCase(), 130, 80)
  
  // Premium "Bill To" section
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('BILL TO:', 20, 110)
  
  // Client information with enhanced styling
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2])
  doc.rect(20, 115, 80, 40, 'F')
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2])
  doc.setLineWidth(1)
  doc.rect(20, 115, 80, 40, 'S')
  
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(clientName, 25, 125)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(clientCompany, 25, 132)
  doc.text(clientEmail, 25, 139)
  
  // Premium services table
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('SERVICES RENDERED', 20, 180)
  
  // Table header
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.rect(20, 185, 170, 15, 'F')
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('SERVICE DETAILS', 25, 195)
  doc.text('QTY', 120, 195)
  doc.text('UNIT PRICE', 140, 195)
  doc.text('TOTAL', 160, 195)
  
  // Service row
  doc.setFillColor(255, 255, 255)
  doc.rect(20, 200, 170, 25, 'F')
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2])
  doc.setLineWidth(1)
  doc.rect(20, 200, 170, 25, 'S')
  
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(serviceTitle, 25, 210)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(serviceDescription, 25, 216)
  
  // Quantity badge
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2])
  doc.rect(115, 205, 15, 15, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(serviceQuantity.toString(), 120, 214)
  
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`${servicePrice.toFixed(2)} ${invoice.currency}`, 140, 210)
  doc.text(`${serviceTotal.toFixed(2)} ${invoice.currency}`, 160, 210)
  
  // Ultra-premium totals section
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2])
  doc.rect(120, 240, 70, 50, 'F')
  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2])
  doc.setLineWidth(2)
  doc.rect(120, 240, 70, 50, 'S')
  
  // Totals header
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2])
  doc.rect(120, 240, 70, 15, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL SUMMARY', 125, 250)
  
  // Financial breakdown
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text('Subtotal:', 125, 265)
  doc.text(`${subtotal.toFixed(2)} ${invoice.currency}`, 160, 265)
  
  if (taxRate > 0) {
    doc.text(`Tax (${taxRate}%):`, 125, 275)
    doc.text(`${taxAmount.toFixed(2)} ${invoice.currency}`, 160, 275)
  }
  
  // Premium total
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.rect(120, 280, 70, 10, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('TOTAL:', 125, 287)
  doc.text(`${total.toFixed(2)} ${invoice.currency}`, 160, 287)
  
  // Ultra-premium footer
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2])
  doc.rect(0, 300, 210, 30, 'F')
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2])
  doc.setLineWidth(1)
  doc.rect(0, 300, 210, 30, 'S')
  
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Thank You for Your Business!', 20, 315)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('This invoice was generated electronically and is valid without signature.', 20, 322)
  
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2])
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Business Services Hub', 150, 315)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Professional Services & Solutions', 150, 322)
  
  // Sophisticated border around the entire document
  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2])
  doc.setLineWidth(3)
  doc.rect(5, 5, 200, 290, 'S')
  
  // Add inner border for premium effect
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2])
  doc.setLineWidth(1)
  doc.rect(6, 6, 198, 288, 'S')
  
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

    // Fetch invoice with explicit relationships to avoid postgrest ambiguity
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
        ),
        invoice_items(*)
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
    console.log('📄 Invoice details:', {
      id: invoice.id,
      amount: invoice.amount,
      currency: invoice.currency,
      status: invoice.status,
      company: (invoice.provider as any)?.company?.name,
      client: (invoice.client as any)?.full_name,
      service: invoice.booking?.service?.title
    })

    // Generate PDF with the enhanced template
    const pdfBuffer = generateSimplePDF({
      ...invoice,
      booking: invoice.booking,
      // For PDF template: expose provider.company under booking.service.provider.company if missing
      bookingForPdf: undefined
    })
    
    console.log('✅ PDF generated successfully, size:', pdfBuffer.length, 'bytes')

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