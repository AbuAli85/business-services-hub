import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import puppeteer from 'puppeteer'

async function generatePDF(invoice: any): Promise<Buffer> {
  // Professional HTML invoice template
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

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      line-height: 1.4; 
      color: #333; 
      background: #fff;
      padding: 20px;
    }
    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      background: #fff;
      border: 1px solid #e0e0e0;
    }
    .header {
      background: #2c5aa0;
      color: white;
      padding: 30px;
      position: relative;
    }
    .header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100px;
      height: 100%;
      background: linear-gradient(45deg, #1e3a8a, #3b82f6);
      clip-path: polygon(0 0, 100% 0, 80% 100%, 0% 100%);
    }
    .header-content {
      position: relative;
      z-index: 2;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .company-info h1 {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 5px;
    }
    .company-info p {
      font-size: 14px;
      opacity: 0.9;
    }
    .invoice-title {
      text-align: right;
    }
    .invoice-title h2 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 5px;
    }
    .invoice-number {
      font-size: 16px;
      opacity: 0.9;
    }
    .main-content {
      padding: 40px 30px;
    }
    .invoice-details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-bottom: 40px;
    }
    .bill-to, .from {
      background: #f8f9fa;
      padding: 20px;
      border-left: 4px solid #2c5aa0;
    }
    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: #2c5aa0;
      margin-bottom: 15px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .contact-info {
      font-size: 14px;
      line-height: 1.6;
    }
    .contact-info p {
      margin-bottom: 5px;
    }
    .contact-info strong {
      color: #333;
    }
    .invoice-meta {
      background: #f8f9fa;
      padding: 20px;
      margin-bottom: 30px;
      border-radius: 4px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 20px;
    }
    .meta-item {
      text-align: center;
    }
    .meta-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 5px;
    }
    .meta-value {
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }
    .services-section {
      margin: 30px 0;
    }
    .services-title {
      font-size: 18px;
      font-weight: 600;
      color: #333;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #2c5aa0;
    }
    .services-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    .services-table th {
      background: #2c5aa0;
      color: white;
      padding: 15px 10px;
      text-align: left;
      font-weight: 600;
      font-size: 14px;
    }
    .services-table td {
      padding: 15px 10px;
      border-bottom: 1px solid #e0e0e0;
      font-size: 14px;
    }
    .services-table tr:nth-child(even) {
      background: #f8f9fa;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .total-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 30px;
    }
    .total-box {
      background: #2c5aa0;
      color: white;
      padding: 20px 30px;
      border-radius: 4px;
      min-width: 250px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      font-size: 14px;
    }
    .total-row.final {
      font-size: 18px;
      font-weight: 700;
      border-top: 2px solid rgba(255,255,255,0.3);
      padding-top: 10px;
      margin-top: 10px;
    }
    .payment-info {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 4px;
      margin-bottom: 30px;
    }
    .payment-title {
      font-size: 16px;
      font-weight: 600;
      color: #2c5aa0;
      margin-bottom: 15px;
    }
    .payment-details {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
    }
    .payment-item {
      font-size: 14px;
    }
    .payment-item strong {
      color: #333;
    }
    .notes-section {
      margin: 30px 0;
    }
    .notes-title {
      font-size: 16px;
      font-weight: 600;
      color: #2c5aa0;
      margin-bottom: 15px;
    }
    .notes-content {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 4px;
      border-left: 4px solid #2c5aa0;
      font-size: 14px;
      line-height: 1.6;
    }
    .footer {
      background: #333;
      color: white;
      padding: 30px;
      text-align: center;
    }
    .footer h3 {
      font-size: 20px;
      margin-bottom: 15px;
    }
    .footer p {
      font-size: 14px;
      opacity: 0.8;
      margin-bottom: 5px;
    }
    .status-badge {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .status-issued {
      background: #3498db;
      color: white;
    }
    .status-paid {
      background: #27ae60;
      color: white;
    }
    .status-overdue {
      background: #e74c3c;
      color: white;
    }
    @media print {
      body { padding: 0; }
      .invoice-container { border: none; }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <!-- Header -->
    <div class="header">
      <div class="header-content">
        <div class="company-info">
          <h1>Business Services Hub</h1>
          <p>Professional Services & Solutions</p>
        </div>
        <div class="invoice-title">
          <h2>INVOICE</h2>
          <div class="invoice-number">${invoiceNumber}</div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="main-content">
      <!-- Invoice Meta Information -->
      <div class="invoice-meta">
        <div class="meta-grid">
          <div class="meta-item">
            <div class="meta-label">Invoice Date</div>
            <div class="meta-value">${createdDate}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Due Date</div>
            <div class="meta-value">${dueDate}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Status</div>
            <div class="meta-value">
              <span class="status-badge status-${invoice.status}">${invoice.status.toUpperCase()}</span>
            </div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Invoice ID</div>
            <div class="meta-value">${invoice.id.slice(-8).toUpperCase()}</div>
          </div>
        </div>
      </div>

      <!-- Bill To / From Information -->
      <div class="invoice-details">
        <div class="bill-to">
          <div class="section-title">Bill To:</div>
          <div class="contact-info">
            <p><strong>${invoice.booking?.client?.full_name || 'Client Name'}</strong></p>
            <p>${invoice.booking?.client?.company?.name || 'Client Company'}</p>
            <p>${invoice.booking?.client?.email || 'client@email.com'}</p>
            <p>123 Client Street, Any City, State 12345</p>
          </div>
        </div>
        <div class="from">
          <div class="section-title">From:</div>
          <div class="contact-info">
            <p><strong>Business Services Hub</strong></p>
            <p>123 Business Street, Suite 100</p>
            <p>City, State 12345</p>
            <p>info@businessservices.com</p>
            <p>+1 (555) 123-4567</p>
          </div>
        </div>
      </div>

      <!-- Services Section -->
      <div class="services-section">
        <h3 class="services-title">For Services Rendered</h3>
        <table class="services-table">
          <thead>
            <tr>
              <th>DESCRIPTION</th>
              <th class="text-center">QTY</th>
              <th class="text-right">UNIT PRICE</th>
              <th class="text-right">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>${invoice.booking?.service?.title || 'Professional Service'}</strong><br>
                <span style="color: #666; font-size: 12px;">${invoice.booking?.service?.description || 'High-quality professional service delivered with excellence and attention to detail.'}</span>
              </td>
              <td class="text-center">1</td>
              <td class="text-right">${invoice.amount} ${invoice.currency}</td>
              <td class="text-right"><strong>${invoice.amount} ${invoice.currency}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Total Section -->
      <div class="total-section">
        <div class="total-box">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>${invoice.amount} ${invoice.currency}</span>
          </div>
          <div class="total-row">
            <span>Tax (0%):</span>
            <span>0.00 ${invoice.currency}</span>
          </div>
          <div class="total-row final">
            <span>TOTAL:</span>
            <span>${invoice.amount} ${invoice.currency}</span>
          </div>
        </div>
      </div>

      <!-- Payment Information -->
      <div class="payment-info">
        <h4 class="payment-title">Payment Information</h4>
        <div class="payment-details">
          <div class="payment-item">
            <strong>Payment Methods:</strong><br>
            Credit Card, Bank Transfer, PayPal
          </div>
          <div class="payment-item">
            <strong>Payment Terms:</strong><br>
            Net 30 days from invoice date
          </div>
          <div class="payment-item">
            <strong>Late Payment:</strong><br>
            1.5% monthly service charge
          </div>
          <div class="payment-item">
            <strong>Questions:</strong><br>
            billing@businessservices.com
          </div>
        </div>
      </div>

      <!-- Notes Section -->
      <div class="notes-section">
        <h4 class="notes-title">Notes</h4>
        <div class="notes-content">
          <p>Payment is due within 30 days of invoice date. Late payments may incur additional charges as specified above. All services are subject to our standard terms and conditions.</p>
          <p><strong>Thank you for your business!</strong></p>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <h3>Business Services Hub</h3>
      <p>123 Business Street, Suite 100, City, State 12345</p>
      <p>Phone: +1 (555) 123-4567 | Email: info@businessservices.com</p>
      <p>Website: www.businessservices.com</p>
      <p>Generated on ${new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}</p>
    </div>
  </div>
</body>
</html>
  `

  try {
    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    
    const page = await browser.newPage()
    
    // Set content and wait for it to load
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' })
    
    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    })
    
    await browser.close()
    
    return pdfBuffer
  } catch (error) {
    console.error('PDF generation error:', error)
    // Fallback to HTML content if PDF generation fails
    return Buffer.from(htmlContent, 'utf-8')
  }
}

export async function POST(request: NextRequest) {
  try {
    const { invoiceId } = await request.json()
    
    console.log('🔍 PDF generation request for invoice:', invoiceId)
    
    if (!invoiceId) {
      console.error('❌ No invoice ID provided')
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 })
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(invoiceId)) {
      console.error('❌ Invalid invoice ID format:', invoiceId)
      return NextResponse.json({ error: 'Invalid invoice ID format' }, { status: 400 })
    }

    // Create Supabase client with service role for API access
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase credentials')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Check if this is a virtual invoice (starts with 'virtual-')
    if (invoiceId.startsWith('virtual-')) {
      console.log('📄 Generating virtual invoice PDF')
      const pdfUrl = `/api/invoices/pdf/${invoiceId}.pdf`
      return NextResponse.json({ 
        success: true, 
        pdfUrl,
        message: 'Virtual invoice PDF generated successfully' 
      })
    }
    
    console.log('🔍 Fetching invoice from database...')
    
    // Get the invoice details from database with full relationships
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        booking:bookings(
          id,
          status,
          requirements,
          service:services(
            id,
            title,
            description,
            provider:profiles!services_provider_id_fkey(
              id,
              full_name,
              email,
              company:companies(
                id,
                name,
                logo_url
              )
            )
          ),
          client:profiles!bookings_client_id_fkey(
            id,
            full_name,
            email,
            company:companies(
              id,
              name,
              logo_url
            )
          )
        )
      `)
      .eq('id', invoiceId)
      .single()

    if (invoiceError) {
      console.error('❌ Database error:', invoiceError)
      console.error('❌ Error details:', {
        message: invoiceError.message,
        details: invoiceError.details,
        hint: invoiceError.hint,
        code: invoiceError.code
      })
      return NextResponse.json({ 
        error: 'Database error', 
        details: invoiceError.message,
        code: invoiceError.code
      }, { status: 500 })
    }

    if (!invoice) {
      console.error('❌ Invoice not found in database:', invoiceId)
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    console.log('✅ Invoice found:', invoice.id, invoice.invoice_number)
    console.log('📄 Invoice data:', {
      id: invoice.id,
      amount: invoice.amount,
      currency: invoice.currency,
      status: invoice.status,
      invoice_number: invoice.invoice_number
    })

    try {
      // Generate professional PDF using Puppeteer
      const pdfContent = await generatePDF(invoice)
      
      console.log('✅ PDF content generated, size:', pdfContent.length, 'bytes')
      
      // Update the invoice with the PDF URL (optional, don't fail if this doesn't work)
      const pdfUrl = `/api/invoices/pdf/${invoiceId}.pdf`
      const { error: updateError } = await supabase
        .from('invoices')
        .update({ pdf_url: pdfUrl })
        .eq('id', invoiceId)

      if (updateError) {
        console.warn('⚠️ Failed to update invoice with PDF URL:', updateError)
        // Don't fail the request if PDF URL update fails
      } else {
        console.log('✅ PDF URL updated successfully')
      }

      // Return the actual PDF content
      return new NextResponse(pdfContent, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="invoice-${invoice.invoice_number || invoiceId}.pdf"`,
        },
      })
    } catch (pdfError) {
      console.error('❌ PDF generation error:', pdfError)
      return NextResponse.json({ 
        error: 'PDF generation failed', 
        details: pdfError instanceof Error ? pdfError.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
