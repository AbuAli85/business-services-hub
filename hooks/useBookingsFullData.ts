import { useState, useEffect, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

interface BookingFullData {
  // Core booking data
  id: string
  title: string
  description?: string
  status: string
  approval_status?: string
  created_at: string
  updated_at?: string
  scheduled_date?: string
  scheduled_time?: string
  location?: string
  notes?: string
  amount?: number
  amount_cents?: number
  currency: string
  client_id: string
  provider_id: string
  service_id: string
  service_package_id?: string
  progress_percentage?: number
  
  // Service information
  service_title: string
  service_description?: string
  service_category?: string
  service_base_price?: number
  service_status?: string
  
  // Client profile information
  client_profile_id: string
  client_name: string
  client_email: string
  client_phone?: string
  client_company?: string
  client_avatar?: string
  
  // Provider profile information
  provider_profile_id: string
  provider_name: string
  provider_email: string
  provider_phone?: string
  provider_company?: string
  provider_avatar?: string
  
  // Invoice information
  invoice_id?: string
  invoice_status?: string
  invoice_amount?: number
  invoice_currency?: string
  invoice_number?: string
  invoice_due_date?: string
  paid_at?: string
  invoice_created_at?: string
  
  // Milestone statistics
  total_milestones: number
  completed_milestones: number
  total_tasks: number
  completed_tasks: number
  
  // Calculated fields
  calculated_progress_percentage: number
  payment_status: string
  normalized_status: string
}

interface UseBookingsFullDataOptions {
  userRole?: string
  userId?: string
  currentPage?: number
  pageSize?: number
  statusFilter?: string
  searchQuery?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  enableRealtime?: boolean
}

interface UseBookingsFullDataReturn {
  bookings: BookingFullData[]
  totalCount: number
  loading: boolean
  error: string | null
  lastUpdatedAt: string
  refresh: (showToast?: boolean) => Promise<void>
}

export function useBookingsFullData({
  userRole,
  userId,
  currentPage = 1,
  pageSize = 10,
  statusFilter = 'all',
  searchQuery = '',
  sortBy = 'created_at',
  sortOrder = 'desc',
  enableRealtime = false
}: UseBookingsFullDataOptions): UseBookingsFullDataReturn {
  const [bookings, setBookings] = useState<BookingFullData[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState(new Date().toISOString())

  const fetchBookings = useCallback(async () => {
    if (!userId) return

    try {
      setLoading(true)
      setError(null)

      const supabase = await getSupabaseClient()
      
      // Build query based on user role
      let query = supabase
        .from('bookings_full_view')
        .select('*', { count: 'exact' })

      // Apply role-based filtering
      if (userRole === 'client') {
        query = query.eq('client_id', userId)
      } else if (userRole === 'provider') {
        query = query.eq('provider_id', userId)
      }
      // Admin can see all bookings (no additional filter)

      // Apply status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'pending') {
          query = query.in('normalized_status', ['pending', 'pending_provider_approval', 'draft'])
        } else {
          query = query.eq('normalized_status', statusFilter)
        }
      }

      // Apply search filter
      if (searchQuery) {
        query = query.or(`service_title.ilike.%${searchQuery}%,client_name.ilike.%${searchQuery}%,title.ilike.%${searchQuery}%`)
      }

      // Apply sorting
      const sortColumn = sortBy === 'createdAt' ? 'created_at' : 
                        sortBy === 'lastUpdated' ? 'updated_at' : 
                        sortBy
      query = query.order(sortColumn, { ascending: sortOrder === 'asc' })

      // Apply pagination
      const from = (currentPage - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)

      const { data, error: fetchError, count } = await query

      if (fetchError) {
        throw new Error(fetchError.message)
      }

      setBookings(data || [])
      setTotalCount(count || 0)
      setLastUpdatedAt(new Date().toISOString())

    } catch (err) {
      console.error('Error fetching bookings:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch bookings')
      toast.error('Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }, [userId, userRole, currentPage, pageSize, statusFilter, searchQuery, sortBy, sortOrder])

  const refresh = useCallback(async (showToast = false) => {
    if (showToast) {
      toast.info('Refreshing bookings...')
    }
    await fetchBookings()
    if (showToast) {
      toast.success('Bookings refreshed')
    }
  }, [fetchBookings])

  // Initial fetch
  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  // Realtime subscriptions (if enabled)
  useEffect(() => {
    if (!enableRealtime || !userId) return

    let channel: any

    const setupRealtime = async () => {
      try {
        const supabase = await getSupabaseClient()
        
        channel = supabase
          .channel('bookings-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'bookings'
            },
            () => {
              // Refresh data when bookings change
              fetchBookings()
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'milestones'
            },
            () => {
              // Refresh data when milestones change (affects progress)
              fetchBookings()
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'invoices'
            },
            () => {
              // Refresh data when invoices change (affects payment status)
              fetchBookings()
            }
          )
          .subscribe()

      } catch (err) {
        console.error('Realtime setup failed:', err)
      }
    }

    setupRealtime()

    return () => {
      if (channel) {
        channel.unsubscribe()
      }
    }
  }, [enableRealtime, userId, fetchBookings])

  return {
    bookings,
    totalCount,
    loading,
    error,
    lastUpdatedAt,
    refresh
  }
}
