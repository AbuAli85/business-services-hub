import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { jsPDF } from 'jspdf'

function generateSimplePDF(invoice: any): Uint8Array {
  // Use the same professional PDF generation logic as the generate-pdf API
  const invoiceNumber = invoice.invoice_number || `INV-${invoice.id.slice(-8).toUpperCase()}`
  const createdDate = new Date(invoice.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  
  const dueDate = invoice.due_date ? 
    new Date(invoice.due_date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : 
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

  // Create a new PDF document
  const doc = new jsPDF('p', 'mm', 'a4')
  
  // Professional color palette
  const primary = [15, 23, 42]   // Navy
  const accent = [59, 130, 246]  // Blue
  const success = [16, 185, 129] // Green
  const warning = [245, 158, 11] // Orange
  const white = [255, 255, 255]
  const gray = [71, 85, 105]
  const lightGray = [248, 250, 252]

  // Helper formatters
  const fmtCurrency = (value: number) => {
    try {
      return new Intl.NumberFormat('en-OM', { 
        style: 'currency', 
        currency: invoice.currency || 'OMR' 
      }).format(value)
    } catch {
      return `${invoice.currency || 'OMR'} ${value.toFixed(2)}`
    }
  }

  // Get company information
  const companyName = invoice.providers?.company_name || 'Business Services Hub'
  const companyAddress = '123 Business Street, Suite 100, City, State 12345'
  const companyPhone = '(555) 555-5555'
  const companyEmail = 'info@businessservices.com'

  // Get client information
  const clientName = invoice.clients?.full_name || 'Client Name'
  const clientCompany = 'Client Company'
  const clientEmail = invoice.clients?.email || 'client@email.com'

  // Calculate financial breakdown
  const subtotal = invoice.subtotal || invoice.amount || 0
  const taxRate = invoice.tax_rate || 0
  const taxAmount = invoice.tax_amount || (subtotal * taxRate / 100)
  const total = invoice.total_amount || (subtotal + taxAmount)

  // Set default font
  doc.setFont('helvetica')
  
  // === Header ===
  doc.setFillColor(primary[0], primary[1], primary[2])
  doc.rect(0, 0, 210, 40, 'F')

  // Logo placeholder (can be enhanced with actual logo)
  doc.setTextColor(accent[0], accent[1], accent[2])
  doc.setFontSize(14).setFont('helvetica', 'bold')
  doc.text('LOGO', 25, 25)

  // Company Name & Contact
  doc.setTextColor(white[0], white[1], white[2])
  doc.setFontSize(18).setFont('helvetica', 'bold')
  doc.text(companyName, 60, 20)

  doc.setFontSize(10).setFont('helvetica', 'normal')
  doc.text(companyAddress, 60, 27)
  doc.text(`${companyPhone} | ${companyEmail}`, 60, 33)

  // Invoice box
  doc.setFillColor(white[0], white[1], white[2])
  doc.rect(140, 10, 60, 25, 'F')
  doc.setDrawColor(accent[0], accent[1], accent[2])
  doc.rect(140, 10, 60, 25, 'S')

  doc.setTextColor(accent[0], accent[1], accent[2])
  doc.setFontSize(16).setFont('helvetica', 'bold').text('INVOICE', 150, 20)
  doc.setFontSize(10).setFont('helvetica', 'normal')
  doc.text(`#${invoiceNumber}`, 150, 27)
  doc.text(`Issued: ${createdDate}`, 150, 32)
  doc.text(`Due: ${dueDate}`, 150, 37)

  // Status badge
  const status = invoice.status || 'pending'
  const color = status === 'paid' ? success : status === 'overdue' ? warning : accent
  doc.setFillColor(color[0], color[1], color[2])
  doc.rect(140, 38, 25, 6, 'F')
  doc.setTextColor(white[0], white[1], white[2])
  doc.setFontSize(8).setFont('helvetica', 'bold')
  doc.text(status.toUpperCase(), 142, 42)

  // === Client Section ===
  doc.setTextColor(primary[0], primary[1], primary[2])
  doc.setFontSize(12).setFont('helvetica', 'bold').text('Bill To:', 20, 60)

  doc.setFontSize(10).setFont('helvetica', 'normal')
  doc.text(clientName, 20, 68)
  if (clientCompany) doc.text(clientCompany, 20, 74)
  if (clientEmail) doc.text(clientEmail, 20, 80)

  // === Items Table ===
  let y = 100
  doc.setFillColor(accent[0], accent[1], accent[2])
  doc.rect(20, y, 170, 10, 'F')
  doc.setTextColor(white[0], white[1], white[2])
  doc.setFontSize(10).setFont('helvetica', 'bold')
  doc.text('Description', 25, y + 7)
  doc.text('Qty', 120, y + 7)
  doc.text('Rate', 140, y + 7)
  doc.text('Amount', 160, y + 7)

  y += 12
  doc.setTextColor(gray[0], gray[1], gray[2])
  doc.setFontSize(10).setFont('helvetica', 'normal')

  // Support multiple invoice items or fallback to single service
  const items = invoice.invoice_items?.length ? invoice.invoice_items : [{
    description: invoice.bookings?.services?.description || 'Service',
    title: invoice.bookings?.services?.title || invoice.bookings?.title || 'Service Item',
    qty: 1,
    price: invoice.amount || 0,
  }]

  items.forEach((item: any) => {
    const qty = item.qty || 1
    const price = item.price || item.rate || 0
    const amount = qty * price

    doc.text(item.title || 'Item', 25, y)
    doc.text(qty.toString(), 122, y)
    doc.text(fmtCurrency(price), 140, y)
    doc.text(fmtCurrency(amount), 160, y)
    y += 8
  })

  // === Totals ===
  y += 10
  doc.setFont('helvetica', 'bold').text('Subtotal:', 140, y)
  doc.setFont('helvetica', 'normal').text(fmtCurrency(subtotal), 185, y, { align: 'right' })

  if (taxAmount > 0) {
    y += 6
    doc.setFont('helvetica', 'bold').text('Tax:', 140, y)
    doc.setFont('helvetica', 'normal').text(fmtCurrency(taxAmount), 185, y, { align: 'right' })
  }

  y += 8
  doc.setFillColor(primary[0], primary[1], primary[2])
  doc.rect(120, y - 5, 70, 10, 'F')
  doc.setTextColor(white[0], white[1], white[2])
  doc.setFontSize(12).setFont('helvetica', 'bold')
  doc.text('TOTAL', 125, y + 2)
  doc.text(fmtCurrency(total), 185, y + 2, { align: 'right' })

  // === Footer ===
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2])
  doc.rect(0, 270, 210, 20, 'F')
  doc.setTextColor(gray[0], gray[1], gray[2])
  doc.setFontSize(9).setFont('helvetica', 'normal')
  doc.text('Thank you for your business!', 20, 278)
  
  // Add VAT/CR numbers if available
  const providerCompany = invoice.providers
  if (providerCompany?.vat_number) {
    doc.text(`VAT No: ${providerCompany.vat_number}`, 150, 278)
  }
  if (providerCompany?.cr_number) {
    doc.text(`CR No: ${providerCompany.cr_number}`, 150, 283)
  }
  
  const arrayBuffer = doc.output('arraybuffer') as ArrayBuffer
  return new Uint8Array(arrayBuffer)
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoiceId = params.id.replace('.pdf', '')
    
    // Use service role key for elevated permissions
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get the invoice details from database
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        bookings:booking_id (
          id,
          title,
          subtotal,
          currency,
          services:service_id (
            title,
            description
          )
        ),
        clients:client_id (
          full_name,
          email,
          phone
        ),
        providers:provider_id (
          full_name,
          email,
          phone,
          company_name
        )
      `)
      .eq('id', invoiceId)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Generate PDF
    const pdfBuffer = generateSimplePDF(invoice)

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoice.invoice_number || invoiceId}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })

  } catch (error) {
    console.error('Error generating invoice PDF:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
