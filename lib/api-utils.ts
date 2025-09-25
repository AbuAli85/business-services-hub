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
  
  // Try to refresh session first
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  
  if (!session || sessionError) {
    console.log('🔄 No session found, attempting refresh...')
    
    // Try to refresh the session
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
    
    if (refreshError || !refreshData.session) {
      console.log('❌ Session refresh failed:', refreshError?.message)
      throw new Error('Session expired. Please sign in again.')
    }
    
    console.log('✅ Session refreshed successfully')
    // Use the refreshed session for the request
  }

  // Get the current session (either original or refreshed)
  const { data: { session: currentSession } } = await supabase.auth.getSession()
  
  if (!currentSession) {
    throw new Error('No active session available. Please sign in.')
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
    sessionExists: !!currentSession,
    accessTokenExists: !!currentSession.access_token,
    tokenPreview: currentSession.access_token ? `${currentSession.access_token.substring(0, 20)}...` : 'N/A',
    userEmail: currentSession.user?.email,
    userId: currentSession.user?.id,
    expiresAt: currentSession.expires_at ? new Date(currentSession.expires_at * 1000).toISOString() : 'N/A'
  })

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${currentSession.access_token}`,
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
    const response = await authenticatedFetch(endpoint, options)
    
    // If we get a 401, try refreshing the session once more
    if (response.status === 401) {
      console.log('🔄 Got 401, attempting one more session refresh...')
      const supabase = await getSupabaseClient()
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
      
      if (!refreshError && refreshData.session) {
        console.log('✅ Second refresh successful, retrying request...')
        // Retry the request with the new session
        return await authenticatedFetch(endpoint, options)
      }
    }
    
    return response
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
    
    const fallbackResponse = await fetch(endpoint, fallbackOptions)
    
    // If fallback also fails with 401, the session is truly expired
    if (fallbackResponse.status === 401) {
      throw new Error('Session expired. Please sign in again.')
    }
    
    return fallbackResponse
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