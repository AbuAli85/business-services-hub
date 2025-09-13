import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role') || 'client'
    
    const supabase = await getSupabaseClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

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
        booking:bookings(
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
      query = query.eq('client_id', user.id)
    } else if (role === 'provider') {
      query = query.eq('provider_id', user.id)
    }
    // Admin can see all invoices (no additional filter)

    const { data: invoices, error } = await query

    if (error) {
      console.error('Error fetching invoices:', error)
      return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
    }

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
      company_logo: invoice.provider?.company?.logo_url || invoice.company_logo
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
