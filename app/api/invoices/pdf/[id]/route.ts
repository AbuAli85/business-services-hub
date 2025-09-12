import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { jsPDF } from 'jspdf'

function generateSimplePDF(invoice: any): Uint8Array {
  // Use the same professional PDF generation logic as the generate-pdf API
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
  
  // Professional color palette
  const primaryColor = [31, 41, 55] // Gray-800
  const accentColor = [37, 99, 235] // Blue-600
  const accentLight = [219, 234, 254] // Blue-100
  const successColor = [34, 197, 94] // Green-500
  const warningColor = [245, 158, 11] // Amber-500
  const lightGray = [249, 250, 251] // Gray-50
  const darkGray = [17, 24, 39] // Gray-900
  const textGray = [75, 85, 99] // Gray-600
  const borderGray = [229, 231, 235] // Gray-200
  const white = [255, 255, 255] // White

  // Get company information
  const companyName = invoice.providers?.company_name || 'Business Services Hub'
  const companyTagline = 'Professional Services & Solutions'
  const companyAddress = '123 Business Street, Suite 100, City, State 12345'
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
  
  // Helper function to split text into multiple lines
  const splitText = (text: string, maxWidth: number, fontSize: number) => {
    const words = text.split(' ')
    const lines = []
    let currentLine = ''
    
    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word
      const textWidth = doc.getTextWidth(testLine) * (fontSize / doc.internal.getFontSize())
      
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
  
  // Create clean header
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.rect(0, 0, 210, 50, 'F')
  
  // Company logo area
  doc.setFillColor(white[0], white[1], white[2])
  doc.rect(20, 15, 30, 20, 'F')
  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2])
  doc.setLineWidth(2)
  doc.rect(20, 15, 30, 20, 'S')
  
  // Logo text
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2])
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('LOGO', 32, 28)
  
  // Company name
  doc.setTextColor(white[0], white[1], white[2])
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text(companyName, 60, 25)
  
  // Company tagline
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(companyTagline, 60, 32)
  
  // Company contact info
  doc.setFontSize(10)
  const addressLines = splitText(companyAddress, 80, 10)
  addressLines.forEach((line, index) => {
    doc.text(line, 60, 38 + (index * 4))
  })
  
  // Phone and email
  doc.text(`${companyPhone} | ${companyEmail}`, 60, 38 + (addressLines.length * 4) + 4)
  
  // Invoice details box
  doc.setFillColor(white[0], white[1], white[2])
  doc.rect(130, 15, 70, 35, 'F')
  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2])
  doc.setLineWidth(2)
  doc.rect(130, 15, 70, 35, 'S')
  
  // Invoice title
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2])
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('INVOICE', 145, 25)
  
  // Invoice number
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(`#${invoiceNumber}`, 135, 30)
  
  // Invoice dates
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Issued:', 135, 36)
  doc.setFont('helvetica', 'normal')
  doc.text(createdDate, 135, 40)
  
  doc.setFont('helvetica', 'bold')
  doc.text('Due:', 135, 44)
  doc.setFont('helvetica', 'normal')
  doc.text(dueDate, 135, 48)
  
  // Status badge
  const statusColor = invoice.status === 'paid' ? successColor : 
                     invoice.status === 'overdue' ? warningColor : accentColor
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2])
  doc.rect(135, 50, 25, 8, 'F')
  doc.setTextColor(white[0], white[1], white[2])
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text(invoice.status.toUpperCase(), 140, 55)
  
  // Bill To section
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Bill To:', 20, 75)
  
  // Client information box
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2])
  doc.rect(20, 80, 80, 30, 'F')
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2])
  doc.setLineWidth(1)
  doc.rect(20, 80, 80, 30, 'S')
  
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(clientName, 25, 88)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(clientCompany, 25, 94)
  doc.text(clientEmail, 25, 100)
  
  // Services section
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Services', 20, 125)
  
  // Services table header
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2])
  doc.rect(20, 130, 170, 12, 'F')
  
  doc.setTextColor(white[0], white[1], white[2])
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Description', 25, 138)
  doc.text('Qty', 120, 138)
  doc.text('Rate', 140, 138)
  doc.text('Amount', 160, 138)
  
  // Service row
  doc.setFillColor(white[0], white[1], white[2])
  doc.rect(20, 142, 170, 20, 'F')
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2])
  doc.setLineWidth(1)
  doc.rect(20, 142, 170, 20, 'S')
  
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(serviceTitle, 25, 150)
  doc.setFont('helvetica', 'normal')
  
  // Split service description if too long
  const descLines = splitText(serviceDescription, 80, 10)
  descLines.forEach((line, index) => {
    doc.text(line, 25, 154 + (index * 4))
  })
  
  // Quantity
  doc.setFont('helvetica', 'bold')
  doc.text(serviceQuantity.toString(), 120, 150)
  
  // Rate
  doc.setFont('helvetica', 'normal')
  doc.text(`${servicePrice.toFixed(2)} ${invoice.currency}`, 140, 150)
  
  // Amount
  doc.setFont('helvetica', 'bold')
  doc.text(`${serviceTotal.toFixed(2)} ${invoice.currency}`, 160, 150)
  
  // Totals section
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2])
  doc.rect(120, 175, 70, 40, 'F')
  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2])
  doc.setLineWidth(2)
  doc.rect(120, 175, 70, 40, 'S')
  
  // Totals header
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2])
  doc.rect(120, 175, 70, 12, 'F')
  doc.setTextColor(white[0], white[1], white[2])
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL SUMMARY', 125, 183)
  
  // Financial breakdown
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Subtotal:', 125, 195)
  doc.text(`${subtotal.toFixed(2)} ${invoice.currency}`, 160, 195)
  
  if (taxRate > 0) {
    doc.text(`Tax (${taxRate}%):`, 125, 203)
    doc.text(`${taxAmount.toFixed(2)} ${invoice.currency}`, 160, 203)
  }
  
  // Total
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.rect(120, 205, 70, 10, 'F')
  doc.setTextColor(white[0], white[1], white[2])
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('TOTAL:', 125, 212)
  doc.text(`${total.toFixed(2)} ${invoice.currency}`, 160, 212)
  
  // Footer
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2])
  doc.rect(0, 250, 210, 30, 'F')
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2])
  doc.setLineWidth(1)
  doc.rect(0, 250, 210, 30, 'S')
  
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Thank you for your business!', 20, 265)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('This invoice was generated electronically and is valid without signature.', 20, 270)
  
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2])
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Business Services Hub', 150, 265)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Professional Services & Solutions', 150, 270)
  
  // Clean border
  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2])
  doc.setLineWidth(1)
  doc.rect(10, 10, 190, 270, 'S')
  
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
