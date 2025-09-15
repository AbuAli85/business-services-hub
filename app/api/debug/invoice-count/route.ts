import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug: Checking invoice count...')
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get total count of invoices
    const { count: totalCount, error: totalError } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })

    if (totalError) {
      console.error('❌ Error getting total count:', totalError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to get total count',
        details: totalError 
      })
    }

    // Get count by provider
    const { count: providerCount, error: providerError } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('provider_id', 'd2ce1fe9-806f-4dbc-8efb-9cf160f19e4b') // The provider from the screenshot

    if (providerError) {
      console.error('❌ Error getting provider count:', providerError)
    }

    // Get all invoices for the provider with basic info
    const { data: allInvoices, error: allInvoicesError } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        amount,
        currency,
        status,
        created_at,
        provider_id,
        client_id
      `)
      .eq('provider_id', 'd2ce1fe9-806f-4dbc-8efb-9cf160f19e4b')
      .order('created_at', { ascending: false })

    if (allInvoicesError) {
      console.error('❌ Error getting all invoices:', allInvoicesError)
    }

    // Get invoices with full relationships (like the main query)
    const { data: fullInvoices, error: fullInvoicesError } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        amount,
        currency,
        status,
        created_at,
        due_date,
        subtotal,
        tax_amount,
        total_amount,
        notes,
        provider_id,
        client_id,
        booking_id,
        booking:bookings!invoices_booking_id_fkey(
          id,
          status,
          client:profiles!bookings_client_id_fkey(
            id,
            full_name,
            email,
            phone,
            role,
            company:companies(
              id,
              name,
              address,
              phone,
              email,
              website
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
              role
            )
          )
        )
      `)
      .eq('provider_id', 'd2ce1fe9-806f-4dbc-8efb-9cf160f19e4b')
      .order('created_at', { ascending: false })

    if (fullInvoicesError) {
      console.error('❌ Error getting full invoices:', fullInvoicesError)
    }

    console.log('📊 Invoice counts:', {
      total: totalCount,
      provider: providerCount,
      basicQuery: allInvoices?.length || 0,
      fullQuery: fullInvoices?.length || 0
    })

    return NextResponse.json({ 
      success: true,
      counts: {
        total: totalCount,
        provider: providerCount,
        basicQuery: allInvoices?.length || 0,
        fullQuery: fullInvoices?.length || 0
      },
      allInvoices: allInvoices?.map(inv => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        amount: inv.amount,
        status: inv.status,
        created_at: inv.created_at
      })),
      errors: {
        total: totalError,
        provider: providerError,
        allInvoices: allInvoicesError,
        fullInvoices: fullInvoicesError
      }
    })

  } catch (error) {
    console.error('❌ Debug error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
