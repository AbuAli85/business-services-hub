/**
 * Simple cache implementation for bookings data
 * Helps reduce unnecessary API calls and improve performance
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
}

class BookingCache {
  private cache: Map<string, CacheEntry<any>> = new Map()
  private readonly DEFAULT_TTL = 60000 // 1 minute default TTL

  /**
   * Get cached data if available and not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  /**
   * Set cache data with optional TTL
   */
  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl
    }
    
    this.cache.set(key, entry)
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Invalidate all cache entries matching a pattern
   */
  invalidatePattern(pattern: RegExp): void {
    const keysToDelete: string[] = []
    this.cache.forEach((_, key) => {
      if (pattern.test(key)) {
        keysToDelete.push(key)
      }
    })
    keysToDelete.forEach(key => this.cache.delete(key))
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics for debugging
   */
  getStats() {
    const now = Date.now()
    let validEntries = 0
    let expiredEntries = 0

    this.cache.forEach((entry) => {
      if (now > entry.expiresAt) {
        expiredEntries++
      } else {
        validEntries++
      }
    })

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries
    }
  }
}

// Export singleton instance
export const bookingCache = new BookingCache()

/**
 * Generate cache key for bookings list
 */
export function getBookingsCacheKey(params: {
  userRole?: string
  userId?: string
  page?: number
  pageSize?: number
  statusFilter?: string
  searchQuery?: string
  sortBy?: string
  sortOrder?: string
}): string {
  return `bookings:${JSON.stringify(params)}`
}

/**
 * Generate cache key for single booking
 */
export function getBookingCacheKey(bookingId: string): string {
  return `booking:${bookingId}`
}

/**
 * Generate cache key for summary stats
 */
export function getSummaryCacheKey(userRole?: string, userId?: string): string {
  return `summary:${userRole}:${userId}`
}
