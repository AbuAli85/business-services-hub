/**
 * Comprehensive Real-time Hook for Admin Dashboard
 * Provides real-time subscriptions for all admin data with optimized performance
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { toast } from 'sonner'

interface RealtimeStatus {
  users: boolean
  services: boolean
  bookings: boolean
  invoices: boolean
  permissions: boolean
  verifications: boolean
  connected: boolean
  lastUpdate: Date | null
}

interface AdminRealtimeConfig {
  enableUsers?: boolean
  enableServices?: boolean
  enableBookings?: boolean
  enableInvoices?: boolean
  enablePermissions?: boolean
  enableVerifications?: boolean
  debounceMs?: number
  autoReconnect?: boolean
  showToasts?: boolean
}

interface RealtimeUpdate {
  table: string
  event: 'INSERT' | 'UPDATE' | 'DELETE'
  record: any
  timestamp: Date
}

export function useAdminRealtime(config: AdminRealtimeConfig = {}) {
  const {
    enableUsers = true,
    enableServices = true,
    enableBookings = true,
    enableInvoices = true,
    enablePermissions = true,
    enableVerifications = true,
    debounceMs = 1000,
    autoReconnect = true,
    showToasts = false
  } = config

  const [status, setStatus] = useState<RealtimeStatus>({
    users: false,
    services: false,
    bookings: false,
    invoices: false,
    permissions: false,
    verifications: false,
    connected: false,
    lastUpdate: null
  })

  const [updates, setUpdates] = useState<RealtimeUpdate[]>([])
  const [error, setError] = useState<string | null>(null)
  const channelsRef = useRef<Map<string, any>>(new Map())
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const updateCallbacksRef = useRef<Map<string, (update: RealtimeUpdate) => void>>(new Map())

  // Setup real-time subscriptions
  const setupRealtimeSubscriptions = useCallback(async () => {
    try {
      const supabase = await getSupabaseClient()
      
      // Clean up existing channels
      channelsRef.current.forEach(channel => {
        channel.unsubscribe()
      })
      channelsRef.current.clear()

      // Helper function to create subscription
      const createSubscription = (
        tableName: string,
        enabled: boolean,
        statusKey: keyof Omit<RealtimeStatus, 'connected' | 'lastUpdate'>
      ) => {
        if (!enabled) return

        const channel = supabase
          .channel(`admin-${tableName}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: tableName
            },
            (payload: any) => {
              const update: RealtimeUpdate = {
                table: tableName,
                event: payload.eventType,
                record: payload.new || payload.old,
                timestamp: new Date()
              }

              // Debounce updates to prevent excessive re-renders
              if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current)
              }

              debounceTimerRef.current = setTimeout(() => {
                setUpdates(prev => [update, ...prev].slice(0, 50)) // Keep last 50 updates
                setStatus(prev => ({
                  ...prev,
                  [statusKey]: true,
                  lastUpdate: new Date()
                }))

                // Call registered callbacks
                const callback = updateCallbacksRef.current.get(tableName)
                if (callback) {
                  callback(update)
                }

                // Show toast if enabled
                if (showToasts) {
                  const eventText = payload.eventType === 'INSERT' ? 'New' : 
                                   payload.eventType === 'UPDATE' ? 'Updated' :
                                   'Deleted'
                  toast.info(`${eventText} ${tableName.slice(0, -1)} detected`, {
                    duration: 2000
                  })
                }

                console.log(`🔄 Real-time ${payload.eventType} on ${tableName}:`, payload)
              }, debounceMs)
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              setStatus(prev => ({
                ...prev,
                [statusKey]: true,
                connected: true
              }))
              console.log(`✅ Subscribed to real-time updates for ${tableName}`)
            } else if (status === 'CHANNEL_ERROR') {
              setStatus(prev => ({
                ...prev,
                [statusKey]: false
              }))
              setError(`Failed to subscribe to ${tableName}`)
              console.error(`❌ Failed to subscribe to ${tableName}`)
            }
          })

        channelsRef.current.set(tableName, channel)
      }

      // Create subscriptions for each table
      createSubscription('profiles', enableUsers, 'users')
      createSubscription('services', enableServices, 'services')
      createSubscription('bookings', enableBookings, 'bookings')
      createSubscription('invoices', enableInvoices, 'invoices')
      createSubscription('user_roles_v2', enablePermissions, 'permissions')
      
      // Update overall connection status
      setStatus(prev => ({ ...prev, connected: true }))
      setError(null)

    } catch (err) {
      console.error('Error setting up real-time subscriptions:', err)
      setError(err instanceof Error ? err.message : 'Failed to setup real-time')
      setStatus(prev => ({ ...prev, connected: false }))
    }
  }, [
    enableUsers,
    enableServices,
    enableBookings,
    enableInvoices,
    enablePermissions,
    enableVerifications,
    debounceMs,
    showToasts
  ])

  // Register callback for specific table updates
  const onTableUpdate = useCallback((
    tableName: string,
    callback: (update: RealtimeUpdate) => void
  ) => {
    updateCallbacksRef.current.set(tableName, callback)
    
    return () => {
      updateCallbacksRef.current.delete(tableName)
    }
  }, [])

  // Cleanup function
  const cleanup = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    
    channelsRef.current.forEach(channel => {
      channel.unsubscribe()
    })
    channelsRef.current.clear()
    
    setStatus({
      users: false,
      services: false,
      bookings: false,
      invoices: false,
      permissions: false,
      verifications: false,
      connected: false,
      lastUpdate: null
    })
  }, [])

  // Initialize subscriptions
  useEffect(() => {
    setupRealtimeSubscriptions()

    // Auto-reconnect logic
    if (autoReconnect) {
      const reconnectInterval = setInterval(() => {
        if (!status.connected) {
          console.log('🔄 Attempting to reconnect real-time subscriptions...')
          setupRealtimeSubscriptions()
        }
      }, 30000) // Try to reconnect every 30 seconds

      return () => {
        clearInterval(reconnectInterval)
        cleanup()
      }
    }

    return cleanup
  }, [setupRealtimeSubscriptions, cleanup, autoReconnect, status.connected])

  // Get updates for specific table
  const getUpdatesForTable = useCallback((tableName: string) => {
    return updates.filter(update => update.table === tableName)
  }, [updates])

  // Clear updates
  const clearUpdates = useCallback(() => {
    setUpdates([])
  }, [])

  return {
    status,
    updates,
    error,
    connected: status.connected,
    lastUpdate: status.lastUpdate,
    onTableUpdate,
    getUpdatesForTable,
    clearUpdates,
    reconnect: setupRealtimeSubscriptions,
    disconnect: cleanup
  }
}

/**
 * Hook for real-time user updates
 */
