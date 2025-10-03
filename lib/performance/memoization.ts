/**
 * Performance optimization utilities for React components
 */

import { useMemo, useCallback, useRef, useEffect } from 'react'

/**
 * Memoize expensive calculations
 * Use this for complex data transformations
 */
export function useMemoizedValue<T>(
  factory: () => T,
  deps: React.DependencyList
): T {
  return useMemo(factory, deps)
}

/**
 * Memoize callback functions to prevent unnecessary re-renders
 */
export function useMemoizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  return useCallback(callback, deps) as T
}

/**
 * Debounce a value (useful for search inputs)
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Throttle a function to limit execution rate
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 500
): T {
  const lastRun = useRef(Date.now())

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now()
      if (now - lastRun.current >= delay) {
        lastRun.current = now
        return callback(...args)
      }
    },
    [callback, delay]
  ) as T
}

/**
 * Cache expensive API calls
 */
class SimpleCache<T> {
  private cache = new Map<string, { data: T; timestamp: number }>()
  private ttl: number

  constructor(ttl: number = 5 * 60 * 1000) {
    // 5 minutes default
    this.ttl = ttl
  }

  get(key: string): T | null {
    const item = this.cache.get(key)
    if (!item) return null

    const isExpired = Date.now() - item.timestamp > this.ttl
    if (isExpired) {
      this.cache.delete(key)
      return null
    }

    return item.data
  }

  set(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    })
  }

  clear(): void {
    this.cache.clear()
  }

  has(key: string): boolean {
    return this.cache.has(key) && this.get(key) !== null
  }
}

// Global caches for different data types
export const bookingsCache = new SimpleCache<any>(5 * 60 * 1000)
export const servicesCache = new SimpleCache<any>(10 * 60 * 1000)
export const profileCache = new SimpleCache<any>(15 * 60 * 1000)

/**
 * Hook to use cached data
 */
export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  cache: SimpleCache<T>
): {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
} {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Check cache first
      const cached = cache.get(key)
      if (cached) {
        setData(cached)
        setLoading(false)
        return
      }

      // Fetch fresh data
      const freshData = await fetcher()
      cache.set(key, freshData)
      setData(freshData)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [key, fetcher, cache])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  }
}

// Need to import useState
import { useState } from 'react'

export default {
  useMemoizedValue,
  useMemoizedCallback,
  useDebounce,
  useThrottle,
  SimpleCache,
  bookingsCache,
  servicesCache,
  profileCache,
  useCachedData,
}

