/**
 * URL utilities for handling domain corrections and validation
 */

/**
 * Fixes common typos in domain names
 */
export function fixDomainTypos(url: string): string {
  if (!url) return url
  
  // Common typos for thedigitalmorph.com
  const typos = [
    { typo: 'theditgialmorph.com', correct: 'thedigitalmorph.com' },
    { typo: 'thedigitalmorph.com', correct: 'thedigitalmorph.com' }, // Already correct
    { typo: 'theditgialmorph', correct: 'thedigitalmorph' },
    { typo: 'thedigitalmorph', correct: 'thedigitalmorph' }, // Already correct
  ]
  
  let fixedUrl = url
  for (const { typo, correct } of typos) {
    if (fixedUrl.includes(typo)) {
      fixedUrl = fixedUrl.replace(typo, correct)
    }
  }
  
  return fixedUrl
}

/**
 * Ensures a URL has a proper protocol
 */
export function ensureProtocol(url: string): string {
  if (!url) return url
  
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  
  // Default to https for production domains
  if (url.includes('thedigitalmorph.com') || url.includes('localhost')) {
    return `https://${url}`
  }
  
  return `http://${url}`
}

/**
 * Gets the base URL for API calls with error correction
 */
export function getBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL
  
  // Log the original URL for debugging
  if (process.env.NODE_ENV !== 'production') {
    console.log('🔍 Original env URL:', envUrl)
  }
  
  if (envUrl) {
    const fixedUrl = fixDomainTypos(envUrl)
    const finalUrl = ensureProtocol(fixedUrl)
    
    // Log the corrected URL for debugging
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔧 Fixed URL:', finalUrl)
    }
    
    // Additional validation - if the URL still contains the typo, force correct it
    if (finalUrl.includes('theditgialmorph.com')) {
      const correctedUrl = finalUrl.replace('theditgialmorph.com', 'thedigitalmorph.com')
      console.warn('⚠️ Forced URL correction:', correctedUrl)
      return correctedUrl
    }
    
    return finalUrl
  }
  
  // Fallback URLs
  if (process.env.NODE_ENV === 'production') {
    return 'https://marketing.thedigitalmorph.com'
  }
  
  return 'http://localhost:3000'
}

/**
 * Validates if a URL is reachable (basic check)
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Creates a safe fetch with timeout and error handling
 */
export async function safeFetch(url: string, options: RequestInit = {}): Promise<Response | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    console.error('Safe fetch error:', error)
    return null
  }
}
