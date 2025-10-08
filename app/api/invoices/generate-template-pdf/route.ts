import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateProfessionalPDF } from '@/lib/pdf-invoice-generator'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 PDF API - Starting request processing')
    
    // Check environment variables first
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ PDF API - Missing environment variables')
      return NextResponse.json({ 
        error: 'Server configuration error',
        details: 'Missing Supabase credentials'
      }, { status: 500 })
    }
    
    const body = await request.json()
    console.log('🔍 PDF API - Request body:', body)
    
    const { invoiceId } = body
    
    if (!invoiceId) {
      console.error('❌ PDF API - No invoice ID provided')
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 })
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(invoiceId)) {
      console.error('❌ PDF API - Invalid invoice ID format:', invoiceId)
      return NextResponse.json({ error: 'Invalid invoice ID format' }, { status: 400 })
    }

    console.log('🔍 Fetching invoice data for template PDF, ID:', invoiceId)
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        booking:bookings!invoices_booking_id_fkey(
          id,
          status,
          requirements,
          client:profiles!bookings_client_id_fkey(
            id,
            full_name,
            email,
            phone,
            company:companies(
              id,
              name,
              address,
              phone,
              email,
              website,
              logo_url
            )
          ),
          service:services(
            id,
            title,
            description,
            provider:profiles!services_provider_id_fkey(
              id,
              full_name,
              email,
              phone,
              company:companies(
                id,
                name,
                address,
                phone,
                email,
                website,
                logo_url
              )
            )
          )
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

    console.log('✅ Invoice data fetched successfully for template PDF')
    console.log('🔍 PDF API - Booking data:', invoice?.booking)
    console.log('🔍 PDF API - Provider data:', invoice?.booking?.service?.provider)
    console.log('🔍 PDF API - Provider company:', invoice?.booking?.service?.provider?.company)
    console.log('🔍 PDF API - Client data:', invoice?.booking?.client)
    console.log('🔍 PDF API - Client company:', invoice?.booking?.client?.company)

    // Enrich invoice data with provider and client details if missing
    let enrichedInvoiceData = { ...invoice }
    
    // If provider data is missing, fetch it using the profiles API
    if (!invoice.booking?.service?.provider && invoice.provider_id) {
      console.log('🔍 PDF API - Fetching provider data for ID:', invoice.provider_id)
      try {
        const providerResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/profiles/search?id=${invoice.provider_id}`)
        if (providerResponse.ok) {
          const providerData = await providerResponse.json()
          if (providerData.profiles && providerData.profiles.length > 0) {
            const provider = providerData.profiles[0]
            console.log('✅ PDF API - Provider data fetched:', provider)
            enrichedInvoiceData = {
              ...enrichedInvoiceData,
              booking: {
                ...enrichedInvoiceData.booking,
                service: {
                  ...enrichedInvoiceData.booking?.service,
                  provider: {
                    id: provider.id,
                    full_name: provider.full_name,
                    email: provider.email,
                    phone: provider.phone,
                    company: {
                      id: provider.company_id || '1',
                      name: provider.company_name || 'Provider Company',
                      address: provider.address || '123 Provider St.',
                      phone: provider.phone || '123-456-7890',
                      email: provider.email || 'provider@company.com',
                      website: provider.website || 'providercompany.com',
                      logo_url: provider.logo_url
                    }
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ PDF API - Failed to fetch provider data:', error)
      }
    }

    // If client data is missing, fetch it using the profiles API
    if (!invoice.booking?.client && invoice.client_id) {
      console.log('🔍 PDF API - Fetching client data for ID:', invoice.client_id)
      try {
        const clientResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/profiles/search?id=${invoice.client_id}`)
        if (clientResponse.ok) {
          const clientData = await clientResponse.json()
          if (clientData.profiles && clientData.profiles.length > 0) {
            const client = clientData.profiles[0]
            console.log('✅ PDF API - Client data fetched:', client)
            enrichedInvoiceData = {
              ...enrichedInvoiceData,
              booking: {
                ...enrichedInvoiceData.booking,
                client: {
                  id: client.id,
                  full_name: client.full_name,
                  email: client.email,
                  phone: client.phone,
                  company: {
                    id: client.company_id || '2',
                    name: client.company_name || 'Client Company',
                    address: client.address || '123 Client St.',
                    phone: client.phone || '123-456-7890',
                    email: client.email || 'client@company.com',
                    website: client.website || 'clientcompany.com',
                    logo_url: client.logo_url
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ PDF API - Failed to fetch client data:', error)
      }
    }

    // Generate template PDF with enriched data
    const invoiceForPdf = { ...enrichedInvoiceData }

    // Debug VAT and calculation data
    console.log('🔍 PDF API - VAT Data:', {
      vat_percent: invoiceForPdf.vat_percent,
      vat_amount: invoiceForPdf.vat_amount,
      subtotal: invoiceForPdf.subtotal,
      total: invoiceForPdf.total,
      amount: invoiceForPdf.amount
    })

    // Generate template PDF
    let pdfBuffer: Uint8Array
    try {
      console.log('🔍 PDF API - Starting PDF generation')
      console.log('🔍 PDF API - Invoice ID:', invoiceForPdf.id)
      console.log('🔍 PDF API - Booking exists:', !!invoiceForPdf.booking)
      console.log('🔍 PDF API - Service exists:', !!invoiceForPdf.booking?.service)
      console.log('🔍 PDF API - Provider exists:', !!invoiceForPdf.booking?.service?.provider)
      console.log('🔍 PDF API - Client exists:', !!invoiceForPdf.booking?.client)
      
      pdfBuffer = await generateProfessionalPDF(invoiceForPdf)
      console.log('✅ PDF API - PDF generated successfully, size:', pdfBuffer.length)
    } catch (pdfError) {
      console.error('❌ PDF generation error:', pdfError)
      console.error('❌ PDF generation error stack:', pdfError instanceof Error ? pdfError.stack : 'No stack trace')
      
      // Return more detailed error information
      const errorMessage = pdfError instanceof Error ? pdfError.message : 'Unknown PDF generation error'
      const errorDetails = {
        message: errorMessage,
        invoiceId: invoiceForPdf.id,
        hasBooking: !!invoiceForPdf.booking,
        hasService: !!invoiceForPdf.booking?.service,
        hasProvider: !!invoiceForPdf.booking?.service?.provider,
        hasClient: !!invoiceForPdf.booking?.client
      }
      
      return NextResponse.json({ 
        error: 'Failed to generate template PDF', 
        details: errorMessage,
        debug: errorDetails
      }, { status: 500 })
    }
    
    console.log('✅ Template PDF generated successfully, size:', pdfBuffer.length, 'bytes')

    const invoiceNumber = invoice.invoice_number || `INV-${invoice.id.slice(-8).toUpperCase()}`

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-template-${invoiceNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error('❌ Template PDF API route error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
