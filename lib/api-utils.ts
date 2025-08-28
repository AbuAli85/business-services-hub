/**
 * API utility functions to ensure all API calls use relative paths
 * This prevents issues with hardcoded domain URLs in production
 */

/**
 * Ensures an API endpoint uses a relative path
 * @param endpoint - The API endpoint (e.g., '/api/bookings' or 'api/bookings')
 * @returns The endpoint with a leading slash
 */
export function getApiEndpoint(endpoint: string): string {
  // Ensure endpoint starts with / for relative paths
  return endpoint.startsWith('/') ? endpoint : `/${endpoint}`
}

/**
 * Creates a fetch request with proper headers and relative path
 * @param endpoint - The API endpoint
 * @param options - Fetch options
 * @returns Fetch promise
 */
export function apiRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const url = getApiEndpoint(endpoint)
  
  // Ensure we're using relative paths
  if (url.startsWith('http')) {
    console.warn('⚠️ API call using absolute URL detected:', url)
    // Convert to relative path
    const relativePath = new URL(url).pathname
    return fetch(relativePath, options)
  }
  
  return fetch(url, options)
}

/**
 * Common API endpoints that should always use relative paths
 */
export const API_ENDPOINTS = {
  BOOKINGS: '/api/bookings',
  SERVICES: '/api/services',
  MESSAGES: '/api/messages',
  PAYMENTS: '/api/payments/create-intent',
  TRACKING: '/api/tracking',
  REPORTS: '/api/reports',
  WEBHOOKS: '/api/webhooks',
  AUTH: '/api/auth/profile-creation'
} as const

/**
 * Type-safe API endpoint getter
 */
export function getApiUrl(endpoint: keyof typeof API_ENDPOINTS): string {
  const baseUrl = API_ENDPOINTS[endpoint]
  // Add cache-busting version parameter to prevent stale API calls
  const version = Date.now()
  return `${baseUrl}?v=${version}`
}
