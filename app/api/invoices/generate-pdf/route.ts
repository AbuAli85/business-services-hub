import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import { Buffer } from 'node:buffer'

async function generateProfessionalPDF(invoice: any): Promise<Uint8Array> {
  // Create an enterprise-grade professional PDF invoice
  const invoiceNumber = invoice.invoice_number || `INV-${invoice.id.slice(-8).toUpperCase()}`
  const createdDate = new Date(invoice.created_at).toLocaleDateString('en-GB')
  const dueDate = new Date(invoice.due_date || Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB')

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
  const borderGray = [226, 232, 240] // Slate-200

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

  // Get company information with proper fallbacks
  const providerCompany = invoice.booking?.service?.provider?.company || 
    (invoice.provider as any)?.company || {}
  
  const companyName = providerCompany.name || 'Business Services Hub'
  const companyAddress = providerCompany.address || '123 Business Street, Suite 100, City, State 12345'
  const companyPhone = providerCompany.phone || '(555) 555-5555'
  const companyEmail = providerCompany.email || 'info@businessservices.com'
  const companyLogoUrl = providerCompany.logo_url
  const vatNumber = providerCompany.vat_number
  const crNumber = providerCompany.cr_number

  // Get client information
  const clientName = (invoice.client as any)?.full_name || invoice.booking?.client?.full_name || 'Client Name'
  const clientCompany = (invoice.client as any)?.company?.name || invoice.booking?.client?.company?.name || 'Client Company'
  const clientEmail = (invoice.client as any)?.email || invoice.booking?.client?.email || 'client@email.com'

  // Calculate financial breakdown
  const subtotal = invoice.subtotal || invoice.amount || 0
  const taxRate = invoice.tax_rate || 0
  const taxAmount = invoice.tax_amount || (subtotal * taxRate / 100)
  const total = invoice.total_amount || (subtotal + taxAmount)

  // Set default font
  doc.setFont('helvetica')
  
  // === Professional Header ===
  doc.setFillColor(primary[0], primary[1], primary[2])
  doc.rect(0, 0, 210, 50, 'F')

  // Logo in top-left
  if (companyLogoUrl) {
    try {
      const logoResponse = await fetch(companyLogoUrl)
      const logoBuffer = await logoResponse.arrayBuffer()
      const logoBase64 = Buffer.from(logoBuffer).toString('base64')
      doc.addImage(`data:image/png;base64,${logoBase64}`, 'PNG', 20, 10, 40, 30)
    } catch (error) {
      console.warn('Failed to load company logo:', error)
      // Fallback to text logo
      doc.setTextColor(accent[0], accent[1], accent[2])
      doc.setFontSize(16).setFont('helvetica', 'bold')
      doc.text('LOGO', 30, 30)
    }
  } else {
    // Text logo placeholder
    doc.setTextColor(accent[0], accent[1], accent[2])
    doc.setFontSize(16).setFont('helvetica', 'bold')
    doc.text('LOGO', 30, 30)
  }

  // Company Name & Tagline below logo
  doc.setTextColor(white[0], white[1], white[2])
  doc.setFontSize(20).setFont('helvetica', 'bold')
  doc.text(companyName, 70, 20)
  doc.setFontSize(12).setFont('helvetica', 'normal')
  doc.text('Professional Services & Solutions', 70, 26)
  
  // Company contact info
  doc.setFontSize(10).setFont('helvetica', 'normal')
  doc.text(companyAddress, 70, 32)
  doc.text(`${companyPhone} | ${companyEmail}`, 70, 38)

  // Invoice info box - top right
  doc.setFillColor(white[0], white[1], white[2])
  doc.rect(130, 10, 70, 35, 'F')
  doc.setDrawColor(accent[0], accent[1], accent[2])
  doc.setLineWidth(1)
  doc.rect(130, 10, 70, 35, 'S')

  doc.setTextColor(accent[0], accent[1], accent[2])
  doc.setFontSize(18).setFont('helvetica', 'bold').text('INVOICE', 145, 20)
  doc.setFontSize(11).setFont('helvetica', 'normal')
  doc.text(`#${invoiceNumber}`, 135, 28)
  doc.text(`Issued: ${createdDate}`, 135, 33)
  doc.text(`Due: ${dueDate}`, 135, 38)

  // Status badge
  const status = invoice.status || 'pending'
  const color = status === 'paid' ? success : status === 'overdue' ? warning : accent
  doc.setFillColor(color[0], color[1], color[2])
  doc.rect(135, 40, 30, 8, 'F')
  doc.setTextColor(white[0], white[1], white[2])
  doc.setFontSize(9).setFont('helvetica', 'bold')
  doc.text(status.toUpperCase(), 140, 45)

  // === Two-Column Provider & Client Section ===
  // Provider section (left)
  doc.setTextColor(primary[0], primary[1], primary[2])
  doc.setFontSize(12).setFont('helvetica', 'bold').text('From:', 20, 70)
  doc.setFontSize(10).setFont('helvetica', 'normal')
  doc.text(companyName, 20, 78)
  doc.text(companyAddress, 20, 84)
  doc.text(`${companyPhone} | ${companyEmail}`, 20, 90)

  // Client section (right) with background
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2])
  doc.rect(110, 65, 90, 30, 'F')
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2])
  doc.setLineWidth(1)
  doc.rect(110, 65, 90, 30, 'S')

  doc.setTextColor(primary[0], primary[1], primary[2])
  doc.setFontSize(12).setFont('helvetica', 'bold').text('Bill To:', 115, 75)
  doc.setFontSize(10).setFont('helvetica', 'normal')
  doc.text(clientName, 115, 83)
  if (clientCompany) doc.text(clientCompany, 115, 89)
  if (clientEmail) doc.text(clientEmail, 115, 95)

  // === Professional Items Table ===
  let y = 110
  const tableWidth = 170
  const tableX = 20
  
  // Table header with professional styling
  doc.setFillColor(accent[0], accent[1], accent[2])
  doc.rect(tableX, y, tableWidth, 12, 'F')
  doc.setTextColor(white[0], white[1], white[2])
  doc.setFontSize(11).setFont('helvetica', 'bold')
  doc.text('Description', tableX + 5, y + 8)
  doc.text('Qty', tableX + 100, y + 8, { align: 'center' })
  doc.text('Rate', tableX + 120, y + 8, { align: 'right' })
  doc.text('Amount', tableX + 150, y + 8, { align: 'right' })

  y += 15
  doc.setTextColor(gray[0], gray[1], gray[2])
  doc.setFontSize(10).setFont('helvetica', 'normal')

  // Support multiple invoice items or fallback to single service
  const items = invoice.invoice_items?.length ? invoice.invoice_items : [{
    description: invoice.booking?.service?.description || 'Service',
    title: invoice.booking?.service?.title || 'Service Item',
    qty: 1,
    price: invoice.amount || 0,
  }]

  items.forEach((item: any, index: number) => {
    const qty = item.qty || 1
    const price = item.price || item.rate || 0
    const amount = qty * price

    // Alternating row colors
    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252) // Very light gray
      doc.rect(tableX, y - 3, tableWidth, 12, 'F')
    }

    // Handle long descriptions with text wrapping
    const itemTitle = item.title || 'Item'
    const wrappedTitle = doc.splitTextToSize(itemTitle, 85)
    
    // Add item row with proper alignment
    doc.text(wrappedTitle, tableX + 5, y + 5)
    doc.text(qty.toString(), tableX + 100, y + 5, { align: 'center' })
    doc.text(fmtCurrency(price), tableX + 120, y + 5, { align: 'right' })
    doc.text(fmtCurrency(amount), tableX + 150, y + 5, { align: 'right' })
    
    // Add description if available and not too long
    if (item.description && item.description !== item.title) {
      y += 4
      const wrappedDesc = doc.splitTextToSize(item.description, 85)
      doc.setFontSize(8)
      doc.text(wrappedDesc, tableX + 5, y + 5)
      doc.setFontSize(10)
    }
    
    y += 12
    
    // Page break if needed
    if (y > 250) {
      doc.addPage()
      y = 40
      // Redraw table header on new page
      doc.setFillColor(accent[0], accent[1], accent[2])
      doc.rect(tableX, y, tableWidth, 12, 'F')
      doc.setTextColor(white[0], white[1], white[2])
      doc.setFontSize(11).setFont('helvetica', 'bold')
      doc.text('Description', tableX + 5, y + 8)
      doc.text('Qty', tableX + 100, y + 8, { align: 'center' })
      doc.text('Rate', tableX + 120, y + 8, { align: 'right' })
      doc.text('Amount', tableX + 150, y + 8, { align: 'right' })
      y += 15
      doc.setTextColor(gray[0], gray[1], gray[2])
      doc.setFontSize(10).setFont('helvetica', 'normal')
    }
  })

  // Add table border
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2])
  doc.setLineWidth(1)
  doc.rect(tableX, 110, tableWidth, y - 110)

  // === Professional Totals Section ===
  y += 15
  const totalsX = 120
  const totalsWidth = 70
  const totalsHeight = 40

  // Totals box background
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2])
  doc.rect(totalsX, y, totalsWidth, totalsHeight, 'F')
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2])
  doc.setLineWidth(1)
  doc.rect(totalsX, y, totalsWidth, totalsHeight, 'S')

  // Subtotal
  doc.setTextColor(gray[0], gray[1], gray[2])
  doc.setFontSize(11).setFont('helvetica', 'bold').text('Subtotal:', totalsX + 5, y + 15)
  doc.setFont('helvetica', 'normal').text(fmtCurrency(subtotal), totalsX + 60, y + 15, { align: 'right' })

  // Tax line
  if (taxAmount > 0) {
    doc.setFont('helvetica', 'bold').text(`Tax (${taxRate}%):`, totalsX + 5, y + 25)
    doc.setFont('helvetica', 'normal').text(fmtCurrency(taxAmount), totalsX + 60, y + 25, { align: 'right' })
  }

  // Total line with emphasis
  doc.setFillColor(primary[0], primary[1], primary[2])
  doc.rect(totalsX, y + 30, totalsWidth, 10, 'F')
  doc.setTextColor(white[0], white[1], white[2])
  doc.setFontSize(14).setFont('helvetica', 'bold')
  doc.text('TOTAL', totalsX + 5, y + 37)
  doc.text(fmtCurrency(total), totalsX + 60, y + 37, { align: 'right' })

  // === Professional Footer ===
  // Top border line
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2])
  doc.setLineWidth(1)
  doc.line(20, 260, 190, 260)

  // Footer background
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2])
  doc.rect(0, 260, 210, 30, 'F')

  // QR Code section (left)
  try {
    const qrText = invoice.payment_url || 
      `Invoice ${invoiceNumber}, Total: ${fmtCurrency(total)}`
    const qrDataUrl = await QRCode.toDataURL(qrText, { width: 100 })
    doc.addImage(qrDataUrl, 'PNG', 20, 265, 25, 25)
    doc.setTextColor(gray[0], gray[1], gray[2])
    doc.setFontSize(8).setFont('helvetica', 'normal')
    doc.text('Scan to Pay', 20, 295)
  } catch (error) {
    console.warn('Failed to generate QR code:', error)
  }

  // Thank you message (center-left)
  doc.setTextColor(gray[0], gray[1], gray[2])
  doc.setFontSize(10).setFont('helvetica', 'bold')
  doc.text('Thank you for your business!', 50, 275)
  
  // Compliance information (right)
  doc.setFontSize(8).setFont('helvetica', 'normal')
  if (vatNumber) {
    doc.text(`VAT No: ${vatNumber}`, 150, 275)
  }
  if (crNumber) {
    doc.text(`CR No: ${crNumber}`, 150, 280)
  }
  doc.text('This invoice was generated electronically', 150, 285)
  doc.text('and is valid without signature.', 150, 290)
  
  const arrayBuffer = doc.output('arraybuffer') as ArrayBuffer
  return new Uint8Array(arrayBuffer)
}

