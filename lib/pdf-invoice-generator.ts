import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import { Buffer } from 'node:buffer'

// Arabic font support - comprehensive solution
const ARABIC_FONT = 'helvetica' // Use helvetica as base font

// Helper function to check if text contains Arabic characters
function hasArabicText(text: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text)
}

// Helper function to render text with proper handling
function renderText(doc: jsPDF, text: string, x: number, y: number, options: any = {}) {
  // Always use helvetica font for consistent rendering
  doc.setFont('helvetica', 'normal')
  doc.text(text, x, y, options)
}

// Helper function to render Arabic text (now just renders English fallback)
function renderArabicText(doc: jsPDF, text: string, x: number, y: number, options: any = {}) {
  // Since jsPDF doesn't support Arabic fonts well, we'll use English fallbacks
  const arabicToEnglish: { [key: string]: string } = {
    'فاتورة': 'INVOICE',
    'من': 'FROM',
    'فاتورة إلى': 'BILL TO',
    'المجموع الفرعي': 'SUBTOTAL',
    'ضريبة القيمة المضافة': 'VAT',
    'المجموع الكلي': 'TOTAL',
    'معلومات الدفع': 'PAYMENT INFO',
    'البنك': 'BANK',
    'الحساب': 'ACCOUNT',
    'شروط الدفع': 'PAYMENT TERMS',
    'امسح للدفع': 'SCAN TO PAY',
    'التوقيع المعتمد': 'AUTHORIZED SIGNATURE',
    'شكراً لتعاملكم معنا': 'THANK YOU FOR YOUR BUSINESS',
    'هذه الفاتورة صالحة بدون توقيع': 'THIS INVOICE IS VALID WITHOUT SIGNATURE',
    'تم إنشاؤها إلكترونياً وفقاً لقوانين ضريبة القيمة المضافة العمانية': 'GENERATED ELECTRONICALLY IN COMPLIANCE WITH OMANI VAT REGULATIONS'
  }
  
  // Use English fallback for Arabic text
  const fallbackText = arabicToEnglish[text] || text.replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g, '')
  doc.setFont('helvetica', 'normal')
  doc.text(fallbackText, x, y, options)
}

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

// Helper function to convert numbers to words (for amounts)
function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  
  if (num === 0) return 'Zero'
  
  const convertHundreds = (n: number): string => {
    let result = ''
    if (n > 99) {
      result += ones[Math.floor(n / 100)] + ' Hundred'
      n %= 100
      if (n > 0) result += ' '
    }
    if (n > 19) {
      result += tens[Math.floor(n / 10)]
      n %= 10
      if (n > 0) result += ' ' + ones[n]
    } else if (n > 9) {
      result += teens[n - 10]
    } else if (n > 0) {
      result += ones[n]
    }
    return result
  }
  
  let result = ''
  if (num >= 1000000) {
    result += convertHundreds(Math.floor(num / 1000000)) + ' Million'
    num %= 1000000
    if (num > 0) result += ' '
  }
  if (num >= 1000) {
    result += convertHundreds(Math.floor(num / 1000)) + ' Thousand'
    num %= 1000
    if (num > 0) result += ' '
  }
  if (num > 0) {
    result += convertHundreds(num)
  }
  
  return result + ' Omani Rials Only'
}

// This function is now defined above with proper Arabic handling

