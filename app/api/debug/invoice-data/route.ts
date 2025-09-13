import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const invoiceId = searchParams.get('invoiceId')
    
    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 })
    }

    console.log('🔍 Invoice Data API - Fetching invoice:', invoiceId)

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
      console.error('❌ Invoice Data API - Database error:', invoiceError)
      return NextResponse.json({ 
        error: 'Database error', 
        details: invoiceError.message 
      }, { status: 500 })
    }

    if (!invoice) {
      console.error('❌ Invoice Data API - Invoice not found')
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    console.log('✅ Invoice Data API - Invoice data fetched successfully')

    return NextResponse.json({ 
      success: true, 
      invoice: invoice,
      message: 'Invoice data fetched successfully'
    })

  } catch (error) {
    console.error('❌ Invoice Data API - Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Unexpected error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
