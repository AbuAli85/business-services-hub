import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import { Buffer } from 'node:buffer'

// Color palette matching the professional template
const colors = {
  primary: [15, 23, 42] as [number, number, number],   // Navy
  accent: [59, 130, 246] as [number, number, number],  // Blue
  teal: [32, 201, 151] as [number, number, number],    // Light teal for table headers
  darkTeal: [20, 184, 135] as [number, number, number], // Darker teal
  darkBlue: [13, 13, 78] as [number, number, number],  // Dark blue for headers
  success: [16, 185, 129] as [number, number, number], // Green
  warning: [245, 158, 11] as [number, number, number], // Orange
  white: [255, 255, 255] as [number, number, number],
  gray: [71, 85, 105] as [number, number, number],
  lightGray: [248, 250, 252] as [number, number, number],
  borderGray: [226, 232, 240] as [number, number, number]
}

// Helper function for text wrapping
function splitText(doc: jsPDF, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
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

// Helper function for currency formatting
function formatCurrency(value: number, currency = 'USD'): string {
  if (currency === 'USD') {
    return `$${value.toFixed(2)}`
  }
  return new Intl.NumberFormat('en-OM', { 
    style: 'currency', 
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

// Helper function for invoice numbering with zero-padding
function formatInvoiceNumber(invoiceId: string, invoiceNumber?: string): string {
  if (invoiceNumber) {
    return invoiceNumber
  }
  
  // Extract numeric part and pad with zeros
  const numericPart = invoiceId.slice(-8)
  const paddedNumber = numericPart.padStart(8, '0')
  return `INV-${paddedNumber}`
}

export async function generateProfessionalPDF(invoice: any): Promise<Uint8Array> {
  const doc = new jsPDF('p', 'mm', 'a4')
  
  // Extract invoice data with fallbacks
  const invoiceNumber = formatInvoiceNumber(invoice.id, invoice.invoice_number)
  const createdDate = new Date(invoice.created_at).toLocaleDateString('en-GB')
  const dueDate = new Date(invoice.due_date || Date.now() + 30 * 86400000).toLocaleDateString('en-GB')
  
  // Company information
  const companyName = invoice.provider?.company?.name || 'Business Services Hub'
  const companyAddress = invoice.provider?.company?.address || '123 Business Street, Suite 100, City'
  const companyPhone = invoice.provider?.company?.phone || '(555) 555-5555'
  const companyEmail = invoice.provider?.company?.email || 'info@businessservices.com'
  const vatNumber = invoice.provider?.company?.vat_number
  const crNumber = invoice.provider?.company?.cr_number
  
  // Client information with proper fallbacks
  const clientName = invoice.client?.full_name || 'Client Name'
  const clientCompany = invoice.client?.company?.name || invoice.client?.company_name || ''
  const clientEmail = invoice.client?.email || ''
  const clientAddress = invoice.client?.company?.address || invoice.client?.address || ''
  const clientPhone = invoice.client?.phone || ''
  
  // Financial calculations
  const subtotal = invoice.subtotal || invoice.amount || 0
  const taxRate = invoice.tax_rate || 0
  const taxAmount = invoice.tax_amount || (subtotal * taxRate / 100)
  const total = invoice.total_amount || (subtotal + taxAmount)
  
  // Status mapping
  const status = invoice.status || 'pending'

  // === HEADER SECTION ===
  // Logo slot (40x20mm) - top-left
  const logoUrl = invoice.provider?.company?.logo_url
  if (logoUrl && (logoUrl.includes('.png') || logoUrl.includes('.jpg') || logoUrl.includes('.jpeg'))) {
    // TODO: Implement actual logo fetching and rendering
    // For now, show placeholder
    doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2])
    doc.rect(20, 15, 40, 20, 'F')
    doc.setDrawColor(colors.borderGray[0], colors.borderGray[1], colors.borderGray[2])
    doc.rect(20, 15, 40, 20, 'S')
    doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2])
    doc.setFontSize(8).setFont('helvetica', 'normal')
    doc.text('LOGO', 35, 27, { align: 'center' })
  } else {
    // No logo - show company name in logo area
    doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2])
    doc.rect(20, 15, 40, 20, 'F')
    doc.setDrawColor(colors.borderGray[0], colors.borderGray[1], colors.borderGray[2])
    doc.rect(20, 15, 40, 20, 'S')
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
    doc.setFontSize(10).setFont('helvetica', 'bold')
    doc.text(companyName.split(' ')[0], 25, 25)
    doc.text(companyName.split(' ').slice(1).join(' '), 25, 30)
  }

  // Company name + tagline beside logo
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
  doc.setFontSize(18).setFont('helvetica', 'bold')
  doc.text(companyName, 70, 25)
  doc.setFontSize(10).setFont('helvetica', 'normal')
  doc.text('Professional Services & Solutions', 70, 32)

  // Invoice Info Box - highlighted box (light gray with blue border) at top-right
  doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2])
  doc.rect(130, 15, 70, 35, 'F')
  doc.setDrawColor(colors.accent[0], colors.accent[1], colors.accent[2])
  doc.setLineWidth(1.5)
  doc.rect(130, 15, 70, 35, 'S')

  // Invoice details in the box
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
  doc.setFontSize(14).setFont('helvetica', 'bold')
  doc.text('INVOICE', 195, 22, { align: 'right' })
  
  doc.setFontSize(10).setFont('helvetica', 'normal')
  doc.text(`Invoice #: ${invoiceNumber}`, 195, 28, { align: 'right' })
  doc.text(`Date: ${createdDate}`, 195, 34, { align: 'right' })
  doc.text(`Due: ${dueDate}`, 195, 40, { align: 'right' })
  
  // Status badge
  const statusColors = {
    paid: colors.success,
    pending: colors.warning,
    overdue: [220, 38, 38] as [number, number, number],
    draft: colors.gray
  }
  const statusColor = statusColors[status as keyof typeof statusColors] || colors.gray
  
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2])
  doc.rect(135, 44, 25, 6, 'F')
  doc.setTextColor(colors.white[0], colors.white[1], colors.white[2])
  doc.setFontSize(8).setFont('helvetica', 'bold')
  doc.text(status.toUpperCase(), 147, 48, { align: 'center' })

  // === BILLING INFORMATION SECTIONS ===
  let yPos = 60

  // Provider Card (From) - Left side with proper header
  doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2])
  doc.rect(15, yPos - 5, 90, 45, 'F')
  doc.setDrawColor(colors.borderGray[0], colors.borderGray[1], colors.borderGray[2])
  doc.setLineWidth(0.5)
  doc.rect(15, yPos - 5, 90, 45, 'S')

  // Header "From" in bold
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
  doc.setFontSize(12).setFont('helvetica', 'bold')
  doc.text('From', 20, yPos)

  doc.setFontSize(10).setFont('helvetica', 'normal')
  doc.text(companyName, 20, yPos + 8)
  doc.text(companyAddress, 20, yPos + 14)
  doc.text(`${companyPhone} | ${companyEmail}`, 20, yPos + 20)
  if (vatNumber) {
    doc.text(`VAT: ${vatNumber}`, 20, yPos + 26)
  }
  if (crNumber) {
    doc.text(`CR: ${crNumber}`, 20, yPos + 32)
  }

  // Client Card (Bill To) - Right side with matching header
  doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2])
  doc.rect(115, yPos - 5, 90, 45, 'F')
  doc.setDrawColor(colors.borderGray[0], colors.borderGray[1], colors.borderGray[2])
  doc.setLineWidth(0.5)
  doc.rect(115, yPos - 5, 90, 45, 'S')

  // Header "Bill To" in bold
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
  doc.setFontSize(12).setFont('helvetica', 'bold')
  doc.text('Bill To', 120, yPos)

  doc.setFontSize(10).setFont('helvetica', 'normal')
  doc.text(clientName, 120, yPos + 8)
  if (clientCompany) {
    doc.text(clientCompany, 120, yPos + 14)
  }
  if (clientAddress) {
    doc.text(clientAddress, 120, yPos + 20)
  }
  if (clientPhone) {
    doc.text(`Phone: ${clientPhone}`, 120, yPos + 26)
  }
  if (clientEmail) {
    doc.text(`Email: ${clientEmail}`, 120, yPos + 32)
  }

  // === SERVICE DETAILS TABLE ===
  yPos = yPos + 50
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
  doc.setFontSize(12).setFont('helvetica', 'bold')
  doc.text('Service Details:', 20, yPos)

  // Table header with teal background
  const tableY = yPos + 8
  const tableWidth = 170
  const colWidths = [15, 80, 25, 25, 25] // No, Description, Hours/Units, Rate, Total
  
  // Header background
  doc.setFillColor(colors.teal[0], colors.teal[1], colors.teal[2])
  doc.rect(20, tableY, tableWidth, 8, 'F')
  
  // Header text
  doc.setTextColor(colors.white[0], colors.white[1], colors.white[2])
  doc.setFontSize(10).setFont('helvetica', 'bold')
  doc.text('No', 22, tableY + 6)
  doc.text('Item Description', 40, tableY + 6)
  doc.text('Qty', 125, tableY + 6)
  doc.text('Rate ($)', 150, tableY + 6)
  doc.text('Amount ($)', 175, tableY + 6)

  // Table rows
  let currentY = tableY + 8
  
  // Support multiple invoice items or fallback to single service
  let items = []
  
  if (invoice.invoice_items && invoice.invoice_items.length > 0) {
    // Use actual invoice items
    items = invoice.invoice_items
  } else if (invoice.booking?.service?.title) {
    // Fallback to service from booking
    items = [{
      title: invoice.booking.service.title,
      description: invoice.booking.service.description,
      qty: 1,
      price: invoice.booking.service.price || invoice.amount || 0,
    }]
  } else {
    // Last resort fallback
    items = [{
      title: 'Service Item',
      qty: 1,
      price: invoice.amount || 0,
    }]
  }

  items.forEach((item: any, index: number) => {
    const qty = item.qty || 1
    const price = item.price || item.rate || 0
    const amount = qty * price

    // Alternating row background
    if (index % 2 === 0) {
      doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2])
      doc.rect(20, currentY, tableWidth, 10, 'F')
    }

    // Row borders
    doc.setDrawColor(colors.borderGray[0], colors.borderGray[1], colors.borderGray[2])
    doc.setLineWidth(0.3)
    doc.rect(20, currentY, tableWidth, 10, 'S')

    // Row content
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
    doc.setFontSize(9).setFont('helvetica', 'normal')
    
    // No. column (left-aligned)
    doc.text(String(index + 1), 22, currentY + 7)
    
    // Item description (with better wrapping)
    const description = item.title || item.description || 'Service Item'
    const descriptionLines = splitText(doc, description, 75)
    doc.text(descriptionLines[0], 40, currentY + 7)
    if (descriptionLines.length > 1) {
      doc.text(descriptionLines[1], 40, currentY + 11)
    }
    
    // Qty column (center-aligned)
    doc.text(String(qty), 137, currentY + 7, { align: 'center' })
    
    // Rate column (right-aligned)
    doc.text(formatCurrency(price, 'USD'), 170, currentY + 7, { align: 'right' })
    
    // Amount column (right-aligned)
    doc.text(formatCurrency(amount, 'USD'), 195, currentY + 7, { align: 'right' })

    currentY += 10
  })

  // === SUMMARY SECTION ===
  // Right-aligned summary table
  const summaryY = currentY + 15
  const summaryWidth = 80
  const summaryX = 110 // Right-aligned
  
  // Summary table background
  doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2])
  doc.rect(summaryX, summaryY, summaryWidth, 30, 'F')
  doc.setDrawColor(colors.borderGray[0], colors.borderGray[1], colors.borderGray[2])
  doc.setLineWidth(0.5)
  doc.rect(summaryX, summaryY, summaryWidth, 30, 'S')

  // Summary rows
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
  doc.setFontSize(10).setFont('helvetica', 'normal')
  
  // Subtotal row
  doc.text('Subtotal:', summaryX + 5, summaryY + 8)
  doc.text(formatCurrency(subtotal, 'USD'), summaryX + summaryWidth - 5, summaryY + 8, { align: 'right' })
  
  // Tax row (if applicable)
  if (taxRate > 0) {
    doc.text(`Tax (${taxRate}%):`, summaryX + 5, summaryY + 16)
    doc.text(formatCurrency(taxAmount, 'USD'), summaryX + summaryWidth - 5, summaryY + 16, { align: 'right' })
  }
  
  // Separator line
  doc.setDrawColor(colors.borderGray[0], colors.borderGray[1], colors.borderGray[2])
  doc.setLineWidth(0.5)
  doc.line(summaryX + 5, summaryY + 20, summaryX + summaryWidth - 5, summaryY + 20)
  
  // Total row (highlighted)
  doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2])
  doc.rect(summaryX + 5, summaryY + 22, summaryWidth - 10, 6, 'F')
  
  doc.setTextColor(colors.white[0], colors.white[1], colors.white[2])
  doc.setFontSize(11).setFont('helvetica', 'bold')
  doc.text('TOTAL:', summaryX + 8, summaryY + 26)
  doc.text(formatCurrency(total, 'USD'), summaryX + summaryWidth - 8, summaryY + 26, { align: 'right' })

  // === PAYMENT AND TERMS SECTION ===
  const paymentY = summaryY + 40
  
  // Payment Information (Left side)
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
  doc.setFontSize(12).setFont('helvetica', 'bold')
  doc.text('Payment Information:', 20, paymentY)

  doc.setFontSize(10).setFont('helvetica', 'normal')
  doc.text('Payment Method: Bank Transfer', 20, paymentY + 8)
  doc.text(`Due Date: ${dueDate}`, 20, paymentY + 14)
  
  // Bank details for Oman clients
  doc.text('Bank Details:', 20, paymentY + 22)
  doc.text('Bank: Bank Muscat', 20, paymentY + 28)
  doc.text('Account: 1234-5678-9012-3456', 20, paymentY + 34)
  doc.text('IBAN: OM12345678901234567890', 20, paymentY + 40)

  // Terms and Conditions (Right side)
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
  doc.setFontSize(12).setFont('helvetica', 'bold')
  doc.text('Terms and Conditions:', 120, paymentY)

  doc.setFontSize(9).setFont('helvetica', 'normal')
  doc.text('• Payment is due upon receipt of this invoice.', 120, paymentY + 8)
  doc.text('• Late payments may incur additional charges.', 120, paymentY + 12)
  doc.text('• Please make checks payable to ' + companyName, 120, paymentY + 16)
  doc.text('• For questions, contact us at ' + companyEmail, 120, paymentY + 20)
  doc.text('• This invoice is valid without signature', 120, paymentY + 24)

  // === FOOTER SECTION ===
  const footerY = paymentY + 50
  
  // Date and signature line (left side)
  doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2])
  doc.setFontSize(10).setFont('helvetica', 'normal')
  doc.text(`Date: ${createdDate}`, 20, footerY)
  doc.text('_________________________', 20, footerY + 8)
  doc.text('Authorized Signature', 20, footerY + 12)
  doc.text(companyName, 20, footerY + 16)

  // QR Code section (left side, below signature)
  try {
    const qrText = invoice.payment_url || 
      `Invoice ${invoiceNumber}, Total: ${formatCurrency(total, 'USD')}`
    const qrDataUrl = await QRCode.toDataURL(qrText, { width: 50 })
    doc.addImage(qrDataUrl, 'PNG', 20, footerY + 20, 15, 15)
    doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2])
    doc.setFontSize(8).setFont('helvetica', 'normal')
    doc.text('Scan to Pay', 22, footerY + 37)
  } catch (error) {
    console.warn('Failed to generate QR code:', error)
  }

  // Thank you message (centered)
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
  doc.setFontSize(12).setFont('helvetica', 'bold')
  doc.text('Thank you for your business!', 105, footerY + 25, { align: 'center' })

  // Compliance text (right side)
  doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2])
  doc.setFontSize(8).setFont('helvetica', 'normal')
  doc.text('This invoice is valid without signature', 190, footerY + 8, { align: 'right' })
  doc.text('VAT: ' + (vatNumber || 'N/A'), 190, footerY + 12, { align: 'right' })
  doc.text('CR: ' + (crNumber || 'N/A'), 190, footerY + 16, { align: 'right' })

  // Contact information footer bar (sleeker)
  doc.setFillColor(colors.darkBlue[0], colors.darkBlue[1], colors.darkBlue[2])
  doc.rect(0, footerY + 40, 210, 8, 'F')
  
  doc.setTextColor(colors.white[0], colors.white[1], colors.white[2])
  doc.setFontSize(8).setFont('helvetica', 'normal')
  doc.text(`📞 ${companyPhone}`, 20, footerY + 45)
  doc.text(`✉️ ${companyEmail}`, 120, footerY + 45)

  const arrayBuffer = doc.output('arraybuffer') as ArrayBuffer
  return new Uint8Array(arrayBuffer)
}

// Helper function to check if PDF should be regenerated (24-hour cache)
export function shouldRegeneratePDF(pdfUrl: string): boolean {
  if (!pdfUrl) return true
  
  try {
    // Extract timestamp from URL if it exists
    const url = new URL(pdfUrl)
    const timestamp = url.searchParams.get('t')
    
    if (timestamp) {
      const generatedTime = parseInt(timestamp)
      const now = Date.now()
      const twentyFourHours = 24 * 60 * 60 * 1000
      
      return (now - generatedTime) > twentyFourHours
    }
    
    return true // Regenerate if no timestamp
  } catch {
    return true // Regenerate on error
  }
}