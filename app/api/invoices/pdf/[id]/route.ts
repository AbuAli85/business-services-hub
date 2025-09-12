import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { jsPDF } from 'jspdf'

function generateSimplePDF(invoice: any): Uint8Array {
  // Use the same PDF generation logic as the generate-pdf API
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
  
  // Enhanced ultra-premium color palette
  const primaryColor = [15, 23, 42] // Deep slate
  const accentColor = [59, 130, 246] // Blue-500
  const accentLight = [147, 197, 253] // Blue-300
  const purpleColor = [147, 51, 234] // Purple-600
  const lightGray = [248, 250, 252] // Slate-50
  const darkGray = [51, 65, 85] // Slate-700
  const borderGray = [226, 232, 240] // Slate-200

  // Get company information
  const companyName = invoice.providers?.company_name || 'Business Services Hub'
  const companyTagline = 'Professional Services & Solutions'
  const companyAddress = '123 Business Street, Suite 100\nCity, State 12345'
  const companyPhone = '(555) 555-5555'
  const companyEmail = 'info@businessservices.com'

  // Get client information
  const clientName = invoice.clients?.full_name || 'Client Name'
  const clientCompany = 'Client Company'
  const clientEmail = invoice.clients?.email || 'client@email.com'

  // Get service information
  const serviceTitle = invoice.bookings?.services?.title || invoice.bookings?.title || 'Professional Service'
  const serviceDescription = 'High-quality professional service delivered with excellence'
  const serviceQuantity = 1
  const servicePrice = invoice.amount || 0
  const serviceTotal = servicePrice * serviceQuantity

  // Calculate financial breakdown
  const subtotal = invoice.subtotal || invoice.amount || 0
  const taxRate = invoice.tax_rate || 0
  const taxAmount = invoice.tax_amount || (subtotal * taxRate / 100)
  const total = invoice.total_amount || (subtotal + taxAmount)
  
  // Create header
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.rect(0, 0, 210, 80, 'F')
  
  // Add gradient overlay
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2])
  doc.rect(0, 0, 210, 8, 'F')
  
  // Add purple accent
  doc.setFillColor(purpleColor[0], purpleColor[1], purpleColor[2])
  doc.rect(0, 6, 210, 2, 'F')
  
  // Company logo area
  doc.setFillColor(255, 255, 255)
  doc.rect(20, 25, 40, 30, 'F')
  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2])
  doc.setLineWidth(4)
  doc.rect(20, 25, 40, 30, 'S')
  
  // Add logo placeholder
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2])
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('LOGO', 35, 42)
  
  // Company branding
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(36)
  doc.setFont('helvetica', 'bold')
  doc.text(companyName, 70, 40)
  
  // Tagline
  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.text(companyTagline, 70, 48)
  
  // Company address
  doc.setFontSize(10)
  doc.text(companyAddress, 70, 56)
  
  // Contact information
  doc.setFontSize(10)
  doc.text(`${companyPhone} | ${companyEmail}`, 70, 64)
  
  // Invoice details box
  doc.setFillColor(255, 255, 255)
  doc.rect(120, 20, 80, 60, 'F')
  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2])
  doc.setLineWidth(3)
  doc.rect(120, 20, 80, 60, 'S')
  
  // Invoice title
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
  
  // Bill To section
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('BILL TO:', 20, 110)
  
  // Client information
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
  
  // Services table
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
  
  // Totals section
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
  
  // Total
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.rect(120, 280, 70, 10, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('TOTAL:', 125, 287)
  doc.text(`${total.toFixed(2)} ${invoice.currency}`, 160, 287)
  
  // Footer
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
  
  // Border around the document
  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2])
  doc.setLineWidth(3)
  doc.rect(5, 5, 200, 290, 'S')
  
  // Add inner border
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2])
  doc.setLineWidth(1)
  doc.rect(6, 6, 198, 288, 'S')
  
  const arrayBuffer = doc.output('arraybuffer') as ArrayBuffer
  return new Uint8Array(arrayBuffer)
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoiceId = params.id.replace('.pdf', '')
    
    // Use service role key for elevated permissions
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get the invoice details from database
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        bookings:booking_id (
          id,
          title,
          subtotal,
          currency,
          services:service_id (
            title,
            description
          )
        ),
        clients:client_id (
          full_name,
          email,
          phone
        ),
        providers:provider_id (
          full_name,
          email,
          phone,
          company_name
        )
      `)
      .eq('id', invoiceId)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Generate PDF
    const pdfBuffer = generateSimplePDF(invoice)

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoice.invoice_number || invoiceId}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })

  } catch (error) {
    console.error('Error generating invoice PDF:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
