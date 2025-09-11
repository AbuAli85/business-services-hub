import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function generateSimplePDF(invoice: any): Buffer {
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
      line-height: 1.6; 
      color: #2c3e50; 
      background: #fff;
      padding: 0;
    }
    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      background: #fff;
      box-shadow: 0 0 30px rgba(0,0,0,0.1);
      border-radius: 12px;
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 50px 40px;
      text-align: center;
    }
    .company-logo {
      font-size: 42px;
      font-weight: 800;
      margin-bottom: 15px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    }
    .company-tagline {
      font-size: 18px;
      opacity: 0.95;
      font-weight: 300;
    }
    .invoice-title {
      background: #f8f9fa;
      padding: 40px;
      border-bottom: 4px solid #667eea;
    }
    .invoice-title h1 {
      font-size: 48px;
      color: #2c3e50;
      margin-bottom: 15px;
      font-weight: 700;
      text-align: center;
    }
    .invoice-number {
      font-size: 24px;
      color: #7f8c8d;
      text-align: center;
      font-weight: 500;
    }
    .content {
      padding: 50px 40px;
    }
    .invoice-details {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 30px;
      margin-bottom: 50px;
    }
    .detail-section {
      background: #f8f9fa;
      padding: 25px;
      border-radius: 12px;
      border-left: 5px solid #667eea;
      box-shadow: 0 4px 6px rgba(0,0,0,0.05);
    }
    .detail-section h3 {
      color: #2c3e50;
      margin-bottom: 20px;
      font-size: 20px;
      font-weight: 600;
      border-bottom: 2px solid #ecf0f1;
      padding-bottom: 10px;
    }
    .detail-item {
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .detail-label {
      font-weight: 600;
      color: #7f8c8d;
      font-size: 14px;
    }
    .detail-value {
      color: #2c3e50;
      font-weight: 500;
      text-align: right;
    }
    .service-section {
      margin: 50px 0;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      padding: 40px;
      border-radius: 15px;
      border: 1px solid #dee2e6;
    }
    .service-title {
      font-size: 28px;
      color: #2c3e50;
      margin-bottom: 25px;
      text-align: center;
      font-weight: 700;
    }
    .service-description {
      background: white;
      padding: 30px;
      border-radius: 12px;
      border-left: 6px solid #667eea;
      margin-bottom: 30px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
    .service-description h3 {
      color: #2c3e50;
      margin-bottom: 15px;
      font-size: 22px;
      font-weight: 600;
    }
    .service-description p {
      color: #5a6c7d;
      line-height: 1.8;
      font-size: 16px;
    }
    .amount-section {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 50px;
      border-radius: 15px;
      text-align: center;
      margin: 50px 0;
    }
    .amount-label {
      font-size: 22px;
      margin-bottom: 15px;
      opacity: 0.95;
      font-weight: 500;
    }
    .amount-value {
      font-size: 64px;
      font-weight: 800;
      margin-bottom: 15px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    }
    .amount-currency {
      font-size: 28px;
      opacity: 0.9;
      font-weight: 600;
    }
    .status-section {
      text-align: center;
      margin: 40px 0;
    }
    .status-badge {
      display: inline-block;
      padding: 15px 35px;
      border-radius: 30px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 2px;
      font-size: 16px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    }
    .status-issued {
      background: linear-gradient(135deg, #3498db, #2980b9);
      color: white;
    }
    .status-paid {
      background: linear-gradient(135deg, #27ae60, #2ecc71);
      color: white;
    }
    .status-overdue {
      background: linear-gradient(135deg, #e74c3c, #c0392b);
      color: white;
    }
    .footer {
      background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
      color: white;
      padding: 50px 40px;
      text-align: center;
    }
    .footer h3 {
      margin-bottom: 20px;
      font-size: 28px;
      font-weight: 700;
    }
    .footer p {
      margin-bottom: 10px;
      opacity: 0.9;
      font-size: 16px;
    }
    .payment-info {
      background: linear-gradient(135deg, #ecf0f1 0%, #bdc3c7 100%);
      padding: 30px;
      border-radius: 12px;
      margin: 30px 0;
      border: 1px solid #bdc3c7;
    }
    .payment-info h4 {
      color: #2c3e50;
      margin-bottom: 20px;
      font-size: 20px;
      font-weight: 600;
    }
    .payment-info p {
      margin-bottom: 10px;
      color: #5a6c7d;
      font-size: 15px;
    }
    .terms {
      margin-top: 40px;
      padding-top: 30px;
      border-top: 2px solid #ecf0f1;
      font-size: 14px;
      color: #7f8c8d;
      line-height: 1.8;
    }
    .terms h4 {
      color: #2c3e50;
      margin-bottom: 15px;
      font-size: 16px;
      font-weight: 600;
    }
    @media print {
      body { padding: 0; }
      .invoice-container { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <!-- Header -->
    <div class="header">
      <div class="company-logo">Business Services Hub</div>
      <div class="company-tagline">Professional Services & Solutions</div>
    </div>

    <!-- Invoice Title -->
    <div class="invoice-title">
      <h1>INVOICE</h1>
      <div class="invoice-number">${invoiceNumber}</div>
    </div>

    <!-- Content -->
    <div class="content">
      <!-- Invoice Details -->
      <div class="invoice-details">
        <div class="detail-section">
          <h3>📋 Invoice Information</h3>
          <div class="detail-item">
            <span class="detail-label">Invoice Date:</span>
            <span class="detail-value">${createdDate}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Due Date:</span>
            <span class="detail-value">${dueDate}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Invoice ID:</span>
            <span class="detail-value">${invoice.id}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Status:</span>
            <span class="detail-value">${invoice.status.toUpperCase()}</span>
          </div>
        </div>

        <div class="detail-section">
          <h3>🏢 Service Provider</h3>
          <div class="detail-item">
            <span class="detail-label">Company:</span>
            <span class="detail-value">Business Services Hub</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Email:</span>
            <span class="detail-value">info@businessservices.com</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Phone:</span>
            <span class="detail-value">+1 (555) 123-4567</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Website:</span>
            <span class="detail-value">www.businessservices.com</span>
          </div>
        </div>

        <div class="detail-section">
          <h3>👤 Client Information</h3>
          <div class="detail-item">
            <span class="detail-label">Client:</span>
            <span class="detail-value">${invoice.booking?.client?.full_name || 'Client Name'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Email:</span>
            <span class="detail-value">${invoice.booking?.client?.email || 'client@email.com'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Company:</span>
            <span class="detail-value">${invoice.booking?.client?.company?.name || 'Client Company'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Booking ID:</span>
            <span class="detail-value">${invoice.booking_id || 'N/A'}</span>
          </div>
        </div>
      </div>

      <!-- Service Section -->
      <div class="service-section">
        <h2 class="service-title">🎯 Service Details</h2>
        <div class="service-description">
          <h3>${invoice.booking?.service?.title || 'Professional Service'}</h3>
          <p>${invoice.booking?.service?.description || 'High-quality professional service delivered with excellence and attention to detail. Our team ensures complete satisfaction and timely delivery of all project requirements.'}</p>
        </div>
      </div>

      <!-- Amount Section -->
      <div class="amount-section">
        <div class="amount-label">💰 Total Amount Due</div>
        <div class="amount-value">${invoice.amount}</div>
        <div class="amount-currency">${invoice.currency}</div>
      </div>

      <!-- Status Section -->
      <div class="status-section">
        <span class="status-badge status-${invoice.status}">${invoice.status.toUpperCase()}</span>
      </div>

      <!-- Payment Information -->
      <div class="payment-info">
        <h4>💳 Payment Information</h4>
        <p><strong>Payment Methods:</strong> Credit Card, Bank Transfer, PayPal, Digital Wallet</p>
        <p><strong>Payment Terms:</strong> Net 30 days from invoice date</p>
        <p><strong>Late Payment:</strong> 1.5% monthly service charge on overdue amounts</p>
        <p><strong>Questions:</strong> Contact us at billing@businessservices.com or call +1 (555) 123-4567</p>
        <p><strong>Support:</strong> Available 24/7 for all payment-related inquiries</p>
      </div>

      <!-- Terms -->
      <div class="terms">
        <h4>📋 Terms & Conditions</h4>
        <p>Payment is due within 30 days of invoice date. Late payments may incur additional charges as specified above. All services are subject to our standard terms and conditions. For questions regarding this invoice, please contact our billing department immediately. We appreciate your business and look forward to continuing our professional relationship.</p>
        <p><strong>Thank you for choosing Business Services Hub for your professional needs!</strong></p>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <h3>Thank you for your business! 🙏</h3>
      <p><strong>Business Services Hub</strong></p>
      <p>123 Business Street, Suite 100, City, State 12345</p>
      <p>📞 Phone: +1 (555) 123-4567 | 📧 Email: info@businessservices.com</p>
      <p>🌐 Website: www.businessservices.com</p>
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

  return Buffer.from(htmlContent, 'utf-8')
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
      // Generate a simple PDF content (in a real implementation, use a PDF library)
      const pdfContent = generateSimplePDF(invoice)
      
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

      // Return the HTML content (for now, in production convert to PDF)
      return new NextResponse(pdfContent as any, {
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `inline; filename="invoice-${invoice.invoice_number || invoiceId}.html"`,
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