export function useUsersRealtime(onUpdate?: (update: RealtimeUpdate) => void) {
  const { status, updates, ...rest } = useAdminRealtime({
    enableUsers: true,
    enableServices: false,
    enableBookings: false,
    enableInvoices: false,
    enablePermissions: false,
    enableVerifications: false
  })

  useEffect(() => {
    if (onUpdate) {
      const unsubscribe = rest.onTableUpdate('profiles', onUpdate)
      return unsubscribe
    }
  }, [onUpdate, rest])

  return {
    isConnected: status.users,
    updates: updates.filter(u => u.table === 'profiles'),
    ...rest
  }
}

/**
 * Hook for real-time service updates
 */
export function useServicesRealtime(onUpdate?: (update: RealtimeUpdate) => void) {
  const { status, updates, ...rest } = useAdminRealtime({
    enableUsers: false,
    enableServices: true,
    enableBookings: false,
    enableInvoices: false,
    enablePermissions: false,
    enableVerifications: false
  })

  useEffect(() => {
    if (onUpdate) {
      const unsubscribe = rest.onTableUpdate('services', onUpdate)
      return unsubscribe
    }
  }, [onUpdate, rest])

  return {
    isConnected: status.services,
    updates: updates.filter(u => u.table === 'services'),
    ...rest
  }
}

/**
 * Hook for real-time booking updates
 */
export function useBookingsRealtime(onUpdate?: (update: RealtimeUpdate) => void) {
  const { status, updates, ...rest } = useAdminRealtime({
    enableUsers: false,
    enableServices: false,
    enableBookings: true,
    enableInvoices: false,
    enablePermissions: false,
    enableVerifications: false
  })

  useEffect(() => {
    if (onUpdate) {
      const unsubscribe = rest.onTableUpdate('bookings', onUpdate)
      return unsubscribe
    }
  }, [onUpdate, rest])

  return {
    isConnected: status.bookings,
    updates: updates.filter(u => u.table === 'bookings'),
    ...rest
  }
}

/**
 * Hook for real-time invoice updates
 */
export function useInvoicesRealtime(onUpdate?: (update: RealtimeUpdate) => void) {
  const { status, updates, ...rest } = useAdminRealtime({
    enableUsers: false,
    enableServices: false,
    enableBookings: false,
    enableInvoices: true,
    enablePermissions: false,
    enableVerifications: false
  })

  useEffect(() => {
    if (onUpdate) {
      const unsubscribe = rest.onTableUpdate('invoices', onUpdate)
      return unsubscribe
    }
  }, [onUpdate, rest])

  return {
    isConnected: status.invoices,
    updates: updates.filter(u => u.table === 'invoices'),
    ...rest
  }
}

