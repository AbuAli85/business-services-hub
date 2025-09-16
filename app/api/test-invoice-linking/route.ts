import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseClient()
    
    // Note: Skip information_schema and pg_* catalog checks here because
    // those schemas are not exposed via the Supabase REST interface.
    // This route focuses on functional sample reads only.

    // Test 5: Check sample invoice data with relationships
    console.log('🔍 Testing sample invoice data...')
    const { data: sampleInvoices, error: sampleError } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        amount,
        currency,
        status,
        provider_id,
        client_id,
        booking_id,
        booking:bookings!invoices_booking_id_fkey(
          id,
          status,
          provider:profiles!bookings_provider_id_fkey(
            id,
            full_name,
            role
          ),
          client:profiles!bookings_client_id_fkey(
            id,
            full_name,
            role
          )
        )
      `)
      .limit(5)

    if (sampleError) {
      console.error('❌ Sample data error:', sampleError)
      return NextResponse.json({ error: 'Failed to fetch sample data' }, { status: 500 })
    }

    // Test 6: Verify provider-client relationships
    console.log('🔍 Verifying provider-client relationships...')
    const relationshipChecks = sampleInvoices?.map(invoice => {
      const booking = Array.isArray(invoice.booking) ? invoice.booking[0] : invoice.booking
      const provider = Array.isArray(booking?.provider) ? booking.provider[0] : booking?.provider
      const client = Array.isArray(booking?.client) ? booking.client[0] : booking?.client
      
      return {
        invoice_id: invoice.id,
        invoice_provider_id: invoice.provider_id,
        invoice_client_id: invoice.client_id,
        booking_provider_id: provider?.id,
        booking_client_id: client?.id,
        provider_role: provider?.role,
        client_role: client?.role,
        provider_client_match: invoice.provider_id === provider?.id && invoice.client_id === client?.id,
        roles_valid: provider?.role === 'provider' && client?.role === 'client'
      }
    }) || []

    const results = {
      sample_invoices: sampleInvoices,
      relationship_checks: relationshipChecks,
      summary: {
        sample_invoice_count: sampleInvoices?.length || 0,
        valid_relationships: relationshipChecks.filter(check => check.provider_client_match && check.roles_valid).length,
        invalid_relationships: relationshipChecks.filter(check => !check.provider_client_match || !check.roles_valid).length
      }
    }

    console.log('✅ Invoice linking test completed successfully')
    return NextResponse.json(results)

  } catch (error) {
    console.error('❌ Invoice linking test failed:', error)
    return NextResponse.json({ 
      error: 'Invoice linking test failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
