import { createClient } from '@/utils/supabase/server'
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
      // Use standard SSR client for cookie-based authentication
      const supabase = await createClient()
      
      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        console.error('❌ Authentication error:', userError)
        return jsonError(401, 'UNAUTHENTICATED', 'Authentication required')
      }

      const userRole = user?.user_metadata?.role || 'client'
      console.log('✅ Invoice API: User authenticated:', user.id, 'Role:', userRole)
      
      // Build query with role-based filtering - start simple and add joins gradually
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
      
      // For now, return basic invoice data - we'll enhance with names in a separate query
      // This gets the basic functionality working first
      const processedInvoices = (data ?? []).map((invoice: any) => ({
        ...invoice,
        // Add placeholder fields that the frontend expects
        client_name: null, // Will be populated by separate queries
        client_email: null,
        client_phone: null,
        client_company: null,
        provider_name: null, // Will be populated by separate queries
        provider_email: null,
        provider_phone: null,
        provider_company: null,
        service_title: 'Service',
        service_category: null
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