export async function POST(request: NextRequest) {
  try {
    const { invoiceId } = await request.json()
    
    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 })
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(invoiceId)) {
      return NextResponse.json({ error: 'Invalid invoice ID format' }, { status: 400 })
    }

    console.log('🔍 Fetching invoice data for ID:', invoiceId)

    // Use service role key for elevated permissions
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch invoice with explicit relationships
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        client:profiles!invoices_client_id_fkey(
          id,
          full_name,
          email,
          company:companies(id, name, address)
        ),
        provider:profiles!invoices_provider_id_fkey(
          id,
          full_name,
          email,
          company:companies(id, name, address, phone, email, logo_url)
        ),
        booking:bookings(
          id,
          service:services(title, description, price)
        )
      `)
      .eq('id', invoiceId)
      .single()

    if (invoiceError) {
      console.error('❌ Database error:', invoiceError)
      return NextResponse.json({ 
        error: 'Database error', 
        details: invoiceError.message 
      }, { status: 500 })
    }

    if (!invoice) {
      console.error('❌ Invoice not found')
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    console.log('✅ Invoice data fetched successfully')

    // Check if PDF already exists and is recent (within 24 hours)
    const shouldRegenerate = !invoice.pdf_url || 
      (invoice.updated_at && new Date(invoice.updated_at) < new Date(Date.now() - 24 * 60 * 60 * 1000))

    if (!shouldRegenerate && invoice.pdf_url) {
      console.log('📄 Using existing PDF:', invoice.pdf_url)
      // Return existing PDF URL
      return NextResponse.json({ 
        pdf_url: invoice.pdf_url,
        message: 'PDF already exists',
        cached: true 
      })
    }

    // Fetch invoice_items
    const { data: items, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoice.id)

    if (itemsError) {
      console.warn('⚠️ Could not load invoice_items; continuing without items:', itemsError.message)
    }

    // Attach items to invoice
    const invoiceForPdf = { ...invoice, invoice_items: items || [] }

    // Generate PDF with error handling
    let pdfBuffer: Uint8Array
    try {
      pdfBuffer = await generateProfessionalPDF(invoiceForPdf)
    } catch (pdfError) {
      console.error('❌ Error generating PDF:', pdfError)
      return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
    }
    
    console.log('✅ PDF generated successfully, size:', pdfBuffer.length, 'bytes')

    // Store PDF URL in database
    const pdfUrl = `/api/invoices/pdf/${invoiceId}`
    const { error: updateError } = await supabase
      .from('invoices')
      .update({ pdf_url: pdfUrl })
      .eq('id', invoiceId)

    if (updateError) {
      console.warn('⚠️ Could not update PDF URL in database:', updateError.message)
    } else {
      console.log('✅ PDF URL stored in database')
    }

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoice.invoice_number || invoiceId}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })

  } catch (error) {
    console.error('❌ PDF generation error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
