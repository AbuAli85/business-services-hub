import { useEffect, useRef, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase-client'
import toast from 'react-hot-toast'

export interface UseRealtimeOptions {
  userId?: string
  userRole?: 'client' | 'provider' | 'admin' | null
  enabled?: boolean
  onRefresh?: () => void
}

export function useRealtime({ userId, userRole, enabled = false, onRefresh }: UseRealtimeOptions) {
  const channelsRef = useRef<{
    bookings?: any
    milestones?: any
    invoices?: any
  }>({})
  const isMountedRef = useRef(true)
  const lastRefreshTimeRef = useRef(0)

  const refresh = useCallback(() => {
    const now = Date.now()
    // Throttle refreshes to prevent excessive calls
    if (now - lastRefreshTimeRef.current > 3000) {
      lastRefreshTimeRef.current = now
      onRefresh?.()
    }
  }, [onRefresh])

  useEffect(() => {
    if (!enabled || !userId || !userRole) return

    let isMounted = true
    isMountedRef.current = true

    const setupRealtimeSubscriptions = async () => {
      try {
        // Add delay to prevent immediate refresh after initial load
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        if (!isMounted) return
        
        const supabase = await getSupabaseClient()
        if (!isMounted) return

        // Bookings channel
        const bookingsBase = { event: '*', schema: 'public', table: 'bookings' } as any
        const bookingsOpts = userRole === 'admin'
          ? bookingsBase
          : { ...bookingsBase, filter: `or(client_id.eq.${userId},provider_id.eq.${userId})` }
        
        channelsRef.current.bookings = supabase
          .channel(`bookings-${userId}`)
          .on('postgres_changes', bookingsOpts, (payload: any) => {
            if (!isMounted) return
            
            // Only trigger refresh for important changes
            if (payload.eventType === 'INSERT' || 
                (payload.eventType === 'UPDATE' && payload.new?.status !== payload.old?.status)) {
              refresh()
              
              // Show toast notifications
              if (payload.eventType === 'INSERT') {
                toast.success('New booking received!')
              } else if (payload.eventType === 'UPDATE') {
                toast(`Booking status updated to ${payload.new.status}`)
              }
            }
          })
          .subscribe()

        // Milestones channel
        const milestonesBase = { event: '*', schema: 'public', table: 'milestones' } as any
        const milestonesOpts = userRole === 'admin'
          ? milestonesBase
          : { ...milestonesBase, filter: `booking_id.in.(select id from bookings where or(client_id.eq.${userId},provider_id.eq.${userId}))` }
        
        channelsRef.current.milestones = supabase
          .channel(`milestones-${userId}`)
          .on('postgres_changes', milestonesOpts, (payload: any) => {
            if (!isMounted) return
            
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              refresh()
            }
          })
          .subscribe()

        // Invoices channel
        const invoicesBase = { event: '*', schema: 'public', table: 'invoices' } as any
        const invoicesOpts = userRole === 'admin'
          ? invoicesBase
          : { ...invoicesBase, filter: `or(client_id.eq.${userId},provider_id.eq.${userId})` }
        
        channelsRef.current.invoices = supabase
          .channel(`invoices-${userId}`)
          .on('postgres_changes', invoicesOpts, (payload: any) => {
            if (!isMounted) return
            
            if (payload.eventType === 'INSERT' || 
                (payload.eventType === 'UPDATE' && payload.new?.status !== payload.old?.status)) {
              refresh()
              
              if (payload.eventType === 'INSERT') {
                toast.success('New invoice created!')
              }
            }
          })
          .subscribe()

      } catch (error) {
        console.error('❌ Realtime subscription error:', error)
      }
    }

    setupRealtimeSubscriptions()

    // Cleanup function
    return () => {
      isMounted = false
      isMountedRef.current = false
      
      const cleanup = async () => {
        try {
          const supabase = await getSupabaseClient()
          if (channelsRef.current.bookings) {
            supabase.removeChannel(channelsRef.current.bookings)
          }
          if (channelsRef.current.milestones) {
            supabase.removeChannel(channelsRef.current.milestones)
          }
          if (channelsRef.current.invoices) {
            supabase.removeChannel(channelsRef.current.invoices)
          }
        } catch (error) {
          console.warn('Error cleaning up subscriptions:', error)
        }
      }
      
      cleanup()
    }
  }, [enabled, userId, userRole, refresh])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])
}
