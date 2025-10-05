import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { bookingCache, getBookingsCacheKey, getSummaryCacheKey } from '@/lib/booking-cache'

export interface Booking {
  id: string
  service_title?: string
  client_name?: string
  provider_name?: string
  status: string
  approval_status?: string
  total_amount?: number
  amount?: number
  amount_cents?: number
  currency?: string
  created_at: string
  updated_at?: string
  scheduled_date?: string
  progress_percentage?: number
  client_id?: string
  provider_id?: string
  client_email?: string
  provider_email?: string
  notes?: string
  invoice_status?: string
  raw_status?: string
  display_status?: string
}

export interface Invoice {
  id: string
  booking_id: string
  status: string
  amount: number
  total_amount?: number
  currency: string
  created_at: string
}

export interface SummaryStats {
  total: number
  completed: number
  inProgress: number
  approved: number
  pending: number
  readyToLaunch: number
  totalRevenue: number
  projectedBillings: number
  pendingApproval: number
  avgCompletionTime: number
}

export interface BookingsState {
  bookings: Booking[]
  invoices: Invoice[]
  totalCount: number
  summaryStats: SummaryStats | null
  loading: boolean
  error: string | null
  lastUpdatedAt: number | null
}

export interface UseBookingsOptions {
  userRole?: 'client' | 'provider' | 'admin' | null
  userId?: string
  currentPage?: number
  pageSize?: number
  statusFilter?: string
  searchQuery?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  enableRealtime?: boolean
}

