import { useState, useEffect, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase-client'

interface BookingFullData {
  booking: {
    id: string
    title: string
    status: string
    approval_status?: string
    client_id?: string
    provider_id?: string
    service: {
      name: string
      description?: string
    }
    client: {
      full_name: string
      email: string
      company_name?: string
    }
    provider: {
      full_name: string
      email: string
      company_name?: string
    }
    created_at: string
    scheduled_date: string
    total_price: number
    currency: string
    invoice?: any
  }
  milestones: Array<{
    id: string
    title: string
    status: string
    progress_percentage?: number
    tasks?: Array<{
      id: string
      title: string
      status: string
    }>
  }>
  messages: Array<{
    id: string
    content: string
    created_at: string
    sender_id: string
    sender?: {
      full_name: string
      email: string
    }
  }>
  files: Array<{
    id: string
    name: string
    url: string
    size?: number
  }>
  statistics: {
    totalMilestones: number
    completedMilestones: number
    totalTasks: number
    completedTasks: number
    progressPercentage: number
  }
  permissions: {
    isClient: boolean
    isProvider: boolean
    isAdmin: boolean
    canEdit: boolean
    canApprove: boolean
    canViewMilestones: boolean
  }
}

interface UseBookingFullDataReturn {
  data: BookingFullData | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useBookingFullData(bookingId: string): UseBookingFullDataReturn {
  const [data, setData] = useState<BookingFullData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const supabase = await getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('No valid session')
      }

      const response = await fetch(`/api/bookings/${bookingId}/full`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const responseData = await response.json()
      setData(responseData)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load booking data'
      setError(errorMessage)
      console.error('Error fetching booking full data:', err)
    } finally {
      setLoading(false)
    }
  }, [bookingId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    loading,
    error,
    refetch: fetchData
  }
}
