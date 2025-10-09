import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import { Buffer } from 'node:buffer'

// Template colors matching the screenshot
const templateColors = {
  primary: [15, 23, 42] as [number, number, number],     // Dark blue sidebar
  accent: [59, 130, 246] as [number, number, number],    // Blue accents
  white: [255, 255, 255] as [number, number, number],    // White
  lightGray: [248, 250, 252] as [number, number, number], // Light gray
  mediumGray: [226, 232, 240] as [number, number, number], // Medium gray
  darkGray: [100, 116, 139] as [number, number, number], // Dark gray
  borderGray: [203, 213, 225] as [number, number, number] // Border gray
}

// Professional typography settings
const typography = {
  title: { size: 24, weight: 'bold' },
  subtitle: { size: 18, weight: 'bold' },
  heading: { size: 14, weight: 'bold' },
  subheading: { size: 12, weight: 'bold' },
  body: { size: 10, weight: 'normal' },
  small: { size: 8, weight: 'normal' },
  caption: { size: 7, weight: 'normal' }
}

// Helper function to format currency
function formatCurrency(amount: number, currency: string = 'OMR'): string {
  // For OMR, we want 3 decimal places as shown in template
  if (currency === 'OMR') {
    return `OMR ${amount.toFixed(3)}`
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

// Helper function to format invoice number
function formatInvoiceNumber(id: string, invoiceNumber?: string): string {
  if (invoiceNumber) {
    return invoiceNumber
  }
  return `INV-${id.slice(-8).toUpperCase()}`
}

// Helper function to draw professional box
function drawBox(doc: jsPDF, x: number, y: number, width: number, height: number, 
  fillColor?: [number, number, number], borderColor?: [number, number, number], lineWidth: number = 1) {
  if (fillColor) {
    doc.setFillColor(fillColor[0], fillColor[1], fillColor[2])
    doc.rect(x, y, width, height, 'F')
  }
  if (borderColor) {
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2])
    doc.setLineWidth(lineWidth)
    doc.rect(x, y, width, height, 'S')
  }
}

// Helper function to add professional text with proper styling
function addText(doc: jsPDF, text: string | any, x: number, y: number, 
  style: keyof typeof typography = 'body', color: [number, number, number] = templateColors.primary, 
  align: 'left' | 'center' | 'right' = 'left', maxWidth?: number) {
  // Ensure text is always a string and clean it
  let textString = String(text || '').trim()
  
  // Remove any problematic characters that might cause rendering issues
  textString = textString.replace(/[^\x20-\x7E]/g, '')
  
  // Set font properties
  const fontStyle = typography[style]
  doc.setFontSize(fontStyle.size)
  doc.setFont('helvetica', fontStyle.weight as any)
  doc.setTextColor(color[0], color[1], color[2])
  
  // Add text with alignment and optional wrapping
  const options: any = {}
  if (align !== 'left') {
    options.align = align
  }
  if (maxWidth) {
    options.maxWidth = maxWidth
  }
  
  doc.text(textString, x, y, options)
}