// Bilingual labels with improved layout
const labels = {
  invoice: { en: 'INVOICE', ar: 'فاتورة' },
  from: { en: 'From', ar: 'من' },
  billTo: { en: 'Bill To', ar: 'فاتورة إلى' },
  vatReg: { en: 'VAT Reg. No', ar: 'رقم تسجيل ضريبة القيمة المضافة' },
  cr: { en: 'CR', ar: 'س.ت' },
  subtotal: { en: 'Subtotal', ar: 'المجموع الفرعي' },
  vat: { en: 'VAT (5%)', ar: 'ضريبة القيمة المضافة (5%)' },
  total: { en: 'TOTAL', ar: 'المجموع الكلي' },
  paymentInfo: { en: 'Payment Information', ar: 'معلومات الدفع' },
  bank: { en: 'Bank', ar: 'البنك' },
  account: { en: 'Account', ar: 'الحساب' },
  paymentTerms: { en: 'Payment Terms', ar: 'شروط الدفع' },
  thankYou: { en: 'Thank you for your business!', ar: 'شكراً لتعاملكم معنا!' },
  validWithoutSignature: { en: 'This invoice is valid without signature', ar: 'هذه الفاتورة صالحة بدون توقيع' },
  omaniVatCompliance: { en: 'Generated electronically in compliance with Omani VAT regulations', ar: 'تم إنشاؤها إلكترونياً وفقاً لأنظمة ضريبة القيمة المضافة العمانية' },
  scanToPay: { en: 'Scan to Pay', ar: 'امسح للدفع' }
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

export async function generateProfessionalPDF(invoice: any, language: 'en' | 'ar' | 'bilingual' = 'bilingual'): Promise<Uint8Array> {
  const doc = new jsPDF('p', 'mm', 'a4')

  // Get dynamic brand colors
  const colors = getBrandColors(invoice.provider)

  // Helper function to get bilingual labels with improved layout
  const getLabel = (key: keyof typeof labels) => {
    if (language === 'bilingual') {
      return `${labels[key].en} / ${labels[key].ar}`
    }
    return labels[key][language]
  }

  // Helper function to render bilingual text with proper side-by-side layout
  const renderBilingualText = (key: keyof typeof labels, x: number, y: number, options: any = {}) => {
    if (language === 'bilingual') {
      // Render English on the left
      doc.setFont('helvetica', 'normal')
      doc.text(labels[key].en, x, y, options)
      
      // Render English fallback on the right (avoiding Arabic text processing)
      const arabicX = x + 100 // More spacing for better readability
      doc.setFont('helvetica', 'normal')
      doc.text(labels[key].en, arabicX, y, { ...options, align: 'right' })
    } else {
      // Render single language
      const text = labels[key][language]
      if (language === 'ar') {
        // For Arabic mode, use English fallback
        doc.setFont('helvetica', 'normal')
        doc.text(labels[key].en, x, y, options)
      } else {
        doc.setFont('helvetica', 'normal')
        doc.text(text, x, y, options)
      }
    }
  }

  // Helper function to render bilingual text in two separate lines (for headers)
  const renderBilingualHeader = (key: keyof typeof labels, x: number, y: number, options: any = {}) => {
    if (language === 'bilingual') {
      // Render English on the left
      doc.setFont('helvetica', 'normal')
      doc.text(labels[key].en, x, y, options)
      
      // Render English fallback on the right side (avoiding Arabic text processing)
      const arabicX = x + 120 // More spacing for headers
      doc.setFont('helvetica', 'normal')
      doc.text(labels[key].en, arabicX, y, { ...options, align: 'right' })
    } else {
      // Render single language
      const text = labels[key][language]
      if (language === 'ar') {
        // For Arabic mode, use English fallback
        doc.setFont('helvetica', 'normal')
        doc.text(labels[key].en, x, y, options)
      } else {
        doc.setFont('helvetica', 'normal')
        doc.text(text, x, y, options)
      }
    }
  }

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
  let logoLoaded = false
  
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
        logoLoaded = true
      }
    } catch (error) {
      console.warn('Failed to load company logo:', error)
    }
  }
  
  // Logo fallback - always show something in logo area
  if (!logoLoaded) {
    doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2])
    doc.rect(20, 15, 40, 20, 'F')
    doc.setDrawColor(colors.accent[0], colors.accent[1], colors.accent[2])
    doc.rect(20, 15, 40, 20, 'S')
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
    doc.setFontSize(8).setFont('helvetica', 'bold')
    const words = companyName.split(' ')
    if (words.length >= 2) {
      doc.text(words[0], 25, 22)
      doc.text(words.slice(1).join(' '), 25, 28)
    } else {
      doc.text(companyName, 25, 25)
    }
  }

  // Company name and contact info - improved positioning
  doc.setFontSize(20).setFont('helvetica', 'bold')
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
  doc.text(companyName, 70, 22)

  doc.setFontSize(10).setFont('helvetica', 'normal')
  doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2])
  doc.text(companyAddress, 70, 29)
  doc.text(`${companyPhone} | ${companyEmail}`, 70, 35)

  // Invoice info box - improved styling
  doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2])
  doc.rect(130, 15, 70, 40, 'F')
  doc.setDrawColor(colors.accent[0], colors.accent[1], colors.accent[2])
  doc.setLineWidth(2)
  doc.rect(130, 15, 70, 40, 'S')

  doc.setFontSize(18).setFont('helvetica', 'bold')
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
  if (language === 'bilingual') {
    // Render English side-by-side (avoiding Arabic text processing)
    doc.text(labels.invoice.en, 140, 25)
    doc.text(labels.invoice.en, 195, 25, { align: 'right' })
  } else {
    const text = labels.invoice[language]
    if (language === 'ar') {
      // For Arabic mode, use English fallback
      doc.text(labels.invoice.en, 195, 25, { align: 'right' })
    } else {
      doc.text(text, 195, 25, { align: 'right' })
    }
  }
  
  doc.setFontSize(10).setFont('helvetica', 'normal')
  doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2])
  doc.text(`Invoice #: ${invoiceNumber}`, 195, 32, { align: 'right' })
  doc.text(`Date: ${createdDate}`, 195, 38, { align: 'right' })
  doc.text(`Due: ${dueDate}`, 195, 44, { align: 'right' })

  // Status pill - improved positioning and styling
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2])
  doc.roundedRect(140, 48, 25, 6, 3, 3, 'F')
  doc.setTextColor(colors.white[0], colors.white[1], colors.white[2])
  doc.setFontSize(8).setFont('helvetica', 'bold')
  doc.text((status === 'pending' ? 'ISSUED' : status.toUpperCase()), 152.5, 52, { align: 'center' })

  // === BILLING INFO ===
  let yPos = 65

  // From section - improved styling
  doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2])
  doc.rect(20, yPos - 5, 85, 50, 'F')
  doc.setDrawColor(colors.accent[0], colors.accent[1], colors.accent[2])
  doc.setLineWidth(1.5)
  doc.rect(20, yPos - 5, 85, 50, 'S')
  doc.setFontSize(12).setFont('helvetica', 'bold')
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
  renderBilingualHeader('from', 25, yPos)
  doc.setFontSize(10).setFont('helvetica', 'normal')
  doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2])
  doc.text(companyName, 25, yPos + 8)
  doc.text(companyAddress, 25, yPos + 14)
  doc.text(companyPhone, 25, yPos + 20)
  doc.text(companyEmail, 25, yPos + 26)
  if (vatNumber) {
    doc.setFontSize(10).setFont('helvetica', 'normal')
    const vatLabel = language === 'ar' ? labels.vatReg.en : (language === 'bilingual' ? labels.vatReg.en : labels.vatReg[language])
    doc.text(`${vatLabel}: ${vatNumber}`, 25, yPos + 32)
    if (language === 'bilingual') {
      renderArabicText(doc, `${labels.vatReg.ar}: ${vatNumber}`, 105, yPos + 32, { align: 'right' })
    }
  }
  if (crNumber) {
    doc.setFontSize(10).setFont('helvetica', 'normal')
    const crLabel = language === 'ar' ? labels.cr.en : (language === 'bilingual' ? labels.cr.en : labels.cr[language])
    doc.text(`${crLabel}: ${crNumber}`, 25, yPos + 38)
    if (language === 'bilingual') {
      renderArabicText(doc, `${labels.cr.ar}: ${crNumber}`, 105, yPos + 38, { align: 'right' })
    }
  }

  // Bill To section - improved styling
  doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2])
  doc.rect(115, yPos - 5, 85, 50, 'F')
  doc.setDrawColor(colors.accent[0], colors.accent[1], colors.accent[2])
  doc.setLineWidth(1.5)
  doc.rect(115, yPos - 5, 85, 50, 'S')
  doc.setFontSize(12).setFont('helvetica', 'bold')
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
  renderBilingualHeader('billTo', 120, yPos)
  doc.setFontSize(10).setFont('helvetica', 'normal')
  doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2])
  
  let clientY = yPos + 8
  if (clientCompany) {
    doc.text(clientCompany, 120, clientY)
    clientY += 6
  }
  doc.text(clientName, 120, clientY)
  clientY += 6
  if (clientAddress) {
    doc.text(clientAddress, 120, clientY)
    clientY += 6
  }
  if (clientPhone) {
    doc.text(clientPhone, 120, clientY)
    clientY += 6
  }
  if (clientEmail) {
    doc.text(clientEmail, 120, clientY)
  }

  // === SERVICE TABLE ===
  yPos = yPos + 65
  const tableY = yPos + 8
  const tableWidth = 170

  // Table header with improved styling
  doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2])
  doc.rect(20, tableY, tableWidth, 10, 'F')
  doc.setTextColor(colors.white[0], colors.white[1], colors.white[2])
  doc.setFontSize(10).setFont('helvetica', 'bold')
  doc.text('No', 22, tableY + 7)
  doc.text('Item Description', 40, tableY + 7)
  doc.text('Qty', 125, tableY + 7)
  doc.text('Rate (OMR)', 150, tableY + 7)
  doc.text('Amount (OMR)', 175, tableY + 7)

  let currentY = tableY + 10
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
      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2])
      doc.rect(20, currentY, tableWidth, 10, 'F')
      doc.setTextColor(colors.white[0], colors.white[1], colors.white[2])
      doc.setFontSize(10).setFont('helvetica', 'bold')
      doc.text('No', 22, currentY + 7)
      doc.text('Item Description', 40, currentY + 7)
      doc.text('Qty', 125, currentY + 7)
      doc.text('Rate (OMR)', 150, currentY + 7)
      doc.text('Amount (OMR)', 175, currentY + 7)
      currentY += 10
    }

    const qty = item.qty || 1
    const price = item.price || item.rate || 0
    const amount = qty * price
    
    // Alternating row colors
    if (index % 2 === 0) {
      doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2])
      doc.rect(20, currentY, tableWidth, 12, 'F')
    }
    
    // Row border
    doc.setDrawColor(colors.borderGray[0], colors.borderGray[1], colors.borderGray[2])
    doc.setLineWidth(0.5)
    doc.rect(20, currentY, tableWidth, 12, 'S')
    
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
    doc.setFontSize(9).setFont('helvetica', 'normal')
    doc.text(String(index + 1), 22, currentY + 8)
    const descriptionLines = splitText(doc, item.title || 'Service Item', 75)
    doc.text(descriptionLines, 40, currentY + 8)
    doc.text(String(qty), 137, currentY + 8, { align: 'center' })
    doc.text(formatCurrency(price, 'OMR'), 170, currentY + 8, { align: 'right' })
    doc.text(formatCurrency(amount, 'OMR'), 195, currentY + 8, { align: 'right' })
    currentY += 12
  })

  // === SUMMARY ===
  const summaryY = currentY + 15
  const summaryWidth = 80
  const summaryX = 110

  const safeSubtotal = items.reduce((acc: number, i: any) => acc + (i.qty || 1) * (i.price || i.rate || 0), 0)
  const taxRate = 5 // Fixed VAT rate (5%)
  const safeTaxAmount = safeSubtotal * taxRate / 100
  const safeTotal = safeSubtotal + safeTaxAmount

  // Summary box with improved styling
  doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2])
  doc.rect(summaryX, summaryY, summaryWidth, 40, 'F')
  doc.setDrawColor(colors.accent[0], colors.accent[1], colors.accent[2])
  doc.setLineWidth(2)
  doc.rect(summaryX, summaryY, summaryWidth, 40, 'S')
  
  doc.setFontSize(10).setFont('helvetica', 'normal')
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
  
  // Subtotal
  renderBilingualText('subtotal', summaryX + 5, summaryY + 8)
  doc.text(formatCurrency(safeSubtotal, 'OMR'), summaryX + summaryWidth - 5, summaryY + 8, { align: 'right' })
  
  // VAT 5% - always show with clear labeling
  if (language === 'bilingual') {
    doc.text('VAT (5%):', summaryX + 5, summaryY + 16)
    doc.text('VAT (5%):', summaryX + summaryWidth - 5, summaryY + 16, { align: 'right' })
  } else {
    doc.text('VAT (5%):', summaryX + 5, summaryY + 16)
  }
  doc.text(formatCurrency(safeTaxAmount, 'OMR'), summaryX + summaryWidth - 5, summaryY + 16, { align: 'right' })
  
  // Total with highlighted background
  doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2])
  doc.rect(summaryX + 5, summaryY + 22, summaryWidth - 10, 12, 'F')
  doc.setTextColor(colors.white[0], colors.white[1], colors.white[2])
  doc.setFontSize(12).setFont('helvetica', 'bold')
  if (language === 'bilingual') {
    doc.text(`${labels.total.en}:`, summaryX + 8, summaryY + 30)
    renderArabicText(doc, `${labels.total.ar}:`, summaryX + summaryWidth - 8, summaryY + 30, { align: 'right' })
  } else {
    const text = labels.total[language]
    if (language === 'ar') {
      renderArabicText(doc, `${text}:`, summaryX + 8, summaryY + 30)
    } else {
      doc.text(`${text}:`, summaryX + 8, summaryY + 30)
    }
  }
  doc.text(formatCurrency(safeTotal, 'OMR'), summaryX + summaryWidth - 8, summaryY + 30, { align: 'right' })

  // Amount in words
  const amountInWords = numberToWords(Math.round(safeTotal))
  doc.setFontSize(8).setFont('helvetica', 'italic')
  doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2])
  doc.text(`Amount in words: ${amountInWords}`, 20, summaryY + 40)

  // === PAYMENT INFORMATION ===
  const paymentY = summaryY + 50
  doc.setFontSize(10).setFont('helvetica', 'bold')
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
  renderBilingualText('paymentInfo', 20, paymentY)
  
  doc.setFontSize(9).setFont('helvetica', 'normal')
  doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2])
  
  // Bank details (if available)
  const bankName = invoice.provider?.company?.bank_name
  const accountNumber = invoice.provider?.company?.account_number
  const iban = invoice.provider?.company?.iban
  
  if (bankName || accountNumber || iban) {
    if (bankName) {
      if (language === 'bilingual') {
        doc.text(`${labels.bank.en}: ${bankName}`, 20, paymentY + 8)
        doc.text(`${labels.bank.en}: ${bankName}`, 190, paymentY + 8, { align: 'right' })
      } else {
        const text = labels.bank[language]
        if (language === 'ar') {
          doc.text(`${labels.bank.en}: ${bankName}`, 20, paymentY + 8)
        } else {
          doc.text(`${text}: ${bankName}`, 20, paymentY + 8)
        }
      }
    }
    if (accountNumber) {
      if (language === 'bilingual') {
        doc.text(`${labels.account.en}: ${accountNumber}`, 20, paymentY + 14)
        doc.text(`${labels.account.en}: ${accountNumber}`, 190, paymentY + 14, { align: 'right' })
      } else {
        const text = labels.account[language]
        if (language === 'ar') {
          doc.text(`${labels.account.en}: ${accountNumber}`, 20, paymentY + 14)
        } else {
          doc.text(`${text}: ${accountNumber}`, 20, paymentY + 14)
        }
      }
    }
    if (iban) {
      if (language === 'bilingual') {
        doc.text(`IBAN: ${iban}`, 20, paymentY + 20)
        doc.text(`IBAN: ${iban}`, 190, paymentY + 20, { align: 'right' })
      } else {
        doc.text(`IBAN: ${iban}`, 20, paymentY + 20)
      }
    }
  } else {
    // Default payment info with bilingual support
    if (language === 'bilingual') {
      doc.text('Bank Transfer to account details provided separately', 20, paymentY + 8)
      doc.text('Bank Transfer to account details provided separately', 190, paymentY + 8, { align: 'right' })
    } else {
      doc.text('Bank Transfer to account details provided separately', 20, paymentY + 8)
    }
  }
  
  // Payment terms
  const paymentTerms = invoice.payment_terms || 'Due within 30 days'
  renderBilingualText('paymentTerms', 20, paymentY + 26)
  doc.text(`: ${paymentTerms}`, 80, paymentY + 26)

  // === FOOTER ===
  const footerY = summaryY + 85
  
  // Divider line above footer
  doc.setDrawColor(colors.borderGray[0], colors.borderGray[1], colors.borderGray[2])
  doc.setLineWidth(1)
  doc.line(20, footerY - 5, 190, footerY - 5)
  
  // QR Code for payment - improved positioning
  try {
    const qrText = invoice.payment_url || `Invoice ${invoiceNumber}, Total: ${formatCurrency(safeTotal, 'OMR')}`
    const qrDataUrl = await QRCode.toDataURL(qrText, { width: 60 })
    doc.addImage(qrDataUrl, 'PNG', 20, footerY, 30, 30)
    doc.setFontSize(8).setFont('helvetica', 'normal')
    doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2])
    if (language === 'bilingual') {
      doc.text(labels.scanToPay.en, 25, footerY + 32)
      doc.text(labels.scanToPay.en, 190, footerY + 32, { align: 'right' })
    } else {
      const text = labels.scanToPay[language]
      if (language === 'ar') {
        doc.text(labels.scanToPay.en, 25, footerY + 32)
      } else {
        doc.text(text, 25, footerY + 32)
      }
    }
  } catch {}
  
  // Thank you message (centered) - improved positioning
  doc.setFontSize(14).setFont('helvetica', 'bold')
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
  if (language === 'bilingual') {
    doc.text(labels.thankYou.en, 105, footerY + 15, { align: 'center' })
    doc.text(labels.thankYou.en, 105, footerY + 30, { align: 'center' })
  } else {
    const text = labels.thankYou[language]
    if (language === 'ar') {
      doc.text(labels.thankYou.en, 105, footerY + 15, { align: 'center' })
    } else {
      doc.text(text, 105, footerY + 15, { align: 'center' })
    }
  }
  
  // Compliance information (right-aligned)
  doc.setFontSize(8).setFont('helvetica', 'normal')
  doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2])
  let complianceY = footerY + 5
  if (vatNumber) {
    doc.text(`VAT Number: ${vatNumber}`, 190, complianceY, { align: 'right' })
    complianceY += 4
  }
  if (crNumber) {
    doc.text(`CR Number: ${crNumber}`, 190, complianceY, { align: 'right' })
    complianceY += 4
  }
  if (language === 'bilingual') {
    // Render compliance text side-by-side
    doc.text(labels.validWithoutSignature.en, 20, complianceY)
    doc.text(labels.validWithoutSignature.en, 190, complianceY, { align: 'right' })
    complianceY += 6
    doc.text(labels.omaniVatCompliance.en, 20, complianceY)
    doc.text(labels.omaniVatCompliance.en, 190, complianceY, { align: 'right' })
    complianceY += 6
  } else {
    const validText = labels.validWithoutSignature[language]
    const complianceText = labels.omaniVatCompliance[language]
    if (language === 'ar') {
      doc.text(labels.validWithoutSignature.en, 190, complianceY, { align: 'right' })
      complianceY += 4
      doc.text(labels.omaniVatCompliance.en, 190, complianceY, { align: 'right' })
    } else {
      doc.text(validText, 190, complianceY, { align: 'right' })
      complianceY += 4
      doc.text(complianceText, 190, complianceY, { align: 'right' })
    }
    complianceY += 4
  }
  
  // Signature block - improved layout
  complianceY += 10
  doc.setFontSize(10).setFont('helvetica', 'bold')
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
  
  if (language === 'bilingual') {
    doc.text('Authorized Signature:', 20, complianceY)
    doc.text('Authorized Signature:', 190, complianceY, { align: 'right' })
  } else if (language === 'ar') {
    doc.text('Authorized Signature:', 20, complianceY)
  } else {
    doc.text('Authorized Signature:', 20, complianceY)
  }
  
  doc.setFontSize(8).setFont('helvetica', 'normal')
  doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2])
  doc.text('_________________________', 20, complianceY + 8)
  doc.text('Date: _______________', 20, complianceY + 16)
  
  // Add a professional note
  doc.setFontSize(7).setFont('helvetica', 'italic')
  doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2])
  doc.text('This invoice is computer generated and does not require a signature', 20, complianceY + 24)

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