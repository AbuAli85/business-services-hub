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
      
      // Build query with role-based filtering (RLS will also apply additional security)
      let query = supabase
        .from('invoices')
        .select('*')
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
      
      return Response.json({ invoices: data ?? [] }, { headers: corsHeaders })
      
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