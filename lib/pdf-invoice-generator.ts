import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import { Buffer } from 'node:buffer'

// Default color palette
const defaultColors = {
  primary: [15, 23, 42] as [number, number, number],   // Navy
  accent: [59, 130, 246] as [number, number, number],  // Blue
  success: [16, 185, 129] as [number, number, number], // Green
  warning: [245, 158, 11] as [number, number, number], // Orange
  white: [255, 255, 255] as [number, number, number],
  gray: [71, 85, 105] as [number, number, number],
  lightGray: [248, 250, 252] as [number, number, number],
  borderGray: [226, 232, 240] as [number, number, number],
  teal: [32, 201, 151] as [number, number, number],
}

// Function to get brand colors from provider data
function getBrandColors(provider: any) {
  const brandColors = provider?.company?.brand_colors
  if (brandColors) {
    return {
      ...defaultColors,
      primary: brandColors.primary ? hexToRgb(brandColors.primary) : defaultColors.primary,
      accent: brandColors.accent ? hexToRgb(brandColors.accent) : defaultColors.accent,
      success: brandColors.success ? hexToRgb(brandColors.success) : defaultColors.success,
      warning: brandColors.warning ? hexToRgb(brandColors.warning) : defaultColors.warning,
    }
  }
  return defaultColors
}

// Helper function to convert hex to RGB
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : [0, 0, 0]
}

