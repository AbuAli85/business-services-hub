import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseClient()
    
    // Test 1: Check if invoices table has proper structure
    console.log('🔍 Testing invoice table structure...')
    const { data: tableInfo, error: tableError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'invoices')
      .eq('table_schema', 'public')
      .order('ordinal_position')

    if (tableError) {
      console.error('❌ Table structure error:', tableError)
      return NextResponse.json({ error: 'Failed to check table structure' }, { status: 500 })
    }

    // Test 2: Check RLS policies
    console.log('🔍 Testing RLS policies...')
    const { data: policies, error: policyError } = await supabase
      .from('pg_policies')
      .select('policyname, permissive, roles, cmd, qual')
      .eq('tablename', 'invoices')
      .eq('schemaname', 'public')

    if (policyError) {
      console.error('❌ Policy check error:', policyError)
      return NextResponse.json({ error: 'Failed to check RLS policies' }, { status: 500 })
    }

    // Test 3: Check foreign key constraints
    console.log('🔍 Testing foreign key constraints...')
    const { data: constraints, error: constraintError } = await supabase
      .from('information_schema.table_constraints')
      .select('constraint_name, constraint_type')
      .eq('table_name', 'invoices')
      .eq('table_schema', 'public')
      .eq('constraint_type', 'FOREIGN KEY')

    if (constraintError) {
      console.error('❌ Constraint check error:', constraintError)
      return NextResponse.json({ error: 'Failed to check constraints' }, { status: 500 })
    }

    // Test 4: Check indexes
    console.log('🔍 Testing indexes...')
    const { data: indexes, error: indexError } = await supabase
      .from('pg_indexes')
      .select('indexname, indexdef')
      .eq('tablename', 'invoices')
      .eq('schemaname', 'public')

    if (indexError) {
      console.error('❌ Index check error:', indexError)
      return NextResponse.json({ error: 'Failed to check indexes' }, { status: 500 })
    }

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
      table_structure: tableInfo,
      rls_policies: policies,
      foreign_key_constraints: constraints,
      indexes: indexes,
      sample_invoices: sampleInvoices,
      relationship_checks: relationshipChecks,
      summary: {
        total_columns: tableInfo?.length || 0,
        total_policies: policies?.length || 0,
        total_constraints: constraints?.length || 0,
        total_indexes: indexes?.length || 0,
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
