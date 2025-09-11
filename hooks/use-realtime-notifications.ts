import { useState, useEffect, useRef } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { Notification } from '@/types/notifications'
import { RealtimeChannel } from '@supabase/supabase-js'

interface UseRealtimeNotificationsProps {
  userId: string
  enabled?: boolean
}

export function useRealtimeNotifications({ userId, enabled = true }: UseRealtimeNotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabaseRef = useRef<any>(null)

  useEffect(() => {
    if (!enabled || !userId) return

    const initializeRealtime = async () => {
      try {
        setLoading(true)
        setError(null)

        // Get Supabase client
        const supabase = await getSupabaseClient()
        supabaseRef.current = supabase

        // Load initial notifications
        const { data: initialNotifications, error: fetchError } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50)

        if (fetchError) {
          console.error('Error fetching initial notifications:', fetchError)
          setError('Failed to load notifications')
          return
        }

        setNotifications(initialNotifications || [])

        // Set up real-time subscription
        const channel = supabase
          .channel(`notifications:${userId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${userId}`
            },
            (payload) => {
              console.log('🔔 Real-time notification update:', payload)
              
              if (payload.eventType === 'INSERT') {
                // New notification added
                const newNotification = payload.new as Notification
                setNotifications(prev => [newNotification, ...prev])
              } else if (payload.eventType === 'UPDATE') {
                // Notification updated (e.g., marked as read)
                const updatedNotification = payload.new as Notification
                setNotifications(prev => 
                  prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
                )
              } else if (payload.eventType === 'DELETE') {
                // Notification deleted
                const deletedId = payload.old.id
                setNotifications(prev => prev.filter(n => n.id !== deletedId))
              }
            }
          )
          .subscribe((status) => {
            console.log('🔔 Realtime subscription status:', status)
            if (status === 'SUBSCRIBED') {
              console.log('✅ Successfully subscribed to real-time notifications')
            } else if (status === 'CHANNEL_ERROR') {
              console.error('❌ Realtime subscription error')
              setError('Failed to connect to real-time updates')
            }
          })

        channelRef.current = channel

      } catch (err) {
        console.error('Error initializing real-time notifications:', err)
        setError('Failed to initialize notifications')
      } finally {
        setLoading(false)
      }
    }

    initializeRealtime()

    // Cleanup on unmount or dependency change
    return () => {
      if (channelRef.current) {
        console.log('🔔 Unsubscribing from real-time notifications')
        supabaseRef.current?.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [userId, enabled])

  // Manual refresh function
  const refresh = async () => {
    if (!supabaseRef.current || !userId) return

    try {
      setLoading(true)
      const { data, error } = await supabaseRef.current
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Error refreshing notifications:', error)
        setError('Failed to refresh notifications')
      } else {
        setNotifications(data || [])
        setError(null)
      }
    } catch (err) {
      console.error('Error refreshing notifications:', err)
      setError('Failed to refresh notifications')
    } finally {
      setLoading(false)
    }
  }

  return {
    notifications,
    loading,
    error,
    refresh
  }
}