// Currency formatter
function formatCurrency(value: number, currency = 'OMR'): string {
  return new Intl.NumberFormat('en-OM', { 
    style: 'currency', 
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

// Text wrapper
function splitText(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth)
}

// Invoice number formatter
function formatInvoiceNumber(invoiceId: string, invoiceNumber?: string): string {
  if (invoiceNumber) return invoiceNumber
  const numericPart = invoiceId.slice(-8)
  return `INV-${numericPart.padStart(8, '0')}`
}

export async function generateProfessionalPDF(invoice: any): Promise<Uint8Array> {
  const doc = new jsPDF('p', 'mm', 'a4')

  // Get dynamic brand colors
  const colors = getBrandColors(invoice.provider)

  // Invoice data
  const invoiceNumber = formatInvoiceNumber(invoice.id, invoice.invoice_number)
  const createdDate = new Date(invoice.created_at).toLocaleDateString('en-GB')
  const dueDate = new Date(invoice.due_date || Date.now() + 30 * 86400000).toLocaleDateString('en-GB')

  // Company info
  const companyName = invoice.provider?.company?.name || 'Business Services Hub'
  const companyAddress = invoice.provider?.company?.address || '123 Business Street, City'
  const companyPhone = invoice.provider?.company?.phone || '(555) 555-5555'
  const companyEmail = invoice.provider?.company?.email || 'info@businessservices.com'
  const vatNumber = invoice.provider?.company?.vat_number
  const crNumber = invoice.provider?.company?.cr_number

  // Client info
  const clientName = invoice.client?.full_name || 'Client Name'
  const clientCompany = invoice.client?.company?.name || invoice.client?.company_name || ''
  const clientEmail = invoice.client?.email || ''
  const clientAddress = invoice.client?.company?.address || invoice.client?.address || ''
  const clientPhone = invoice.client?.phone || ''

  // Status
  const status = invoice.status || 'pending'
  const statusColors = {
    paid: colors.success,
    pending: colors.warning,
    overdue: [220, 38, 38] as [number, number, number],
    draft: colors.gray,
    issued: colors.accent
  }
  const statusColor = statusColors[status as keyof typeof statusColors] || colors.accent

  // === HEADER ===
  // Company logo (if available)
  const logoUrl = invoice.provider?.company?.logo_url
  if (logoUrl && (logoUrl.includes('.png') || logoUrl.includes('.jpg') || logoUrl.includes('.jpeg'))) {
    try {
      const logoResp = await fetch(logoUrl)
      if (logoResp.ok) {
        const logoBlob = await logoResp.blob()
        const logoDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(logoBlob)
        })
        doc.addImage(logoDataUrl, 'PNG', 20, 15, 40, 20)
      } else {
        // Fallback to text if logo fails to load
        doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2])
        doc.rect(20, 15, 40, 20, 'F')
        doc.setDrawColor(colors.borderGray[0], colors.borderGray[1], colors.borderGray[2])
        doc.rect(20, 15, 40, 20, 'S')
        doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
        doc.setFontSize(10).setFont('helvetica', 'bold')
        doc.text(companyName.split(' ')[0], 25, 25)
        doc.text(companyName.split(' ').slice(1).join(' '), 25, 30)
      }
    } catch (error) {
      console.warn('Failed to load company logo:', error)
      // Fallback to text
      doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2])
      doc.rect(20, 15, 40, 20, 'F')
      doc.setDrawColor(colors.borderGray[0], colors.borderGray[1], colors.borderGray[2])
      doc.rect(20, 15, 40, 20, 'S')
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
      doc.setFontSize(10).setFont('helvetica', 'bold')
      doc.text(companyName.split(' ')[0], 25, 25)
      doc.text(companyName.split(' ').slice(1).join(' '), 25, 30)
    }
  } else {
    // No logo URL - show company name in logo area
    doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2])
    doc.rect(20, 15, 40, 20, 'F')
    doc.setDrawColor(colors.borderGray[0], colors.borderGray[1], colors.borderGray[2])
    doc.rect(20, 15, 40, 20, 'S')
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
    doc.setFontSize(10).setFont('helvetica', 'bold')
    doc.text(companyName.split(' ')[0], 25, 25)
    doc.text(companyName.split(' ').slice(1).join(' '), 25, 30)
  }

  // Company name and contact info
  doc.setFontSize(18).setFont('helvetica', 'bold')
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
  doc.text(companyName, 70, 20)

  doc.setFontSize(10).setFont('helvetica', 'normal')
  doc.text(companyAddress, 70, 27)
  doc.text(`${companyPhone} | ${companyEmail}`, 70, 33)

  // Invoice info box
  doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2])
  doc.rect(130, 15, 70, 35, 'F')
  doc.setDrawColor(colors.accent[0], colors.accent[1], colors.accent[2])
  doc.setLineWidth(1.5)
  doc.rect(130, 15, 70, 35, 'S')

  doc.setFontSize(16).setFont('helvetica', 'bold')
  doc.text('INVOICE', 195, 22, { align: 'right' })
  doc.setFontSize(10).setFont('helvetica', 'normal')
  doc.text(`Invoice #: ${invoiceNumber}`, 195, 28, { align: 'right' })
  doc.text(`Date: ${createdDate}`, 195, 34, { align: 'right' })
  doc.text(`Due: ${dueDate}`, 195, 40, { align: 'right' })

  // Status pill
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2])
  doc.roundedRect(135, 44, 30, 6, 3, 3, 'F')
  doc.setTextColor(colors.white[0], colors.white[1], colors.white[2])
  doc.setFontSize(8).setFont('helvetica', 'bold')
  doc.text((status === 'pending' ? 'ISSUED' : status.toUpperCase()), 150, 48, { align: 'center' })

  // === BILLING INFO ===
  let yPos = 60

  // From
  doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2])
  doc.rect(20, yPos - 5, 85, 45, 'F')
  doc.rect(20, yPos - 5, 85, 45, 'S')
  doc.setFontSize(12).setFont('helvetica', 'bold')
  doc.text('From', 25, yPos)
  doc.setFontSize(10).setFont('helvetica', 'normal')
  doc.text(companyName, 25, yPos + 8)
  doc.text(companyAddress, 25, yPos + 14)
  doc.text(companyPhone, 25, yPos + 20)
  doc.text(companyEmail, 25, yPos + 26)
  if (vatNumber) doc.text(`VAT: ${vatNumber}`, 25, yPos + 32)
  if (crNumber) doc.text(`CR: ${crNumber}`, 25, yPos + 38)

  // Bill To
  doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2])
  doc.rect(115, yPos - 5, 85, 50, 'F')
  doc.rect(115, yPos - 5, 85, 50, 'S')
  doc.setFontSize(12).setFont('helvetica', 'bold')
  doc.text('Bill To', 120, yPos)
  doc.setFontSize(10).setFont('helvetica', 'normal')
  if (clientCompany) {
    doc.text(clientCompany, 120, yPos + 8)
    doc.text(clientName, 120, yPos + 14)
  } else {
    doc.text(clientName, 120, yPos + 8)
  }
  if (clientAddress) doc.text(clientAddress, 120, yPos + 20)
  if (clientPhone) doc.text(clientPhone, 120, yPos + 26)
  if (clientEmail) doc.text(clientEmail, 120, yPos + 32)

  // === SERVICE TABLE ===
  yPos = yPos + 60
  const tableY = yPos + 8
  const tableWidth = 170

  doc.setFillColor(colors.teal[0], colors.teal[1], colors.teal[2])
  doc.rect(20, tableY, tableWidth, 8, 'F')
  doc.setTextColor(colors.white[0], colors.white[1], colors.white[2])
  doc.setFontSize(10).setFont('helvetica', 'bold')
  doc.text('No', 22, tableY + 6)
  doc.text('Item Description', 40, tableY + 6)
  doc.text('Qty', 125, tableY + 6)
  doc.text('Rate (OMR)', 150, tableY + 6)
  doc.text('Amount (OMR)', 175, tableY + 6)

  let currentY = tableY + 8
  const items = invoice.invoice_items?.length ? invoice.invoice_items : [{
    title: 'Service Item',
    qty: 1,
    price: invoice.amount || 0,
  }]

  items.forEach((item: any, index: number) => {
    // Check if we need a new page
    if (currentY > 260) {
      doc.addPage()
      currentY = 20
      
      // Redraw table header on new page
      doc.setFillColor(colors.teal[0], colors.teal[1], colors.teal[2])
      doc.rect(20, currentY, tableWidth, 8, 'F')
      doc.setTextColor(colors.white[0], colors.white[1], colors.white[2])
      doc.setFontSize(10).setFont('helvetica', 'bold')
      doc.text('No', 22, currentY + 6)
      doc.text('Item Description', 40, currentY + 6)
      doc.text('Qty', 125, currentY + 6)
      doc.text('Rate (OMR)', 150, currentY + 6)
      doc.text('Amount (OMR)', 175, currentY + 6)
      currentY += 8
    }

    const qty = item.qty || 1
    const price = item.price || item.rate || 0
    const amount = qty * price
    if (index % 2 === 0) {
      doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2])
      doc.rect(20, currentY, tableWidth, 10, 'F')
    }
    doc.rect(20, currentY, tableWidth, 10, 'S')
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
    doc.setFontSize(9).setFont('helvetica', 'normal')
    doc.text(String(index + 1), 22, currentY + 7)
    const descriptionLines = splitText(doc, item.title || 'Service Item', 75)
    doc.text(descriptionLines, 40, currentY + 7)
    doc.text(String(qty), 137, currentY + 7, { align: 'center' })
    doc.text(formatCurrency(price, 'OMR'), 170, currentY + 7, { align: 'right' })
    doc.text(formatCurrency(amount, 'OMR'), 195, currentY + 7, { align: 'right' })
    currentY += 10
  })

  // === SUMMARY ===
  const summaryY = currentY + 15
  const summaryWidth = 80
  const summaryX = 110

  const safeSubtotal = items.reduce((acc: number, i: any) => acc + (i.qty || 1) * (i.price || i.rate || 0), 0)
  const taxRate = invoice.tax_rate || 0
  const safeTaxAmount = taxRate > 0 ? (safeSubtotal * taxRate / 100) : 0
  const safeTotal = safeSubtotal + safeTaxAmount

  doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2])
  doc.rect(summaryX, summaryY, summaryWidth, 30, 'F')
  doc.rect(summaryX, summaryY, summaryWidth, 30, 'S')
  doc.setFontSize(10).setFont('helvetica', 'normal')
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
  doc.text('Subtotal:', summaryX + 5, summaryY + 8)
  doc.text(formatCurrency(safeSubtotal, 'OMR'), summaryX + summaryWidth - 5, summaryY + 8, { align: 'right' })
  if (safeTaxAmount > 0) {
    doc.text(`Tax (${taxRate}%):`, summaryX + 5, summaryY + 16)
    doc.text(formatCurrency(safeTaxAmount, 'OMR'), summaryX + summaryWidth - 5, summaryY + 16, { align: 'right' })
  }
  doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2])
  doc.rect(summaryX + 5, summaryY + 22, summaryWidth - 10, 8, 'F')
  doc.setTextColor(colors.white[0], colors.white[1], colors.white[2])
  doc.setFontSize(12).setFont('helvetica', 'bold')
  doc.text('TOTAL:', summaryX + 8, summaryY + 28)
  doc.text(formatCurrency(safeTotal, 'OMR'), summaryX + summaryWidth - 8, summaryY + 28, { align: 'right' })

  // === FOOTER ===
  const footerY = summaryY + 50
  try {
    const qrText = invoice.payment_url || `Invoice ${invoiceNumber}, Total: ${formatCurrency(safeTotal, 'OMR')}`
    const qrDataUrl = await QRCode.toDataURL(qrText, { width: 50 })
    doc.addImage(qrDataUrl, 'PNG', 150, footerY, 20, 20)
    doc.setFontSize(8).setFont('helvetica', 'normal')
    doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2])
    doc.text('Scan to Pay', 152, footerY + 23)
  } catch {}
  doc.setFontSize(10).setFont('helvetica', 'bold')
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
  doc.text('Thank you for your business!', 105, footerY + 30, { align: 'center' })
  doc.setFontSize(8).setFont('helvetica', 'normal')
  doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2])
  doc.text('This invoice is valid without signature', 20, footerY + 40)
  if (vatNumber) doc.text(`VAT: ${vatNumber}`, 190, footerY + 8, { align: 'right' })
  if (crNumber) doc.text(`CR: ${crNumber}`, 190, footerY + 12, { align: 'right' })

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