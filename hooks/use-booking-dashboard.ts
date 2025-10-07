import { useState, useEffect, useCallback } from 'react'
import { useRefreshCallback } from '@/contexts/AutoRefreshContext'

interface BookingStats {
  total: number
  active: number
  pending: number
  completed: number
  cancelled: number
  disputed: number
  revenue: {
    total: number
    completed: number
    pending: number
  }
  progress: {
    average: number
    milestone_average: number
  }
  rates: {
    success: number
    portfolio: number
  }
  milestones: {
    bookings_with_milestones: number
  }
}

interface Booking {
  id: string
  booking_number: string
  service_title: string
  client_name: string
  provider_name: string
  status: string
  normalized_status: string
  total_amount: number
  currency: string
  revenue_status: string
  progress_percentage: number
  progress_status: string
  milestone_count: number
  completed_milestones: number
  rating: number | null
  rating_text: string
  created_at: string
  updated_at: string
}

interface DashboardData {
  stats: BookingStats
  bookings: Booking[]
  last_updated: string
}

interface UseBookingDashboardReturn {
  data: DashboardData | null
  loading: boolean
  error: string | null
  refreshing: boolean
  refetch: () => Promise<void>
  updateBookingProgress: (bookingId: string) => Promise<number | null>
}

export function useBookingDashboard(): UseBookingDashboardReturn {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchDashboardData = useCallback(async () => {
    try {
      setRefreshing(true)
      setError(null)
      
      const response = await fetch('/api/dashboard/bookings', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add cache busting for real-time updates
        cache: 'no-cache'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch dashboard data')
      }

      setData(result.data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      setError(errorMessage)
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  const updateBookingProgress = useCallback(async (bookingId: string): Promise<number | null> => {
    try {
      const response = await fetch('/api/dashboard/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          booking_id: bookingId,
          action: 'update_progress'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update progress')
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update progress')
      }

      // Refresh dashboard data to get updated progress
      await fetchDashboardData()
      
      return result.progress
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update progress'
      setError(errorMessage)
      console.error('Progress update error:', err)
      return null
    }
  }, [fetchDashboardData])

  // Initial fetch
  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  // Register with centralized auto-refresh system
  useRefreshCallback(() => {
    if (!refreshing) {
      fetchDashboardData()
    }
  }, [fetchDashboardData, refreshing])

  return {
    data,
    loading,
    error,
    refreshing,
    refetch: fetchDashboardData,
    updateBookingProgress
  }
}

// Utility functions for the dashboard
export const formatCurrency = (amount: number, currency: string = 'OMR'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'completed': return 'bg-green-100 text-green-800'
    case 'in_progress': return 'bg-blue-100 text-blue-800'
    case 'approved': return 'bg-yellow-100 text-yellow-800'
    case 'pending_approval': return 'bg-orange-100 text-orange-800'
    case 'cancelled': return 'bg-red-100 text-red-800'
    case 'disputed': return 'bg-purple-100 text-purple-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

export const getProgressColor = (percentage: number): string => {
  if (percentage === 0) return 'bg-gray-200'
  if (percentage < 30) return 'bg-red-500'
  if (percentage < 70) return 'bg-yellow-500'
  return 'bg-green-500'
}

export const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed': return 'CheckCircle'
    case 'in_progress': return 'Clock'
    case 'approved': return 'CheckCircle'
    case 'pending_approval': return 'Clock'
    case 'cancelled': return 'XCircle'
    case 'disputed': return 'AlertCircle'
    default: return 'Clock'
  }
}

export const getProgressStatus = (percentage: number): string => {
  if (percentage === 0) return 'Not Started'
  if (percentage < 30) return 'Getting Started'
  if (percentage < 70) return 'In Progress'
  if (percentage < 100) return 'Almost Done'
  return 'Completed'
}