export function useBookings(options: UseBookingsOptions = {}) {
  const router = useRouter()
  const {
    userRole,
    userId,
    currentPage = 1,
    pageSize = 10,
    statusFilter = 'all',
    searchQuery = '',
    sortBy = 'lastUpdated',
    sortOrder = 'desc',
    enableRealtime = false
  } = options

  const [state, setState] = useState<BookingsState>({
    bookings: [],
    invoices: [],
    totalCount: 0,
    summaryStats: null,
    loading: false,
    error: null,
    lastUpdatedAt: null
  })

  const isLoadingRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const lastRefreshTimeRef = useRef(0)

  // Map UI sort keys to API sort keys
  const mapSortKeyToApi = useCallback((key: string): string => {
    switch (key) {
      case 'lastUpdated': return 'updated_at'
      case 'createdAt': return 'created_at'
      case 'totalAmount': return 'amount'
      case 'serviceTitle': return 'title'
      case 'clientName': return 'client_name'
      case 'providerName': return 'provider_name'
      default: return 'created_at'
    }
  }, [])

  // Load bookings data
  const loadBookings = useCallback(async (force = false) => {
    if (isLoadingRef.current && !force) {
      console.log('⏳ Bookings fetch already in progress, skipping...')
      return
    }

    if (!userRole || !userId) {
      console.log('⏸️ Skipping load - user not ready', { userRole, userId })
      return
    }

    // Abort any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const ac = new AbortController()
    abortControllerRef.current = ac
    isLoadingRef.current = true

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      // Build query params
      const params = new URLSearchParams({
        page: String(currentPage),
        pageSize: String(pageSize),
        search: searchQuery,
        status: statusFilter === 'all' ? '' : statusFilter,
        sort: mapSortKeyToApi(sortBy),
        order: sortOrder
      })

      const apiEndpoint = `/api/bookings?${params}`
      
      // Get session token
      const supabase = await getSupabaseClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        console.error('❌ Session error:', sessionError)
        setState(prev => ({ 
          ...prev, 
          error: 'Authentication error. Please sign in again.',
          loading: false 
        }))
        router.push('/auth/sign-in')
        return
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      const res = await fetch(apiEndpoint, {
        credentials: 'include',
        headers,
        signal: ac.signal
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        
        if (res.status === 401) {
          setState(prev => ({ 
            ...prev, 
            error: 'Your session has expired. Please sign in again.',
            loading: false 
          }))
          router.push('/auth/sign-in')
          return
        }
        
        if (res.status === 404 || res.status === 403) {
          setState(prev => ({
            ...prev,
            bookings: [],
            totalCount: 0,
            invoices: [],
            loading: false
          }))
          return
        }
        
        throw new Error(errorData?.error || `API request failed: ${res.status}`)
      }

      const json = await res.json()
      const bookingsData = json.data || []
      
      setState(prev => ({
        ...prev,
        bookings: bookingsData,
        totalCount: Number(json.total || 0),
        loading: false,
        lastUpdatedAt: Date.now()
      }))

      // Load invoices separately
      try {
        console.log('📥 Fetching invoices from /api/invoices...')
        const invoiceRes = await fetch('/api/invoices', {
          credentials: 'include',
          headers,
          signal: ac.signal
        })
        
        if (invoiceRes.ok) {
          const contentType = invoiceRes.headers.get('content-type')
          if (contentType && contentType.includes('application/json')) {
            const invoiceJson = await invoiceRes.json()
            const invoicesData = invoiceJson.invoices || []
            console.log('✅ Invoices loaded:', {
              count: invoicesData.length,
              statuses: invoicesData.reduce((acc: Record<string, number>, inv: any) => {
                acc[inv.status] = (acc[inv.status] || 0) + 1
                return acc
              }, {}),
              totalAmount: invoicesData.reduce((sum: number, inv: any) => sum + (inv.amount || inv.total_amount || 0), 0)
            })
            setState(prev => ({ ...prev, invoices: invoicesData }))
          } else {
            console.warn('⚠️ Invoice API returned non-JSON response:', contentType)
          }
        } else {
          console.warn('⚠️ Invoice API returned error status:', invoiceRes.status)
          const errorText = await invoiceRes.text().catch(() => 'Unable to read error')
          console.warn('⚠️ Invoice API error:', errorText)
        }
      } catch (invoiceError: any) {
        if (invoiceError?.name !== 'AbortError') {
          console.warn('⚠️ Invoice loading error:', invoiceError)
        }
      }

    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        console.error('❌ Bookings loading error:', e)
        setState(prev => ({ 
          ...prev, 
          error: e?.message || 'Failed to load bookings data',
          loading: false 
        }))
      }
    } finally {
      isLoadingRef.current = false
    }
  }, [userRole, userId, currentPage, pageSize, statusFilter, searchQuery, sortBy, sortOrder, mapSortKeyToApi, router])

  // Load summary stats
  const loadSummaryStats = useCallback(async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) return

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      headers['Authorization'] = `Bearer ${session.access_token}`

      const response = await fetch('/api/bookings/summary', {
        method: 'GET',
        credentials: 'include',
        headers,
        cache: 'no-store'
      })

      if (response.ok) {
        const summary = await response.json()
        setState(prev => ({ ...prev, summaryStats: summary }))
      }
    } catch (error: any) {
      console.warn('⚠️ Summary stats error:', error)
    }
  }, [])

  // Throttled refresh function
  const refresh = useCallback((force = false) => {
    const now = Date.now()
    if (!force && now - lastRefreshTimeRef.current < 2000) {
      console.log('⏸️ Skipping refresh - too soon since last refresh')
      return
    }
    
    lastRefreshTimeRef.current = now
    loadBookings(force)
    loadSummaryStats()
  }, [loadBookings, loadSummaryStats])

  // Auto-load when dependencies change
  useEffect(() => {
    if (userRole && userId) {
      refresh()
    }
  }, [userRole, userId, currentPage, pageSize, statusFilter, searchQuery, sortBy, sortOrder, refresh])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Approve booking
  const approveBooking = useCallback(async (id: string, providerId?: string, status?: string) => {
    const canApprove = userRole === 'admin' || (userRole === 'provider' && userId === providerId)
    const isPending = status === 'pending' || status === 'pending_provider_approval'
    
    if (!canApprove || !isPending) {
      toast.error('You cannot approve this booking or it is not pending approval')
      return false
    }
    
    try {
      const supabase = await getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
      
      const res = await fetch(`/api/bookings/${id}/approve`, { 
        method: 'POST', 
        headers, 
        credentials: 'include' 
      })
      
      if (!res.ok) {
        const { error, details } = await res.json().catch(() => ({}))
        throw new Error(error || details || `Request failed: ${res.status}`)
      }
      
      toast.success('Booking approved')
      refresh(true)
      return true
    } catch (err: any) {
      toast.error(err?.message || 'Approval failed')
      return false
    }
  }, [userRole, userId, refresh])

  // Decline booking
  const declineBooking = useCallback(async (id: string, providerId?: string, status?: string) => {
    const canDecline = userRole === 'admin' || (userRole === 'provider' && userId === providerId)
    const isPending = status === 'pending' || status === 'pending_provider_approval'
    
    if (!canDecline || !isPending) {
      toast.error('You cannot decline this booking or it is not pending approval')
      return false
    }
    
    try {
      const supabase = await getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
      
      const res = await fetch(`/api/bookings/${id}/decline`, { 
        method: 'POST', 
        headers, 
        credentials: 'include' 
      })
      
      if (!res.ok) {
        const { error, details } = await res.json().catch(() => ({}))
        throw new Error(error || details || `Request failed: ${res.status}`)
      }
      
      toast.success('Booking declined')
      refresh(true)
      return true
    } catch (err: any) {
      toast.error(err?.message || 'Decline failed')
      return false
    }
  }, [userRole, userId, refresh])

  return {
    ...state,
    refresh,
    approveBooking,
    declineBooking,
    isLoading: state.loading
  }
}
