import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateTemplatePDF } from '@/lib/pdf-template-generator'

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

    // First try to get the basic invoice data
    const { data: basicInvoice, error: basicError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single()

    if (basicError) {
      console.error('❌ Failed to fetch basic invoice:', basicError)
      return NextResponse.json({ 
        error: 'Failed to fetch invoice', 
        details: basicError.message 
      }, { status: 500 })
    }

    console.log('✅ Basic invoice data fetched:', basicInvoice)

    // Then try to get the full invoice with relationships
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        booking:bookings!invoices_booking_id_fkey(
          id,
          status,
          requirements,
          client_id,
          provider_id,
          service_id,
          client:profiles!bookings_client_id_fkey(
            id,
            full_name,
            email,
            phone,
            company_name,
            address,
            website,
            logo_url,
            company_id,
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
            provider_id,
            provider:profiles!services_provider_id_fkey(
              id,
              full_name,
              email,
              phone,
              company_name,
              address,
              website,
              logo_url,
              company_id,
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

    let finalInvoice = invoice
    if (invoiceError) {
      console.error('❌ Relationship query error:', invoiceError)
      console.log('⚠️ Falling back to basic invoice data')
      // Use basic invoice data if relationship query fails
      finalInvoice = basicInvoice
    }

    if (!finalInvoice) {
      console.error('❌ Invoice not found')
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    console.log('✅ Invoice data fetched successfully for template PDF')
    console.log('🔍 PDF API - Full invoice structure:', JSON.stringify(finalInvoice, null, 2))
    console.log('🔍 PDF API - Booking data:', finalInvoice?.booking)
    console.log('🔍 PDF API - Provider data:', finalInvoice?.booking?.service?.provider)
    console.log('🔍 PDF API - Provider company:', finalInvoice?.booking?.service?.provider?.company)
    console.log('🔍 PDF API - Client data:', finalInvoice?.booking?.client)
    console.log('🔍 PDF API - Client company:', finalInvoice?.booking?.client?.company)

    // Enrich invoice data with provider and client details if missing
    let enrichedInvoiceData = { ...finalInvoice }
    
    // Always fetch fresh provider and client data to ensure we have the latest information
    console.log('🔍 PDF API - Fetching fresh provider and client data...')
    
    // Fetch provider data directly from database
    if (finalInvoice.provider_id) {
      console.log('🔍 PDF API - Fetching provider data for ID:', finalInvoice.provider_id)
      try {
        const { data: providerProfile, error: providerError } = await supabase
          .from('profiles')
          .select(`
            id,
            full_name,
            email,
            phone,
            company_name,
            address,
            website,
            logo_url,
            company_id,
            company:companies(
              id,
              name,
              address,
              phone,
              email,
              website,
              logo_url
            )
          `)
          .eq('id', finalInvoice.provider_id)
          .single()

        if (!providerError && providerProfile) {
          console.log('✅ PDF API - Provider profile fetched:', providerProfile)
          
          // Use company data if available, otherwise use profile data
          const providerCompany = Array.isArray(providerProfile.company) ? providerProfile.company[0] : providerProfile.company || {}
          const providerData = {
            id: providerProfile.id,
            full_name: providerProfile.full_name,
            email: providerProfile.email,
            phone: providerProfile.phone,
            company: {
              id: providerCompany.id || providerProfile.company_id || '1',
              name: providerCompany.name || providerProfile.company_name || 'Provider Company',
              address: providerCompany.address || providerProfile.address || '123 Provider St.',
              phone: providerCompany.phone || providerProfile.phone || '123-456-7890',
              email: providerCompany.email || providerProfile.email || 'provider@company.com',
              website: providerCompany.website || providerProfile.website || 'providercompany.com',
              logo_url: providerCompany.logo_url || providerProfile.logo_url
            }
          }
          
          console.log('✅ PDF API - Processed provider data:', providerData)
          
          enrichedInvoiceData = {
            ...enrichedInvoiceData,
            booking: {
              ...enrichedInvoiceData.booking,
              service: {
                ...enrichedInvoiceData.booking?.service,
                provider: providerData
              }
            }
          }
        } else {
          console.warn('⚠️ PDF API - Failed to fetch provider profile:', providerError)
        }
      } catch (error) {
        console.warn('⚠️ PDF API - Error fetching provider data:', error)
      }
    }

    // Fetch client data directly from database
    if (finalInvoice.client_id) {
      console.log('🔍 PDF API - Fetching client data for ID:', finalInvoice.client_id)
      try {
        const { data: clientProfile, error: clientError } = await supabase
          .from('profiles')
          .select(`
            id,
            full_name,
            email,
            phone,
            company_name,
            address,
            website,
            logo_url,
            company_id,
            company:companies(
              id,
              name,
              address,
              phone,
              email,
              website,
              logo_url
            )
          `)
          .eq('id', finalInvoice.client_id)
          .single()

        if (!clientError && clientProfile) {
          console.log('✅ PDF API - Client profile fetched:', clientProfile)
          
          // Use company data if available, otherwise use profile data
          const clientCompany = Array.isArray(clientProfile.company) ? clientProfile.company[0] : clientProfile.company || {}
          const clientData = {
            id: clientProfile.id,
            full_name: clientProfile.full_name,
            email: clientProfile.email,
            phone: clientProfile.phone,
            company: {
              id: clientCompany.id || clientProfile.company_id || '2',
              name: clientCompany.name || clientProfile.company_name || 'Client Company',
              address: clientCompany.address || clientProfile.address || '123 Client St.',
              phone: clientCompany.phone || clientProfile.phone || '123-456-7890',
              email: clientCompany.email || clientProfile.email || 'client@company.com',
              website: clientCompany.website || clientProfile.website || 'clientcompany.com',
              logo_url: clientCompany.logo_url || clientProfile.logo_url
            }
          }
          
          console.log('✅ PDF API - Processed client data:', clientData)
          
          enrichedInvoiceData = {
            ...enrichedInvoiceData,
            booking: {
              ...enrichedInvoiceData.booking,
              client: clientData
            }
          }
        } else {
          console.warn('⚠️ PDF API - Failed to fetch client profile:', clientError)
        }
      } catch (error) {
        console.warn('⚠️ PDF API - Error fetching client data:', error)
      }
    }

    // Generate template PDF with enriched data
    const invoiceForPdf = { ...enrichedInvoiceData }

    // Debug final enriched data
    console.log('🔍 PDF API - Final enriched invoice data:', JSON.stringify(invoiceForPdf, null, 2))
    console.log('🔍 PDF API - Final provider data:', invoiceForPdf.booking?.service?.provider)
    console.log('🔍 PDF API - Final client data:', invoiceForPdf.booking?.client)
    console.log('🔍 PDF API - Provider ID:', finalInvoice.provider_id)
    console.log('🔍 PDF API - Client ID:', finalInvoice.client_id)
    console.log('🔍 PDF API - Invoice ID:', finalInvoice.id)

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
      
      pdfBuffer = await generateTemplatePDF(invoiceForPdf)
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

    const invoiceNumber = finalInvoice.invoice_number || `INV-${finalInvoice.id.slice(-8).toUpperCase()}`

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
