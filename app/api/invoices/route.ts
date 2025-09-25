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
  const gate = await requireRole(supabase, ['admin'])
  if (!gate.ok) return jsonError(gate.status, gate.status === 401 ? 'UNAUTHENTICATED' : 'FORBIDDEN', gate.message)

  const { data, error } = await supabase.from('invoices').select('*').limit(50)
  if (error) return jsonError(500, 'DB_ERROR', 'Failed to fetch invoices', { hint: error.message })
  return Response.json({ invoices: data ?? [] }, { headers: corsHeaders })
}