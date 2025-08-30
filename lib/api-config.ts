/**
 * Cross-Domain API Configuration
 * 
 * This file automatically routes API calls between different domains:
 * - Marketing site (marketing.thedigitalmorph.com) → Portal site (portal.thesmartpro.io)
 * - Portal site (portal.thesmartpro.io) → Same domain
 * - Development (localhost) → Same domain
 */

// API Configuration
export const API_CONFIG = {
  // Portal site base URL (where the actual APIs are hosted)
  PORTAL_BASE_URL: process.env.NEXT_PUBLIC_PORTAL_API_URL || 'https://portal.thesmartpro.io',
  
  // Marketing site URL
  MARKETING_URL: process.env.NEXT_PUBLIC_MARKETING_URL || 'https://marketing.thedigitalmorph.com',
  
  // Development fallback
  DEV_FALLBACK: 'http://localhost:3001'
}

/**
 * Gets the appropriate API URL based on the current domain
 * @param endpoint - The API endpoint (e.g., '/api/bookings')
 * @returns The full API URL
 */
export function getApiUrl(endpoint: string): string {
  // If we're in a browser environment
  if (typeof window !== 'undefined') {
    const currentHost = window.location.hostname
    
    // If we're on the marketing site, call the portal site
    if (currentHost === 'marketing.thedigitalmorph.com' || 
        currentHost === 'www.marketing.thedigitalmorph.com') {
      console.log('🔗 Marketing site detected, routing to portal:', `${API_CONFIG.PORTAL_BASE_URL}${endpoint}`)
      return `${API_CONFIG.PORTAL_BASE_URL}${endpoint}`
    }
    
    // If we're on the portal site, use relative URLs
    if (currentHost === 'portal.thesmartpro.io' || 
        currentHost === 'www.portal.thesmartpro.io') {
      console.log('🔗 Portal site detected, using relative URL:', endpoint)
      return endpoint
    }
    
    // If we're in development (localhost), use relative URLs
    if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
      console.log('🔗 Development environment detected, using relative URL:', endpoint)
      return endpoint
    }
  }
  
  // Server-side or fallback: use relative URLs
  console.log('🔗 Server-side or fallback, using relative URL:', endpoint)
  return endpoint
}

/**
 * Creates a fetch request with proper cross-domain configuration
 * @param endpoint - The API endpoint
 * @param options - Fetch options
 * @returns Fetch promise
 */
export async function crossDomainFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const url = getApiUrl(endpoint)
  
  // Add CORS headers for cross-domain requests
  const fetchOptions: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    // Include credentials for cross-domain requests
    credentials: 'include',
  }
  
  console.log('🌐 Making cross-domain API call:', {
    originalEndpoint: endpoint,
    finalUrl: url,
    method: options.method || 'GET',
    isCrossDomain: url !== endpoint
  })
  
  return fetch(url, fetchOptions)
}

/**
 * Specific API endpoint helpers
 */
export const API_ENDPOINTS = {
  BOOKINGS: '/api/bookings',
  SERVICES: '/api/services',
  TRACKING: '/api/tracking',
  REPORTS: '/api/reports',
  PAYMENTS: '/api/payments',
  WEBHOOKS: '/api/webhooks',
  MESSAGES: '/api/messages',
  AUTH: '/api/auth/profile-creation'
} as const

/**
 * Type-safe API endpoint getter
 */
export function getApiUrlFor(endpoint: keyof typeof API_ENDPOINTS): string {
  return getApiUrl(API_ENDPOINTS[endpoint])
}

/**
 * Test function to verify API configuration
 */
export function testApiConfiguration(): {
  currentHost: string | null
  portalUrl: string
  marketingUrl: string
  isMarketingSite: boolean
  isPortalSite: boolean
  isDevelopment: boolean
} {
  let currentHost: string | null = null
  
  if (typeof window !== 'undefined') {
    currentHost = window.location.hostname
  }
  
  const isMarketingSite = currentHost === 'marketing.thedigitalmorph.com' || 
                          currentHost === 'www.marketing.thedigitalmorph.com'
  
  const isPortalSite = currentHost === 'portal.thesmartpro.io' || 
                       currentHost === 'www.portal.thesmartpro.io'
  
  const isDevelopment = currentHost === 'localhost' || currentHost === '127.0.0.1'
  
  return {
    currentHost,
    portalUrl: API_CONFIG.PORTAL_BASE_URL,
    marketingUrl: API_CONFIG.MARKETING_URL,
    isMarketingSite,
    isPortalSite,
    isDevelopment
  }
}

/**
 * Environment variable validation
 */
export function validateApiConfig(): string[] {
  const errors: string[] = []
  
  if (!process.env.NEXT_PUBLIC_PORTAL_API_URL) {
    errors.push('NEXT_PUBLIC_PORTAL_API_URL is not set')
  }
  
  if (!process.env.NEXT_PUBLIC_MARKETING_URL) {
    errors.push('NEXT_PUBLIC_MARKETING_URL is not set')
  }
  
  return errors
}

// Log configuration on load
if (typeof window !== 'undefined') {
  console.log('🔧 API Configuration loaded:', {
    portalBaseUrl: API_CONFIG.PORTAL_BASE_URL,
    marketingUrl: API_CONFIG.MARKETING_URL,
    currentHost: window.location.hostname
  })
}
