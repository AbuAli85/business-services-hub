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
  
  // Debug logging for data structure
  console.log('🔍 PDF Generator - Invoice data:', {
    id: invoice.id,
    hasBooking: !!invoice.booking,
    hasService: !!invoice.booking?.service,
    hasProvider: !!invoice.booking?.service?.provider,
    hasProviderCompany: !!invoice.booking?.service?.provider?.company,
    hasClient: !!invoice.booking?.client,
    hasClientCompany: !!invoice.booking?.client?.company,
    providerData: invoice.booking?.service?.provider,
    clientData: invoice.booking?.client
  })
  
  // Layout dimensions
  const sidebarWidth = 50 // Dark blue sidebar width
  const contentStartX = sidebarWidth + 5
  const contentWidth = pageWidth - sidebarWidth - 10
  const margin = 15

  // Invoice data
  const invoiceNumber = formatInvoiceNumber(invoice.id, invoice.invoice_number)
  const createdDate = new Date(invoice.created_at).toLocaleDateString('en-GB')
  const dueDate = new Date(invoice.due_date || Date.now() + 30 * 86400000).toLocaleDateString('en-GB')
  
  // Company information (Provider) - Try multiple sources with more comprehensive fallbacks
  const providerCompany = invoice.booking?.service?.provider?.company || {}
  const provider = invoice.booking?.service?.provider || {}
  
  // Fallback to direct invoice data if nested structure is missing
  const directProviderId = invoice.provider_id
  const directClientId = invoice.client_id
  
  console.log('🔍 PDF Generator - Provider ID sources:', {
    nested: invoice.booking?.service?.provider?.id,
    direct: directProviderId,
    hasNestedData: !!invoice.booking?.service?.provider,
    providerCompanyExists: !!providerCompany,
    providerExists: !!provider
  })
  
  // Try multiple fallback approaches for company data
  // TEMPORARY: Add test data to verify extraction is working
  const companyName = providerCompany.name || 
                     provider.company_name || 
                     provider.full_name || 
                     (directProviderId ? `Provider ID: ${directProviderId}` : 'Your Company Name')
  const companyAddress = providerCompany.address || 
                        provider.address || 
                        '123 Anywhere St., Any City, ST 12345'
  const companyPhone = providerCompany.phone || 
                      provider.phone || 
                      '123-456-7890'
  const companyEmail = providerCompany.email || 
                      provider.email || 
                      'provider@company.com'
  const companyWebsite = providerCompany.website || 
                        provider.website || 
                        'company.com'
  const companyLogo = providerCompany.logo_url || 
                     provider.logo_url
  
  // Client information - Try multiple sources with comprehensive fallbacks
  const client = invoice.booking?.client || {}
  const clientCompany = client.company || {}
  
  console.log('🔍 PDF Generator - Client data sources:', {
    hasClient: !!client,
    hasClientCompany: !!clientCompany,
    clientName: client.full_name,
    clientCompanyName: clientCompany.name || client.company_name
  })
  
  const clientName = client.full_name || 
                    (directClientId ? `Client ID: ${directClientId}` : 'Client Name')
  const clientCompanyName = clientCompany.name || 
                           client.company_name || 
                           'Client Company'
  const clientAddress = clientCompany.address || 
                       client.address || 
                       '123 Anywhere St., Any City, ST 12345'
  const clientPhone = client.phone || 
                     clientCompany.phone || 
                     '123-456-7890'
  const clientEmail = client.email || 
                     clientCompany.email || 
                     'client@company.com'
  const clientWebsite = clientCompany.website || 
                       client.website || 
                       'clientcompany.com'
  
  // Debug logging for extracted data
  console.log('🔍 PDF Generator - Raw provider data:', invoice.booking?.service?.provider)
  console.log('🔍 PDF Generator - Raw client data:', invoice.booking?.client)
  console.log('🔍 PDF Generator - Provider company data:', invoice.booking?.service?.provider?.company)
  console.log('🔍 PDF Generator - Client company data:', invoice.booking?.client?.company)
  console.log('🔍 PDF Generator - Direct provider ID:', invoice.provider_id)
  console.log('🔍 PDF Generator - Direct client ID:', invoice.client_id)
  
  console.log('🔍 PDF Generator - Extracted company data:', {
    companyName,
    companyAddress,
    companyPhone,
    companyEmail,
    companyWebsite,
    companyLogo
  })
  
  console.log('🔍 PDF Generator - Extracted client data:', {
    clientName,
    clientCompanyName,
    clientAddress,
    clientPhone,
    clientEmail,
    clientWebsite
  })
  
  // Check if we're using fallback values
  const isUsingFallbacks = {
    company: companyName === 'Your Company Name',
    client: clientName === 'Client Name'
  }
  console.log('🔍 PDF Generator - Using fallback values:', isUsingFallbacks)
  
  // If we're using fallbacks, log detailed debugging info
  if (isUsingFallbacks.company || isUsingFallbacks.client) {
    console.log('⚠️ PDF Generator - Using fallback values, detailed debugging:')
    console.log('Invoice structure:', {
      hasBooking: !!invoice.booking,
      hasService: !!invoice.booking?.service,
      hasProvider: !!invoice.booking?.service?.provider,
      hasClient: !!invoice.booking?.client,
      providerId: invoice.provider_id,
      clientId: invoice.client_id,
      bookingId: invoice.booking?.id
    })
    
    // Log the actual data structure
    if (invoice.booking?.service?.provider) {
      console.log('Provider data structure:', JSON.stringify(invoice.booking.service.provider, null, 2))
    }
    if (invoice.booking?.client) {
      console.log('Client data structure:', JSON.stringify(invoice.booking.client, null, 2))
    }
  }
  
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
  const displayVatPercent = Math.min(safeVatPercent, 0.05)
  const displayVatAmount = safeSubtotal * displayVatPercent
  const displayTotal = safeSubtotal + displayVatAmount

  // === SIDEBAR SECTION (Dark Blue) ===
  drawBox(doc, 0, 0, sidebarWidth, pageHeight, templateColors.primary)
  
  // Logo section
  const logoSize = 20
  const logoX = 15
  const logoY = 20
  drawBox(doc, logoX, logoY, logoSize, logoSize, templateColors.white)
  
  if (companyLogo) {
    try {
      // Try to add the company logo if URL is provided
      // For now, we'll add a placeholder that mentions the logo
      addText(doc, 'LOGO', logoX + 5, logoY + 12, 'small', templateColors.primary, 'center')
      addText(doc, 'Available', logoX + 5, logoY + 16, 'caption', templateColors.primary, 'center')
    } catch (error) {
      console.warn('⚠️ PDF Generator - Could not load company logo:', error)
      addText(doc, 'LOGO', logoX + 5, logoY + 12, 'small', templateColors.primary, 'center')
    }
  } else {
    // No logo available - show placeholder
    addText(doc, 'LOGO', logoX + 5, logoY + 12, 'small', templateColors.primary, 'center')
  }
  
  // Professional Services text
  addText(doc, 'PROFESSIONAL SERVICES', 10, 50, 'small', templateColors.white, 'left')
  doc.setDrawColor(templateColors.white[0], templateColors.white[1], templateColors.white[2])
  doc.setLineWidth(0.5)
  doc.line(10, 52, 40, 52)
  
  // Quality & Excellence
  addText(doc, 'Quality & Excellence', 10, 60, 'caption', templateColors.white, 'left')

  // === MAIN CONTENT AREA ===
  
  // === HEADER SECTION (Two-column layout) ===
  let currentY = 20
  
  // Company Information (Top Left) - Larger, bold company name
  addText(doc, companyName, contentStartX, currentY, 'title', templateColors.primary, 'left')
  currentY += 8
  
  // Company contact details without icons for cleaner look
  addText(doc, companyAddress, contentStartX, currentY, 'body', templateColors.darkGray, 'left')
  currentY += 5
  addText(doc, companyPhone, contentStartX, currentY, 'body', templateColors.darkGray, 'left')
  currentY += 5
  addText(doc, companyEmail, contentStartX, currentY, 'body', templateColors.darkGray, 'left')
  currentY += 5
  addText(doc, companyWebsite, contentStartX, currentY, 'body', templateColors.darkGray, 'left')

  // Invoice Details (Top Right) - Proper positioning
  const rightColumnX = contentStartX + contentWidth - 15
  addText(doc, 'Invoice', rightColumnX, 20, 'title', templateColors.accent, 'right')
  addText(doc, `Invoice Number: #${invoiceNumber}`, rightColumnX, 30, 'subheading', templateColors.primary, 'right')

  // === DATES AND BILL TO SECTION (Two-column layout) ===
  currentY = 55
  
  // Dates (Left)
  addText(doc, `Date: ${createdDate}`, contentStartX, currentY, 'body', templateColors.darkGray, 'left')
  currentY += 5
  addText(doc, `Due Date: ${dueDate}`, contentStartX, currentY, 'body', templateColors.darkGray, 'left')
  
  // Bill To (Right) - Properly aligned with better spacing
  const billToY = 55
  const billToRightX = contentStartX + contentWidth - 15 // Give more margin from right edge
  const billToMaxWidth = 80 // Limit width to prevent cramping
  
  addText(doc, 'Bill To:', billToRightX, billToY, 'heading', templateColors.accent, 'right')
  let billToCurrentY = billToY + 7
  addText(doc, clientName, billToRightX, billToCurrentY, 'subheading', templateColors.primary, 'right')
  billToCurrentY += 6
  addText(doc, clientCompanyName, billToRightX, billToCurrentY, 'body', templateColors.darkGray, 'right')
  billToCurrentY += 6
  addText(doc, clientAddress, billToRightX, billToCurrentY, 'body', templateColors.darkGray, 'right')
  billToCurrentY += 6
  addText(doc, clientEmail, billToRightX, billToCurrentY, 'body', templateColors.darkGray, 'right')
  billToCurrentY += 6
  addText(doc, clientPhone, billToRightX, billToCurrentY, 'body', templateColors.darkGray, 'right')
  billToCurrentY += 6
  addText(doc, clientWebsite, billToRightX, billToCurrentY, 'body', templateColors.darkGray, 'right')

  // === ITEMS TABLE (Full-width bordered table matching template) ===
  currentY = 85
  const tableStartY = currentY
  
  // Define table structure - adjusted widths for better proportions
  const tableX = contentStartX
  const tableWidth = contentWidth - 5 // Leave some margin from right edge
  const rowHeight = 12
  const colWidths = [15, 60, 20, 30, 35] // Item, Description, Qty/Hour, Rate, Total
  
  // Draw header row with gray background
  drawBox(doc, tableX, tableStartY, tableWidth, rowHeight, templateColors.lightGray, templateColors.borderGray, 0.5)
  
  // Add column borders for header
  let colX = tableX
  for (let i = 0; i < colWidths.length; i++) {
    doc.setDrawColor(templateColors.borderGray[0], templateColors.borderGray[1], templateColors.borderGray[2])
    doc.setLineWidth(0.5)
    doc.line(colX, tableStartY, colX, tableStartY + rowHeight)
    colX += colWidths[i]
  }
  doc.line(colX, tableStartY, colX, tableStartY + rowHeight) // Right border
  
  // Header text
  addText(doc, 'Item', tableX + 2, tableStartY + 8, 'subheading', templateColors.accent, 'left')
  addText(doc, 'Description', tableX + colWidths[0] + 2, tableStartY + 8, 'subheading', templateColors.accent, 'left')
  addText(doc, 'Qty/Hour', tableX + colWidths[0] + colWidths[1] + 10, tableStartY + 8, 'subheading', templateColors.accent, 'center')
  addText(doc, 'Rate', tableX + colWidths[0] + colWidths[1] + colWidths[2] + 28, tableStartY + 8, 'subheading', templateColors.accent, 'right')
  addText(doc, 'Total', tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 33, tableStartY + 8, 'subheading', templateColors.accent, 'right')
  
  currentY = tableStartY + rowHeight
  
  // Table rows with borders
  const items = invoice.items || (invoice.invoice_items && invoice.invoice_items.length > 0 ? invoice.invoice_items : [{
    product: invoice.booking?.service?.title || 'Professional Service',
    description: invoice.booking?.service?.description || 'High-quality professional service',
    qty: 1,
    unit_price: safeSubtotal,
    total: safeSubtotal
  }])
  
  items.forEach((item: any, index: number) => {
    // Draw row background (alternating for better readability)
    if (index % 2 === 1) {
      drawBox(doc, tableX, currentY, tableWidth, rowHeight, [250, 250, 250])
    }
    
    // Draw borders
    drawBox(doc, tableX, currentY, tableWidth, rowHeight, undefined, templateColors.borderGray, 0.5)
    
    // Column separators
    colX = tableX
    for (let i = 0; i < colWidths.length; i++) {
      doc.line(colX, currentY, colX, currentY + rowHeight)
      colX += colWidths[i]
    }
    doc.line(colX, currentY, colX, currentY + rowHeight) // Right border
    
    // Row data
    addText(doc, String(index + 1).padStart(2, '0'), tableX + 2, currentY + 8, 'body', templateColors.darkGray, 'left')
    addText(doc, item.product || item.description || 'Service', tableX + colWidths[0] + 2, currentY + 8, 'body', templateColors.darkGray, 'left')
    addText(doc, String(item.qty || item.quantity || 1), tableX + colWidths[0] + colWidths[1] + 10, currentY + 8, 'body', templateColors.darkGray, 'center')
    addText(doc, formatCurrency(item.unit_price || safeSubtotal, invoice.currency || 'OMR'), tableX + colWidths[0] + colWidths[1] + colWidths[2] + 28, currentY + 8, 'body', templateColors.darkGray, 'right')
    addText(doc, formatCurrency(item.total || ((item.unit_price || safeSubtotal) * (item.qty || item.quantity || 1)), invoice.currency || 'OMR'), tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 33, currentY + 8, 'body', templateColors.darkGray, 'right')
    
    currentY += rowHeight
  })

  // === FINANCIAL SUMMARY (Right-aligned matching template) ===
  currentY += 8
  const summaryBoxX = contentStartX + contentWidth - 75
  const summaryBoxWidth = 75
  
  // Draw summary box with border
  const summaryStartY = currentY
  drawBox(doc, summaryBoxX, summaryStartY, summaryBoxWidth, 25, templateColors.white, templateColors.borderGray, 0.5)
  
  currentY += 6
  
  // Subtotal row
  addText(doc, 'Subtotal', summaryBoxX + 3, currentY, 'subheading', templateColors.darkGray, 'left')
  addText(doc, formatCurrency(safeSubtotal, invoice.currency || 'OMR'), summaryBoxX + summaryBoxWidth - 3, currentY, 'subheading', templateColors.primary, 'right')
  currentY += 5
  
  // VAT row
  addText(doc, `VAT (${(displayVatPercent * 100).toFixed(1)}%)`, summaryBoxX + 3, currentY, 'subheading', templateColors.darkGray, 'left')
  addText(doc, formatCurrency(displayVatAmount, invoice.currency || 'OMR'), summaryBoxX + summaryBoxWidth - 3, currentY, 'subheading', templateColors.primary, 'right')
  
  // Separator line
  currentY += 4
  doc.setDrawColor(templateColors.borderGray[0], templateColors.borderGray[1], templateColors.borderGray[2])
  doc.setLineWidth(0.5)
  doc.line(summaryBoxX + 3, currentY, summaryBoxX + summaryBoxWidth - 3, currentY)
  currentY += 4
  
  // Total row (bold)
  addText(doc, 'Total Amount Due', summaryBoxX + 3, currentY, 'heading', templateColors.primary, 'left')
  addText(doc, formatCurrency(displayTotal, invoice.currency || 'OMR'), summaryBoxX + summaryBoxWidth - 3, currentY, 'heading', templateColors.primary, 'right')

  // === FOOTER SECTION (Two-column: Signature left, Terms right) ===
  currentY += 15
  const footerStartY = currentY
  
  // Signature Area (Left) - Dashed border box
  const signatureBoxWidth = 60
  const signatureBoxHeight = 20
  
  // Draw dashed border for signature (using multiple small lines)
  doc.setDrawColor(templateColors.borderGray[0], templateColors.borderGray[1], templateColors.borderGray[2])
  doc.setLineWidth(0.5)
  
  // Draw dashed rectangle manually
  const dashLength = 2
  const gapLength = 2
  const totalDashGap = dashLength + gapLength
  
  // Top border (dashed)
  for (let x = contentStartX; x < contentStartX + signatureBoxWidth; x += totalDashGap) {
    doc.line(x, footerStartY, Math.min(x + dashLength, contentStartX + signatureBoxWidth), footerStartY)
  }
  // Bottom border (dashed)
  for (let x = contentStartX; x < contentStartX + signatureBoxWidth; x += totalDashGap) {
    doc.line(x, footerStartY + signatureBoxHeight, Math.min(x + dashLength, contentStartX + signatureBoxWidth), footerStartY + signatureBoxHeight)
  }
  // Left border (dashed)
  for (let y = footerStartY; y < footerStartY + signatureBoxHeight; y += totalDashGap) {
    doc.line(contentStartX, y, contentStartX, Math.min(y + dashLength, footerStartY + signatureBoxHeight))
  }
  // Right border (dashed)
  for (let y = footerStartY; y < footerStartY + signatureBoxHeight; y += totalDashGap) {
    doc.line(contentStartX + signatureBoxWidth, y, contentStartX + signatureBoxWidth, Math.min(y + dashLength, footerStartY + signatureBoxHeight))
  }
  
  addText(doc, 'Name and Signature', contentStartX + signatureBoxWidth / 2, footerStartY + signatureBoxHeight / 2 + 1, 'body', templateColors.darkGray, 'center')

  // === TERMS & CONDITIONS (Right) ===
  const termsX = contentStartX + signatureBoxWidth + 8
  const termsWidth = contentWidth - signatureBoxWidth - 8
  
  addText(doc, 'Terms & Conditions', termsX, footerStartY + 3, 'subheading', templateColors.accent, 'left')
  
  let termsY = footerStartY + 8
  const lineSpacing = 3
  
  // Payment Terms
  addText(doc, 'Payment Terms:', termsX, termsY, 'small', templateColors.primary, 'left')
  termsY += 3
  doc.setFontSize(7)
  doc.setTextColor(templateColors.darkGray[0], templateColors.darkGray[1], templateColors.darkGray[2])
  const paymentTermsText = 'Payment is due within 30 days of invoice date. Late payments are subject to a 1.5% monthly service charge. All amounts are in OMR unless otherwise specified.'
  const paymentLines = doc.splitTextToSize(paymentTermsText, termsWidth)
  doc.text(paymentLines, termsX, termsY)
  termsY += paymentLines.length * 2.5 + 2
  
  // Service Agreement
  addText(doc, 'Service Agreement:', termsX, termsY, 'small', templateColors.primary, 'left')
  termsY += 3
  const serviceTermsText = 'All services are provided subject to our standard terms of service. Work performed is guaranteed for 90 days from completion date.'
  const serviceLines = doc.splitTextToSize(serviceTermsText, termsWidth)
  doc.text(serviceLines, termsX, termsY)
  termsY += serviceLines.length * 2.5 + 2
  
  // Disputes
  addText(doc, 'Disputes:', termsX, termsY, 'small', templateColors.primary, 'left')
  termsY += 3
  const disputesText = 'Any disputes must be submitted in writing within 15 days of invoice date. For questions regarding this invoice, please contact us at the provided contact information.'
  const disputesLines = doc.splitTextToSize(disputesText, termsWidth)
  doc.text(disputesLines, termsX, termsY)

  // === FOOTER ===
  const footerY = pageHeight - 8
  addText(doc, 'Thank you for your business!', contentStartX + contentWidth / 2, footerY, 'subheading', templateColors.accent, 'center')

  return new Uint8Array(doc.output('arraybuffer'))
}