// Main PDF generation function matching the template design
export async function generateTemplatePDF(invoice: any): Promise<Uint8Array> {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  
  // Layout dimensions
  const sidebarWidth = 50 // Dark blue sidebar width
  const contentStartX = sidebarWidth + 5
  const contentWidth = pageWidth - sidebarWidth - 10
  const margin = 15

  // Invoice data
  const invoiceNumber = formatInvoiceNumber(invoice.id, invoice.invoice_number)
  const createdDate = new Date(invoice.created_at).toLocaleDateString('en-GB')
  const dueDate = new Date(invoice.due_date || Date.now() + 30 * 86400000).toLocaleDateString('en-GB')
  
  // Company information (Provider)
  const providerCompany = invoice.booking?.service?.provider?.company || {}
  const companyName = providerCompany.name || 'Your Company Name'
  const companyAddress = providerCompany.address || '123 Anywhere St., Any City, ST 12345'
  const companyPhone = providerCompany.phone || '123-456-7890'
  const companyEmail = providerCompany.email || 'luxsess2001@hotmail.com'
  const companyWebsite = providerCompany.website || 'reallygreatsite.com'
  const companyLogo = providerCompany.logo_url
  
  // Client information
  const client = invoice.booking?.client || {}
  const clientName = client.full_name || 'Fahad alamri'
  const clientCompany = client.company?.name || 'Client Company'
  const clientAddress = client.company?.address || '123 Anywhere St., Any City, ST 12345'
  const clientPhone = client.phone || '95153930'
  const clientEmail = client.email || 'chairman@falconeyegroup.net'
  const clientWebsite = client.company?.website || 'clientcompany.com'
  
  // Financial calculations
  let safeSubtotal = invoice.subtotal || 0
  if (safeSubtotal === 0 && invoice.invoice_items && invoice.invoice_items.length > 0) {
    safeSubtotal = invoice.invoice_items.reduce((sum: number, item: any) => {
      return sum + ((item.unit_price || 0) * (item.quantity || 1))
    }, 0)
  }
  if (safeSubtotal === 0) {
    safeSubtotal = 180 // Default value matching template
  }
  
  const safeVatPercent = invoice.vat_percent || 0.05
  const safeVatAmount = invoice.vat_amount || (safeSubtotal * safeVatPercent)
  const safeTotal = invoice.total || (safeSubtotal + safeVatAmount)
  
  // Ensure VAT percentage is reasonable (max 25%)
  const displayVatPercent = Math.min(safeVatPercent, 0.25)
  const displayVatAmount = safeSubtotal * displayVatPercent
  const displayTotal = safeSubtotal + displayVatAmount

  // === SIDEBAR SECTION (Dark Blue) ===
  drawBox(doc, 0, 0, sidebarWidth, pageHeight, templateColors.primary)
  
  // Logo placeholder
  const logoSize = 20
  const logoX = 15
  const logoY = 20
  drawBox(doc, logoX, logoY, logoSize, logoSize, templateColors.white)
  addText(doc, 'LOGO', logoX + 5, logoY + 12, 'small', templateColors.primary, 'center')
  
  // Professional Services text
  addText(doc, 'PROFESSIONAL SERVICES', 10, 50, 'small', templateColors.white, 'left')
  doc.setDrawColor(templateColors.white[0], templateColors.white[1], templateColors.white[2])
  doc.setLineWidth(0.5)
  doc.line(10, 52, 40, 52)
  
  // Quality & Excellence
  addText(doc, 'Quality & Excellence', 10, 60, 'caption', templateColors.white, 'left')

  // === MAIN CONTENT AREA ===
  
  // Company Information (Top Left)
  addText(doc, companyName, contentStartX, 25, 'title', templateColors.primary, 'left')
  
  // Company contact details
  let currentY = 35
  addText(doc, companyAddress, contentStartX, currentY, 'body', templateColors.darkGray, 'left')
  currentY += 6
  addText(doc, companyPhone, contentStartX, currentY, 'body', templateColors.darkGray, 'left')
  currentY += 6
  addText(doc, companyEmail, contentStartX, currentY, 'body', templateColors.darkGray, 'left')
  currentY += 6
  addText(doc, companyWebsite, contentStartX, currentY, 'body', templateColors.darkGray, 'left')

  // === INVOICE DETAILS (Top Right) ===
  const invoiceDetailsX = contentStartX + contentWidth - 80
  addText(doc, 'Invoice', invoiceDetailsX, 25, 'title', templateColors.accent, 'right')
  addText(doc, `Invoice Number: #${invoiceNumber}`, invoiceDetailsX, 35, 'body', templateColors.darkGray, 'right')
  addText(doc, `Date: ${createdDate}`, invoiceDetailsX, 41, 'body', templateColors.darkGray, 'right')
  addText(doc, `Due Date: ${dueDate}`, invoiceDetailsX, 47, 'body', templateColors.darkGray, 'right')

  // === BILL TO SECTION ===
  currentY = 60
  addText(doc, 'Bill To:', contentStartX, currentY, 'heading', templateColors.accent, 'left')
  currentY += 8
  addText(doc, clientName, contentStartX, currentY, 'subheading', templateColors.primary, 'left')
  currentY += 6
  addText(doc, clientCompany, contentStartX, currentY, 'body', templateColors.darkGray, 'left')
  currentY += 6
  addText(doc, clientAddress, contentStartX, currentY, 'body', templateColors.darkGray, 'left')
  currentY += 6
  addText(doc, clientEmail, contentStartX, currentY, 'body', templateColors.darkGray, 'left')
  currentY += 6
  addText(doc, clientPhone, contentStartX, currentY, 'body', templateColors.darkGray, 'left')
  currentY += 6
  addText(doc, clientWebsite, contentStartX, currentY, 'body', templateColors.darkGray, 'left')

  // === ITEMS TABLE ===
  currentY += 15
  const tableStartY = currentY
  
  // Table headers
  const colWidths = [15, 60, 15, 25, 25] // Item, Description, Qty, Rate, Total
  const colX = [contentStartX, contentStartX + 15, contentStartX + 75, contentStartX + 90, contentStartX + 115]
  
  // Header background
  drawBox(doc, contentStartX, currentY - 5, contentWidth, 8, templateColors.lightGray)
  
  addText(doc, 'Item', colX[0], currentY, 'subheading', templateColors.primary, 'left')
  addText(doc, 'Description', colX[1], currentY, 'subheading', templateColors.primary, 'left')
  addText(doc, 'Qty', colX[2], currentY, 'subheading', templateColors.primary, 'left')
  addText(doc, 'Rate', colX[3], currentY, 'subheading', templateColors.primary, 'left')
  addText(doc, 'Total', colX[4], currentY, 'subheading', templateColors.primary, 'left')
  
  currentY += 8
  
  // Table data
  if (invoice.invoice_items && invoice.invoice_items.length > 0) {
    invoice.invoice_items.forEach((item: any, index: number) => {
      addText(doc, String(index + 1).padStart(2, '0'), colX[0], currentY, 'body', templateColors.darkGray, 'left')
      addText(doc, item.description || 'Content Creation', colX[1], currentY, 'body', templateColors.darkGray, 'left')
      addText(doc, String(item.quantity || 1), colX[2], currentY, 'body', templateColors.darkGray, 'left')
      addText(doc, formatCurrency(item.unit_price || safeSubtotal, 'OMR'), colX[3], currentY, 'body', templateColors.darkGray, 'left')
      addText(doc, formatCurrency((item.unit_price || safeSubtotal) * (item.quantity || 1), 'OMR'), colX[4], currentY, 'body', templateColors.darkGray, 'left')
      currentY += 6
    })
  } else {
    // Default item if no items
    addText(doc, '01', colX[0], currentY, 'body', templateColors.darkGray, 'left')
    addText(doc, 'Content Creation', colX[1], currentY, 'body', templateColors.darkGray, 'left')
    addText(doc, '1', colX[2], currentY, 'body', templateColors.darkGray, 'left')
    addText(doc, formatCurrency(safeSubtotal, 'OMR'), colX[3], currentY, 'body', templateColors.darkGray, 'left')
    addText(doc, formatCurrency(safeSubtotal, 'OMR'), colX[4], currentY, 'body', templateColors.darkGray, 'left')
    currentY += 6
  }

  // === FINANCIAL SUMMARY ===
  currentY += 10
  const summaryX = contentStartX + contentWidth - 60
  
  addText(doc, `Subtotal: ${formatCurrency(safeSubtotal, 'OMR')}`, summaryX, currentY, 'body', templateColors.darkGray, 'right')
  currentY += 6
  addText(doc, `VAT (${(displayVatPercent * 100).toFixed(1)}%): ${formatCurrency(displayVatAmount, 'OMR')}`, summaryX, currentY, 'body', templateColors.darkGray, 'right')
  currentY += 8
  addText(doc, `Total Amount Due: ${formatCurrency(displayTotal, 'OMR')}`, summaryX, currentY, 'heading', templateColors.primary, 'right')

  // === SIGNATURE AREA ===
  currentY += 20
  const signatureBoxY = currentY
  drawBox(doc, contentStartX, signatureBoxY, 40, 15, templateColors.lightGray, templateColors.borderGray)
  addText(doc, 'Name and Signature', contentStartX + 5, signatureBoxY + 8, 'body', templateColors.darkGray, 'left')

  // === TERMS & CONDITIONS ===
  const termsX = contentStartX + 50
  const termsY = signatureBoxY
  const termsWidth = contentWidth - 50
  
  addText(doc, 'Payment Terms:', termsX, termsY, 'subheading', templateColors.primary, 'left')
  addText(doc, 'Payment is due within 30 days of invoice date. Late payments are subject to a 1.5% monthly service charge.', termsX, termsY + 6, 'caption', templateColors.darkGray, 'left', termsWidth)
  
  addText(doc, 'Service Agreement:', termsX, termsY + 15, 'subheading', templateColors.primary, 'left')
  addText(doc, 'All services are provided subject to our standard terms of service. Work performed is guaranteed for 90 days.', termsX, termsY + 21, 'caption', templateColors.darkGray, 'left', termsWidth)
  
  addText(doc, 'Disputes:', termsX, termsY + 30, 'subheading', templateColors.primary, 'left')
  addText(doc, 'Any disputes must be submitted in writing within 15 days of invoice date. Contact us for questions.', termsX, termsY + 36, 'caption', templateColors.darkGray, 'left', termsWidth)

  // === FOOTER ===
  const footerY = pageHeight - 15
  addText(doc, 'Thank you for your business!', contentStartX, footerY, 'body', templateColors.accent, 'center')

  return new Uint8Array(doc.output('arraybuffer'))
}