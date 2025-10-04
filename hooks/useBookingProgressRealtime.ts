'use client'

import { useEffect, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

interface BookingProgressUpdate {
  booking_id: string
  milestone_id?: string
  task_id?: string
  action?: string
  old_status?: string
  new_status?: string
  old_progress?: number
  new_progress?: number
  updated_at?: string
  created_at?: string
}

interface UseBookingProgressRealtimeOptions {
  onUpdate?: (data: BookingProgressUpdate) => void
  onError?: (error: Error) => void
  showToast?: boolean
  toastMessage?: (data: BookingProgressUpdate) => string
}

export function useBookingProgressRealtime({
  onUpdate,
  onError,
  showToast = true,
  toastMessage
}: UseBookingProgressRealtimeOptions = {}) {
  
  const handleUpdate = useCallback((data: BookingProgressUpdate) => {
    // Call the provided update handler
    if (onUpdate) {
      onUpdate(data)
    }
    
    // Show toast notification if enabled
    if (showToast) {
      const message = toastMessage ? toastMessage(data) : getDefaultToastMessage(data)
      toast.success(message, {
        duration: 3000,
        position: 'top-right'
      })
    }
  }, [onUpdate, showToast, toastMessage])

  const handleError = useCallback((error: Error) => {
    console.error('Booking progress realtime error:', error)
    if (onError) {
      onError(error)
    }
    if (showToast) {
      toast.error('Failed to receive real-time updates')
    }
  }, [onError, showToast])

  useEffect(() => {
    let mounted = true
    let channel: any = null

    const setupRealtime = async () => {
      try {
        const supabase = await getSupabaseClient()
        
        // Create channel for booking progress updates
        channel = supabase
          .channel('booking_progress_updates')
          .on(
            'postgres_changes',
            { 
              event: '*', 
              schema: 'public', 
              table: 'milestones' 
            },
            (payload) => {
              if (!mounted) return
              
              const data: BookingProgressUpdate = {
                booking_id: (payload.new as any)?.booking_id || (payload.old as any)?.booking_id,
                milestone_id: (payload.new as any)?.id || (payload.old as any)?.id,
                action: payload.eventType,
                old_status: (payload.old as any)?.status,
                new_status: (payload.new as any)?.status,
                old_progress: (payload.old as any)?.progress_percentage,
                new_progress: (payload.new as any)?.progress_percentage,
                updated_at: (payload.new as any)?.updated_at,
                created_at: (payload.new as any)?.created_at
              }
              
              handleUpdate(data)
            }
          )
          .on(
            'postgres_changes',
            { 
              event: '*', 
              schema: 'public', 
              table: 'tasks' 
            },
            (payload) => {
              if (!mounted) return
              
              const data: BookingProgressUpdate = {
                booking_id: (payload.new as any)?.booking_id || (payload.old as any)?.booking_id,
                task_id: (payload.new as any)?.id || (payload.old as any)?.id,
                milestone_id: (payload.new as any)?.milestone_id || (payload.old as any)?.milestone_id,
                action: payload.eventType,
                old_status: (payload.old as any)?.status,
                new_status: (payload.new as any)?.status,
                old_progress: (payload.old as any)?.progress_percentage,
                new_progress: (payload.new as any)?.progress_percentage,
                updated_at: (payload.new as any)?.updated_at,
                created_at: (payload.new as any)?.created_at
              }
              
              handleUpdate(data)
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log('✅ Subscribed to booking progress updates')
            } else if (status === 'CHANNEL_ERROR') {
              handleError(new Error('Failed to subscribe to real-time updates'))
            }
          })

      } catch (error) {
        handleError(error as Error)
      }
    }

    setupRealtime()

    return () => {
      mounted = false
      if (channel) {
        const cleanup = async () => {
          const supabase = await getSupabaseClient()
          supabase.removeChannel(channel)
        }
        cleanup()
      }
    }
  }, [handleUpdate, handleError])

  return {
    // Return any additional methods if needed
    isConnected: true // This could be enhanced to track actual connection status
  }
}

// Helper function to generate default toast messages
function getDefaultToastMessage(data: BookingProgressUpdate): string {
  if (data.action === 'INSERT') {
    return `New milestone created for booking ${data.booking_id.slice(-6)}`
  }
  
  if (data.action === 'UPDATE' && data.new_progress !== undefined) {
    return `Progress updated to ${data.new_progress}% for booking ${data.booking_id.slice(-6)}`
  }
  
  if (data.action === 'UPDATE' && data.new_status) {
    return `Status changed to ${data.new_status} for booking ${data.booking_id.slice(-6)}`
  }
  
  if (data.action === 'DELETE') {
    return `Milestone removed from booking ${data.booking_id.slice(-6)}`
  }
  
  return `Booking ${data.booking_id.slice(-6)} updated`
}
