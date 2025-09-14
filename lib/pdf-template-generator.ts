import { jsPDF } from 'jspdf'
import type { Invoice } from '@/lib/types/pdf-generator'
import {
  templateColors,
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
    const doc = new jsPDF('p', 'mm', 'a4')
    const { pageWidth, pageHeight, margin, contentWidth, lineHeight, sidebarWidth } = layout
    
    const currency = invoice.currency || 'USD'
    const locale = currency === 'OMR' ? 'ar-OM' : 'en-US'

    // ---- Sidebar (as in web) -------------------------------------------------
  addRect(doc, 0, 0, sidebarWidth, pageHeight, templateColors.primary)
  
    // Sidebar logo
    const sbLogoSize = 20, sbLogoX = 10, sbLogoY = 20
    try {
      const logoUrl = Array.isArray(invoice.booking?.service?.provider?.company)
        ? (invoice.booking?.service?.provider?.company?.[0] as any)?.logo_url
        : (invoice.booking?.service?.provider?.company as any)?.logo_url
      const ok = await addLogo(doc, logoUrl, sbLogoX, sbLogoY, sbLogoSize, sbLogoSize)
      if (!ok) {
        addRect(doc, sbLogoX, sbLogoY, sbLogoSize, sbLogoSize, templateColors.white)
        addText(doc, 'LOGO', sbLogoX + 2, sbLogoY + 12, { size: 8, color: templateColors.primary })
      }
    } catch {
      addRect(doc, sbLogoX, sbLogoY, sbLogoSize, sbLogoSize, templateColors.white)
      addText(doc, 'LOGO', sbLogoX + 2, sbLogoY + 12, { size: 8, color: templateColors.primary })
    }

    // Sidebar labels
  addText(doc, t('professionalServices', locale), 10, 50, { size: 8, color: templateColors.white })
  addLine(doc, 10, 57, 30, 57, templateColors.white)
  addText(doc, t('qualityExcellence', locale), 10, 65, { size: 6, color: templateColors.white })

    // ---- Header layout (match web) -------------------------------------------
    const mainX = sidebarWidth + 10 // start of main content
    const headerTop = margin
    const rightBlockWidth = 95
    const rightX = pageWidth - margin - rightBlockWidth

    // Provider info (left)
    const providerCompany = Array.isArray(invoice.booking?.service?.provider?.company)
      ? invoice.booking?.service?.provider?.company?.[0]
      : invoice.booking?.service?.provider?.company
    const providerName =
      providerCompany?.name ??
      invoice.booking?.service?.provider?.full_name ??
      'smartPRO'

    let yLeft = headerTop
    addText(doc, providerName, mainX, yLeft, { size: 20, weight: 'bold' })
    yLeft += lineHeight + 2

    const provAddress = (providerCompany as any)?.address ?? 'PO. Box 354, PC. 133, Al Khuwair'
    const provPhone   = (providerCompany as any)?.phone   ?? (invoice.booking?.service?.provider as any)?.phone ?? '95153930'
    const provEmail   = (providerCompany as any)?.email   ?? invoice.booking?.service?.provider?.email ?? 'info@example.com'
    const provSite    = (providerCompany as any)?.website ?? 'https://thesmartpro.io'

    const leftLines = [
      `• ${provAddress}`,
      `• ${provPhone}`,
      `• ${provEmail}`,
      `• ${provSite}`
    ]
    leftLines.forEach(l => {
      addText(doc, l, mainX, yLeft, { size: 10, color: templateColors.lightText })
      yLeft += lineHeight
    })

    // Dates under provider
    const createdTxt = `${t('date', locale)}: ${formatDate(invoice.created_at, 'en-US')}`
    addText(doc, createdTxt, mainX, yLeft + 2, { size: 10 })
    if (invoice.due_date) {
      addText(doc, `${t('dueDate', locale)}: ${formatDate(invoice.due_date, 'en-US')}`, mainX, yLeft + 2 + lineHeight, { size: 10 })
    }
    const leftBlockBottom = yLeft + 2 + (invoice.due_date ? lineHeight : 0)

    // Invoice title & number (right, blue) - inline layout
    let yRight = headerTop
    const invoiceTitle = t('invoice', locale)
    const invoiceNumber = `${t('invoiceNumber', locale)}: #${invoice.invoice_number || invoice.id.slice(-8)}`
    
    // Calculate positions for inline layout
    const titleWidth = getTextWidth(doc, invoiceTitle, { size: 26, weight: 'bold' } as any)
    const numberWidth = getTextWidth(doc, invoiceNumber, { size: 12, weight: 'bold' } as any)
    const totalWidth = titleWidth + 20 + numberWidth // 20pt gap between title and number
    
    // Center the combined title+number block
    const startX = rightX + (rightBlockWidth - totalWidth) / 2
    
    addText(doc, invoiceTitle, startX, yRight, {
      size: 26, color: templateColors.primary, weight: 'bold'
    })
    addText(doc, invoiceNumber, startX + titleWidth + 20, yRight, {
      size: 12, weight: 'bold'
    })
    yRight += lineHeight + 8

    // Bill To (card on right)
    addText(doc, t('billTo', locale), rightX, yRight, { size: 14, color: templateColors.primary, weight: 'bold' })
    yRight += lineHeight + 2

    const client = invoice.booking?.client
    const clientCompany = Array.isArray(client?.company) ? client?.company?.[0] : client?.company
    const clientName = client?.full_name ?? 'Client Name'
    const clientCompanyName =
      (clientCompany as any)?.name ?? (clientName ? `${clientName}'s Company` : 'Client Company')

    // Debug client data extraction
    console.log('🔍 PDF Generator - Raw client data:', {
      client: client,
      clientCompany: clientCompany,
      clientCompanyType: typeof clientCompany,
      isArray: Array.isArray(client?.company)
    })

    // Compose address string (string or object) - improved logic
    const cAddr = (clientCompany as any)?.address
    const addressText = (() => {
      if (!cAddr) return 'Address not provided'
      if (typeof cAddr === 'string') return cAddr.trim() || 'Address not provided'
      if (typeof cAddr === 'object') {
        const a: any = cAddr
        const parts = [
          a.street || a.line1 || a.address,
          a.city,
          a.region || a.state,
          a.country,
          a.postal_code || a.zip
        ].filter(Boolean)
        return parts.join(', ') || 'Address not provided'
      }
      return String(cAddr)
    })()
    
    const cEmail = (clientCompany as any)?.email ?? client?.email ?? 'Email not provided'
    const cPhoneRaw = (clientCompany as any)?.phone ?? (client as any)?.phone ?? 'Phone not provided'
    const cPhone = cPhoneRaw && cPhoneRaw !== 'Phone not provided'
      ? (/^\+/.test(cPhoneRaw) ? cPhoneRaw : (cPhoneRaw.startsWith('9') ? `+968-${cPhoneRaw}` : `+${cPhoneRaw}`))
      : 'Phone not provided'
    const cWeb = (clientCompany as any)?.website || (client as any)?.website || 'Website not provided'

    console.log('🔍 PDF Generator - Client data extraction:', {
      clientName: clientName,
      clientCompanyName: clientCompanyName,
      addressText: addressText,
      cEmail: cEmail,
      cPhone: cPhone,
      cWeb: cWeb
    })

    // Filter out placeholder text and only show real data
    const safeBillLines = [
      clientName,
      clientCompanyName,
      addressText,
      cEmail,
      cPhone,
      cWeb
    ].filter(txt => txt && !txt.includes('not provided'))

    console.log('🔍 PDF Generator - Bill To lines:', {
      originalLines: [clientName, clientCompanyName, addressText, cEmail, cPhone, cWeb],
      filteredLines: safeBillLines
    })

    safeBillLines.forEach((txt, i) => {
      const isName = i <= 1
      const isContact = txt.includes('@') || txt.includes('+') || txt.includes('http')
  addText(
    doc,
        (isContact ? '• ' : '') + txt, // bullets for contact info
        rightX,
        yRight,
        { size: isName ? 12 : 10, weight: isName ? 'bold' : 'normal', color: isName ? templateColors.text : templateColors.lightText }
      )
      yRight += lineHeight
    })

    // Content start (below whichever is lower)
    let y = Math.max(leftBlockBottom, yRight) + lineHeight

    // ---- Items table (grid, centered headers) --------------------------------
    const tableX = mainX
    const tableW = pageWidth - margin - tableX
    const cols = [15, 75, 25, 30, 30] as const // Better column distribution
    const colX = [
      tableX,
      tableX + cols[0],
      tableX + cols[0] + cols[1],
      tableX + cols[0] + cols[1] + cols[2],
      tableX + cols[0] + cols[1] + cols[2] + cols[3]
    ]
    // Header row - increased height for better appearance
    const headerH = 16
    addRect(doc, tableX, y, tableW, headerH, templateColors.background, templateColors.border)
    const headers = [t('item', locale), t('description', locale), t('qtyHour', locale), t('rate', locale), t('total', locale)]
    headers.forEach((h, i) => {
      // center small columns
      const baseX = i === 0 ? colX[i] + 2 : (i >= 2 ? colX[i] + cols[i] / 2 : colX[i] + 3)
      const opts = { size: 12, color: templateColors.primary, weight: 'bold' } as const
      if (i >= 2) {
        // centered
        const w = getTextWidth(doc, h, opts as any)
        addText(doc, h, baseX - w / 2, y + 10, opts as any)
      } else {
        addText(doc, h, baseX, y + 10, opts as any)
      }
    })
    // Vertical header lines
    for (let i = 1; i < colX.length; i++) addLine(doc, colX[i], y, colX[i], y + headerH, templateColors.border)
    addLine(doc, tableX, y + headerH, tableX + tableW, y + headerH, templateColors.border)
    y += headerH

    // Items
    const fallbackSubtotal = invoice.subtotal ?? 800
    const items = [
      {
        id: '1',
        product: invoice.booking?.service?.title ?? (invoice as any).service_title ?? 'Website Development',
        description:
          invoice.booking?.service?.description ??
          (invoice as any).service_description ??
          'Custom website development using modern technologies like React and Next.js. Perfect for businesses looking to establish their online presence.',
        qty: 1,
        unit_price: fallbackSubtotal,
        total: fallbackSubtotal
      }
    ]

    const rowPadY = 8
    items.forEach((it, idx) => {
      // Wrap description to column width
      const descWidth = cols[1] - 10
      const descLines = wrapText(doc, it.description || '-', descWidth)
      const linesCount = Array.isArray(descLines) ? descLines.length : 1
      const rowH = Math.max(20, rowPadY + 10 + (linesCount - 1) * 6) // Increased row height

      // Zebra row bg
      if (idx % 2 === 0) addRect(doc, tableX, y, tableW, rowH, templateColors.background)

      // Horizontal row borders
      addLine(doc, tableX, y, tableX + tableW, y, templateColors.border)
      addLine(doc, tableX, y + rowH, tableX + tableW, y + rowH, templateColors.border)

      // Vertical grid lines
      for (let i = 1; i < colX.length; i++) addLine(doc, colX[i], y, colX[i], y + rowH, templateColors.border)

      // Cells - improved positioning
      addText(doc, String(idx + 1).padStart(2, '0'), colX[0] + 5, y + 10, { size: 11 })

      addText(doc, it.product || 'Service', colX[1] + 5, y + 10, { size: 11, weight: 'bold' })
      if (Array.isArray(descLines)) {
        doc.text(descLines as string[], colX[1] + 5, y + 10 + 6)
  } else {
        addText(doc, descLines as string, colX[1] + 5, y + 10 + 6, { size: 10 })
      }

      // Centered small columns
      const centerCell = (text: string, colIndex: number, size = 11, bold = false) => {
        const w = getTextWidth(doc, text, { size, weight: bold ? 'bold' : 'normal' } as any)
        const cx = colX[colIndex] + cols[colIndex] / 2
        addText(doc, text, cx - w / 2, y + 10, { size, weight: bold ? 'bold' : 'normal' })
      }

      centerCell(String(it.qty || 1), 2)
      centerCell(formatCurrency(it.unit_price || 0, currency), 3)
      centerCell(formatCurrency(it.total || 0, currency), 4, 11, true)

      y += rowH
    })

    // Final bottom border of table
    addLine(doc, tableX, y, tableX + tableW, y, templateColors.border)
    y += lineHeight * 2

    // ---- Totals (right stacked, bold Total) ----------------------------------
    const subtotal = invoice.subtotal ?? items.reduce((s, i) => s + (i.total || 0), 0)
  const taxRate = invoice.vat_percent ? invoice.vat_percent / 100 : 0.05
    const taxAmount = invoice.vat_amount ?? subtotal * taxRate
    const grandTotal = invoice.total_amount ?? subtotal + taxAmount

    console.log('🔍 PDF Generator - Totals calculation:', {
      subtotal: subtotal,
      taxRate: taxRate,
      taxAmount: taxAmount,
      grandTotal: grandTotal,
      invoiceSubtotal: invoice.subtotal,
      invoiceVatAmount: invoice.vat_amount,
      invoiceTotal: invoice.total_amount
    })

    const rightEdge = pageWidth - margin
    const amountX = rightEdge - 10
    const labelMaxW = Math.max(
      getTextWidth(doc, t('subtotal', locale), { size: 13 } as any),
      getTextWidth(doc, `${t('tax', locale)} (${(taxRate * 100).toFixed(1)}%)`, { size: 13 } as any),
      getTextWidth(doc, t('totalAmountDue', locale), { size: 16, weight: 'bold' } as any)
    )
    const labelX = amountX - Math.max(
      getTextWidth(doc, formatCurrency(subtotal, currency), { size: 13 } as any),
      getTextWidth(doc, formatCurrency(taxAmount, currency), { size: 13 } as any),
      getTextWidth(doc, formatCurrency(grandTotal, currency), { size: 16, weight: 'bold' } as any)
    ) - 15 - labelMaxW

    const drawTotalRow = (label: string, value: string, y0: number, big = false) => {
      addText(doc, label, labelX, y0, { size: big ? 16 : 12, weight: big ? 'bold' : 'normal' })
      addRightAlignedText(doc, value, amountX, y0, { size: big ? 16 : 12, weight: big ? 'bold' : 'normal' })
    }

    drawTotalRow(t('subtotal', locale), formatCurrency(subtotal, currency), y)
    y += lineHeight + 3
    drawTotalRow(`${t('tax', locale)} (${(taxRate * 100).toFixed(1)}%)`, formatCurrency(taxAmount, currency), y)
    y += lineHeight + 3
    addLine(doc, labelX, y, amountX, y, templateColors.border)
    y += lineHeight + 3
    drawTotalRow(t('totalAmountDue', locale), formatCurrency(grandTotal, currency), y, true)
    y += lineHeight * 3

    // ---- Footer: Signature (dashed) + Terms (bottom-right) --------------------
    const footerTop = pageHeight - 70
    // Signature dashed box on left
    const sigW = 100, sigH = 30

    // jsPDF sometimes has setLineDashPattern, but typings don't expose it
    const anyDoc = doc as any
    if (typeof anyDoc.setLineDashPattern === 'function') {
      anyDoc.setLineDashPattern([1.5, 1.5], 0)
      doc.rect(mainX, footerTop, sigW, sigH)
      anyDoc.setLineDashPattern([], 0) // reset
    } else {
      // fallback solid border
      doc.rect(mainX, footerTop, sigW, sigH)
    }

    // center caption
    const cap = t('nameAndSignature', locale)
    const capW = getTextWidth(doc, cap, { size: 11 } as any)
    addText(doc, cap, mainX + sigW / 2 - capW / 2, footerTop + sigH / 2 + 3, { size: 11, color: templateColors.lightText })

    // Terms & Conditions (full-width below signature box for professional appearance)
    const termsX = mainX
    const termsWidth = pageWidth - margin * 2
    const termsY = footerTop + sigH + 12
    
    addText(doc, t('termsAndConditions', locale), termsX, termsY, {
      size: 12, color: templateColors.primary, weight: 'bold'
    })

    const terms = [
      `Payment Terms: Payment is due within 30 days of invoice date. Late payments are subject to a 1.5% monthly service charge. All amounts are in ${currency}.`,
    'Service Agreement: All services are provided subject to our standard terms of service. Work performed is guaranteed for 90 days from completion date.',
    'Disputes: Any disputes must be submitted in writing within 15 days of invoice date. For questions regarding this invoice, please contact us at the provided contact information.'
  ]
    let ty = termsY + 8
    terms.forEach((para, i) => {
      const lines = wrapText(doc, para, termsWidth)
      if (Array.isArray(lines)) {
        doc.text(lines, termsX, ty)
        ty += lines.length * 4
      } else {
        addText(doc, lines, termsX, ty, { size: 9 })
        ty += 4
      }
      if (i < terms.length - 1) ty += 3
  })

  return new Uint8Array(doc.output('arraybuffer'))
  } catch (err) {
    console.error('PDF generation error', err)
    throw err
  }
}
