import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get all companies
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*')

    if (companiesError) {
      console.error('Error fetching companies:', companiesError)
      return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 })
    }

    // Get all profiles with company relationships
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        email,
        phone,
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

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 })
    }

    // Get a sample invoice with relationships
    const { data: invoice, error: invoiceError } = await supabase
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
        )
      `)
      .limit(1)
      .single()

    return NextResponse.json({
      companies: companies || [],
      profiles: profiles || [],
      sampleInvoice: invoice || null,
      errors: {
        companies: companiesError,
        profiles: profilesError,
        invoice: invoiceError
      }
    })

  } catch (error) {
    console.error('Error in debug API:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
