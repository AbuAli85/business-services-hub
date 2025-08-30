/**
 * Local API Configuration
 * 
 * This file handles API calls using relative URLs for local development
 * and same-domain requests. No cross-domain routing is implemented.
 */

// API Configuration
export const API_CONFIG = {
  // Development fallback
  DEV_FALLBACK: 'http://localhost:3001'
}

/**
 * Gets the appropriate API URL based on the current domain
 * @param endpoint - The API endpoint (e.g., '/api/bookings')
 * @returns The API URL (always relative for now)
 */
export function getApiUrl(endpoint: string): string {
  // Always use relative URLs to avoid cross-domain issues
  console.log('🔗 Using relative URL:', endpoint)
  return endpoint
}

/**
 * Creates a fetch request with proper configuration
 * @param endpoint - The API endpoint
 * @param options - Fetch options
 * @returns Fetch promise
 */
export async function crossDomainFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const url = getApiUrl(endpoint)
  
  // Add headers for requests
  const fetchOptions: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  }
  
  console.log('🌐 Making API call:', {
    originalEndpoint: endpoint,
    finalUrl: url,
    method: options.method || 'GET'
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
  isDevelopment: boolean
} {
  let currentHost: string | null = null
  
  if (typeof window !== 'undefined') {
    currentHost = window.location.hostname
  }
  
  const isDevelopment = currentHost === 'localhost' || currentHost === '127.0.0.1'
  
  return {
    currentHost,
    isDevelopment
  }
}

/**
 * Environment variable validation
 */
export function validateApiConfig(): string[] {
  // No environment variables required for local-only setup
  return []
}

// Log configuration on load
if (typeof window !== 'undefined') {
  const currentHost = window.location.hostname
  
  if (currentHost === 'marketing.thedigitalmorph.com' || 
      currentHost === 'www.marketing.thedigitalmorph.com') {
    console.error('🚨 🚨 🚨 IMPORTANT: You are on the marketing site! 🚨 🚨 🚨')
    console.error('🚨 The API endpoints (/api/bookings, /api/services, etc.) do NOT exist on this domain')
    console.error('🚨 This will cause 404 errors for all API calls')
    console.error('🚨')
    console.error('🚨 SOLUTIONS:')
    console.error('🚨 1. Use localhost:3001 for development (npm run dev)')
    console.error('🚨 2. Use the portal site for production')
    console.error('🚨 3. Contact your developer to set up proper cross-domain API routing')
    console.error('🚨')
    console.error('🔧 Current configuration: Local-only API (no cross-domain support)')
  } else {
    console.log('🔧 Local API Configuration loaded:', {
      currentHost: currentHost,
      mode: 'local-only'
    })
  }
}
