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

    // Synchronize the refreshed token to cookies for middleware compatibility
    try {
      await syncTokenToCookies(refreshData.session)
      console.log('✅ Refreshed token synchronized to cookies')
    } catch (syncError) {
      console.warn('⚠️ Failed to sync token to cookies:', syncError)
      // Don't fail the request if cookie sync fails
    }
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

      // Check if we already have a valid session first
      const supabase = await getSupabaseClient()
      const { data: { session: currentSession } } = await supabase.auth.getSession()

      if (currentSession) {
        console.log('✅ Already have valid session, using it directly')

        // Synchronize the current token to cookies for middleware compatibility
        try {
          await syncTokenToCookies(currentSession)
          console.log('✅ Current token synchronized to cookies')

          // Add a small delay to ensure cookies are properly set
          await new Promise(resolve => setTimeout(resolve, 50))
        } catch (syncError) {
          console.warn('⚠️ Failed to sync current token to cookies:', syncError)
        }

        // Try the request again with the current session
        return await authenticatedFetch(endpoint, options)
      }

      // No valid session, try refreshing
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()

      if (!refreshError && refreshData.session) {
        console.log('✅ Token refresh successful, retrying request...')

        // Synchronize the refreshed token to cookies for middleware compatibility
        try {
          await syncTokenToCookies(refreshData.session)
          console.log('✅ Refreshed token synchronized to cookies')

          // Add a small delay to ensure cookies are properly set
          await new Promise(resolve => setTimeout(resolve, 100))
        } catch (syncError) {
          console.warn('⚠️ Failed to sync refreshed token to cookies:', syncError)
        }

        // Retry the request with the new session
        console.log('🔄 Retrying request with refreshed token...')
        const retryResponse = await authenticatedFetch(endpoint, options)

        // If the retry also fails with 401, the issue is not just token refresh
        if (retryResponse.status === 401) {
          console.log('❌ Second attempt also failed with 401, falling back to cookies')
          // Fall through to cookie-based fallback
        } else {
          return retryResponse
        }
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

/**
 * Synchronize the refreshed token to cookies for middleware compatibility
 */
async function syncTokenToCookies(session: any): Promise<void> {
  if (!session || !session.access_token) {
    throw new Error('No session or access token available')
  }

  console.log('🔄 Syncing token to cookies for middleware compatibility')

  // Use document.cookie directly for immediate synchronization
  if (typeof document !== 'undefined') {
    try {
      // Calculate cookie expiration time
      const expiresAt = session.expires_at ? new Date(session.expires_at * 1000) : new Date(Date.now() + 3600 * 1000)
      const maxAge = session.expires_at ? session.expires_at - Math.floor(Date.now() / 1000) : 3600

      const cookieOptions = `; path=/; max-age=${maxAge}; secure; samesite=lax`

      // Set access token cookie
      document.cookie = `sb-access-token=${session.access_token}${cookieOptions}`

      // Set refresh token cookie if available
      if (session.refresh_token) {
        document.cookie = `sb-refresh-token=${session.refresh_token}${cookieOptions}`
      }

      // Also try to set the standard Supabase cookie names
      document.cookie = `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0] || 'default'}-auth-token=${JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token || '',
        expires_at: session.expires_at || 0,
        token_type: session.token_type || 'bearer'
      })}${cookieOptions}`

      console.log('✅ Token synchronized to cookies via document.cookie')

      // Also try the API method as backup
      try {
        const response = await fetch('/api/auth/sync-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token || '',
            expires_at: session.expires_at || 0,
            token_type: session.token_type || 'bearer'
          }),
          credentials: 'include'
        })

        if (!response.ok) {
          console.warn('⚠️ Token sync API call failed:', response.status)
        } else {
          console.log('✅ Token also synchronized via API')
        }
      } catch (apiError) {
        console.warn('⚠️ Token sync API call failed (non-critical):', apiError)
      }

    } catch (cookieError) {
      console.error('❌ Document cookie sync failed:', cookieError)
      throw cookieError
    }
  } else {
    // Server-side fallback - try API method
    try {
      const response = await fetch('/api/auth/sync-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token || '',
          expires_at: session.expires_at || 0,
          token_type: session.token_type || 'bearer'
        }),
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ Token sync API call failed:', response.status, errorData)
        throw new Error(`Token sync failed: ${response.status}`)
      } else {
        console.log('✅ Token synchronized to cookies via API')
      }
    } catch (error) {
      console.error('❌ Token sync failed:', error)
      throw error
    }
  }
}