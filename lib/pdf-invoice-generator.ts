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

// Bilingual labels
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

  // Helper function to get bilingual labels
  const getLabel = (key: keyof typeof labels) => {
    if (language === 'bilingual') {
      return `${labels[key].en} / ${labels[key].ar}`
    }
    return labels[key][language]
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
  doc.text(getLabel('invoice'), 195, 22, { align: 'right' })
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
  doc.text(getLabel('from'), 25, yPos)
  doc.setFontSize(10).setFont('helvetica', 'normal')
  doc.text(companyName, 25, yPos + 8)
  doc.text(companyAddress, 25, yPos + 14)
  doc.text(companyPhone, 25, yPos + 20)
  doc.text(companyEmail, 25, yPos + 26)
  if (vatNumber) doc.text(`${getLabel('vatReg')}: ${vatNumber}`, 25, yPos + 32)
  if (crNumber) doc.text(`${getLabel('cr')}: ${crNumber}`, 25, yPos + 38)

  // Bill To
  doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2])
  doc.rect(115, yPos - 5, 85, 50, 'F')
  doc.setDrawColor(colors.accent[0], colors.accent[1], colors.accent[2])
  doc.rect(115, yPos - 5, 85, 50, 'S')
  doc.setFontSize(12).setFont('helvetica', 'bold')
  doc.text(getLabel('billTo'), 120, yPos)
  doc.setFontSize(10).setFont('helvetica', 'normal')
  
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
  const taxRate = 5 // Fixed VAT rate (5%)
  const safeTaxAmount = safeSubtotal * taxRate / 100
  const safeTotal = safeSubtotal + safeTaxAmount

  // Summary box with proper styling using brand accent color
  doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2])
  doc.rect(summaryX, summaryY, summaryWidth, 35, 'F')
  doc.setDrawColor(colors.accent[0], colors.accent[1], colors.accent[2])
  doc.setLineWidth(2)
  doc.rect(summaryX, summaryY, summaryWidth, 35, 'S')
  
  doc.setFontSize(10).setFont('helvetica', 'normal')
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
  
  // Subtotal
  doc.text(`${getLabel('subtotal')}:`, summaryX + 5, summaryY + 8)
  doc.text(formatCurrency(safeSubtotal, 'OMR'), summaryX + summaryWidth - 5, summaryY + 8, { align: 'right' })
  
  // VAT 5% - always show
  doc.text(`${getLabel('vat')}:`, summaryX + 5, summaryY + 16)
  doc.text(formatCurrency(safeTaxAmount, 'OMR'), summaryX + summaryWidth - 5, summaryY + 16, { align: 'right' })
  doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2])
  doc.rect(summaryX + 5, summaryY + 22, summaryWidth - 10, 8, 'F')
  doc.setTextColor(colors.white[0], colors.white[1], colors.white[2])
  doc.setFontSize(12).setFont('helvetica', 'bold')
  doc.text(`${getLabel('total')}:`, summaryX + 8, summaryY + 28)
  doc.text(formatCurrency(safeTotal, 'OMR'), summaryX + summaryWidth - 8, summaryY + 28, { align: 'right' })

  // Amount in words
  const amountInWords = numberToWords(Math.round(safeTotal))
  doc.setFontSize(8).setFont('helvetica', 'italic')
  doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2])
  doc.text(`Amount in words: ${amountInWords}`, 20, summaryY + 40)

  // === PAYMENT INFORMATION ===
  const paymentY = summaryY + 50
  doc.setFontSize(10).setFont('helvetica', 'bold')
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
  doc.text(getLabel('paymentInfo'), 20, paymentY)
  
  doc.setFontSize(9).setFont('helvetica', 'normal')
  doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2])
  
  // Bank details (if available)
  const bankName = invoice.provider?.company?.bank_name
  const accountNumber = invoice.provider?.company?.account_number
  const iban = invoice.provider?.company?.iban
  
  if (bankName || accountNumber || iban) {
    if (bankName) doc.text(`${getLabel('bank')}: ${bankName}`, 20, paymentY + 8)
    if (accountNumber) doc.text(`${getLabel('account')}: ${accountNumber}`, 20, paymentY + 14)
    if (iban) doc.text(`IBAN: ${iban}`, 20, paymentY + 20)
  } else {
    // Default payment info
    doc.text('Bank Transfer to account details provided separately', 20, paymentY + 8)
  }
  
  // Payment terms
  const paymentTerms = invoice.payment_terms || 'Due within 30 days'
  doc.text(`${getLabel('paymentTerms')}: ${paymentTerms}`, 20, paymentY + 26)

  // === FOOTER ===
  const footerY = summaryY + 80
  
  // Divider line above footer
  doc.setDrawColor(colors.borderGray[0], colors.borderGray[1], colors.borderGray[2])
  doc.line(20, footerY - 5, 190, footerY - 5)
  
  // QR Code for payment
  try {
    const qrText = invoice.payment_url || `Invoice ${invoiceNumber}, Total: ${formatCurrency(safeTotal, 'OMR')}`
    const qrDataUrl = await QRCode.toDataURL(qrText, { width: 50 })
    doc.addImage(qrDataUrl, 'PNG', 20, footerY, 25, 25)
    doc.setFontSize(8).setFont('helvetica', 'normal')
    doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2])
    doc.text(getLabel('scanToPay'), 22, footerY + 28)
  } catch {}
  
  // Thank you message (centered)
  doc.setFontSize(12).setFont('helvetica', 'bold')
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
  doc.text(getLabel('thankYou'), 105, footerY + 15, { align: 'center' })
  
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
  doc.text(getLabel('validWithoutSignature'), 190, complianceY, { align: 'right' })
  complianceY += 4
  doc.text(getLabel('omaniVatCompliance'), 190, complianceY, { align: 'right' })
  
  // Optional signature block
  if (invoice.require_signature) {
    complianceY += 8
    doc.setFontSize(10).setFont('helvetica', 'bold')
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
    doc.text('Authorized Signature:', 20, complianceY)
    doc.setFontSize(8).setFont('helvetica', 'normal')
    doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2])
    doc.text('_________________________', 20, complianceY + 8)
    doc.text('Date: _______________', 20, complianceY + 16)
  }

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