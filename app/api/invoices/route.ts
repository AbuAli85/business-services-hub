import { makeServerClient } from '@/utils/supabase/makeServerClient'
import { requireRole } from '@/lib/authz'
import { jsonError } from '@/lib/http'

// CORS headers for cross-domain access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
}

// Handle preflight OPTIONS request
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  })
}

export async function GET(request: Request) {
  try {
    // Add timeout protection for the entire request
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 12000) // 12 second timeout
    
    try {
      // NextRequest is ideal, but Request gives headers; cast minimal where needed
      const req = request as any
      const supabase = await makeServerClient(req)
      const gate = await requireRole(supabase, ['client', 'provider', 'admin'])
      if (!gate.ok) return jsonError(gate.status, gate.status === 401 ? 'UNAUTHENTICATED' : 'FORBIDDEN', gate.message)

      const user = gate.user
      const userRole = user?.user_metadata?.role || 'client'
      
      // Build query with role-based filtering and proper joins for client/provider names
      let query = supabase
        .from('invoices')
        .select(`
          *,
          client_profile:client_id(full_name, email, phone, company_name),
          provider_profile:provider_id(full_name, email, phone, company_name),
          service:booking_id(service_id),
          service_details:service_id(title, category)
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      // Apply role-based filtering at the API level (in addition to RLS)
      if (userRole === 'client') {
        query = query.eq('client_id', user.id)
      } else if (userRole === 'provider') {
        query = query.eq('provider_id', user.id)
      }
      // Admin can see all invoices (no additional filter)

      const { data, error } = await query
      
      clearTimeout(timeoutId)
      
      if (error) {
        console.error('❌ Database error fetching invoices:', error)
        return jsonError(500, 'DB_ERROR', 'Failed to fetch invoices', { hint: error.message })
      }
      
      // Flatten the nested data to provide the expected field names
      const processedInvoices = (data ?? []).map((invoice: any) => ({
        ...invoice,
        // Client information
        client_name: invoice.client_profile?.full_name || null,
        client_email: invoice.client_profile?.email || null,
        client_phone: invoice.client_profile?.phone || null,
        client_company: invoice.client_profile?.company_name || null,
        // Provider information
        provider_name: invoice.provider_profile?.full_name || null,
        provider_email: invoice.provider_profile?.email || null,
        provider_phone: invoice.provider_profile?.phone || null,
        provider_company: invoice.provider_profile?.company_name || null,
        // Service information
        service_title: invoice.service_details?.title || 'Service',
        service_category: invoice.service_details?.category || null,
        // Clean up nested objects
        client_profile: undefined,
        provider_profile: undefined,
        service: undefined,
        service_details: undefined
      }))
      
      return Response.json({ invoices: processedInvoices }, { headers: corsHeaders })
      
    } catch (error: any) {
      clearTimeout(timeoutId)
      
      if (error.name === 'AbortError') {
        console.warn('⚠️ Invoice API request timed out after 12 seconds')
        return jsonError(500, 'TIMEOUT', 'Request timeout - please try again', { hint: 'The request took too long to process' })
      }
      
      console.error('❌ Invoice API error:', error)
      return jsonError(500, 'INTERNAL_ERROR', 'An unexpected error occurred', { hint: error.message })
    }
  } catch (error: any) {
    console.error('❌ Critical error in invoice API:', error)
    return jsonError(500, 'CRITICAL_ERROR', 'A critical error occurred', { hint: error.message })
  }
}