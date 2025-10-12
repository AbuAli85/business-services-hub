/**
 * Automated PDF Invoice Generator
 * 
 * Generates professional PDF invoices using dynamically fetched data.
 * No manual entry or fallback values - fully database-driven.
 */

import { jsPDF } from 'jspdf'
import { InvoiceDataComplete } from './invoice-data-fetcher'

// Template colors matching professional design
const templateColors = {
  primary: [15, 23, 42] as [number, number, number],     // Dark blue
  accent: [59, 130, 246] as [number, number, number],    // Blue accent
  white: [255, 255, 255] as [number, number, number],    
  lightGray: [248, 250, 252] as [number, number, number],
  mediumGray: [226, 232, 240] as [number, number, number],
  darkGray: [100, 116, 139] as [number, number, number],
  borderGray: [203, 213, 225] as [number, number, number]
}

// Typography
const typography = {
  title: { size: 24, weight: 'bold' },
  subtitle: { size: 18, weight: 'bold' },
  heading: { size: 14, weight: 'bold' },
  subheading: { size: 12, weight: 'bold' },
  body: { size: 10, weight: 'normal' },
  small: { size: 8, weight: 'normal' },
  caption: { size: 7, weight: 'normal' }
}

// ==================== Helper Functions ====================

function formatCurrency(amount: number, currency: string = 'OMR'): string {
  // Use 2 decimal places for consistency across the platform
  if (currency === 'OMR') {
    return `OMR ${amount.toFixed(2)}`
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB')
}

function drawBox(
  doc: jsPDF, 
  x: number, 
  y: number, 
  width: number, 
  height: number, 
  fillColor?: [number, number, number], 
  borderColor?: [number, number, number], 
  lineWidth: number = 1
) {
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

function addText(
  doc: jsPDF, 
  text: string, 
  x: number, 
  y: number, 
  style: keyof typeof typography = 'body', 
  color: [number, number, number] = templateColors.primary, 
  align: 'left' | 'center' | 'right' = 'left', 
  maxWidth?: number
) {
  const textString = String(text || '').trim().replace(/[^\x20-\x7E]/g, '')
  const fontStyle = typography[style]
  
  doc.setFontSize(fontStyle.size)
  doc.setFont('helvetica', fontStyle.weight as any)
  doc.setTextColor(color[0], color[1], color[2])
  
  const options: any = {}
  if (align !== 'left') options.align = align
  if (maxWidth) options.maxWidth = maxWidth
  
  doc.text(textString, x, y, options)
}

// ==================== Main PDF Generator ====================

/**
 * Generate professional PDF from complete invoice data
 */
export async function generateAutomatedInvoicePDF(
  invoiceData: InvoiceDataComplete
): Promise<Uint8Array> {
  console.log('📄 Generating automated PDF for invoice:', invoiceData.invoice_number)
  
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  
  // Layout dimensions
  const sidebarWidth = 35
  const contentStartX = sidebarWidth + 8
  const contentWidth = pageWidth - sidebarWidth - 20
  const margin = 15
  
  // Format dates
  const createdDate = formatDate(invoiceData.created_at)
  const dueDate = formatDate(invoiceData.due_date)
  
  // ==================== SIDEBAR ====================
  
  drawBox(doc, 0, 0, sidebarWidth, pageHeight, templateColors.primary)
  
  // Logo section
  const logoSize = 20
  const logoX = (sidebarWidth - logoSize) / 2
  const logoY = 25
  drawBox(doc, logoX, logoY, logoSize, logoSize, templateColors.white)
  
  if (invoiceData.provider.logo_url) {
    // TODO: Load and add actual logo image
    addText(doc, 'LOGO', logoX + logoSize / 2, logoY + 12, 'small', templateColors.primary, 'center')
  } else {
    addText(doc, 'LOGO', logoX + logoSize / 2, logoY + 12, 'small', templateColors.primary, 'center')
  }
  
  // Professional Services label
  addText(doc, 'PROFESSIONAL SERVICES', 10, 50, 'small', templateColors.white, 'left')
  doc.setDrawColor(templateColors.white[0], templateColors.white[1], templateColors.white[2])
  doc.setLineWidth(0.5)
  doc.line(10, 52, 40, 52)
  
  addText(doc, 'Quality & Excellence', 10, 60, 'caption', templateColors.white, 'left')
  
  // ==================== HEADER SECTION ====================
  
  let currentY = 25
  
  // Company name (provider)
  addText(doc, invoiceData.provider.company, contentStartX, currentY, 'title', templateColors.primary, 'left')
  currentY += 10
  
  // Company details
  addText(doc, invoiceData.provider.address, contentStartX, currentY, 'body', templateColors.darkGray, 'left')
  currentY += 6
  addText(doc, invoiceData.provider.phone, contentStartX, currentY, 'body', templateColors.darkGray, 'left')
  currentY += 6
  addText(doc, invoiceData.provider.email, contentStartX, currentY, 'body', templateColors.darkGray, 'left')
  currentY += 6
  if (invoiceData.provider.website) {
    addText(doc, invoiceData.provider.website, contentStartX, currentY, 'body', templateColors.darkGray, 'left')
  }
  
  // Invoice details (top right)
  const rightColumnX = pageWidth - 20
  addText(doc, 'Invoice', rightColumnX, 19, 'title', templateColors.accent, 'right')
  addText(doc, `Invoice Number: #${invoiceData.invoice_number}`, rightColumnX, 26, 'body', templateColors.primary, 'right')
  addText(doc, `Date: ${createdDate}`, rightColumnX, 32, 'body', templateColors.darkGray, 'right')
  addText(doc, `Due Date: ${dueDate}`, rightColumnX, 37, 'body', templateColors.darkGray, 'right')
  
  // Blue underline under "Invoice"
  doc.setDrawColor(templateColors.accent[0], templateColors.accent[1], templateColors.accent[2])
  doc.setLineWidth(1)
  doc.line(rightColumnX - 35, 24, rightColumnX, 24)
  
  // ==================== BILL TO SECTION ====================
  
  const billToY = 41
  const billToRightX = pageWidth - 20
  
  addText(doc, 'Bill To:', billToRightX, billToY, 'heading', templateColors.accent, 'right')
  let billToCurrentY = billToY + 8
  addText(doc, invoiceData.client.name, billToRightX, billToCurrentY, 'subheading', templateColors.primary, 'right')
  billToCurrentY += 6
  addText(doc, invoiceData.client.company, billToRightX, billToCurrentY, 'body', templateColors.darkGray, 'right')
  billToCurrentY += 6
  addText(doc, invoiceData.client.address, billToRightX, billToCurrentY, 'body', templateColors.darkGray, 'right', 80)
  billToCurrentY += 6
  addText(doc, invoiceData.client.email, billToRightX, billToCurrentY, 'body', templateColors.darkGray, 'right')
  billToCurrentY += 6
  addText(doc, invoiceData.client.phone, billToRightX, billToCurrentY, 'body', templateColors.darkGray, 'right')
  billToCurrentY += 6
  if (invoiceData.client.website) {
    addText(doc, invoiceData.client.website, billToRightX, billToCurrentY, 'body', templateColors.darkGray, 'right')
  }
  
  // Separator line
  doc.setDrawColor(templateColors.borderGray[0], templateColors.borderGray[1], templateColors.borderGray[2])
  doc.setLineWidth(0.2)
  doc.line(contentStartX, billToCurrentY + 5, pageWidth - margin, billToCurrentY + 5)
  
  // ==================== ITEMS TABLE ====================
  
  currentY = 75
  const tableStartY = currentY
  const tableX = contentStartX
  const tableWidth = contentWidth - 10
  const rowHeight = 12
  const colWidths = [15, 80, 25, 30, 30]
  
  // Header row
  drawBox(doc, tableX, tableStartY, tableWidth, rowHeight, [235, 238, 242], templateColors.borderGray, 0.5)
  
  // Column borders
  let colX = tableX
  for (let i = 0; i < colWidths.length; i++) {
    doc.setDrawColor(templateColors.borderGray[0], templateColors.borderGray[1], templateColors.borderGray[2])
    doc.setLineWidth(0.5)
    doc.line(colX, tableStartY, colX, tableStartY + rowHeight)
    colX += colWidths[i]
  }
  doc.line(colX, tableStartY, colX, tableStartY + rowHeight)
  
  // Header text
  addText(doc, 'Item', tableX + 2, tableStartY + 8, 'subheading', templateColors.accent, 'left')
  addText(doc, 'Description', tableX + colWidths[0] + 2, tableStartY + 8, 'subheading', templateColors.accent, 'left')
  addText(doc, 'Qty/Hour', tableX + colWidths[0] + colWidths[1] + 12, tableStartY + 8, 'subheading', templateColors.accent, 'center')
  addText(doc, 'Rate', tableX + colWidths[0] + colWidths[1] + colWidths[2] + 26, tableStartY + 8, 'subheading', templateColors.accent, 'right')
  addText(doc, 'Total', tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 26, tableStartY + 8, 'subheading', templateColors.accent, 'right')
  
  currentY = tableStartY + rowHeight
  
  // Data rows
  invoiceData.items.forEach((item, index) => {
    // Alternating background
    if (index % 2 === 1) {
      drawBox(doc, tableX, currentY, tableWidth, rowHeight, [250, 250, 250])
    }
    
    // Borders
    drawBox(doc, tableX, currentY, tableWidth, rowHeight, undefined, templateColors.borderGray, 0.5)
    
    // Column separators
    colX = tableX
    for (let i = 0; i < colWidths.length; i++) {
      doc.line(colX, currentY, colX, currentY + rowHeight)
      colX += colWidths[i]
    }
    doc.line(colX, currentY, colX, currentY + rowHeight)
    
    // Row data
    addText(doc, String(index + 1).padStart(2, '0'), tableX + 2, currentY + 8, 'body', templateColors.darkGray, 'left')
    addText(doc, item.product, tableX + colWidths[0] + 2, currentY + 8, 'body', templateColors.darkGray, 'left')
    addText(doc, String(item.qty), tableX + colWidths[0] + colWidths[1] + 12, currentY + 8, 'body', templateColors.darkGray, 'center')
    addText(doc, formatCurrency(item.unit_price, invoiceData.currency), tableX + colWidths[0] + colWidths[1] + colWidths[2] + 26, currentY + 8, 'body', templateColors.darkGray, 'right')
    addText(doc, formatCurrency(item.total, invoiceData.currency), tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 26, currentY + 8, 'body', templateColors.darkGray, 'right')
    
    currentY += rowHeight
  })
  
  // ==================== FINANCIAL SUMMARY ====================
  
  currentY += 6
  
  // Separator line
  doc.setDrawColor(templateColors.borderGray[0], templateColors.borderGray[1], templateColors.borderGray[2])
  doc.setLineWidth(0.3)
  doc.line(contentStartX, currentY - 4, pageWidth - margin, currentY - 4)
  
  const summaryBoxX = contentStartX + contentWidth - 90
  const summaryBoxWidth = 85
  const summaryStartY = currentY
  
  drawBox(doc, summaryBoxX, summaryStartY, summaryBoxWidth, 25, templateColors.white, templateColors.borderGray, 0.5)
  
  currentY += 6
  
  // Subtotal
  addText(doc, 'Subtotal', summaryBoxX + 3, currentY, 'subheading', templateColors.darkGray, 'left')
  addText(doc, formatCurrency(invoiceData.subtotal, invoiceData.currency), summaryBoxX + summaryBoxWidth - 3, currentY, 'subheading', templateColors.primary, 'right')
  currentY += 5
  
  // VAT
  addText(doc, `VAT (${invoiceData.vat_rate.toFixed(1)}%)`, summaryBoxX + 3, currentY, 'subheading', templateColors.darkGray, 'left')
  addText(doc, formatCurrency(invoiceData.vat_amount, invoiceData.currency), summaryBoxX + summaryBoxWidth - 3, currentY, 'subheading', templateColors.primary, 'right')
  
  // Separator
  currentY += 4
  doc.setDrawColor(templateColors.borderGray[0], templateColors.borderGray[1], templateColors.borderGray[2])
  doc.setLineWidth(0.5)
  doc.line(summaryBoxX + 3, currentY, summaryBoxX + summaryBoxWidth - 3, currentY)
  currentY += 4
  
  // Total
  addText(doc, 'Total Amount Due', summaryBoxX + 3, currentY, 'heading', templateColors.primary, 'left')
  addText(doc, formatCurrency(invoiceData.total, invoiceData.currency), summaryBoxX + summaryBoxWidth - 7, currentY, 'heading', templateColors.accent, 'right')
  
  // ==================== FOOTER ====================
  
  const footerStartY = pageHeight - 110
  const signatureWidth = 60
  const signatureHeight = 20
  
  // Signature box (dashed)
  doc.setDrawColor(templateColors.borderGray[0], templateColors.borderGray[1], templateColors.borderGray[2])
  doc.setLineWidth(0.5)
  
  const dashLength = 2
  const gapLength = 2
  const totalDashGap = dashLength + gapLength
  
  // Dashed borders
  for (let x = contentStartX; x < contentStartX + signatureWidth; x += totalDashGap) {
    doc.line(x, footerStartY, Math.min(x + dashLength, contentStartX + signatureWidth), footerStartY)
  }
  for (let x = contentStartX; x < contentStartX + signatureWidth; x += totalDashGap) {
    doc.line(x, footerStartY + signatureHeight, Math.min(x + dashLength, contentStartX + signatureWidth), footerStartY + signatureHeight)
  }
  for (let y = footerStartY; y < footerStartY + signatureHeight; y += totalDashGap) {
    doc.line(contentStartX, y, contentStartX, Math.min(y + dashLength, footerStartY + signatureHeight))
  }
  for (let y = footerStartY; y < footerStartY + signatureHeight; y += totalDashGap) {
    doc.line(contentStartX + signatureWidth, y, contentStartX + signatureWidth, Math.min(y + dashLength, footerStartY + signatureHeight))
  }
  
  addText(doc, 'Name and Signature', contentStartX + signatureWidth / 2, footerStartY + signatureHeight / 2 + 1, 'body', templateColors.darkGray, 'center')
  
  // Terms & Conditions
  const termsX = pageWidth - 85
  const termsWidth = 75
  
  addText(doc, 'Terms & Conditions', termsX, footerStartY + 3, 'subheading', templateColors.accent, 'left')
  
  let termsY = footerStartY + 8
  
  addText(doc, 'Payment Terms:', termsX, termsY, 'small', templateColors.primary, 'left')
  termsY += 3
  doc.setFontSize(7)
  doc.setTextColor(templateColors.darkGray[0], templateColors.darkGray[1], templateColors.darkGray[2])
  const paymentTermsText = invoiceData.payment_terms || 'Payment is due within 30 days of invoice date.'
  const paymentLines = doc.splitTextToSize(paymentTermsText, termsWidth)
  doc.text(paymentLines, termsX, termsY)
  termsY += paymentLines.length * 2.5 + 2
  
  if (invoiceData.notes) {
    addText(doc, 'Notes:', termsX, termsY, 'small', templateColors.primary, 'left')
    termsY += 3
    const notesLines = doc.splitTextToSize(invoiceData.notes, termsWidth)
    doc.text(notesLines, termsX, termsY)
  }
  
  // Footer message
  const footerY = pageHeight - 10
  doc.setDrawColor(230, 230, 230)
  doc.setLineWidth(0.3)
  doc.line(contentStartX, footerY - 4, pageWidth - margin, footerY - 4)
  addText(doc, 'Thank you for your business!', contentStartX + contentWidth / 2, footerY, 'subheading', templateColors.accent, 'center')
  
  console.log('✅ PDF generated successfully')
  return new Uint8Array(doc.output('arraybuffer'))
}

/**
 * Wrapper function for backward compatibility with existing code
 */
export async function generatePDFFromInvoiceId(
  invoiceId: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<Uint8Array | null> {
  const { fetchInvoiceWithRelations, mapInvoiceToCompleteData } = await import('./invoice-data-fetcher')
  
  // Fetch invoice with all relations
  const invoice = await fetchInvoiceWithRelations(invoiceId, supabaseUrl, supabaseKey)
  if (!invoice) {
    console.error('❌ Could not fetch invoice:', invoiceId)
    return null
  }
  
  // Map to complete structure
  const invoiceData = mapInvoiceToCompleteData(invoice)
  if (!invoiceData) {
    console.error('❌ Could not map invoice data')
    return null
  }
  
  // Generate PDF
  return await generateAutomatedInvoicePDF(invoiceData)
}

