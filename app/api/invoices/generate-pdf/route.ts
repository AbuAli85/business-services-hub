import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { jsPDF } from 'jspdf'

function generateSimplePDF(invoice: any): Buffer {
  // Create an ultra-premium, high-end PDF using jsPDF
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
  
  // Ultra-premium color palette
  const primaryColor = [15, 23, 42] // Deep slate
  const secondaryColor = [30, 41, 59] // Slate
  const accentColor = [59, 130, 246] // Blue-500
  const accentLight = [147, 197, 253] // Blue-300
  const successColor = [34, 197, 94] // Green-500
  const warningColor = [251, 191, 36] // Amber-400
  const lightGray = [248, 250, 252] // Slate-50
  const mediumGray = [241, 245, 249] // Slate-100
  const darkGray = [51, 65, 85] // Slate-700
  const textGray = [71, 85, 105] // Slate-600
  const borderGray = [226, 232, 240] // Slate-200
  
  // Create sophisticated gradient header
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.rect(0, 0, 210, 60, 'F')
  
  // Add premium accent stripe
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2])
  doc.rect(0, 0, 210, 6, 'F')
  
  // Add subtle pattern overlay
  doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
  doc.rect(0, 6, 210, 2, 'F')
  
  // Premium company logo area with sophisticated design
  doc.setFillColor(255, 255, 255)
  doc.rect(20, 20, 35, 25, 'F')
  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2])
  doc.setLineWidth(3)
  doc.rect(20, 20, 35, 25, 'S')
  
  // Add inner logo border
  doc.setDrawColor(accentLight[0], accentLight[1], accentLight[2])
  doc.setLineWidth(1)
  doc.rect(22, 22, 31, 21, 'S')
  
  // Get company information from the invoice data
  const companyName = invoice.booking?.service?.provider?.company?.name || 'Business Services Hub'
  const companyTagline = 'Professional Services & Solutions'
  
  // Premium company branding
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(32)
  doc.setFont('helvetica', 'bold')
  doc.text(companyName, 65, 32)
  
  // Sophisticated tagline
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(companyTagline, 65, 38)
  
  // Add premium separator line
  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2])
  doc.setLineWidth(2)
  doc.line(65, 42, 190, 42)
  
  // Ultra-premium invoice title with sophisticated styling
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2])
  doc.setFontSize(48)
  doc.setFont('helvetica', 'bold')
  doc.text('INVOICE', 20, 75)
  
  // Add premium underline
  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2])
  doc.setLineWidth(3)
  doc.line(20, 78, 100, 78)
  
  // Sophisticated invoice number badge
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2])
  doc.rect(20, 85, 80, 18, 'F')
  doc.setDrawColor(accentLight[0], accentLight[1], accentLight[2])
  doc.setLineWidth(1)
  doc.rect(20, 85, 80, 18, 'S')
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(invoiceNumber, 25, 97)
  
  // Ultra-premium invoice details card
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2])
  doc.rect(120, 65, 80, 70, 'F')
  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2])
  doc.setLineWidth(2)
  doc.rect(120, 65, 80, 70, 'S')
  
  // Add inner shadow effect
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2])
  doc.setLineWidth(1)
  doc.rect(121, 66, 78, 68, 'S')
  
  // Premium invoice details typography
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('INVOICE DATE', 125, 78)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(createdDate, 125, 84)
  
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('DUE DATE', 125, 95)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(dueDate, 125, 101)
  
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('STATUS', 125, 112)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(invoice.status.toUpperCase(), 125, 118)
  
  // Add status indicator
  const statusColor = invoice.status === 'paid' ? successColor : 
                     invoice.status === 'overdue' ? warningColor : accentColor
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2])
  doc.circle(195, 115, 3, 'F')
  
  // Premium client information section with sophisticated design
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2])
  doc.rect(20, 125, 85, 12, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('BILL TO', 25, 133)
  
  // Add client info background
  doc.setFillColor(mediumGray[0], mediumGray[1], mediumGray[2])
  doc.rect(20, 137, 85, 25, 'F')
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2])
  doc.rect(20, 137, 85, 25, 'S')
  
  // Get client information from the invoice data
  const clientName = invoice.booking?.client?.full_name || 'Client Name'
  const clientCompany = invoice.booking?.client?.company?.name || 'Client Company'
  const clientEmail = invoice.booking?.client?.email || 'client@email.com'
  
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(clientName, 25, 147)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(clientCompany, 25, 152)
  doc.text(clientEmail, 25, 157)
  
  // Premium company information section
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2])
  doc.rect(115, 125, 85, 12, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('FROM', 120, 133)
  
  // Add company info background
  doc.setFillColor(mediumGray[0], mediumGray[1], mediumGray[2])
  doc.rect(115, 137, 85, 25, 'F')
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2])
  doc.rect(115, 137, 85, 25, 'S')
  
  // Get provider company information from the invoice data
  const providerCompanyName = invoice.booking?.service?.provider?.company?.name || 'Business Services Hub'
  const providerAddress = '123 Business Street, Suite 100'
  const providerCity = 'City, State 12345'
  const providerEmail = invoice.booking?.service?.provider?.email || 'info@businessservices.com'
  
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(providerCompanyName, 120, 147)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(providerAddress, 120, 152)
  doc.text(providerCity, 120, 157)
  doc.text(providerEmail, 120, 162)
  
  // Ultra-premium services section header
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.rect(20, 175, 170, 12, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('SERVICES RENDERED', 25, 183)
  
  // Add premium table with sophisticated styling
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2])
  doc.rect(20, 190, 170, 25, 'F')
  
  // Add table header borders
  doc.setDrawColor(accentLight[0], accentLight[1], accentLight[2])
  doc.setLineWidth(1)
  doc.line(25, 190, 25, 215)
  doc.line(120, 190, 120, 215)
  doc.line(150, 190, 150, 215)
  doc.line(180, 190, 180, 215)
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('DESCRIPTION', 30, 202)
  doc.text('QTY', 125, 202)
  doc.text('UNIT PRICE', 155, 202)
  doc.text('TOTAL', 185, 202)
  
  // Premium table row with sophisticated styling
  doc.setFillColor(255, 255, 255)
  doc.rect(20, 215, 170, 25, 'F')
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2])
  doc.setLineWidth(1)
  doc.rect(20, 215, 170, 25, 'S')
  
  // Add inner table borders
  doc.line(25, 215, 25, 240)
  doc.line(120, 215, 120, 240)
  doc.line(150, 215, 150, 240)
  doc.line(180, 215, 180, 240)
  
  // Get service information from the invoice data
  const serviceTitle = invoice.booking?.service?.title || 'Professional Service'
  const serviceDescription = invoice.booking?.service?.description || 'High-quality professional service delivered with excellence'
  const serviceQuantity = 1
  const servicePrice = invoice.amount || 0
  const serviceTotal = servicePrice * serviceQuantity
  
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(serviceTitle, 30, 227)
  doc.text(serviceQuantity.toString(), 125, 227)
  doc.text(`${servicePrice} ${invoice.currency}`, 155, 227)
  doc.text(`${serviceTotal} ${invoice.currency}`, 185, 227)
  
  // Ultra-premium total section with sophisticated design
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2])
  doc.rect(120, 250, 70, 60, 'F')
  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2])
  doc.setLineWidth(3)
  doc.rect(120, 250, 70, 60, 'S')
  
  // Add inner shadow
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2])
  doc.setLineWidth(1)
  doc.rect(121, 251, 68, 58, 'S')
  
  // Total section header with premium styling
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2])
  doc.rect(120, 250, 70, 15, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL SUMMARY', 125, 260)
  
  // Calculate financial breakdown
  const subtotal = invoice.subtotal || invoice.amount || 0
  const taxRate = invoice.tax_rate || 0
  const taxAmount = invoice.tax_amount || (subtotal * taxRate / 100)
  const total = invoice.total_amount || (subtotal + taxAmount)
  
  // Financial breakdown with premium typography
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text('Subtotal:', 125, 275)
  doc.text(`${subtotal.toFixed(2)} ${invoice.currency}`, 160, 275)
  
  doc.text(`Tax (${taxRate}%):`, 125, 285)
  doc.text(`${taxAmount.toFixed(2)} ${invoice.currency}`, 160, 285)
  
  // Premium total with sophisticated styling
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.rect(120, 290, 70, 20, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('TOTAL:', 125, 302)
  doc.text(`${total.toFixed(2)} ${invoice.currency}`, 160, 302)
  
  // Ultra-premium payment information section
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2])
  doc.rect(20, 320, 170, 12, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('PAYMENT INFORMATION', 25, 328)
  
  // Payment details with premium styling
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text('Payment Methods: Credit Card, Bank Transfer, PayPal', 20, 345)
  doc.text('Payment Terms: Net 30 days from invoice date', 20, 352)
  doc.text('Questions: billing@businessservices.com', 20, 359)
  
  // Ultra-premium thank you section
  doc.setFillColor(successColor[0], successColor[1], successColor[2])
  doc.rect(20, 370, 170, 20, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Thank you for your business!', 25, 382)
  
  // Ultra-premium footer with sophisticated design
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.rect(0, 395, 210, 30, 'F')
  
  // Add footer accent
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2])
  doc.rect(0, 395, 210, 4, 'F')
  
  // Footer content with premium typography using actual company data
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`${providerCompanyName} | ${providerAddress} | ${providerEmail}`, 20, 405)
  doc.text('This invoice was generated electronically and is valid without signature.', 20, 412)
  doc.text(`© 2024 ${providerCompanyName}. All rights reserved.`, 20, 419)
  
  // Add sophisticated border around entire document
  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2])
  doc.setLineWidth(2)
  doc.rect(3, 3, 204, 291, 'S')
  
  // Add inner border
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2])
  doc.setLineWidth(1)
  doc.rect(5, 5, 200, 287, 'S')
  
  // Convert to buffer
  const pdfBuffer = doc.output('arraybuffer')
  return Buffer.from(pdfBuffer)
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
      invoice_number: invoice.invoice_number,
      subtotal: invoice.subtotal,
      tax_rate: invoice.tax_rate,
      tax_amount: invoice.tax_amount,
      total_amount: invoice.total_amount
    })
    
    console.log('📄 Booking data:', {
      booking_id: invoice.booking?.id,
      service_title: invoice.booking?.service?.title,
      service_description: invoice.booking?.service?.description,
      client_name: invoice.booking?.client?.full_name,
      client_email: invoice.booking?.client?.email,
      client_company: invoice.booking?.client?.company?.name,
      provider_name: invoice.booking?.service?.provider?.full_name,
      provider_email: invoice.booking?.service?.provider?.email,
      provider_company: invoice.booking?.service?.provider?.company?.name
    })

    try {
      // Generate simple PDF
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

      // Return the actual PDF content
      return new NextResponse(pdfContent as any, {
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
