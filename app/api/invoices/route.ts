import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role') || 'client'
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Build query based on user role
    let query = supabase
      .from('invoices')
      .select(`
        *,
        provider:profiles!invoices_provider_id_fkey(
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
        client:profiles!invoices_client_id_fkey(
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
        booking:bookings!invoices_booking_id_fkey(
          id,
          status,
          requirements,
          service:services(
            id,
            title,
            description
          )
        )
      `)
      .order('created_at', { ascending: false })

    // Apply role-based filtering
    if (role === 'client') {
      query = query.eq('client_id', userId)
    } else if (role === 'provider') {
      query = query.eq('provider_id', userId)
    }
    // Admin can see all invoices (no additional filter)

    const { data: invoices, error } = await query

    if (error) {
      console.error('Error fetching invoices:', error)
      return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
    }

    console.log('📊 Raw invoices data:', JSON.stringify(invoices, null, 2))

    // Transform the data to match the expected format
    const transformedInvoices = (invoices || []).map((invoice: any) => ({
      ...invoice,
      service_title: invoice.booking?.service?.title || invoice.service_title || 'Service',
      service_description: invoice.booking?.service?.description || invoice.service_description,
      client_name: invoice.client?.full_name || invoice.client_name || 'Unknown Client',
      client_email: invoice.client?.email || invoice.client_email,
      client_phone: invoice.client?.phone || invoice.client_phone,
      provider_name: invoice.provider?.full_name || invoice.provider_name || 'Unknown Provider',
      provider_email: invoice.provider?.email || invoice.provider_email,
      provider_phone: invoice.provider?.phone || invoice.provider_phone,
      company_name: invoice.provider?.company?.name || invoice.company_name,
      company_logo: invoice.provider?.company?.logo_url || invoice.company_logo,
      // Include full provider and client objects for detailed access
      provider: invoice.provider,
      client: invoice.client,
      booking: invoice.booking
    }))

    return NextResponse.json({ 
      invoices: transformedInvoices,
      count: transformedInvoices.length
    })

  } catch (error) {
    console.error('Error in invoices API:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
