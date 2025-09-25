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

  // Force relative URLs regardless of current domain
  let finalEndpoint = endpoint
  if (endpoint.startsWith('http')) {
    // Extract just the path from absolute URLs
    const url = new URL(endpoint)
    finalEndpoint = url.pathname + url.search
  }
  
  console.log('🔍 API Request Debug:', {
    originalEndpoint: endpoint,
    finalEndpoint,
    currentDomain: typeof window !== 'undefined' ? window.location.origin : 'server-side',
    sessionExists: !!session,
    accessTokenExists: !!session.access_token,
    tokenPreview: session.access_token ? `${session.access_token.substring(0, 20)}...` : 'N/A',
    userEmail: session.user?.email,
    userId: session.user?.id
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
 * Helper to make API calls with automatic authentication
 * Falls back to cookies if session token is not available
 */
export async function apiRequest(
  endpoint: string, 
  options: RequestInit = {}
): Promise<Response> {
  try {
    // Try with authentication token first
    return await authenticatedFetch(endpoint, options)
  } catch (authError) {
    console.warn('🔄 Auth token failed, falling back to cookie auth:', authError)
    
    // Fallback to cookie-based authentication
    const fallbackOptions: RequestInit = {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      }
    }
    
    return fetch(endpoint, fallbackOptions)
  }
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