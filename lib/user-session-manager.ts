/**
 * User Session Manager
 * Ensures proper user isolation and prevents data conflicts between users
 */

import { profileManager } from './profile-manager'

interface UserSession {
  userId: string
  sessionId: string
  loginTime: number
  lastActivity: number
  profileData?: any
}

export class UserSessionManager {
  private static instance: UserSessionManager
  private activeSessions = new Map<string, UserSession>()
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000 // 5 minutes

  constructor() {
    this.startCleanupTimer()
  }

  static getInstance(): UserSessionManager {
    if (!UserSessionManager.instance) {
      UserSessionManager.instance = new UserSessionManager()
    }
    return UserSessionManager.instance
  }

  /**
   * Start a new user session
   */
  startSession(userId: string): string {
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid userId provided')
    }

    // Clear any existing session for this user
    this.endSession(userId)

    const sessionId = this.generateSessionId()
    const now = Date.now()

    const session: UserSession = {
      userId,
      sessionId,
      loginTime: now,
      lastActivity: now
    }

    this.activeSessions.set(userId, session)
    
    // Clear any cached profile data to ensure fresh data
    profileManager.clearCache(userId)
    
    console.log('🆕 Started session for user:', userId, 'session:', sessionId)
    
    return sessionId
  }

  /**
   * End a user session and clean up data
   */
  endSession(userId: string): void {
    if (!userId) return

    const session = this.activeSessions.get(userId)
    if (session) {
      console.log('🔚 Ending session for user:', userId, 'session:', session.sessionId)
      
      // Clear profile cache for this user
      profileManager.clearCache(userId)
      
      // Remove session
      this.activeSessions.delete(userId)
    }
  }

  /**
   * Update last activity for a user
   */
  updateActivity(userId: string): void {
    const session = this.activeSessions.get(userId)
    if (session) {
      session.lastActivity = Date.now()
    }
  }

  /**
   * Check if a user session is valid
   */
  isSessionValid(userId: string): boolean {
    const session = this.activeSessions.get(userId)
    if (!session) return false

    const now = Date.now()
    const timeSinceActivity = now - session.lastActivity

    if (timeSinceActivity > this.SESSION_TIMEOUT) {
      console.log('⏰ Session expired for user:', userId)
      this.endSession(userId)
      return false
    }

    return true
  }

  /**
   * Get current user session
   */
  getSession(userId: string): UserSession | null {
    if (!this.isSessionValid(userId)) {
      return null
    }
    
    return this.activeSessions.get(userId) || null
  }

  /**
   * Clear all sessions (for debugging/logout)
   */
  clearAllSessions(): void {
    console.log('🧹 Clearing all user sessions')
    
    // Clear all profile caches
    profileManager.clearCache()
    
    // Clear all sessions
    this.activeSessions.clear()
  }

  /**
   * Get session statistics for debugging
   */
  getSessionStats(): { 
    totalSessions: number
    activeSessions: Array<{ userId: string; sessionAge: number; lastActivity: number }>
  } {
    const now = Date.now()
    const activeSessions = Array.from(this.activeSessions.values()).map(session => ({
      userId: session.userId,
      sessionAge: now - session.loginTime,
      lastActivity: now - session.lastActivity
    }))

    return {
      totalSessions: this.activeSessions.size,
      activeSessions
    }
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Start cleanup timer to remove expired sessions
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanupExpiredSessions()
    }, this.CLEANUP_INTERVAL)
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now()
    const expiredUsers: string[] = []

    for (const [userId, session] of Array.from(this.activeSessions.entries())) {
      const timeSinceActivity = now - session.lastActivity
      
      if (timeSinceActivity > this.SESSION_TIMEOUT) {
        expiredUsers.push(userId)
      }
    }

    expiredUsers.forEach(userId => {
      console.log('🧹 Cleaning up expired session for user:', userId)
      this.endSession(userId)
    })

    if (expiredUsers.length > 0) {
      console.log('🧹 Cleaned up', expiredUsers.length, 'expired sessions')
    }
  }
}

// Export singleton instance
export const userSessionManager = UserSessionManager.getInstance()

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).userSessionManager = userSessionManager
  (window as any).profileManager = profileManager
}
