import { getSupabaseClient } from './supabase'

/**
 * Helper function to make authenticated API calls to Next.js API routes
 * This ensures that the Supabase access token is included in the request headers
 */
export async function authenticatedFetch(
  endpoint: string, 
  options: RequestInit = {}
): Promise<Response> {
  const supabase = await getSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    throw new Error('No active session found. Please sign in.')
  }

  // Ensure we're using relative URLs for local development
  const finalEndpoint = endpoint.startsWith('http') ? endpoint : endpoint
  
  console.log('🔍 API Request Debug:', {
    originalEndpoint: endpoint,
    finalEndpoint,
    currentDomain: typeof window !== 'undefined' ? window.location.origin : 'server-side',
    sessionExists: !!session,
    accessTokenExists: !!session.access_token
  })

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
    ...options.headers,
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: 'include',
  }

  return fetch(finalEndpoint, fetchOptions)
}

/**
 * Wrapper for GET requests with authentication
 */
export async function authenticatedGet(endpoint: string): Promise<Response> {
  return authenticatedFetch(endpoint, { method: 'GET' })
}

/**
 * Wrapper for POST requests with authentication
 */
export async function authenticatedPost(
  endpoint: string, 
  body: any
): Promise<Response> {
  return authenticatedFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/**
 * Wrapper for PATCH requests with authentication
 */
export async function authenticatedPatch(
  endpoint: string, 
  body: any
): Promise<Response> {
  return authenticatedFetch(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

/**
 * Wrapper for DELETE requests with authentication
 */
export async function authenticatedDelete(endpoint: string): Promise<Response> {
  return authenticatedFetch(endpoint, { method: 'DELETE' })
}