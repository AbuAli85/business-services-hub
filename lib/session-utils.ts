/**
 * Utility functions for session management and cleanup
 */

export interface SessionCleanupOptions {
  clearLocalStorage?: boolean
  clearSessionStorage?: boolean
  redirectTo?: string
}

/**
 * Clears all authentication-related data from storage
 */
export function clearAuthData(options: SessionCleanupOptions = {}) {
  const {
    clearLocalStorage = true,
    clearSessionStorage = true,
  } = options

  if (typeof window === 'undefined') return

  try {
    // Clear Supabase auth tokens
    if (clearLocalStorage) {
      const keysToRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (
          key.includes('sb-') || 
          key.includes('supabase') ||
          key.includes('auth-token')
        )) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key))
    }

    // Clear session storage
    if (clearSessionStorage) {
      const keysToRemove = []
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key && (
          key.includes('sb-') || 
          key.includes('supabase') ||
          key.includes('auth-token')
        )) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => sessionStorage.removeItem(key))
    }

    console.log('🧹 Auth data cleared from storage')
  } catch (error) {
    console.error('Error clearing auth data:', error)
  }
}

/**
 * Checks if a refresh token error is recoverable
 */
export function isRefreshTokenError(error: any): boolean {
  if (!error || typeof error.message !== 'string') return false
  
  const refreshTokenErrors = [
    'Invalid Refresh Token',
    'Refresh Token Not Found',
    'refresh_token_not_found',
    'invalid_grant',
    'Token has expired'
  ]
  
  return refreshTokenErrors.some(errorType => 
    error.message.includes(errorType)
  )
}

/**
 * Safely signs out a user and clears all auth data
 */
export async function safeSignOut(
  supabase: any, 
  options: SessionCleanupOptions = {}
): Promise<void> {
  try {
    // Clear auth data first
    clearAuthData(options)
    
    // Attempt to sign out from Supabase
    await supabase.auth.signOut()
    
    console.log('✅ User signed out successfully')
  } catch (error) {
    console.error('Error during sign out:', error)
    
    // Even if sign out fails, clear local data
    clearAuthData(options)
  }
}

/**
 * Validates if a session is still valid
 */
export function isSessionValid(session: any): boolean {
  if (!session) return false
  
  const now = Math.floor(Date.now() / 1000)
  const expiresAt = session.expires_at || 0
  
  // Consider session invalid if it expires within 30 seconds
  return expiresAt > (now + 30)
}

/**
 * Gets time remaining until session expires
 */
export function getSessionTimeRemaining(session: any): number {
  if (!session) return 0
  
  const now = Math.floor(Date.now() / 1000)
  const expiresAt = session.expires_at || 0
  
  return Math.max(0, expiresAt - now)
}
