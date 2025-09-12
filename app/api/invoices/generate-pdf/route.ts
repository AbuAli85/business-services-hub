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

  // Logo in top-left with file type validation
  if (companyLogoUrl && (companyLogoUrl.endsWith('.png') || companyLogoUrl.endsWith('.jpg') || companyLogoUrl.endsWith('.jpeg'))) {
    try {
      const logoResponse = await fetch(companyLogoUrl)
      if (logoResponse.ok) {
        const logoBuffer = await logoResponse.arrayBuffer()
        const logoBase64 = Buffer.from(logoBuffer).toString('base64')
        const fileExtension = companyLogoUrl.split('.').pop()?.toUpperCase() || 'PNG'
        doc.addImage(`data:image/${fileExtension.toLowerCase()};base64,${logoBase64}`, fileExtension, 20, 10, 40, 30)
      } else {
        throw new Error(`Logo fetch failed: ${logoResponse.status}`)
      }
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

  // Enhanced invoice info box - clean professional layout
  doc.setFillColor(248, 250, 252) // Light gray background
  doc.rect(130, 10, 70, 35, 'F')
  doc.setDrawColor(accent[0], accent[1], accent[2])
  doc.setLineWidth(1.5)
  doc.rect(130, 10, 70, 35, 'S')

  // Invoice title and details - right aligned
  doc.setTextColor(accent[0], accent[1], accent[2])
  doc.setFontSize(16).setFont('helvetica', 'bold').text('INVOICE', 195, 18, { align: 'right' })
  doc.setFontSize(10).setFont('helvetica', 'normal')
  doc.text(`#${invoiceNumber}`, 195, 24, { align: 'right' })
  doc.text(`Issued: ${createdDate}`, 195, 30, { align: 'right' })
  doc.text(`Due: ${dueDate}`, 195, 36, { align: 'right' })

  // Status badge - pill-shaped inside the box
  const status = invoice.status || 'pending'
  const statusColors = {
    paid: success,
    pending: warning,
    overdue: [220, 38, 38], // Red
    draft: gray
  }
  const color = statusColors[status as keyof typeof statusColors] || accent
  
  // Pill-shaped status badge
  doc.setFillColor(color[0], color[1], color[2])
  doc.roundedRect(160, 38, 35, 6, 3, 3, 'F')
  
  // Status text
  doc.setTextColor(white[0], white[1], white[2])
  doc.setFontSize(8).setFont('helvetica', 'bold')
  doc.text(status.toUpperCase(), 177, 42, { align: 'center' })

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
  
  // Dynamic column widths (percentage-based)
  const colWidths = {
    desc: 90,    // Description column width
    qty: 20,     // Quantity column width
    rate: 30,    // Rate column width
    amount: 30   // Amount column width
  }
  
  // Calculate column positions
  const colPositions = {
    desc: tableX + 5,
    qty: tableX + colWidths.desc + 5,
    rate: tableX + colWidths.desc + colWidths.qty + 5,
    amount: tableX + colWidths.desc + colWidths.qty + colWidths.rate + 5
  }
  
  // Table header with professional styling
  // Items table header with stronger borders
  doc.setFillColor(accent[0], accent[1], accent[2])
  doc.rect(tableX, y, tableWidth, 12, 'F')
  doc.setDrawColor(accent[0], accent[1], accent[2])
  doc.setLineWidth(1)
  doc.rect(tableX, y, tableWidth, 12, 'S')
  
  doc.setTextColor(white[0], white[1], white[2])
  doc.setFontSize(11).setFont('helvetica', 'bold')
  doc.text('Description', colPositions.desc, y + 8)
  doc.text('Qty', colPositions.qty + colWidths.qty/2, y + 8, { align: 'center' })
  doc.text('Rate', colPositions.rate + colWidths.rate, y + 8, { align: 'right' })
  doc.text('Amount', colPositions.amount + colWidths.amount, y + 8, { align: 'right' })

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

    // Handle long descriptions with text wrapping
    const itemTitle = item.title || 'Item'
    const wrappedTitle = doc.splitTextToSize(itemTitle, colWidths.desc - 10)
    
    // Calculate consistent row height
    const baseRowHeight = 12
    const lineHeight = 4
    const titleLines = wrappedTitle.length
    const rowHeight = Math.max(baseRowHeight, titleLines * lineHeight)
    
    // Alternating row colors with clear borders
    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252) // Very light gray
      doc.rect(tableX, y - 1, tableWidth, rowHeight + 2, 'F')
    }

    // Add row border with stronger lines
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2])
    doc.setLineWidth(0.8)
    doc.rect(tableX, y - 1, tableWidth, rowHeight + 2, 'S')

    // Add item row with proper alignment and dynamic positioning
    let currentY = y + 5
    wrappedTitle.forEach((line: string, lineIndex: number) => {
      doc.text(line, colPositions.desc, currentY + (lineIndex * lineHeight))
    })
    
    // Position quantity, rate, and amount with perfect alignment
    doc.text(qty.toString(), colPositions.qty + colWidths.qty/2, y + 5, { align: 'center' })
    doc.text(fmtCurrency(price), colPositions.rate + colWidths.rate - 3, y + 5, { align: 'right' })
    doc.text(fmtCurrency(amount), colPositions.amount + colWidths.amount - 3, y + 5, { align: 'right' })
    
    // Add description if available and not too long
    if (item.description && item.description !== item.title) {
      const wrappedDesc = doc.splitTextToSize(item.description, colWidths.desc - 10)
      doc.setFontSize(8)
      wrappedDesc.forEach((line: string, lineIndex: number) => {
        doc.text(line, colPositions.desc, currentY + (titleLines + lineIndex + 1) * lineHeight)
      })
      doc.setFontSize(10)
    }
    
    y += rowHeight + 2
    
    // Page break if needed
    if (y > 250) {
      doc.addPage()
      y = 40
      // Redraw table header on new page
      doc.setFillColor(accent[0], accent[1], accent[2])
      doc.rect(tableX, y, tableWidth, 12, 'F')
      doc.setTextColor(white[0], white[1], white[2])
      doc.setFontSize(11).setFont('helvetica', 'bold')
      doc.text('Description', colPositions.desc, y + 8)
      doc.text('Qty', colPositions.qty + colWidths.qty/2, y + 8, { align: 'center' })
      doc.text('Rate', colPositions.rate + colWidths.rate, y + 8, { align: 'right' })
      doc.text('Amount', colPositions.amount + colWidths.amount, y + 8, { align: 'right' })
      y += 15
      doc.setTextColor(gray[0], gray[1], gray[2])
      doc.setFontSize(10).setFont('helvetica', 'normal')
    }
  })

  // Add table border
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2])
  doc.setLineWidth(1)
  doc.rect(tableX, 110, tableWidth, y - 110)

  // === Integrated Totals Section ===
  // Seamless integration with table
  const totalsX = 120
  const totalsWidth = 70

  // Totals background box
  doc.setFillColor(248, 250, 252) // Light gray
  doc.rect(totalsX, y + 5, totalsWidth, 35, 'F')
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2])
  doc.setLineWidth(1)
  doc.rect(totalsX, y + 5, totalsWidth, 35, 'S')

  // Subtotal line
  doc.setTextColor(gray[0], gray[1], gray[2])
  doc.setFontSize(11).setFont('helvetica', 'bold').text('Subtotal:', totalsX + 5, y + 15)
  doc.setFont('helvetica', 'normal').text(fmtCurrency(subtotal), totalsX + totalsWidth - 5, y + 15, { align: 'right' })

  // Tax line
  if (taxAmount > 0) {
    doc.setFont('helvetica', 'bold').text(`Tax (${taxRate}%):`, totalsX + 5, y + 22)
    doc.setFont('helvetica', 'normal').text(fmtCurrency(taxAmount), totalsX + totalsWidth - 5, y + 22, { align: 'right' })
  }

  // Discount line (if applicable)
  const discountAmount = invoice.discount_amount || 0
  if (discountAmount > 0) {
    doc.setFont('helvetica', 'bold').text('Discount:', totalsX + 5, y + 29)
    doc.setFont('helvetica', 'normal').text(`-${fmtCurrency(discountAmount)}`, totalsX + totalsWidth - 5, y + 29, { align: 'right' })
  }

  // Separator line
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2])
  doc.setLineWidth(1)
  doc.line(totalsX + 5, y + 32, totalsX + totalsWidth - 5, y + 32)

  // Total line with enhanced emphasis - dark navy background
  doc.setFillColor(primary[0], primary[1], primary[2])
  doc.rect(totalsX + 2, y + 34, totalsWidth - 4, 6, 'F')
  doc.setTextColor(white[0], white[1], white[2])
  doc.setFontSize(12).setFont('helvetica', 'bold')
  doc.text('TOTAL', totalsX + 5, y + 38)
  doc.text(fmtCurrency(total), totalsX + totalsWidth - 5, y + 38, { align: 'right' })

  // === Enhanced Footer ===
  // Top border line
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2])
  doc.setLineWidth(1)
  doc.line(20, y + 50, 190, y + 50)

  // Footer background
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2])
  doc.rect(0, y + 50, 210, 25, 'F')

  // QR Code section (aligned with totals box)
  try {
    const qrText = invoice.payment_url || 
      `Invoice ${invoiceNumber}, Total: ${fmtCurrency(total)}`
    const qrDataUrl = await QRCode.toDataURL(qrText, { width: 80 })
    doc.addImage(qrDataUrl, 'PNG', 20, y + 55, 20, 20)
    doc.setTextColor(gray[0], gray[1], gray[2])
    doc.setFontSize(8).setFont('helvetica', 'normal')
    doc.text('Scan to Pay', 25, y + 78)
  } catch (error) {
    console.warn('Failed to generate QR code:', error)
  }

  // Thank you message (centered)
  doc.setTextColor(gray[0], gray[1], gray[2])
  doc.setFontSize(12).setFont('helvetica', 'bold')
  doc.text('Thank you for your business!', 105, y + 65, { align: 'center' })
  
  // Compliance information (right-aligned, smaller font)
  doc.setFontSize(7).setFont('helvetica', 'normal')
  if (vatNumber) {
    doc.text(`VAT: ${vatNumber}`, 190, y + 60, { align: 'right' })
  }
  if (crNumber) {
    doc.text(`CR: ${crNumber}`, 190, y + 65, { align: 'right' })
  }
  doc.text('This invoice is valid without signature', 190, y + 70, { align: 'right' })
  
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

    // Upload PDF to Supabase Storage for caching
    const invoiceNumber = invoice.invoice_number || `INV-${invoice.id.slice(-8).toUpperCase()}`
    const fileName = `invoice-${invoiceNumber}.pdf`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: true
      })

    let pdfUrl = `/api/invoices/pdf/${invoiceId}` // Fallback URL
    
    if (uploadError) {
      console.warn('⚠️ Could not upload PDF to storage:', uploadError.message)
    } else {
      // Get public URL from storage
      const { data: urlData } = supabase.storage
        .from('invoices')
        .getPublicUrl(fileName)
      pdfUrl = urlData.publicUrl
      console.log('✅ PDF uploaded to storage:', pdfUrl)
    }

    // Store PDF URL in database
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
