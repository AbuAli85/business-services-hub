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
  if (error) return jsonError(500, 'DB_ERROR', 'Failed to fetch invoices', { hint: error.message })
  return Response.json({ invoices: data ?? [] }, { headers: corsHeaders })
}