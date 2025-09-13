import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 PDF Test API - Starting')
    
    const { invoiceId } = await request.json()
    console.log('🔍 PDF Test API - Invoice ID:', invoiceId)
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        booking:bookings(
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
      console.error('❌ PDF Test API - Database error:', invoiceError)
      return NextResponse.json({ 
        error: 'Database error', 
        details: invoiceError.message 
      }, { status: 500 })
    }

    if (!invoice) {
      console.error('❌ PDF Test API - Invoice not found')
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    console.log('✅ PDF Test API - Invoice data fetched successfully')
    console.log('🔍 PDF Test API - Full invoice data:', JSON.stringify(invoice, null, 2))

    return NextResponse.json({ 
      success: true, 
      invoice: invoice,
      message: 'Data fetched successfully - ready for PDF generation'
    })

  } catch (error) {
    console.error('❌ PDF Test API - Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Unexpected error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
