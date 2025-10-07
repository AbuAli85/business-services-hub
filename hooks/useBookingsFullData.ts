import { useState, useEffect, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

interface BookingFullData {
  // Core booking data from booking_list_optimized view
  id: string
  booking_title: string
  service_id: string
  service_title: string
  service_description?: string
  service_category?: string
  client_id: string
  client_name: string
  client_email?: string
  client_company?: string
  client_avatar?: string
  provider_id: string
  provider_name: string
  provider_email?: string
  provider_company?: string
  provider_avatar?: string
  
  // Progress and milestone data
  progress: number
  total_milestones: number
  completed_milestones: number
  
  // Status information
  raw_status: string
  approval_status?: string
  display_status: string
  
  // Payment information
  payment_status: string
  invoice_status?: string
  invoice_id?: string | null
  amount_cents?: number
  amount?: number
  currency: string
  
  // Timestamps
  created_at: string
  updated_at?: string
  due_at?: string
  
  // Additional data
  requirements?: string
  notes?: string
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
        .from('booking_list_optimized')
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
          query = query.in('display_status', ['pending_review', 'pending'])
        } else {
          query = query.eq('display_status', statusFilter)
        }
      }

      // Apply search filter
      if (searchQuery) {
        query = query.or(`service_title.ilike.%${searchQuery}%,client_name.ilike.%${searchQuery}%,booking_title.ilike.%${searchQuery}%`)
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

      // Transform data to match expected format
      const transformedData = (data || []).map(item => ({
        id: item.id,
        booking_title: item.booking_title,
        service_id: item.service_id,
        service_title: item.service_title,
        service_description: item.service_description || undefined,
        service_category: item.service_category || undefined,
        client_id: item.client_id,
        client_name: item.client_name,
        client_email: item.client_email || undefined,
        client_company: item.client_company || undefined,
        client_avatar: item.client_avatar || undefined,
        provider_id: item.provider_id,
        provider_name: item.provider_name,
        provider_email: item.provider_email || undefined,
        provider_company: item.provider_company || undefined,
        provider_avatar: item.provider_avatar || undefined,
        progress: item.progress_percentage || 0,
        total_milestones: 0, // Will be calculated separately if needed
        completed_milestones: 0, // Will be calculated separately if needed
        raw_status: item.status,
        approval_status: item.approval_status || undefined,
        display_status: item.display_status,
        payment_status: item.payment_status,
        invoice_status: item.payment_display_status || undefined,
        invoice_id: null, // Will be populated from invoices table separately
        amount_cents: item.amount_cents || undefined,
        amount: item.total_amount || undefined,
        currency: item.currency || 'USD',
        created_at: item.created_at,
        updated_at: item.updated_at || undefined,
        due_at: item.due_at || undefined,
        requirements: item.requirements || undefined,
        notes: item.notes || undefined
      }))

      setBookings(transformedData)
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
