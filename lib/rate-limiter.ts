import { NextRequest } from 'next/server'
import { authLogger } from './auth-logger'

interface RateLimitConfig {
  windowMs: number
  maxAttempts: number
  keyGenerator: (req: NextRequest) => string
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

interface RateLimitEntry {
  count: number
  resetAt: number
  firstAttempt: number
  lastAttempt: number
  blocked: boolean
}

// In-memory store (for production, use Redis or similar)
const rateLimitStore = new Map<string, RateLimitEntry>()

export class RateLimiter {
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = config
  }

  async checkLimit(req: NextRequest): Promise<{
    allowed: boolean
    remaining: number
    resetTime: number
    retryAfter?: number
  }> {
    const key = this.config.keyGenerator(req)
    const now = Date.now()
    const entry = rateLimitStore.get(key)

    // Clean up expired entries
    this.cleanup()

    if (!entry || entry.resetAt < now) {
      // No entry or expired, create new one
      const newEntry: RateLimitEntry = {
        count: 1,
        resetAt: now + this.config.windowMs,
        firstAttempt: now,
        lastAttempt: now,
        blocked: false
      }
      rateLimitStore.set(key, newEntry)

      authLogger.logRateLimit({
        ip: this.getClientIP(req),
        endpoint: req.nextUrl.pathname,
        attempts: 1,
        blocked: false
      })

      return {
        allowed: true,
        remaining: this.config.maxAttempts - 1,
        resetTime: newEntry.resetAt
      }
    }

    // Entry exists and is not expired
    if (entry.blocked) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
      
      authLogger.logRateLimit({
        ip: this.getClientIP(req),
        endpoint: req.nextUrl.pathname,
        attempts: entry.count,
        blocked: true
      })

      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetAt,
        retryAfter
      }
    }

    if (entry.count >= this.config.maxAttempts) {
      // Block the request
      entry.blocked = true
      entry.lastAttempt = now
      rateLimitStore.set(key, entry)

      authLogger.logRateLimit({
        ip: this.getClientIP(req),
        endpoint: req.nextUrl.pathname,
        attempts: entry.count,
        blocked: true
      })

      const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetAt,
        retryAfter
      }
    }

    // Increment count
    entry.count++
    entry.lastAttempt = now
    rateLimitStore.set(key, entry)

    authLogger.logRateLimit({
      ip: this.getClientIP(req),
      endpoint: req.nextUrl.pathname,
      attempts: entry.count,
      blocked: false
    })

    return {
      allowed: true,
      remaining: this.config.maxAttempts - entry.count,
      resetTime: entry.resetAt
    }
  }

  async recordSuccess(req: NextRequest): Promise<void> {
    if (this.config.skipSuccessfulRequests) {
      return
    }

    const key = this.config.keyGenerator(req)
    const entry = rateLimitStore.get(key)
    
    if (entry && !entry.blocked) {
      // Reset on successful request
      rateLimitStore.delete(key)
    }
  }

  async recordFailure(req: NextRequest): Promise<void> {
    if (this.config.skipFailedRequests) {
      return
    }

    // Failure is already recorded in checkLimit
  }

  private getClientIP(req: NextRequest): string {
    const forwarded = req.headers.get('x-forwarded-for')
    const realIP = req.headers.get('x-real-ip')
    const cfConnectingIP = req.headers.get('cf-connecting-ip')
    
    if (cfConnectingIP) return cfConnectingIP
    if (realIP) return realIP
    if (forwarded) return forwarded.split(',')[0].trim()
    
    return req.ip || 'unknown'
  }

  private cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []
    
    rateLimitStore.forEach((entry, key) => {
      if (entry.resetAt < now) {
        keysToDelete.push(key)
      }
    })
    
    keysToDelete.forEach(key => rateLimitStore.delete(key))
  }

  // Get current rate limit status for a key
  getStatus(key: string): RateLimitEntry | null {
    const entry = rateLimitStore.get(key)
    if (!entry || entry.resetAt < Date.now()) {
      return null
    }
    return entry
  }

  // Reset rate limit for a key
  reset(key: string): void {
    rateLimitStore.delete(key)
  }

  // Get all active rate limits (for monitoring)
  getAllActiveLimits(): Array<{ key: string; entry: RateLimitEntry }> {
    const now = Date.now()
    const active: Array<{ key: string; entry: RateLimitEntry }> = []
    
    rateLimitStore.forEach((entry, key) => {
      if (entry.resetAt >= now) {
        active.push({ key, entry })
      }
    })
    
    return active
  }
}

// Pre-configured rate limiters
export const loginRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxAttempts: 5,
  keyGenerator: (req) => {
    const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown'
    const email = req.nextUrl.searchParams.get('email')
    return `login:${ip}:${email || 'unknown'}`
  }
})

export const registrationRateLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxAttempts: 3,
  keyGenerator: (req) => {
    const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown'
    return `registration:${ip}`
  }
})

export const passwordResetRateLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxAttempts: 3,
  keyGenerator: (req) => {
    const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown'
    const email = req.nextUrl.searchParams.get('email')
    return `password_reset:${ip}:${email || 'unknown'}`
  }
})

export const apiRateLimiter = new RateLimiter({
  windowMs: 15 * 1000, // 15 seconds
  maxAttempts: 30,
  keyGenerator: (req) => {
    const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown'
    return `api:${ip}:${req.nextUrl.pathname}`
  }
})
