import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import { Buffer } from 'node:buffer'

// Color palette for consistent styling
const colors = {
  primary: [15, 23, 42] as [number, number, number],   // Navy
  accent: [59, 130, 246] as [number, number, number],  // Blue
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
function formatCurrency(value: number, currency = 'OMR'): string {
  return new Intl.NumberFormat('en-OM', { 
    style: 'currency', 
    currency: currency,
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
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
  
  // Financial calculations
  const subtotal = invoice.subtotal || invoice.amount || 0
  const taxRate = invoice.tax_rate || 0
  const taxAmount = invoice.tax_amount || (subtotal * taxRate / 100)
  const total = invoice.total_amount || (subtotal + taxAmount)
  
  // === Header Section ===
  // Company logo placeholder (can be enhanced with actual logo fetching)
  doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2])
  doc.rect(0, 0, 210, 50, 'F')
  
  // Company logo area (left side)
  const logoUrl = invoice.provider?.company?.logo_url
  if (logoUrl && (logoUrl.includes('.png') || logoUrl.includes('.jpg') || logoUrl.includes('.jpeg'))) {
    // TODO: Implement actual logo fetching and rendering
    // For now, show company name in logo area
    doc.setTextColor(colors.white[0], colors.white[1], colors.white[2])
    doc.setFontSize(16).setFont('helvetica', 'bold')
    doc.text(companyName, 20, 25)
  } else {
    // No logo available, show company name
    doc.setTextColor(colors.white[0], colors.white[1], colors.white[2])
    doc.setFontSize(20).setFont('helvetica', 'bold')
    doc.text(companyName, 20, 25)
  }
  
  doc.setFontSize(10).setFont('helvetica', 'normal')
  doc.text('Professional Services & Solutions', 20, 32)
  
  // Company contact info
  doc.setFontSize(10).setFont('helvetica', 'normal')
  doc.text(companyAddress, 20, 38)
  doc.text(`${companyPhone} | ${companyEmail}`, 20, 44)

  // Enhanced invoice info box - clean professional layout
  doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2])
  doc.rect(130, 10, 70, 35, 'F')
  doc.setDrawColor(colors.accent[0], colors.accent[1], colors.accent[2])
  doc.setLineWidth(1.5)
  doc.rect(130, 10, 70, 35, 'S')

  // Invoice title and details - right aligned
  doc.setTextColor(colors.accent[0], colors.accent[1], colors.accent[2])
  doc.setFontSize(16).setFont('helvetica', 'bold').text('INVOICE', 195, 18, { align: 'right' })
  doc.setFontSize(10).setFont('helvetica', 'normal')
  doc.text(`#${invoiceNumber}`, 195, 24, { align: 'right' })
  doc.text(`Issued: ${createdDate}`, 195, 30, { align: 'right' })
  doc.text(`Due: ${dueDate}`, 195, 36, { align: 'right' })

  // Status badge - pill-shaped inside the box
  const status = invoice.status || 'pending'
  const statusColors = {
    paid: colors.success,
    pending: colors.warning,
    overdue: [220, 38, 38] as [number, number, number],
    draft: colors.gray
  }
  const color = statusColors[status as keyof typeof statusColors] || colors.accent
  
  // Pill-shaped status badge
  doc.setFillColor(color[0], color[1], color[2])
  doc.roundedRect(160, 38, 35, 6, 3, 3, 'F')
  
  // Status text
  doc.setTextColor(colors.white[0], colors.white[1], colors.white[2])
  doc.setFontSize(8).setFont('helvetica', 'bold')
  doc.text(status.toUpperCase(), 177, 42, { align: 'center' })

  // === Two-Column Provider & Client Section ===
  // Provider section (left) with background
  doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2])
  doc.rect(15, 65, 90, 35, 'F')
  doc.setDrawColor(colors.borderGray[0], colors.borderGray[1], colors.borderGray[2])
  doc.setLineWidth(0.5)
  doc.rect(15, 65, 90, 35, 'S')
  
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
  doc.setFontSize(12).setFont('helvetica', 'bold').text('From:', 20, 75)

  doc.setFontSize(10).setFont('helvetica', 'normal')
  doc.text(companyName, 20, 83)
  doc.text(companyAddress, 20, 89)
  doc.text(`${companyPhone} | ${companyEmail}`, 20, 95)

  // Client section (right) with matching background
  doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2])
  doc.rect(115, 65, 90, 35, 'F')
  doc.setDrawColor(colors.borderGray[0], colors.borderGray[1], colors.borderGray[2])
  doc.setLineWidth(0.5)
  doc.rect(115, 65, 90, 35, 'S')
  
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
  doc.setFontSize(12).setFont('helvetica', 'bold').text('Bill To:', 120, 75)

  doc.setFontSize(10).setFont('helvetica', 'normal')
  doc.text(clientName, 120, 83)
  if (clientCompany) doc.text(clientCompany, 120, 89)
  if (clientAddress) doc.text(clientAddress, 120, 95)
  if (clientEmail) doc.text(clientEmail, 120, 101)

  // === Items Table ===
  const tableX = 20
  const tableWidth = 170
  let y = 110

  // Column widths and positions
  const colWidths = {
    desc: 90,
    qty: 20,
    rate: 30,
    amount: 30
  }
  
  const colPositions = {
    desc: tableX + 5,
    qty: tableX + colWidths.desc + 5,
    rate: tableX + colWidths.desc + colWidths.qty + 5,
    amount: tableX + colWidths.desc + colWidths.qty + colWidths.rate + 5
  }
  
  // Items table header with stronger borders
  doc.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2])
  doc.rect(tableX, y, tableWidth, 12, 'F')
  doc.setDrawColor(colors.accent[0], colors.accent[1], colors.accent[2])
  doc.setLineWidth(1)
  doc.rect(tableX, y, tableWidth, 12, 'S')
  
  doc.setTextColor(colors.white[0], colors.white[1], colors.white[2])
  doc.setFontSize(11).setFont('helvetica', 'bold')
  doc.text('Description', colPositions.desc, y + 8)
  doc.text('Qty', colPositions.qty + colWidths.qty/2, y + 8, { align: 'center' })
  doc.text('Rate', colPositions.rate + colWidths.rate, y + 8, { align: 'right' })
  doc.text('Amount', colPositions.amount + colWidths.amount, y + 8, { align: 'right' })

  y += 15
  doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2])
  doc.setFontSize(10).setFont('helvetica', 'normal')

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

    // Handle long descriptions with text wrapping
    const itemTitle = item.title || 'Item'
    const wrappedTitle = doc.splitTextToSize(itemTitle, colWidths.desc - 10)
    
    // Calculate consistent row height
    const baseRowHeight = 12
    const lineHeight = 4
    const titleLines = wrappedTitle.length
    const rowHeight = Math.max(baseRowHeight, titleLines * lineHeight)
    
    // Alternating row colors with clear borders
    if (index % 2 === 0) {
      doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2])
      doc.rect(tableX, y - 1, tableWidth, rowHeight + 2, 'F')
    }

    // Add row border with stronger lines
    doc.setDrawColor(colors.borderGray[0], colors.borderGray[1], colors.borderGray[2])
    doc.setLineWidth(0.8)
    doc.rect(tableX, y - 1, tableWidth, rowHeight + 2, 'S')

    // Add item row with proper alignment and dynamic positioning
    let currentY = y + 5
    wrappedTitle.forEach((line: string, lineIndex: number) => {
      doc.text(line, colPositions.desc, currentY + (lineIndex * lineHeight))
    })
    
    // Position quantity, rate, and amount with perfect alignment
    doc.text(qty.toString(), colPositions.qty + colWidths.qty/2, y + 5, { align: 'center' })
    doc.text(formatCurrency(price), colPositions.rate + colWidths.rate - 3, y + 5, { align: 'right' })
    doc.text(formatCurrency(amount), colPositions.amount + colWidths.amount - 3, y + 5, { align: 'right' })
    
    // Add description if available and not too long
    if (item.description && item.description !== item.title) {
      const wrappedDesc = doc.splitTextToSize(item.description, colWidths.desc - 10)
      doc.setFontSize(8)
      wrappedDesc.forEach((line: string, lineIndex: number) => {
        doc.text(line, colPositions.desc, currentY + (titleLines + lineIndex + 1) * lineHeight)
      })
      doc.setFontSize(10)
    }
    
    y += rowHeight + 2
    
    // Page break if needed
    if (y > 250) {
      doc.addPage()
      y = 40
      // Redraw table header on new page
      doc.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2])
      doc.rect(tableX, y, tableWidth, 12, 'F')
      doc.setTextColor(colors.white[0], colors.white[1], colors.white[2])
      doc.setFontSize(11).setFont('helvetica', 'bold')
      doc.text('Description', colPositions.desc, y + 8)
      doc.text('Qty', colPositions.qty + colWidths.qty/2, y + 8, { align: 'center' })
      doc.text('Rate', colPositions.rate + colWidths.rate, y + 8, { align: 'right' })
      doc.text('Amount', colPositions.amount + colWidths.amount, y + 8, { align: 'right' })
      y += 15
      doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2])
      doc.setFontSize(10).setFont('helvetica', 'normal')
    }
  })

  // Add table border
  doc.setDrawColor(colors.borderGray[0], colors.borderGray[1], colors.borderGray[2])
  doc.setLineWidth(1)
  doc.rect(tableX, 110, tableWidth, y - 110)

  // === Integrated Totals Section ===
  // Seamless integration with table
  const totalsX = 120
  const totalsWidth = 70

  // Totals background box
  doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2])
  doc.rect(totalsX, y + 5, totalsWidth, 35, 'F')
  doc.setDrawColor(colors.borderGray[0], colors.borderGray[1], colors.borderGray[2])
  doc.setLineWidth(1)
  doc.rect(totalsX, y + 5, totalsWidth, 35, 'S')

  // Subtotal line
  doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2])
  doc.setFontSize(11).setFont('helvetica', 'bold').text('Subtotal:', totalsX + 5, y + 15)
  doc.setFont('helvetica', 'normal').text(formatCurrency(subtotal), totalsX + totalsWidth - 5, y + 15, { align: 'right' })

  // Tax line
  if (taxAmount > 0) {
    doc.setFont('helvetica', 'bold').text(`Tax (${taxRate}%):`, totalsX + 5, y + 22)
    doc.setFont('helvetica', 'normal').text(formatCurrency(taxAmount), totalsX + totalsWidth - 5, y + 22, { align: 'right' })
  }

  // Discount line (if applicable)
  const discountAmount = invoice.discount_amount || 0
  if (discountAmount > 0) {
    doc.setFont('helvetica', 'bold').text('Discount:', totalsX + 5, y + 29)
    doc.setFont('helvetica', 'normal').text(`-${formatCurrency(discountAmount)}`, totalsX + totalsWidth - 5, y + 29, { align: 'right' })
  }

  // Separator line
  doc.setDrawColor(colors.borderGray[0], colors.borderGray[1], colors.borderGray[2])
  doc.setLineWidth(1)
  doc.line(totalsX + 5, y + 32, totalsX + totalsWidth - 5, y + 32)

  // Total line with enhanced emphasis - dark navy background
  doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2])
  doc.rect(totalsX + 2, y + 34, totalsWidth - 4, 6, 'F')
  doc.setTextColor(colors.white[0], colors.white[1], colors.white[2])
  doc.setFontSize(12).setFont('helvetica', 'bold')
  doc.text('TOTAL', totalsX + 5, y + 38)
  doc.text(formatCurrency(total), totalsX + totalsWidth - 5, y + 38, { align: 'right' })

  // === Fixed Footer Section ===
  // Fixed positioning to prevent overlap - moved higher
  const footerY = 250
  
  // Top border line
  doc.setDrawColor(colors.borderGray[0], colors.borderGray[1], colors.borderGray[2])
  doc.setLineWidth(1)
  doc.line(20, footerY, 190, footerY)

  // Footer background
  doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2])
  doc.rect(0, footerY, 210, 35, 'F')

  // QR Code section (left side, smaller)
  try {
    const qrText = invoice.payment_url || 
      `Invoice ${invoiceNumber}, Total: ${formatCurrency(total)}`
    const qrDataUrl = await QRCode.toDataURL(qrText, { width: 60 })
    doc.addImage(qrDataUrl, 'PNG', 20, footerY + 5, 15, 15)
    doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2])
    doc.setFontSize(7).setFont('helvetica', 'normal')
    doc.text('Scan to Pay', 22, footerY + 23)
  } catch (error) {
    console.warn('Failed to generate QR code:', error)
  }

  // Thank you message (centered)
  doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2])
  doc.setFontSize(12).setFont('helvetica', 'bold')
  doc.text('Thank you for your business!', 105, footerY + 12, { align: 'center' })
  
  // Compliance information (right side, properly spaced)
  doc.setFontSize(6).setFont('helvetica', 'normal')
  if (vatNumber) {
    doc.text(`VAT: ${vatNumber}`, 190, footerY + 8, { align: 'right' })
  }
  if (crNumber) {
    doc.text(`CR: ${crNumber}`, 190, footerY + 12, { align: 'right' })
  }
  doc.text('This invoice is valid without signature', 190, footerY + 16, { align: 'right' })
  
  const arrayBuffer = doc.output('arraybuffer') as ArrayBuffer
  return new Uint8Array(arrayBuffer)
}

// Helper function to check if PDF should be regenerated
export function shouldRegeneratePDF(invoice: any): boolean {
  if (!invoice.pdf_url) return true
  
  // Regenerate if older than 24 hours
  const lastUpdated = new Date(invoice.updated_at || invoice.created_at)
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  
  return lastUpdated < twentyFourHoursAgo
}
