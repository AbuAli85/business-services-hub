import { jsPDF } from 'jspdf'
import type { Invoice } from '@/lib/types/pdf-generator'
import {
  templateColors,
  typography,
  layout,
  formatCurrency,
  formatDate,
  addText,
  addLine,
  addRect,
  wrapText,
  addRightAlignedText,
  getTextWidth,
  addLogo,
  t
} from '@/lib/utils/pdfHelpers'

export async function generateTemplatePDF(invoice: Invoice): Promise<Uint8Array> {
  try {
    console.log('🔍 PDF Generator - Starting with invoice:', invoice.id)
    console.log('🔍 PDF Generator - Invoice data structure:', {
      hasBooking: !!invoice.booking,
      hasService: !!invoice.booking?.service,
      hasProvider: !!invoice.booking?.service?.provider,
      hasClient: !!invoice.booking?.client,
      hasProviderCompany: !!invoice.booking?.service?.provider?.company,
      hasClientCompany: !!invoice.booking?.client?.company
    })
    
    const doc = new jsPDF('p', 'mm', 'a4')
    const { pageWidth, pageHeight, margin, contentWidth, lineHeight, sidebarWidth } = layout
    
    let yPosition = margin
    const currency = invoice.currency || 'USD'
    const locale = currency === 'OMR' ? 'ar-OM' : 'en-US'

  // Blue sidebar
  addRect(doc, 0, 0, sidebarWidth, pageHeight, templateColors.primary)
  
  // Company logo area in sidebar
  const logoSize = 20
  const logoX = 10
  const logoY = 20
  
  // Try to add actual logo, fallback to placeholder
  try {
    const logoUrl = Array.isArray(invoice.booking?.service?.provider?.company) 
      ? (invoice.booking?.service?.provider?.company?.[0] as any)?.logo_url
      : (invoice.booking?.service?.provider?.company as any)?.logo_url
    
    console.log('🔍 PDF Generator - Logo URL:', logoUrl)
    
    const logoAdded = await addLogo(
      doc,
      logoUrl,
      logoX,
      logoY,
      logoSize,
      logoSize
    )
    
    if (!logoAdded) {
      addRect(doc, logoX, logoY, logoSize, logoSize, templateColors.white)
      addText(doc, 'LOGO', logoX + 2, logoY + 12, { size: 8, color: templateColors.primary })
    }
  } catch (logoError) {
    console.warn('⚠️ PDF Generator - Logo handling failed:', logoError)
    // Fallback to placeholder
    addRect(doc, logoX, logoY, logoSize, logoSize, templateColors.white)
    addText(doc, 'LOGO', logoX + 2, logoY + 12, { size: 8, color: templateColors.primary })
  }

  // Sidebar text
  addText(doc, t('professionalServices', locale), 10, 50, { size: 8, color: templateColors.white })
  addLine(doc, 10, 57, 30, 57, templateColors.white)
  addText(doc, t('qualityExcellence', locale), 10, 65, { size: 6, color: templateColors.white })

  // Main content area
  const mainContentX = 50
  yPosition = margin

  // Provider company information
  const providerCompany = Array.isArray(invoice.booking?.service?.provider?.company) 
    ? invoice.booking?.service?.provider?.company?.[0] 
    : invoice.booking?.service?.provider?.company
  const providerName = providerCompany?.name ?? invoice.booking?.service?.provider?.full_name ?? 'Provider Name'
  
  try {
    addText(
      doc,
      providerName, 
      mainContentX, 
      yPosition, 
      { size: 18, weight: 'bold' }
    )
    yPosition += lineHeight + 2
  } catch (textError) {
    console.warn('⚠️ PDF Generator - Provider name text failed:', textError)
    // Add fallback text
    addText(doc, 'Provider Name', mainContentX, yPosition, { size: 18, weight: 'bold' })
    yPosition += lineHeight + 2
  }

  // Contact information with icons
  const contactInfo = [
    { icon: '📍', text: (providerCompany as any)?.address ?? 'Address not provided' },
    { icon: '📞', text: (providerCompany as any)?.phone ?? invoice.booking?.service?.provider?.phone ?? 'Phone not provided' },
    { icon: '✉️', text: (providerCompany as any)?.email ?? invoice.booking?.service?.provider?.email ?? 'Email not provided' },
    { icon: '🌐', text: (providerCompany as any)?.website ?? 'Website not provided' }
  ]

  contactInfo.forEach(info => {
    try {
      addText(doc, info.icon, mainContentX, yPosition, { size: 10 })
      addText(doc, info.text, mainContentX + 6, yPosition, { size: 10, color: templateColors.lightText })
      yPosition += lineHeight - 2
    } catch (textError) {
      console.warn('⚠️ PDF Generator - Text rendering failed:', textError)
      // Continue with next item
      yPosition += lineHeight - 2
    }
  })

  yPosition += lineHeight

  // Invoice title and number (right aligned)
  const invoiceTitleX = pageWidth - margin - 60
  addText(doc, t('invoice', locale), invoiceTitleX, margin, { size: 18, color: templateColors.primary })
  addText(
    doc, 
    `${t('invoiceNumber', locale)}: #${invoice.invoice_number || invoice.id.slice(-8)}`, 
    invoiceTitleX, 
    margin + lineHeight + 2, 
    { size: 10, color: templateColors.text }
  )

  yPosition = margin + 40

  // Dates and Bill To section
  const datesX = mainContentX
  const billToX = pageWidth - margin - 80

  // Dates - use English format for better readability
  const formattedDate = formatDate(invoice.created_at, 'en-US')
  addText(doc, `${t('date', locale)}: ${formattedDate}`, datesX, yPosition, { size: 8 })
  if (invoice.due_date) {
    addText(doc, `${t('dueDate', locale)}: ${formatDate(invoice.due_date, locale)}`, datesX, yPosition + lineHeight, { size: 8 })
  }

  // Bill To
  addText(doc, t('billTo', locale), billToX, yPosition, { size: 14, color: templateColors.primary })

  // Client information
  const client = invoice.booking?.client
  const clientCompany = Array.isArray(client?.company) 
    ? client?.company?.[0] 
    : client?.company
  
  // Client name
  addText(
    doc,
    client?.full_name ?? 'Client Name',
    billToX, 
    yPosition + lineHeight, 
    { size: 12, weight: 'bold' }
  )

  // Client company name
  addText(
    doc,
    (clientCompany as any)?.name ?? 'Client Company',
    billToX, 
    yPosition + lineHeight * 2, 
    { size: 12, weight: 'bold' }
  )

  // Client company address
  // Client address - handle both string and object formats
  const clientAddress = (clientCompany as any)?.address
  let addressText = 'Address not provided'
  
  if (typeof clientAddress === 'string' && clientAddress.trim()) {
    addressText = clientAddress
  } else if (clientAddress && typeof clientAddress === 'object') {
    // Try to extract meaningful address parts from object
    const addrObj = clientAddress as any
    if (addrObj.street) {
      addressText = addrObj.street
      if (addrObj.city) addressText += `, ${addrObj.city}`
      if (addrObj.country) addressText += `, ${addrObj.country}`
    } else if (addrObj.address) {
      addressText = addrObj.address
    } else {
      // Fallback to a clean string representation
      const cleanAddress = Object.values(addrObj).filter(v => v && typeof v === 'string').join(', ')
      addressText = cleanAddress || 'Address not provided'
    }
  }
  
  addText(
    doc,
    addressText,
    billToX, 
    yPosition + lineHeight * 3, 
    { size: 10 }
  )

  // Client email
  addText(
    doc,
    (clientCompany as any)?.email ?? client?.email ?? 'Email not provided',
    billToX, 
    yPosition + lineHeight * 4, 
    { size: 10 }
  )

  // Optional: phone & website if available
  let currentY = yPosition + lineHeight * 5
  const clientPhone = (clientCompany as any)?.phone ?? (client as any)?.phone ?? 'Phone not provided'
  const clientWebsite = (clientCompany as any)?.website ?? 'Website not provided'
  
  addText(doc, `📞 ${clientPhone}`, billToX, currentY, { size: 10 })
  currentY += lineHeight
  
  addText(doc, `🌐 ${clientWebsite}`, billToX, currentY, { size: 10 })
  currentY += lineHeight

  // Update yPosition based on how many lines we actually added
  yPosition = currentY + lineHeight

  // Services table
  const tableX = mainContentX
  const tableWidth = contentWidth - 30
  const colWidths = [15, 60, 20, 25, 25]
  const colPositions = [tableX, tableX + colWidths[0], tableX + colWidths[0] + colWidths[1], tableX + colWidths[0] + colWidths[1] + colWidths[2], tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3]]
  const rowHeight = 12

  // Table headers
  const headers = [t('item', locale), t('description', locale), t('qtyHour', locale), t('rate', locale), t('total', locale)]
  addRect(doc, tableX, yPosition, tableWidth, rowHeight, templateColors.background, templateColors.border)
  
  headers.forEach((header, index) => {
    addText(doc, header, colPositions[index] + 2, yPosition + 6, { size: 10, color: templateColors.primary, weight: 'bold' })
  })

  yPosition += rowHeight

  // Generate service items from booking data (invoice_items table doesn't exist)
  const itemSubtotal = invoice.subtotal ?? 800
  const items = [{
    id: '1',
    product: invoice.booking?.service?.title ?? (invoice as any).service_title ?? 'Professional Service',
    description: invoice.booking?.service?.description ?? (invoice as any).service_description ?? 'High-quality professional service delivered with excellence',
    qty: 1,
    unit_price: itemSubtotal,  // Unit price should be the subtotal
    total: itemSubtotal,       // Item total should also be the subtotal
    invoice_id: invoice.id,
    created_at: invoice.created_at,
    updated_at: invoice.created_at
  }]

  // Handle empty items
  if (items.length === 0) {
    const rowY = yPosition
    addRect(doc, tableX, rowY, tableWidth, rowHeight, templateColors.background)
    addLine(doc, tableX, rowY, tableX + tableWidth, rowY, templateColors.border)
    addLine(doc, tableX, rowY + rowHeight, tableX + tableWidth, rowY + rowHeight, templateColors.border)
    addText(doc, t('noServicesProvided', locale), colPositions[1] + 2, rowY + 6, { size: 8, color: templateColors.lightText })
    yPosition += rowHeight
  } else {
    items.forEach((item: any, index: number) => {
      const rowY = yPosition + (index * rowHeight)
      
      // Alternate row background
      if (index % 2 === 0) {
        addRect(doc, tableX, rowY, tableWidth, rowHeight, templateColors.background)
      }
      
      // Row border
      addLine(doc, tableX, rowY, tableX + tableWidth, rowY, templateColors.border)
      addLine(doc, tableX, rowY + rowHeight, tableX + tableWidth, rowY + rowHeight, templateColors.border)
      
      // Row content
      addText(doc, String(index + 1).padStart(2, '0'), colPositions[0] + 2, rowY + 6, { size: 10 })
      
      // Product name
      addText(doc, item.product || 'Service', colPositions[1] + 2, rowY + 6, { size: 10, weight: 'bold' })
      
      // Description with text wrapping
      const wrappedDesc = wrapText(doc, item.description || '-', colWidths[1] - 4)
      if (Array.isArray(wrappedDesc)) {
        doc.text(wrappedDesc, colPositions[1] + 2, rowY + 6)
      } else {
        addText(doc, wrappedDesc, colPositions[1] + 2, rowY + 6, { size: 10 })
      }
      
      addText(doc, String(item.qty || 1), colPositions[2] + 2, rowY + 6, { size: 10 })
      addText(doc, formatCurrency(item.unit_price || 0, currency), colPositions[3] + 2, rowY + 6, { size: 10 })
      addText(doc, formatCurrency(item.total || 0, currency), colPositions[4] + 2, rowY + 6, { size: 10, weight: 'bold' })
    })

    yPosition += (items.length * rowHeight)
  }

  yPosition += lineHeight * 2

  // Totals section with responsive right-alignment
  const totalsX = pageWidth - margin - 80
  const subtotal = itemSubtotal  // Use the same subtotal as the item
  const taxRate = invoice.vat_percent ? invoice.vat_percent / 100 : 0.05
  const taxAmount = invoice.vat_amount ?? (subtotal * taxRate)
  const total = subtotal + taxAmount  // Calculate total properly

  // Calculate right-aligned positions
  const subtotalText = formatCurrency(subtotal, currency)
  const taxText = formatCurrency(taxAmount, currency)
  const totalText = formatCurrency(total, currency)
  
  const rightAlignX = pageWidth - margin - 10
  const labelX = rightAlignX - Math.max(
    getTextWidth(doc, subtotalText, { size: 8 }),
    getTextWidth(doc, taxText, { size: 8 }),
    getTextWidth(doc, totalText, { size: 10, weight: 'bold' })
  ) - 10

  addText(doc, t('subtotal', locale), labelX, yPosition, { size: 12, weight: 'bold' })
  addRightAlignedText(doc, subtotalText, rightAlignX, yPosition, { size: 12, weight: 'bold' })
  yPosition += lineHeight

  addText(doc, `${t('tax', locale)} (${(taxRate * 100).toFixed(1)}%)`, labelX, yPosition, { size: 12, weight: 'bold' })
  addRightAlignedText(doc, taxText, rightAlignX, yPosition, { size: 12, weight: 'bold' })
  yPosition += lineHeight

  addLine(doc, labelX, yPosition, rightAlignX, yPosition, templateColors.border)
  yPosition += lineHeight

  addText(doc, t('totalAmountDue', locale), labelX, yPosition, { size: 14, weight: 'bold' })
  addRightAlignedText(doc, totalText, rightAlignX, yPosition, { size: 14, weight: 'bold' })

  yPosition += lineHeight * 5

  // Footer section
  const footerY = pageHeight - 40

  // Signature area
  addRect(doc, mainContentX, footerY, 60, 20, undefined, templateColors.border)
  addText(doc, t('nameAndSignature', locale), mainContentX + 2, footerY + 12, { size: 8, color: templateColors.lightText })

  // Terms & Conditions
  const termsX = pageWidth - margin - 80
  addText(doc, t('termsAndConditions', locale), termsX, footerY, { size: 8, color: templateColors.primary })
  
  const termsText = [
    'Payment Terms: Payment is due within 30 days of invoice date. Late payments are subject to a 1.5% monthly service charge. All amounts are in USD unless otherwise specified.',
    'Service Agreement: All services are provided subject to our standard terms of service. Work performed is guaranteed for 90 days from completion date.',
    'Disputes: Any disputes must be submitted in writing within 15 days of invoice date. For questions regarding this invoice, please contact us at the provided contact information.'
  ]
  
  let termsY = footerY + 6
  termsText.forEach(term => {
    const wrappedTerms = wrapText(doc, term, 70)
    if (Array.isArray(wrappedTerms)) {
      doc.text(wrappedTerms, termsX, termsY)
      termsY += wrappedTerms.length * 3
    } else {
      addText(doc, wrappedTerms, termsX, termsY, { size: 8 })
      termsY += 3
    }
  })

  return new Uint8Array(doc.output('arraybuffer'))
  
  } catch (error) {
    console.error('❌ PDF Generator - Error:', error)
    console.error('❌ PDF Generator - Stack:', error instanceof Error ? error.stack : 'No stack trace')
    throw error
  }
}
