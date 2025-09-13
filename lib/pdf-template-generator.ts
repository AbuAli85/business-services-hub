import { jsPDF } from 'jspdf'

// Template-specific color palette matching the design
const templateColors = {
  primary: [30, 64, 175] as [number, number, number],     // Blue-900
  accent: [59, 130, 246] as [number, number, number],     // Blue-600
  text: [31, 41, 55] as [number, number, number],         // Gray-800
  lightText: [75, 85, 99] as [number, number, number],    // Gray-600
  border: [209, 213, 219] as [number, number, number],    // Gray-300
  white: [255, 255, 255] as [number, number, number],     // White
  background: [249, 250, 251] as [number, number, number] // Gray-50
}

// Typography settings for template
const typography = {
  title: { size: 20, weight: 'bold' },
  subtitle: { size: 16, weight: 'bold' },
  heading: { size: 12, weight: 'bold' },
  body: { size: 10, weight: 'normal' },
  small: { size: 8, weight: 'normal' }
}

// Helper function to format currency
function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

// Helper function to format date
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export async function generateTemplatePDF(invoice: any): Promise<Uint8Array> {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = 210
  const pageHeight = 297
  const margin = 20
  const contentWidth = pageWidth - (margin * 2)
  
  let yPosition = margin

  // Helper function to add text with proper positioning
  const addText = (text: string, x: number, y: number, options: any = {}) => {
    doc.setFontSize(options.size || typography.body.size)
    doc.setFont('helvetica', options.weight || typography.body.weight)
    const color = options.color || templateColors.text
    doc.setTextColor(color[0], color[1], color[2])
    doc.text(text, x, y)
  }

  // Helper function to add line
  const addLine = (x1: number, y1: number, x2: number, y2: number, color: number[] = templateColors.border) => {
    doc.setDrawColor(color[0], color[1], color[2])
    doc.line(x1, y1, x2, y2)
  }

  // Helper function to add rectangle
  const addRect = (x: number, y: number, width: number, height: number, fillColor?: number[], strokeColor?: number[]) => {
    if (fillColor) {
      doc.setFillColor(fillColor[0], fillColor[1], fillColor[2])
      doc.rect(x, y, width, height, 'F')
    }
    if (strokeColor) {
      doc.setDrawColor(strokeColor[0], strokeColor[1], strokeColor[2])
      doc.rect(x, y, width, height, 'S')
    }
  }

  // Blue sidebar
  addRect(0, 0, 40, pageHeight, templateColors.primary)
  
  // Company logo area in sidebar
  const logoSize = 20
  const logoX = 10
  const logoY = 20
  addRect(logoX, logoY, logoSize, logoSize, templateColors.white)
  addText('LOGO', logoX + 2, logoY + 12, { size: 8, color: templateColors.primary })

  // Sidebar text
  addText('Professional', 10, 50, { size: 8, color: templateColors.white })
  addText('Services', 10, 58, { size: 8, color: templateColors.white })
  addLine(10, 65, 30, 65, templateColors.white)
  addText('Quality &', 10, 75, { size: 6, color: templateColors.white })
  addText('Excellence', 10, 82, { size: 6, color: templateColors.white })

  // Main content area
  const mainContentX = 50
  yPosition = margin

  // Company information
  addText(invoice.provider?.company?.name || 'Your Company Name', mainContentX, yPosition, typography.title)
  yPosition += 8

  // Contact information with icons
  const contactInfo = [
    { icon: '📍', text: invoice.provider?.company?.address || '123 Anywhere St., Any City, ST 12345' },
    { icon: '📞', text: invoice.provider?.company?.phone || '123-456-7890' },
    { icon: '✉️', text: invoice.provider?.email || 'hello@reallygreatsite.com' },
    { icon: '🌐', text: invoice.provider?.company?.website || 'reallygreatsite.com' }
  ]

  contactInfo.forEach(info => {
    addText(info.icon, mainContentX, yPosition, { size: 8 })
    addText(info.text, mainContentX + 6, yPosition, { size: 8, color: templateColors.lightText })
    yPosition += 4
  })

  yPosition += 10

  // Invoice title and number (right aligned)
  const invoiceTitleX = pageWidth - margin - 60
  addText('Invoice', invoiceTitleX, margin, { size: 24, color: templateColors.primary })
  addText(`Invoice Number: #${invoice.invoice_number || invoice.id.slice(-8)}`, invoiceTitleX, margin + 8, { size: 10, color: templateColors.text })

  yPosition = margin + 40

  // Dates and Bill To section
  const datesX = mainContentX
  const billToX = pageWidth - margin - 80

  // Dates
  addText(`Date: ${formatDate(invoice.created_at)}`, datesX, yPosition, { size: 8 })
  if (invoice.due_date) {
    addText(`Due Date: ${formatDate(invoice.due_date)}`, datesX, yPosition + 4, { size: 8 })
  }

  // Bill To
  addText('Bill To:', billToX, yPosition, { size: 10, color: templateColors.primary })
  addText(invoice.client?.full_name || 'Client Name', billToX, yPosition + 6, { size: 8 })
  if (invoice.client?.company?.name) {
    addText(invoice.client.company.name, billToX, yPosition + 10, { size: 8 })
  }
  if (invoice.client?.company?.address) {
    addText(invoice.client.company.address, billToX, yPosition + 14, { size: 8 })
  }
  addText(invoice.client?.email || 'client@company.com', billToX, yPosition + 18, { size: 8 })

  yPosition += 30

  // Services table
  const tableX = mainContentX
  const tableWidth = contentWidth - 30
  const colWidths = [15, 60, 20, 25, 25]
  const colPositions = [tableX, tableX + colWidths[0], tableX + colWidths[0] + colWidths[1], tableX + colWidths[0] + colWidths[1] + colWidths[2], tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3]]

  // Table headers
  const headers = ['Item', 'Description', 'Qty/Hour', 'Rate', 'Total']
  addRect(tableX, yPosition, tableWidth, 8, templateColors.background, templateColors.border)
  
  headers.forEach((header, index) => {
    addText(header, colPositions[index] + 2, yPosition + 5, { size: 8, color: templateColors.primary })
  })

  yPosition += 8

  // Table rows
  const items = invoice.invoice_items || [{
    product: invoice.booking?.service?.title || 'Professional Service',
    description: invoice.booking?.service?.description || 'High-quality professional service',
    qty: 1,
    unit_price: invoice.amount * 0.9,
    total: invoice.amount * 0.9
  }]

  items.forEach((item: any, index: number) => {
    const rowY = yPosition + (index * 8)
    
    // Alternate row background
    if (index % 2 === 0) {
      addRect(tableX, rowY, tableWidth, 8, templateColors.background)
    }
    
    // Row border
    addLine(tableX, rowY, tableX + tableWidth, rowY, templateColors.border)
    addLine(tableX, rowY + 8, tableX + tableWidth, rowY + 8, templateColors.border)
    
    // Row content
    addText(String(index + 1).padStart(2, '0'), colPositions[0] + 2, rowY + 5, { size: 8 })
    addText(item.product || 'Service', colPositions[1] + 2, rowY + 5, { size: 8 })
    addText(String(item.qty || 1), colPositions[2] + 2, rowY + 5, { size: 8 })
    addText(formatCurrency(item.unit_price || 0, invoice.currency), colPositions[3] + 2, rowY + 5, { size: 8 })
    addText(formatCurrency(item.total || 0, invoice.currency), colPositions[4] + 2, rowY + 5, { size: 8 })
  })

  yPosition += (items.length * 8) + 20

  // Totals section
  const totalsX = pageWidth - margin - 80
  const subtotal = invoice.subtotal || invoice.amount * 0.9
  const taxRate = invoice.vat_percent ? invoice.vat_percent / 100 : 0.1
  const taxAmount = invoice.vat_amount || invoice.amount * 0.1
  const total = invoice.total_amount || invoice.amount

  addText('Subtotal', totalsX, yPosition, { size: 8 })
  addText(formatCurrency(subtotal, invoice.currency), totalsX + 50, yPosition, { size: 8 })
  yPosition += 6

  addText(`Tax (${(taxRate * 100).toFixed(1)}%)`, totalsX, yPosition, { size: 8 })
  addText(formatCurrency(taxAmount, invoice.currency), totalsX + 50, yPosition, { size: 8 })
  yPosition += 6

  addLine(totalsX, yPosition, totalsX + 60, yPosition, templateColors.border)
  yPosition += 6

  addText('Total Amount Due', totalsX, yPosition, { size: 10, weight: 'bold' })
  addText(formatCurrency(total, invoice.currency), totalsX + 50, yPosition, { size: 10, weight: 'bold' })

  yPosition += 30

  // Footer section
  const footerY = pageHeight - 40

  // Signature area
  addRect(mainContentX, footerY, 60, 20, undefined, templateColors.border)
  addText('Name and Signature', mainContentX + 2, footerY + 12, { size: 8, color: templateColors.lightText })

  // Terms & Conditions
  const termsX = pageWidth - margin - 80
  addText('Terms & Conditions', termsX, footerY, { size: 8, color: templateColors.primary })
  addText('Payment is due within 30 days of invoice date. Late payments may incur a 1.5% monthly service charge. All services are provided subject to our standard terms of service. For questions regarding this invoice, please contact us at the provided contact information.', termsX, footerY + 6, { size: 6, color: templateColors.lightText })

  return new Uint8Array(doc.output('arraybuffer'))
}
