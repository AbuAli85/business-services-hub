import { jsPDF } from 'jspdf'
import type { PDFColors, PDFTypography, PDFLayout } from '@/lib/types/pdf-generator'

// Template-specific color palette matching the design
export const templateColors: PDFColors = {
  primary: [30, 64, 175] as [number, number, number],     // Blue-900
  accent: [59, 130, 246] as [number, number, number],     // Blue-600
  text: [31, 41, 55] as [number, number, number],         // Gray-800
  lightText: [75, 85, 99] as [number, number, number],    // Gray-600
  border: [209, 213, 219] as [number, number, number],    // Gray-300
  white: [255, 255, 255] as [number, number, number],     // White
  background: [249, 250, 251] as [number, number, number] // Gray-50
}

// Typography settings for template
export const typography: PDFTypography = {
  title: { size: 20, weight: 'bold' },
  subtitle: { size: 16, weight: 'bold' },
  heading: { size: 12, weight: 'bold' },
  body: { size: 10, weight: 'normal' },
  small: { size: 8, weight: 'normal' }
}

// Layout constants
export const layout: PDFLayout = {
  pageWidth: 210,
  pageHeight: 297,
  margin: 20,
  contentWidth: 190,
  lineHeight: 6,
  sidebarWidth: 40
}

// Safe text function to fix encoding issues
export const safeText = (text?: string | null): string => {
  if (!text) return ''
  return text.normalize('NFC').replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII characters that cause encoding issues
}

// Currency formatting with locale support
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  const currencyMap: Record<string, string> = {
    'USD': 'en-US',
    'EUR': 'en-EU',
    'GBP': 'en-GB',
    'OMR': 'en-OM',
    'AED': 'ar-AE',
    'SAR': 'ar-SA'
  }

  const locale = currencyMap[currency] || 'en-US'
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

// Date formatting with locale support
export function formatDate(dateString: string, locale: string = 'en-US'): string {
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return new Date().toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }
    
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  } catch (error) {
    console.warn('Invalid date format:', dateString)
    return new Date().toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }
}

// Text positioning helper
export function addText(
  doc: jsPDF, 
  text: string, 
  x: number, 
  y: number, 
  options: { size?: number; weight?: string; color?: [number, number, number]; align?: 'left' | 'center' | 'right' } = {}
) {
  doc.setFontSize(options.size || typography.body.size)
  doc.setFont('helvetica', options.weight || typography.body.weight)
  
  if (options.color) {
    doc.setTextColor(options.color[0], options.color[1], options.color[2])
  } else {
    doc.setTextColor(...templateColors.text)
  }
  
  const safeTextContent = safeText(text)
  
  if (options.align) {
    doc.text(safeTextContent, x, y, { align: options.align })
  } else {
    doc.text(safeTextContent, x, y)
  }
}

// Line drawing helper
export function addLine(
  doc: jsPDF,
  x1: number, 
  y1: number, 
  x2: number, 
  y2: number, 
  color: [number, number, number] = templateColors.border
) {
  doc.setDrawColor(color[0], color[1], color[2])
  doc.line(x1, y1, x2, y2)
}

// Rectangle drawing helper
export function addRect(
  doc: jsPDF,
  x: number, 
  y: number, 
  width: number, 
  height: number, 
  fillColor?: [number, number, number], 
  strokeColor?: [number, number, number]
) {
  if (fillColor) {
    doc.setFillColor(fillColor[0], fillColor[1], fillColor[2])
    doc.rect(x, y, width, height, 'F')
  }
  if (strokeColor) {
    doc.setDrawColor(strokeColor[0], strokeColor[1], strokeColor[2])
    doc.rect(x, y, width, height, 'S')
  }
}

// Text wrapping helper
export function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text || '', maxWidth)
}

// Right-align text helper
export function addRightAlignedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  options: { size?: number; weight?: string; color?: [number, number, number] } = {}
) {
  addText(doc, text, x, y, { ...options, align: 'right' })
}

// Calculate text width
export function getTextWidth(doc: jsPDF, text: string, options: { size?: number; weight?: string } = {}): number {
  doc.setFontSize(options.size || typography.body.size)
  doc.setFont('helvetica', options.weight || typography.body.weight)
  return doc.getTextWidth(text)
}

// Logo/image helper
export async function addLogo(
  doc: jsPDF,
  logoUrl: string | undefined,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<boolean> {
  if (!logoUrl || logoUrl.includes('/logo.png')) {
    return false
  }

  try {
    // Convert image to base64
    const response = await fetch(logoUrl)
    const blob = await response.blob()
    const reader = new FileReader()
    
    return new Promise((resolve) => {
      reader.onload = () => {
        try {
          const base64 = reader.result as string
          doc.addImage(base64, 'PNG', x, y, width, height)
          resolve(true)
        } catch (error) {
          console.warn('Failed to add logo:', error)
          resolve(false)
        }
      }
      reader.onerror = () => resolve(false)
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.warn('Failed to fetch logo:', error)
    return false
  }
}

// Translation dictionary
export const translations = {
  en: {
    invoice: 'Invoice',
    invoiceNumber: 'Invoice Number',
    date: 'Date',
    dueDate: 'Due Date',
    billTo: 'Bill To',
    item: 'Item',
    description: 'Description',
    qtyHour: 'Qty/Hour',
    rate: 'Rate',
    total: 'Total',
    subtotal: 'Subtotal',
    tax: 'Tax',
    totalAmountDue: 'Total Amount Due',
    termsAndConditions: 'Terms & Conditions',
    nameAndSignature: 'Name and Signature',
    professionalServices: 'Professional Services',
    qualityExcellence: 'Quality & Excellence',
    noServicesProvided: 'No services provided'
  },
  ar: {
    invoice: 'فاتورة',
    invoiceNumber: 'رقم الفاتورة',
    date: 'التاريخ',
    dueDate: 'تاريخ الاستحقاق',
    billTo: 'الفاتورة إلى',
    item: 'البند',
    description: 'الوصف',
    qtyHour: 'الكمية/ساعة',
    rate: 'السعر',
    total: 'المجموع',
    subtotal: 'المجموع الفرعي',
    tax: 'الضريبة',
    totalAmountDue: 'المبلغ المستحق',
    termsAndConditions: 'الشروط والأحكام',
    nameAndSignature: 'الاسم والتوقيع',
    professionalServices: 'الخدمات المهنية',
    qualityExcellence: 'الجودة والتميز',
    noServicesProvided: 'لم يتم تقديم خدمات'
  }
}

// Get translation
export function t(key: keyof typeof translations.en, locale: string = 'en'): string {
  return translations[locale as keyof typeof translations]?.[key] || translations.en[key]
}
