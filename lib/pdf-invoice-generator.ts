import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import { Buffer } from 'node:buffer'

// High-end business class color palette
const premiumColors = {
  primary: [15, 23, 42] as [number, number, number],     // Deep Navy
  accent: [59, 130, 246] as [number, number, number],    // Professional Blue
  secondary: [71, 85, 105] as [number, number, number],  // Slate Gray
  success: [34, 197, 94] as [number, number, number],    // Green
  warning: [245, 158, 11] as [number, number, number],   // Amber
  danger: [239, 68, 68] as [number, number, number],     // Red
  white: [255, 255, 255] as [number, number, number],    // White
  lightGray: [248, 250, 252] as [number, number, number], // Light Gray
  mediumGray: [226, 232, 240] as [number, number, number], // Medium Gray
  darkGray: [100, 116, 139] as [number, number, number], // Dark Gray
  borderGray: [203, 213, 225] as [number, number, number] // Border Gray
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

// Professional spacing
const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32
}

// Helper function to format currency
function formatCurrency(amount: number, currency: string = 'OMR'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

// Helper function to format invoice number
function formatInvoiceNumber(id: number, invoiceNumber?: string): string {
  if (invoiceNumber) {
    return invoiceNumber
  }
  return `INV-${String(id).padStart(6, '0')}`
}

// Helper function to convert numbers to words
function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  
  if (num === 0) return 'Zero'
  if (num < 10) return ones[num]
  if (num < 20) return teens[num - 10]
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '')
  if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + numberToWords(num % 100) : '')
  if (num < 1000000) return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + numberToWords(num % 1000) : '')
  return 'Large Number'
}

