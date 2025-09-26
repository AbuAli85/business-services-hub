'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface ProgressUpdate {
  bookingId: string
  milestoneId: string
  taskId?: string
  type: 'task' | 'milestone' | 'booking'
  action: 'create' | 'update' | 'delete' | 'complete'
  data: any
  timestamp: string
}

interface RealtimeProgressProps {
  bookingId: string
  onProgressUpdate?: (update: ProgressUpdate) => void
  onMilestoneComplete?: (milestoneId: string) => void
  onBookingComplete?: (bookingId: string) => void
}

export function useRealtimeProgress({ 
  bookingId, 
  onProgressUpdate, 
  onMilestoneComplete, 
  onBookingComplete 
}: RealtimeProgressProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)
  const channelRef = useRef<any>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5

  const connect = useCallback(async () => {
    try {
      const supabase = await getSupabaseClient()
      
      // Clean up existing connection
      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current)
      }

      // Create filter strings inside the async function where bookingId is available
      const milestoneFilter = `booking_id=eq.${bookingId}`
      const bookingFilter = `id=eq.${bookingId}`
      const milestoneIds = await getMilestoneIds(bookingId)
      const taskFilter = `milestone_id=in.(${milestoneIds})`

      // Create new channel for this booking
      const channel = supabase
        .channel(`progress-${bookingId}`, {
          config: {
            presence: {
              key: bookingId
            }
          }
        })
        .on('postgres_changes', 
          {
            event: '*',
            schema: 'public',
            table: 'tasks',
            filter: taskFilter
          },
          async (payload) => {
            console.log('📋 Task update received:', payload)
            await handleTaskUpdate(payload)
          }
        )
        .on('postgres_changes',
          {
            event: '*',
            schema: 'public', 
            table: 'milestones',
            filter: milestoneFilter
          },
          async (payload) => {
            console.log('🎯 Milestone update received:', payload)
            await handleMilestoneUpdate(payload)
          }
        )
        .on('postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'bookings',
            filter: bookingFilter
          },
          async (payload) => {
            console.log('📊 Booking update received:', payload)
            await handleBookingUpdate(payload)
          }
        )
        .on('broadcast', { event: 'progress_update' }, (payload) => {
          console.log('📡 Broadcast progress update:', payload)
          handleBroadcastUpdate(payload.payload)
        })
        .subscribe((status) => {
          console.log('🔄 Channel status:', status)
          if (status === 'SUBSCRIBED') {
            setIsConnected(true)
            reconnectAttempts.current = 0
            toast.success('Real-time progress tracking connected')
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setIsConnected(false)
            handleReconnect()
          }
        })

      channelRef.current = channel
    } catch (error) {
      console.error('❌ Error connecting to real-time:', error)
      setIsConnected(false)
      handleReconnect()
    }
  }, [bookingId])

  const disconnect = useCallback(async () => {
    if (channelRef.current) {
      const supabase = await getSupabaseClient()
      await supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    setIsConnected(false)
  }, [])

  const handleReconnect = useCallback(() => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached')
      toast.error('Real-time connection failed. Please refresh the page.')
      return
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)
    reconnectAttempts.current++

    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`)
    
    reconnectTimeoutRef.current = setTimeout(() => {
      connect()
    }, delay)
  }, [connect])

  const getMilestoneIds = async (bookingId: string): Promise<string> => {
    try {
      const supabase = await getSupabaseClient()
      const { data } = await supabase
        .from('milestones')
        .select('id')
        .eq('booking_id', bookingId)
      
      return data?.map(m => m.id).join(',') || ''
    } catch (error) {
      console.error('Error fetching milestone IDs:', error)
      return ''
    }
  }

  const handleTaskUpdate = async (payload: any) => {
    const update: ProgressUpdate = {
      bookingId,
      milestoneId: payload.new?.milestone_id || payload.old?.milestone_id,
      taskId: payload.new?.id || payload.old?.id,
      type: 'task',
      action: payload.eventType.toLowerCase(),
      data: payload.new || payload.old,
      timestamp: new Date().toISOString()
    }

    setLastUpdate(update.timestamp)
    onProgressUpdate?.(update)

    // Check if task was completed
    if (payload.eventType === 'UPDATE' && payload.new?.status === 'completed') {
      toast.success(`Task completed: ${payload.new.title}`)
      await checkMilestoneCompletion(update.milestoneId)
    }
  }

  const handleMilestoneUpdate = async (payload: any) => {
    const update: ProgressUpdate = {
      bookingId,
      milestoneId: payload.new?.id || payload.old?.id,
      type: 'milestone',
      action: payload.eventType.toLowerCase(),
      data: payload.new || payload.old,
      timestamp: new Date().toISOString()
    }

    setLastUpdate(update.timestamp)
    onProgressUpdate?.(update)

    // Check if milestone was completed
    if (payload.eventType === 'UPDATE' && payload.new?.status === 'completed') {
      toast.success(`Milestone completed: ${payload.new.title}`)
      onMilestoneComplete?.(update.milestoneId)
      await checkBookingCompletion()
    }
  }

  const handleBookingUpdate = async (payload: any) => {
    const update: ProgressUpdate = {
      bookingId,
      milestoneId: '',
      type: 'booking',
      action: payload.eventType.toLowerCase(),
      data: payload.new || payload.old,
      timestamp: new Date().toISOString()
    }

    setLastUpdate(update.timestamp)
    onProgressUpdate?.(update)

    // Check if booking was completed
    if (payload.eventType === 'UPDATE' && payload.new?.status === 'completed') {
      toast.success('🎉 Project completed!')
      onBookingComplete?.(bookingId)
    }
  }

  const handleBroadcastUpdate = (payload: any) => {
    const update: ProgressUpdate = {
      bookingId: payload.bookingId,
      milestoneId: payload.milestoneId || '',
      taskId: payload.taskId,
      type: payload.type,
      action: payload.action,
      data: payload.data,
      timestamp: payload.timestamp
    }

    setLastUpdate(update.timestamp)
    onProgressUpdate?.(update)
  }

  const checkMilestoneCompletion = async (milestoneId: string) => {
    try {
      const supabase = await getSupabaseClient()
      
      // Get milestone with all tasks
      const { data: milestone } = await supabase
        .from('milestones')
        .select(`
          id,
          title,
          status,
          tasks (
            id,
            status
          )
        `)
        .eq('id', milestoneId)
        .single()

      if (!milestone) return

      const totalTasks = milestone.tasks?.length || 0
      const completedTasks = milestone.tasks?.filter((t: any) => t.status === 'completed').length || 0

      // Auto-complete milestone if all tasks are done
      if (totalTasks > 0 && completedTasks === totalTasks && milestone.status !== 'completed') {
        await supabase
          .from('milestones')
          .update({ 
            status: 'completed',
            progress_percentage: 100,
            updated_at: new Date().toISOString()
          })
          .eq('id', milestoneId)

        // Broadcast milestone completion
        await supabase
          .channel(`progress-${bookingId}`)
          .send({
            type: 'broadcast',
            event: 'progress_update',
            payload: {
              bookingId,
              milestoneId,
              type: 'milestone',
              action: 'complete',
              data: { ...milestone, status: 'completed' },
              timestamp: new Date().toISOString()
            }
          })
      }
    } catch (error) {
      console.error('Error checking milestone completion:', error)
    }
  }

  const checkBookingCompletion = async () => {
    try {
      const supabase = await getSupabaseClient()
      
      // Get all milestones for this booking
      const { data: milestones } = await supabase
        .from('milestones')
        .select('id, status')
        .eq('booking_id', bookingId)

      if (!milestones) return

      const totalMilestones = milestones.length
      const completedMilestones = milestones.filter(m => m.status === 'completed').length

      // Auto-complete booking if all milestones are done
      if (totalMilestones > 0 && completedMilestones === totalMilestones) {
        await supabase
          .from('bookings')
          .update({ 
            status: 'completed',
            project_progress: 100,
            updated_at: new Date().toISOString()
          })
          .eq('id', bookingId)

        // Broadcast booking completion
        await supabase
          .channel(`progress-${bookingId}`)
          .send({
            type: 'broadcast',
            event: 'progress_update',
            payload: {
              bookingId,
              type: 'booking',
              action: 'complete',
              data: { status: 'completed', project_progress: 100 },
              timestamp: new Date().toISOString()
            }
          })
      }
    } catch (error) {
      console.error('Error checking booking completion:', error)
    }
  }

  const broadcastProgressUpdate = useCallback(async (update: Omit<ProgressUpdate, 'timestamp'>) => {
    try {
      const supabase = await getSupabaseClient()
      await supabase
        .channel(`progress-${bookingId}`)
        .send({
          type: 'broadcast',
          event: 'progress_update',
          payload: {
            ...update,
            timestamp: new Date().toISOString()
          }
        })
    } catch (error) {
      console.error('Error broadcasting progress update:', error)
    }
  }, [bookingId])

  // Connect on mount
  useEffect(() => {
    connect()
    return () => {
      disconnect()
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [connect, disconnect])

  return {
    isConnected,
    lastUpdate,
    broadcastProgressUpdate,
    reconnect: connect
  }
}
