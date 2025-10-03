import { useState, useEffect, useCallback } from 'react'
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { realtimeOptimizer } from '@/lib/realtime-optimizer'

interface SubscriptionConfig {
  table: string
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  filter?: string
  callback: (payload: RealtimePostgresChangesPayload<any>) => void
  debounceMs?: number
  maxRetries?: number
}

/**
 * Optimized Realtime Hook
 * 
 * This hook provides optimized realtime subscriptions that reduce database load
 * by implementing debouncing, connection pooling, and automatic cleanup.
 * 
 * Based on performance analysis showing 92.8% of database time consumed by
 * realtime.list_changes queries.
 */
export function useOptimizedRealtime(
  supabase: any,
  config: SubscriptionConfig,
  dependencies: any[] = []
) {
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) {
      setError('Supabase client is required')
      return
    }

    try {
      const id = realtimeOptimizer.subscribe(supabase, {
        ...config,
        callback: (payload) => {
          try {
            config.callback(payload)
            setIsConnected(true)
            setError(null)
          } catch (err) {
            console.error('Realtime callback error:', err)
            setError(err instanceof Error ? err.message : 'Callback error')
          }
        }
      })
      
      setSubscriptionId(id)
      setIsConnected(true)
      setError(null)

      return () => {
        realtimeOptimizer.unsubscribe(id)
        setSubscriptionId(null)
        setIsConnected(false)
      }
    } catch (err) {
      console.error('Failed to create realtime subscription:', err)
      setError(err instanceof Error ? err.message : 'Subscription error')
      setIsConnected(false)
    }
  }, dependencies)

  const unsubscribe = useCallback(() => {
    if (subscriptionId) {
      realtimeOptimizer.unsubscribe(subscriptionId)
      setSubscriptionId(null)
      setIsConnected(false)
    }
  }, [subscriptionId])

  return {
    subscriptionId,
    isConnected,
    error,
    unsubscribe
  }
}

/**
 * Hook for booking-specific realtime subscriptions
 */
export function useBookingRealtime(
  supabase: any,
  bookingId: string,
  onUpdate: (payload: RealtimePostgresChangesPayload<any>) => void
) {
  return useOptimizedRealtime(
    supabase,
    {
      table: 'bookings',
      event: 'UPDATE',
      filter: `id=eq.${bookingId}`,
      callback: onUpdate,
      debounceMs: 500 // 500ms debounce for booking updates
    },
    [bookingId]
  )
}

/**
 * Hook for milestone realtime subscriptions
 */
export function useMilestoneRealtime(
  supabase: any,
  bookingId: string,
  onUpdate: (payload: RealtimePostgresChangesPayload<any>) => void
) {
  return useOptimizedRealtime(
    supabase,
    {
      table: 'milestones',
      event: '*',
      filter: `booking_id=eq.${bookingId}`,
      callback: onUpdate,
      debounceMs: 1000 // 1s debounce for milestone updates
    },
    [bookingId]
  )
}

/**
 * Hook for notification realtime subscriptions
 */
export function useNotificationRealtime(
  supabase: any,
  userId: string,
  onUpdate: (payload: RealtimePostgresChangesPayload<any>) => void
) {
  return useOptimizedRealtime(
    supabase,
    {
      table: 'notifications',
      event: 'INSERT',
      filter: `user_id=eq.${userId}`,
      callback: onUpdate,
      debounceMs: 200 // 200ms debounce for notifications
    },
    [userId]
  )
}

/**
 * Hook for service realtime subscriptions
 */
export function useServiceRealtime(
  supabase: any,
  providerId: string,
  onUpdate: (payload: RealtimePostgresChangesPayload<any>) => void
) {
  return useOptimizedRealtime(
    supabase,
    {
      table: 'services',
      event: '*',
      filter: `provider_id=eq.${providerId}`,
      callback: onUpdate,
      debounceMs: 2000 // 2s debounce for service updates
    },
    [providerId]
  )
}

/**
 * Hook to get realtime performance statistics
 */
export function useRealtimeStats() {
  const [stats, setStats] = useState(realtimeOptimizer.getStats())

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(realtimeOptimizer.getStats())
    }, 5000) // Update stats every 5 seconds

    return () => clearInterval(interval)
  }, [])

  return stats
}