// Helper function to draw professional divider line
function drawDivider(doc: jsPDF, y: number, color: [number, number, number] = premiumColors.borderGray) {
  doc.setDrawColor(color[0], color[1], color[2])
  doc.setLineWidth(0.5)
  doc.line(20, y, 190, y)
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
function addText(doc: jsPDF, text: string, x: number, y: number, 
  style: keyof typeof typography = 'body', color: [number, number, number] = premiumColors.primary, 
  align: 'left' | 'center' | 'right' = 'left') {
  const fontStyle = typography[style]
  doc.setFontSize(fontStyle.size)
  doc.setFont('helvetica', fontStyle.weight)
  doc.setTextColor(color[0], color[1], color[2])
  doc.text(text, x, y, { align })
}

// Main PDF generation function
export async function generateProfessionalPDF(
  invoice: InvoiceWithDetails,
  language: 'en' | 'ar' | 'bilingual' = 'en'
): Promise<Uint8Array> {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  
  // Use premium colors from invoice data or default
  const colors = invoice.provider?.company?.brand_colors 
    ? JSON.parse(invoice.provider.company.brand_colors as string)
    : premiumColors

  // Invoice data
  const invoiceNumber = formatInvoiceNumber(invoice.id, invoice.invoice_number)
  const createdDate = new Date(invoice.created_at).toLocaleDateString('en-GB')
  const dueDate = new Date(invoice.due_date || Date.now() + 30 * 86400000).toLocaleDateString('en-GB')
  
  // Company information
  const companyName = invoice.provider?.company?.name || 'Business Services Hub'
  const companyAddress = invoice.provider?.company?.address || '123 Business Street, City'
  const companyPhone = invoice.provider?.company?.phone || '(555) 555-5555'
  const companyEmail = invoice.provider?.company?.email || 'info@businessservices.com'
  const companyLogo = invoice.provider?.company?.logo_url
  
  // Client information
  const clientName = invoice.client?.name || 'Client Name'
  const clientCompany = invoice.client?.company || ''
  const clientAddress = invoice.client?.address || ''
  const clientPhone = invoice.client?.phone || ''
  const clientEmail = invoice.client?.email || ''
  
  // Financial calculations
  const safeSubtotal = invoice.subtotal || 0
  const safeTaxRate = invoice.tax_rate || 5
  const safeTaxAmount = (safeSubtotal * safeTaxRate) / 100
  const safeTotal = safeSubtotal + safeTaxAmount
  
  // Payment information
  const paymentTerms = invoice.payment_terms || 'Due within 30 days'
  const bankName = invoice.provider?.company?.bank_name || 'Bank Name'
  const accountNumber = invoice.provider?.company?.account_number || 'Account Number'
  
  // Status information
  const status = invoice.status || 'issued'
  const statusColors = {
    issued: premiumColors.accent,
    paid: premiumColors.success,
    overdue: premiumColors.danger,
    cancelled: premiumColors.darkGray
  }
  const statusColor = statusColors[status as keyof typeof statusColors] || premiumColors.accent

  // === HEADER SECTION ===
  // Professional header background
  drawBox(doc, 0, 0, pageWidth, 60, premiumColors.lightGray, undefined, 0)
  
  // Company logo area
  if (companyLogo) {
    try {
      const response = await fetch(companyLogo)
      const logoBlob = await response.blob()
      const logoArrayBuffer = await logoBlob.arrayBuffer()
      const logoBase64 = Buffer.from(logoArrayBuffer).toString('base64')
      const logoDataUrl = `data:image/png;base64,${logoBase64}`
      doc.addImage(logoDataUrl, 'PNG', 20, 15, 30, 30)
    } catch (error) {
      // Fallback to text logo
      drawBox(doc, 20, 15, 30, 30, colors.primary, colors.primary, 2)
      addText(doc, 'BSH', 35, 35, 'heading', premiumColors.white, 'center')
    }
  } else {
    // Professional text logo
    drawBox(doc, 20, 15, 30, 30, colors.primary, colors.primary, 2)
    addText(doc, 'BSH', 35, 35, 'heading', premiumColors.white, 'center')
  }

  // Company information
  addText(doc, companyName, 60, 25, 'title', colors.primary)
  addText(doc, companyAddress, 60, 32, 'body', premiumColors.darkGray)
  addText(doc, `${companyPhone} | ${companyEmail}`, 60, 39, 'body', premiumColors.darkGray)
  
  // VAT Registration (if available)
  if (invoice.provider?.company?.vat_registration) {
    addText(doc, `VAT Reg: ${invoice.provider.company.vat_registration}`, 60, 46, 'small', premiumColors.darkGray)
  }

  // Invoice details box
  drawBox(doc, 130, 15, 70, 45, undefined, colors.primary, 2)
  addText(doc, 'INVOICE', 165, 30, 'subtitle', colors.primary, 'center')
  
  addText(doc, `Invoice #: ${invoiceNumber}`, 135, 38, 'body', premiumColors.darkGray)
  addText(doc, `Date: ${createdDate}`, 135, 44, 'body', premiumColors.darkGray)
  addText(doc, `Due: ${dueDate}`, 135, 50, 'body', premiumColors.darkGray)
  
  // Status badge
  drawBox(doc, 135, 54, 25, 8, statusColor, statusColor, 0)
  addText(doc, status.toUpperCase(), 147.5, 59, 'small', premiumColors.white, 'center')

  // === BILLING SECTIONS ===
  const billingY = 75
  
  // From section
  drawBox(doc, 20, billingY, 85, 50, premiumColors.lightGray, colors.primary, 1)
  addText(doc, 'FROM', 25, billingY + 8, 'subheading', colors.primary)
  addText(doc, companyName, 25, billingY + 16, 'body', premiumColors.darkGray)
  addText(doc, companyAddress, 25, billingY + 22, 'body', premiumColors.darkGray)
  addText(doc, companyPhone, 25, billingY + 28, 'body', premiumColors.darkGray)
  addText(doc, companyEmail, 25, billingY + 34, 'body', premiumColors.darkGray)
  
  // Bill To section
  drawBox(doc, 115, billingY, 85, 50, premiumColors.lightGray, colors.primary, 1)
  addText(doc, 'BILL TO', 120, billingY + 8, 'subheading', colors.primary)
  
  let clientY = billingY + 16
  if (clientCompany) {
    addText(doc, clientCompany, 120, clientY, 'body', premiumColors.darkGray)
    clientY += 6
  }
  addText(doc, clientName, 120, clientY, 'body', premiumColors.darkGray)
  clientY += 6
  if (clientAddress) {
    addText(doc, clientAddress, 120, clientY, 'body', premiumColors.darkGray)
    clientY += 6
  }
  if (clientPhone) {
    addText(doc, clientPhone, 120, clientY, 'body', premiumColors.darkGray)
    clientY += 6
  }
  if (clientEmail) {
    addText(doc, clientEmail, 120, clientY, 'body', premiumColors.darkGray)
    clientY += 6
  }
  
  // Add professional note if no company info
  if (!clientCompany && !clientAddress && !clientPhone) {
    addText(doc, 'Individual Client', 120, clientY, 'small', premiumColors.darkGray)
  }

  // === SERVICE TABLE ===
  const tableY = billingY + 70
  const tableWidth = 170
  const colWidths = [15, 80, 20, 30, 25]
  const colX = [20, 35, 115, 135, 165]
  
  // Table header
  drawBox(doc, 20, tableY, tableWidth, 12, colors.primary, colors.primary, 0)
  addText(doc, 'No', colX[0], tableY + 8, 'subheading', premiumColors.white, 'center')
  addText(doc, 'Item Description', colX[1], tableY + 8, 'subheading', premiumColors.white)
  addText(doc, 'Qty', colX[2], tableY + 8, 'subheading', premiumColors.white, 'center')
  addText(doc, 'Rate (OMR)', colX[3], tableY + 8, 'subheading', premiumColors.white, 'right')
  addText(doc, 'Amount', colX[4], tableY + 8, 'subheading', premiumColors.white, 'right')
  
  // Table rows
  let currentY = tableY + 12
  invoice.invoice_items?.forEach((item, index) => {
    const isEven = index % 2 === 0
    const rowColor = isEven ? premiumColors.white : premiumColors.lightGray
    
    drawBox(doc, 20, currentY, tableWidth, 12, rowColor, premiumColors.borderGray, 0.5)
    addText(doc, String(index + 1), colX[0], currentY + 8, 'body', premiumColors.darkGray, 'center')
    addText(doc, item.description || 'Service Item', colX[1], currentY + 8, 'body', premiumColors.darkGray)
    addText(doc, String(item.quantity || 1), colX[2], currentY + 8, 'body', premiumColors.darkGray, 'center')
    addText(doc, formatCurrency(item.unit_price || 0, 'OMR'), colX[3], currentY + 8, 'body', premiumColors.darkGray, 'right')
    addText(doc, formatCurrency((item.unit_price || 0) * (item.quantity || 1), 'OMR'), colX[4], currentY + 8, 'body', premiumColors.darkGray, 'right')
    
    currentY += 12
  })

  // === SUMMARY SECTION ===
  const summaryY = currentY + 10
  const summaryWidth = 170
  const summaryX = 20
  
  // Summary box
  drawBox(doc, summaryX, summaryY, summaryWidth, 40, premiumColors.lightGray, colors.primary, 1)
  
  // Subtotal
  addText(doc, 'Subtotal:', summaryX + 10, summaryY + 12, 'body', premiumColors.darkGray)
  addText(doc, formatCurrency(safeSubtotal, 'OMR'), summaryX + summaryWidth - 10, summaryY + 12, 'body', premiumColors.darkGray, 'right')
  
  // VAT
  addText(doc, `VAT (${safeTaxRate}%):`, summaryX + 10, summaryY + 20, 'body', premiumColors.darkGray)
  addText(doc, formatCurrency(safeTaxAmount, 'OMR'), summaryX + summaryWidth - 10, summaryY + 20, 'body', premiumColors.darkGray, 'right')
  
  // Total with highlight
  drawBox(doc, summaryX + 5, summaryY + 26, summaryWidth - 10, 12, colors.primary, colors.primary, 0)
  addText(doc, 'TOTAL', summaryX + 10, summaryY + 34, 'subheading', premiumColors.white)
  addText(doc, formatCurrency(safeTotal, 'OMR'), summaryX + summaryWidth - 10, summaryY + 34, 'subheading', premiumColors.white, 'right')
  
  // Amount in words
  const amountInWords = numberToWords(Math.round(safeTotal))
  addText(doc, `Amount in words: ${amountInWords} Omani Rials Only`, summaryX + 10, summaryY + 50, 'small', premiumColors.darkGray)

  // === PAYMENT INFORMATION ===
  const paymentY = summaryY + 60
  addText(doc, 'PAYMENT INFORMATION', 20, paymentY, 'subheading', colors.primary)
  
  addText(doc, `Bank: ${bankName}`, 20, paymentY + 8, 'body', premiumColors.darkGray)
  addText(doc, `Account: ${accountNumber}`, 20, paymentY + 14, 'body', premiumColors.darkGray)
  addText(doc, `Payment Terms: ${paymentTerms}`, 20, paymentY + 20, 'body', premiumColors.darkGray)

  // === FOOTER ===
  const footerY = paymentY + 35
  
  // Divider line
  drawDivider(doc, footerY - 5)
  
  // QR Code
  try {
    const qrText = invoice.payment_url || `Invoice ${invoiceNumber}, Total: ${formatCurrency(safeTotal, 'OMR')}`
    const qrDataUrl = await QRCode.toDataURL(qrText, { width: 60 })
    doc.addImage(qrDataUrl, 'PNG', 20, footerY, 30, 30)
    addText(doc, 'Scan to Pay', 25, footerY + 35, 'small', premiumColors.darkGray)
  } catch (error) {
    // QR code generation failed, continue without it
  }
  
  // Thank you message
  addText(doc, 'Thank you for your business!', 100, footerY + 15, 'heading', colors.primary, 'center')
  
  // Compliance text
  addText(doc, 'Generated electronically in compliance with Omani VAT regulations', 100, footerY + 25, 'small', premiumColors.darkGray, 'center')
  
  // Signature section
  addText(doc, 'Authorized Signature:', 20, footerY + 40, 'body', colors.primary)
  addText(doc, '_________________________', 20, footerY + 48, 'body', premiumColors.darkGray)
  addText(doc, 'Date: _______________', 20, footerY + 56, 'body', premiumColors.darkGray)
  
  // Professional note
  addText(doc, 'This invoice is valid without signature', 100, footerY + 50, 'small', premiumColors.darkGray, 'center')

  return new Uint8Array(doc.output('arraybuffer'))
}

// Helper function to check if PDF should be regenerated
export function shouldRegeneratePDF(pdfUrl: string | null): boolean {
  if (!pdfUrl) return true
  
  // Check if PDF is older than 24 hours
  const pdfTimestamp = pdfUrl.match(/\?t=(\d+)/)
  if (pdfTimestamp) {
    const timestamp = parseInt(pdfTimestamp[1])
    const now = Date.now()
    const twentyFourHours = 24 * 60 * 60 * 1000
    return (now - timestamp) > twentyFourHours
  }
  
  return true
}

// Type definitions
export interface InvoiceWithDetails {
  id: number
  invoice_number?: string
  subtotal?: number
  tax_rate?: number
  total?: number
  status?: string
  payment_terms?: string
  payment_url?: string
  due_date?: string
  created_at: string
  provider?: {
    name?: string
    company?: {
      name?: string
      address?: string
      phone?: string
      email?: string
      logo_url?: string
      vat_registration?: string
      bank_name?: string
      account_number?: string
      brand_colors?: string
    }
  }
  client?: {
    name?: string
    company?: string
    address?: string
    phone?: string
    email?: string
  }
  invoice_items?: Array<{
    description?: string
    quantity?: number
    unit_price?: number
  }>
}