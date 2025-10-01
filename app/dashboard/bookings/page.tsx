'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Search,
  Calendar,
  RefreshCw,
  Clock,
  CheckCircle,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  TrendingUp,
  Receipt,
  AlertTriangle,
  Target,
  Zap,
  Settings,
  Play,
  Award,
  User,
  FileText,
  Rocket,
  DollarSign,
  Download,
  Upload,
  HelpCircle,
  Grid3X3,
  Table
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency } from '@/lib/dashboard-data'
import toast from 'react-hot-toast'
import { getSupabaseClient } from '@/lib/supabase-client'
import { DataTable } from '@/components/dashboard/DataTable'
import { FilterDropdown } from '@/components/dashboard/FilterDropdown'
import { StatusFilter } from '@/components/dashboard/bookings/StatusFilter'
import { BookingCard } from '@/components/dashboard/bookings/BookingCard'
import { ImprovedBookingCard } from '@/components/dashboard/bookings/ImprovedBookingCard'
import { StatusBadge } from '@/components/dashboard/bookings/StatusBadge'
import { AmountDisplay } from '@/components/dashboard/bookings/AmountDisplay'
import { BulkActions } from '@/components/dashboard/bookings/BulkActions'
import { SearchAndSort } from '@/components/dashboard/bookings/SearchAndSort'
import { BookingFilters } from '@/components/dashboard/bookings/BookingFilters'
import { BookingCalendar } from '@/components/dashboard/bookings/BookingCalendar'
import { BookingDetailModal } from '@/components/dashboard/bookings/BookingDetailModal'
import { BrandLoader } from '@/components/ui/BrandLoader'
import { useBookingFilters, applyBookingFilters } from '@/hooks/useBookingFilters'
import PaginationFooter from '@/components/ui/PaginationFooter'
import { formatOMR, formatMuscatDate, formatMuscatDateTime } from '@/lib/format'
import { formatMuscat } from '@/lib/dates'
import { StatusPill } from '@/components/ui/StatusPill'
import { normalizeStatus } from '@/lib/status'

// Constants
const OMAN_TZ = 'Asia/Muscat'

// Helper for custom tooltips - simplified for now
const TitleTip: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div title={label}>
    {children}
  </div>
)

// Helper function to derive booking status (list view only)
function getDerivedStatus(booking: any, invoice?: any) {
  if (booking.status === 'completed') return 'delivered'
  if (booking.status === 'in_progress') return 'in_production'
  if (invoice && ['issued', 'paid'].includes(invoice?.status)) return 'ready_to_launch'
  if (booking.approval_status === 'approved' || booking.status === 'approved') return 'approved'
  if (booking.status === 'declined' || booking.approval_status === 'declined' || booking.status === 'cancelled') return 'cancelled'
  if (booking.status === 'on_hold') return 'on_hold'
  return 'pending_review'
}

export default function BookingsPage() {
  const router = useRouter()
  const [userLoading, setUserLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)
  const isLoadingRef = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [bookings, setBookings] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [summaryStats, setSummaryStats] = useState<any>(null)
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [showFilters, setShowFilters] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailBooking, setDetailBooking] = useState<any | null>(null)
  const [detailMilestones, setDetailMilestones] = useState<any[]>([])
  const [detailCommunications, setDetailCommunications] = useState<any[]>([])
  const [detailFiles, setDetailFiles] = useState<any[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [summary, setSummary] = useState<{ total_projects: number; completed_count: number; total_revenue: number } | null>(null)
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<'client' | 'provider' | 'admin' | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('lastUpdated')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
  const [realtimeReady, setRealtimeReady] = useState(false)
  const [enableRealtime, setEnableRealtime] = useState(false) // Temporarily disable realtime
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set())
  const lastRefreshTimeRef = useRef(0)
  const abortControllerRef = useRef<AbortController | null>(null)
	const [viewMode, setViewMode] = useState<'card' | 'calendar' | 'table'>(() => {
		if (typeof window === 'undefined') return 'card'
		return (localStorage.getItem('bookings:viewMode') as any) || 'card'
	})
	const [density, setDensity] = useState<'compact' | 'comfortable' | 'spacious'>(() => {
		if (typeof window === 'undefined') return 'comfortable'
		return (localStorage.getItem('bookings:density') as any) || 'comfortable'
	})
	const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null)
	const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
		if (typeof window === 'undefined') return ['serviceTitle','clientName','providerName','status','progress','payment','totalAmount','createdAt','actions']
		try { return JSON.parse(localStorage.getItem('bookings:visibleColumns') || '[]') } catch { return [] }
	})
  // Show brand-centric page loader when initial load is in progress and we have no items yet
  if (userLoading || (dataLoading && bookings.length === 0 && !error)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <BrandLoader size={72} />
      </div>
    )
  }


  // Invoice lookup - moved up to avoid hoisting issues
  const invoiceByBooking = useMemo(() => {
    const m = new Map<string, any>()
    invoices.forEach((invoice: any) => {
      const bookingId = String(invoice.bookingId ?? invoice.booking_id)
      m.set(bookingId, invoice)
    })
    return m
  }, [invoices])
  
  const getInvoiceForBooking = useCallback((bookingId: string) => {
    return invoiceByBooking.get(String(bookingId))
  }, [invoiceByBooking])

  // Open details helper: loads enriched booking + milestones + communications
  const openBookingDetails = useCallback(async (booking: any) => {
    try {
      setDetailOpen(true)
      setDetailBooking(booking)
      setDetailMilestones([])
      setDetailCommunications([])
      setDetailFiles([])
      setDetailLoading(true)

      const supabase = await getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      const headers: Record<string,string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`

      // Fetch all in parallel
      const [bookingRes, milestonesRes, commsRes] = await Promise.all([
        fetch(`/api/bookings/${booking.id}`, { headers, credentials: 'include' }),
        fetch(`/api/milestones?bookingId=${encodeURIComponent(booking.id)}`, { headers, credentials: 'include' }),
        fetch(`/api/messages?booking_id=${encodeURIComponent(booking.id)}`, { headers, credentials: 'include' })
      ])

      if (bookingRes.ok) {
        const { booking: enriched } = await bookingRes.json()
        if (enriched) setDetailBooking(enriched)
      }
      if (milestonesRes.ok) {
        const { milestones } = await milestonesRes.json()
        setDetailMilestones(Array.isArray(milestones) ? milestones : [])
      }
      if (commsRes.ok) {
        const { messages } = await commsRes.json()
        setDetailCommunications(Array.isArray(messages) ? messages : [])
      }
    } catch (e) {
      console.warn('Failed to load booking details:', e)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  // Helper functions
  function getDerivedStatus(booking: any) {
    if (booking.status === 'completed') return 'delivered'
    if (booking.status === 'in_progress') return 'in_production'
    
    // Safety check to prevent hoisting issues
    if (typeof getInvoiceForBooking !== 'function') {
      console.warn('getInvoiceForBooking not available yet, skipping invoice check')
      return booking.status === 'pending' ? 'pending_review' : booking.status || 'pending_review'
    }
    
    const invoice = getInvoiceForBooking(booking.id)
    if (invoice && ['issued', 'paid'].includes(invoice.status)) {
      return 'ready_to_launch'
    }
    
    // Check approval status first - this is the primary indicator
    if (booking.approval_status === 'approved') {
      return 'approved'
    }
    
    // Fallback to status if approval_status is not set
    if (booking.status === 'approved') {
      return 'approved'
    }
    
    if (booking.status === 'declined' || booking.approval_status === 'declined') {
      return 'cancelled'
    }
    
    if (booking.status === 'rescheduled') return 'pending_review'
    if (booking.status === 'pending') return 'pending_review'
    
    // Handle other status mappings
    if (booking.status === 'in_production') return 'in_production'
    if (booking.status === 'delivered') return 'delivered'
    if (booking.status === 'cancelled') return 'cancelled'
    if (booking.status === 'on_hold') return 'on_hold'
    
    return booking.status || 'pending_review'
  }

  function getStatusSubtitle(status: string) {
    switch (status) {
      case 'delivered': return 'Project successfully delivered'
      case 'in_production': return 'Active development in progress'
      case 'ready_to_launch': return 'All prerequisites met • Ready to launch'
      case 'approved': return 'Approved and ready for next steps'
      case 'pending_review': return 'Awaiting provider approval'
      case 'cancelled': return 'Project cancelled'
      default: return 'Status unknown'
    }
  }



  // Map UI sort keys to API sort keys
  const mapSortKeyToApi = (key: string): string => {
    switch (key) {
      case 'lastUpdated': return 'updated_at'
      case 'createdAt': return 'created_at'
      case 'totalAmount': return 'amount'
      case 'serviceTitle': return 'title'
      case 'clientName': return 'client_name'
      case 'providerName': return 'provider_name'
      default: return 'created_at'
    }
  }

  // Load summary statistics from API
  const loadSummaryStats = useCallback(async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        console.warn('⚠️ No session token for summary stats')
        return
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      const response = await fetch('/api/bookings/summary', {
        method: 'GET',
        credentials: 'include',
        headers,
        cache: 'no-store'
      })

      if (response.ok) {
        const summary = await response.json()
        setSummaryStats(summary)
        console.log('✅ Summary stats loaded:', summary)
      } else {
        console.warn('⚠️ Summary stats loading failed:', response.status)
      }
    } catch (error: any) {
      console.warn('⚠️ Summary stats error:', error)
    }
  }, [])

  // Load bookings via server API with proper role-based filtering
  const loadSupabaseData = useCallback(async () => {
    if (isLoadingRef.current || !user || !userRole) {
      console.log('⏸️ Skipping load - request already in progress or user not ready', {
        isLoading: isLoadingRef.current,
        hasUser: !!user,
        userRole,
        userId: user?.id
      })
      return
    }
    
    // Abort any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    const ac = new AbortController()
    abortControllerRef.current = ac
    isLoadingRef.current = true
    setDataLoading(true)
    setError(null)
    
    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log('📊 Loading bookings data for role:', userRole)
      }
      
      // Build query params for server-side pagination/filtering
      const params = new URLSearchParams({
        page: String(currentPage),
        pageSize: String(pageSize),
        search: debouncedQuery,              // ← keep '#' for ID lookup
        status: statusFilter === 'all' ? '' : statusFilter,
        sort: mapSortKeyToApi(sortBy),
        order: sortOrder
      })
      
      // Use the new bookings API endpoint
      const apiEndpoint = `/api/bookings?${params}`
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('📡 Fetching from:', apiEndpoint)
      }
      
      // Get the current session token for authentication
      const supabase = await getSupabaseClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('❌ Session error:', sessionError)
        setError('Authentication error. Please sign in again.')
        router.push('/auth/sign-in')
        // Ensure loading flags are cleared on early return
        try { if (abortControllerRef.current) abortControllerRef.current.abort() } catch {}
        setDataLoading(false)
        isLoadingRef.current = false
        return
      }
      
      if (!session) {
        console.error('❌ No session found - user not authenticated')
        setError('Please sign in to view bookings.')
        router.push('/auth/sign-in')
        // Ensure loading flags are cleared on early return
        try { if (abortControllerRef.current) abortControllerRef.current.abort() } catch {}
        setDataLoading(false)
        isLoadingRef.current = false
        return
      }
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔐 Session status:', { 
          hasSession: !!session, 
          hasToken: !!session?.access_token,
          tokenLength: session?.access_token?.length || 0,
          user: session?.user?.id || 'none',
          expiresAt: session?.expires_at
        })
      }
      
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
        if (process.env.NODE_ENV !== 'production') {
          console.log('✅ Added Authorization header')
        }
      } else {
        console.warn('⚠️ No session token available, request may fail')
        setError('Authentication token missing. Please sign in again.')
        router.push('/auth/sign-in')
        // Ensure loading flags are cleared on early return
        try { if (abortControllerRef.current) abortControllerRef.current.abort() } catch {}
        setDataLoading(false)
        isLoadingRef.current = false
        return
      }
      
      const res = await fetch(apiEndpoint, {
        credentials: 'include',
        headers,
        signal: ac.signal
      })
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        console.error('❌ API request failed:', res.status, errorData)

        // Handle authentication errors (401)
        if (res.status === 401) {
          console.log('🔐 Authentication required (401)')
          setError('Your session has expired. Please sign in again to continue.')
          router.push('/auth/sign-in')
          // Ensure loading flags are cleared on early return
          try { if (abortControllerRef.current) abortControllerRef.current.abort() } catch {}
          setDataLoading(false)
          isLoadingRef.current = false
          return
        }
        
        // For non-critical errors, show empty state instead of error
        if (res.status === 404 || res.status === 403) {
          console.log('📝 No bookings found or access denied - showing empty state')
          setBookings([])
          setTotalCount(0)
          setInvoices([])
          // Ensure loading flags are cleared on early return
          try { if (abortControllerRef.current) abortControllerRef.current.abort() } catch {}
          setDataLoading(false)
          isLoadingRef.current = false
          return
        }
        
        throw new Error(errorData?.error || `API request failed: ${res.status}`)
      }
      
      const json = await res.json()
      console.log('📊 API Response received:', { 
        dataCount: json.data?.length,
        total: json.total
      })
      
      // Handle the new API response format
      const bookingsData = json.data || []
      setBookings(bookingsData)
      setTotalCount(Number(json.total || 0))
      console.log('✅ Bookings data loaded:', {
        count: bookingsData.length,
        total: json.total,
        sample: bookingsData.slice(0, 2).map((b: any) => ({
          id: b.id,
          status: b.status,
          approval_status: b.approval_status,
          amount_cents: b.amount_cents,
          service_title: b.service_title
        }))
      })
      
      // Load invoices separately
      try {
        const invoiceHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
        if (session?.access_token) {
          invoiceHeaders['Authorization'] = `Bearer ${session.access_token}`
        }
        
        const invoiceRes = await fetch('/api/invoices', {
          credentials: 'include',
          headers: invoiceHeaders,
          signal: ac.signal
        })
        if (invoiceRes.ok) {
          const invoiceJson = await invoiceRes.json()
          const invoicesData = invoiceJson.invoices || []
          setInvoices(invoicesData)
          console.log('✅ Invoices data loaded:', {
            count: invoicesData.length,
            sample: invoicesData.slice(0, 2).map((inv: any) => ({
              id: inv.id,
              booking_id: inv.booking_id,
              status: inv.status,
              amount: inv.amount
            }))
          })
        } else {
          console.warn('⚠️ Invoice loading failed:', invoiceRes.status)
          setInvoices([]) // Continue without invoices if loading fails
        }
      } catch (invoiceError: any) {
        // Only log non-abort errors to avoid noise
        if (invoiceError?.name !== 'AbortError') {
          console.warn('⚠️ Invoice loading error:', invoiceError)
        }
        setInvoices([]) // Continue without invoices if loading fails
      }
      
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        console.error('❌ Data loading error:', e)
        setError(e?.message || 'Failed to load bookings data')
      }
    } finally {
      setDataLoading(false)
      console.log('✅ Data loading complete')
      isLoadingRef.current = false
		  setLastUpdatedAt(Date.now())
    }
  }, [user, userRole, currentPage, pageSize, statusFilter, debouncedQuery, sortBy, sortOrder, router])

  // Initialize user authentication and role detection
  useEffect(() => {
    const initializeUser = async () => {
      try {
        console.log('🔄 Initializing user authentication...')
        setUserLoading(true)
        setError(null)
        
        const supabase = await getSupabaseClient()
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !currentUser) {
          console.warn('No authenticated user yet; waiting for middleware/session to settle')
          setUser(null)
          setUserRole(null)
          return
        }
        
        console.log('✅ User authenticated:', currentUser.id)
        setUser(currentUser)
        
        // Determine user role from metadata first, then profile
        let detectedRole = currentUser.user_metadata?.role
        console.log('🔍 Role from metadata:', detectedRole)
        
        if (!detectedRole) {
          try {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('role, is_admin')
              .eq('id', currentUser.id)
              .single()
            
            if (!profileError && profile) {
              detectedRole = profile.is_admin ? 'admin' : profile.role
              console.log('🔍 Role from profile:', detectedRole)
            }
          } catch (profileError) {
            console.warn('⚠️ Could not fetch profile role:', profileError)
          }
        }
        
        // Default to client if no role found
        if (!detectedRole) {
          detectedRole = 'client'
          console.log('🔍 Using default role: client')
        }
        
        setUserRole(detectedRole as 'client' | 'provider' | 'admin')
        console.log('✅ User role set:', detectedRole)
        
      } catch (error) {
        console.error('❌ User initialization error:', error)
        setError('Failed to initialize user session')
      } finally {
        setUserLoading(false)
        console.log('✅ User initialization complete')
      }
    }
    
    initializeUser()
  }, [router])

  // Only load data when user and role are ready
  useEffect(() => {
    if (user && userRole && !userLoading) {
      const now = Date.now()
      // Add throttling to prevent excessive data loading
      if (now - lastRefreshTimeRef.current > 2000) {
        console.log('🚀 Triggering data load - user and role ready')
        lastRefreshTimeRef.current = now
        loadSupabaseData()
        loadSummaryStats() // Load summary stats for consistent metrics
      } else {
        console.log('⏸️ Skipping data load - too soon since last load')
      }
    } else {
      console.log('⏳ Waiting for user/role - not triggering data load yet', { 
        user: !!user, 
        userRole, 
        userLoading 
      })
    }
  }, [user, userRole, userLoading, currentPage, pageSize, statusFilter, debouncedQuery, loadSupabaseData, loadSummaryStats])

  // Cleanup effect to abort requests on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Separate effect for refresh trigger to prevent infinite loops
  useEffect(() => {
    if (refreshTrigger > 0 && user && userRole && !userLoading && realtimeReady) {
      const now = Date.now()
      // Only refresh if it's been at least 5 seconds since last refresh
      if (now - lastRefreshTimeRef.current > 5000) {
        console.log('🔄 Refresh triggered by realtime update')
        lastRefreshTimeRef.current = now
        loadSupabaseData()
        loadSummaryStats() // Also refresh summary stats
      } else {
        console.log('⏸️ Skipping refresh - too soon since last refresh (', now - lastRefreshTimeRef.current, 'ms ago)')
      }
    }
  }, [refreshTrigger, user, userRole, userLoading, realtimeReady])

	// Persist view and density preferences
	useEffect(() => {
		if (typeof window === 'undefined') return
		try { localStorage.setItem('bookings:viewMode', viewMode) } catch {}
	}, [viewMode])

	useEffect(() => {
		if (typeof window === 'undefined') return
		try { localStorage.setItem('bookings:density', density) } catch {}
	}, [density])

	useEffect(() => {
		if (typeof window === 'undefined') return
		try { localStorage.setItem('bookings:visibleColumns', JSON.stringify(visibleColumns)) } catch {}
	}, [visibleColumns])

  // Debounce searchQuery for smoother UX
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(searchQuery)
      // Reset to page 1 when search query changes
      setCurrentPage(1)
    }, 250)
    return () => clearTimeout(t)
  }, [searchQuery])

  // Reset to page 1 when status filter changes
  useEffect(() => {
    setCurrentPage(1)
    setSelectedIds(new Set())
    setSelectAll(false)
  }, [statusFilter])

  // Realtime subscriptions for live updates
  useEffect(() => {
    if (!user || !userRole || !enableRealtime) return

    let bookingsChannel: any
    let milestonesChannel: any  
    let invoicesChannel: any
    let isMounted = true

    // Get userId outside the async function to avoid hoisting issues
    const userId = user?.id
    if (!userId) {
      console.warn('⚠️ User ID not available for realtime subscriptions')
      return
    }

    const setupRealtimeSubscriptions = async () => {
      try {
        // Add a delay to prevent immediate refresh triggers after initial load
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        if (!isMounted) return
        
        console.log('🔄 Setting up realtime subscriptions for:', userRole)
        const supabase = await getSupabaseClient()

        if (!isMounted) return
        
        // Create filter strings inside the async function where userId is available
        // Create server-side filter to reduce noise
        const base = { event: '*', schema: 'public', table: 'bookings' } as any
        const bookingsOpts = userRole === 'admin'
          ? base
          : { ...base, filter: `or(client_id.eq.${userId},provider_id.eq.${userId})` }
        
        bookingsChannel = supabase
          .channel(`bookings-${userId}`)
          .on('postgres_changes', bookingsOpts, (payload: any) => {
            if (!isMounted) return
            if (process.env.NODE_ENV !== 'production') {
              console.log('📡 Bookings realtime update:', payload.eventType, payload.new?.id)
            }
            
            // Only trigger refresh for important changes, not every update
            if (payload.eventType === 'INSERT' || 
                (payload.eventType === 'UPDATE' && payload.new?.status !== payload.old?.status)) {
              // Debounce the reload to avoid too many refreshes
              setTimeout(() => {
                if (isMounted) {
                  // Trigger data reload by updating refresh trigger
                  setRefreshTrigger(prev => prev + 1)
                }
              }, 3000) // Increased debounce time to prevent loops
              
              // Show toast notification for important changes
              if (payload.eventType === 'INSERT') {
                toast.success('New booking received!')
              } else if (payload.eventType === 'UPDATE') {
                toast(`Booking status updated to ${payload.new.status}`)
              }
            }
          })
          .subscribe()

        // Subscribe to milestones changes for progress updates
        const milestonesBase = { event: '*', schema: 'public', table: 'milestones' } as any
        const milestonesOpts = userRole === 'admin'
          ? milestonesBase
          : { ...milestonesBase, filter: `booking_id.in.(select id from bookings where or(client_id.eq.${userId},provider_id.eq.${userId}))` }
        
        milestonesChannel = supabase
          .channel(`milestones-${userId}`)
          .on('postgres_changes', milestonesOpts, (payload: any) => {
            if (!isMounted) return
            if (process.env.NODE_ENV !== 'production') {
              console.log('📡 Milestones realtime update:', payload.eventType, payload.new?.booking_id)
            }
            // Only trigger refresh for milestone changes that affect user's bookings
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              setTimeout(() => {
                if (isMounted) {
                  // Trigger data reload by updating a dependency
                  setRefreshTrigger(prev => prev + 1)
                }
              }, 2000) // Increased debounce time to prevent loops
            }
          })
          .subscribe()

        // Subscribe to invoices changes
        const invoicesBase = { event: '*', schema: 'public', table: 'invoices' } as any
        const invoicesOpts = userRole === 'admin'
          ? invoicesBase
          : { ...invoicesBase, filter: `or(client_id.eq.${userId},provider_id.eq.${userId})` }
        
        invoicesChannel = supabase
          .channel(`invoices-${userId}`)
          .on('postgres_changes', invoicesOpts, (payload: any) => {
            if (!isMounted) return
            if (process.env.NODE_ENV !== 'production') {
              console.log('📡 Invoices realtime update:', payload.eventType)
            }
            // Only trigger refresh for important invoice changes
            if (payload.eventType === 'INSERT' || 
                (payload.eventType === 'UPDATE' && payload.new?.status !== payload.old?.status)) {
              setTimeout(() => {
                if (isMounted) {
                  // Trigger data reload by updating a dependency
                  setRefreshTrigger(prev => prev + 1)
                }
              }, 4000) // Increased debounce time to prevent loops
            }
            
            if (payload.eventType === 'INSERT') {
              toast.success('New invoice created!')
            }
          })
          .subscribe()

        console.log('✅ Realtime subscriptions active')
        setRealtimeReady(true)
      } catch (error) {
        console.error('❌ Realtime subscription error:', error)
        // Non-blocking - continue without realtime if it fails
        setRealtimeReady(true) // Still set ready even if realtime fails
      }
    }

    setupRealtimeSubscriptions()

    // Cleanup function
    return () => {
      isMounted = false
      setRealtimeReady(false)
      console.log('🧹 Cleaning up realtime subscriptions')
      
      const cleanup = async () => {
        try {
          const supabase = await getSupabaseClient()
          if (bookingsChannel) supabase.removeChannel(bookingsChannel)
          if (milestonesChannel) supabase.removeChannel(milestonesChannel)
          if (invoicesChannel) supabase.removeChannel(invoicesChannel)
        } catch (error) {
          console.warn('Error cleaning up subscriptions:', error)
        }
      }
      
      cleanup()
    }
  }, [user, userRole, enableRealtime])

  // Approve booking function with optimistic UI
  const approveBooking = async (id: string, providerId?: string, status?: string) => {
    // Gate on client: only provider can approve when pending_provider_approval
    const isProvider = user?.id && providerId && user.id === providerId
    if (!isProvider || normalizeStatus(status) !== 'pending_provider_approval') {
      toast.error('Booking not pending provider approval')
      return
    }
    if (approvingIds.has(id)) return
    setApprovingIds(s => new Set(s).add(id))
    const prev = bookings
    setBookings(b => b.map(x => x.id === id ? { ...x, approval_status: 'approved' } : x))
    const dismiss = toast.loading('Approving booking…')
    try {
      // Get the current session token for authentication
      const supabase = await getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
      
      const res = await fetch(`/api/bookings/${id}/approve`, { method: 'POST', headers, credentials: 'include' })
      if (!res.ok) {
        const { error, details } = await res.json().catch(() => ({}))
        throw new Error(error || details || `Request failed: ${res.status}`)
      }
      toast.success('Booking approved')
      setRefreshTrigger(prev => prev + 1)
    } catch (err: any) {
      setBookings(prev) // revert on error
      toast.error(err?.message || 'Approval failed')
    } finally {
      toast.dismiss(dismiss)
      setApprovingIds(s => { const n = new Set(s); n.delete(id); return n })
    }
  }

  // Decline booking function with optimistic UI
  const declineBooking = async (id: string, providerId?: string, status?: string) => {
    // Gate on client: only provider can decline when pending_provider_approval
    const isProvider = user?.id && providerId && user.id === providerId
    if (!isProvider || normalizeStatus(status) !== 'pending_provider_approval') {
      toast.error('Booking not pending provider approval')
      return
    }
    if (approvingIds.has(id)) return
    setApprovingIds(s => new Set(s).add(id))
    const prev = bookings
    setBookings(b => b.map(x => x.id === id ? { ...x, approval_status: 'rejected', status: 'declined' } : x))
    const dismiss = toast.loading('Declining booking…')
    try {
      const supabase = await getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
      const res = await fetch(`/api/bookings/${id}/decline`, { method: 'POST', headers, credentials: 'include' })
      if (!res.ok) {
        const { error, details } = await res.json().catch(() => ({}))
        throw new Error(error || details || `Request failed: ${res.status}`)
      }
      toast.success('Booking declined')
      setRefreshTrigger(prev => prev + 1)
    } catch (err: any) {
      setBookings(prev)
      toast.error(err?.message || 'Decline failed')
    } finally {
      toast.dismiss(dismiss)
      setApprovingIds(s => { const n = new Set(s); n.delete(id); return n })
    }
  }

  // Start project/work function
  const startProject = async (id: string) => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) { toast.error('Sign in required'); router.push('/auth/sign-in'); return }
      const res = await fetch('/api/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        credentials: 'include',
        body: JSON.stringify({ booking_id: id, action: 'start_project' })
      })
      if (!res.ok) throw new Error('Failed to start project')
      toast.success('Project started')
      setRefreshTrigger(v=>v+1)
    } catch (e:any) { toast.error(e?.message || 'Failed to start') }
  }

  // Role-based permissions
  const canCreateBooking = userRole === 'client' || userRole === 'admin'
  const canManageBookings = userRole === 'admin'
  const canViewAllBookings = userRole === 'admin'
  const canCreateInvoice = userRole === 'provider' || userRole === 'admin'

  const getInvoiceHref = (invoiceId: string) => {
    if (userRole === 'admin') return `/dashboard/invoices/template/${invoiceId}`
    if (userRole === 'provider') return `/dashboard/provider/invoices/template/${invoiceId}`
    return `/dashboard/client/invoices/template/${invoiceId}`
  }

  const handleCreateInvoice = useCallback(async (booking: any) => {
    try {
      const eligibleStatuses = ['approved', 'confirmed', 'in_progress', 'completed']
      const isApproved = eligibleStatuses.includes(String(booking.status)) || 
                        booking.approval_status === 'approved'
      
      if (!isApproved) {
        toast.error('Invoice can be created only after approval')
        return
      }
      
      if (!canCreateInvoice) {
        toast.error('You do not have permission to create invoices')
        return
      }
      
      const supabase = await getSupabaseClient()
      const amount = Number(
        (booking.amount_cents ?? null) !== null
          ? (booking.amount_cents as number) / 100
          : booking.totalAmount ?? booking.amount ?? booking.total_price ?? 0
      )
      const currency = String(booking.currency ?? 'OMR')
      
      if (amount <= 0) {
        toast.error('Invalid booking amount')
        return
      }
      
      const payload: any = {
        booking_id: booking.id,
        client_id: booking.client_id || booking.client_profile?.id,
        provider_id: booking.provider_id || booking.provider_profile?.id || user?.id,
        amount,
        currency,
        status: 'draft',
        invoice_number: `INV-${Date.now()}`,
        total_amount: amount,
        subtotal: amount,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      console.log('Creating invoice with payload:', payload)
      
      const { data, error } = await supabase
        .from('invoices')
        .insert(payload)
        .select('id, booking_id, status, amount, currency')
        .single()
      
      if (error) {
        console.error('Invoice creation error:', error)
        throw new Error(error.message || 'Failed to create invoice')
      }
      
      // Update local invoices list
      setInvoices(prev => [{ 
        id: data.id, 
        booking_id: data.booking_id, 
        status: data.status,
        amount: data.amount,
        currency: data.currency
      }, ...prev])
      
      toast.success('Invoice created successfully')
    } catch (e: any) {
      console.error('Invoice creation failed:', e)
      toast.error(e?.message || 'Failed to create invoice')
    }
  }, [canCreateInvoice, user])

  // Quick invoice actions
  const handleSendInvoice = useCallback(async (invoiceId: string) => {
    try {
      const supabase = await getSupabaseClient()
      const { error } = await supabase
        .from('invoices')
        .update({ 
          status: 'issued',
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId)

      if (error) throw error

      toast.success('Invoice sent successfully')
      // Trigger data reload by updating a dependency
      setRefreshTrigger(prev => prev + 1)
    } catch (e: any) {
      console.error('Send invoice failed:', e)
      toast.error(e?.message || 'Failed to send invoice')
    }
  }, [])


  const handleMarkInvoicePaid = useCallback(async (invoiceId: string) => {
    try {
      const supabase = await getSupabaseClient()
      const { error } = await supabase
        .from('invoices')
        .update({ 
          status: 'paid',
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId)

      if (error) throw error

      toast.success('Invoice marked as paid')
      // Trigger data reload by updating a dependency
      setRefreshTrigger(prev => prev + 1)
    } catch (e: any) {
      console.error('Mark paid failed:', e)
      toast.error(e?.message || 'Failed to mark invoice as paid')
    }
  }, [])

	// Export helpers
	const exportBookings = useCallback((format: 'csv' | 'pdf' | 'xlsx', ids?: string[]) => {
		const params = new URLSearchParams()
		params.set('format', format)
		if (ids && ids.length > 0) params.set('ids', ids.join(','))
		const url = `/api/bookings/export?${params.toString()}`
		window.open(url, '_blank')
	}, [])

  // Safely resolve and format dates regardless of field naming or value shape
  const getCreatedAtTimestamp = useCallback((record: any): number => {
    const raw = record?.createdAt ?? record?.created_at ?? record?.created_at_utc ?? record?.created_at_iso
    if (!raw) return 0
    const date = typeof raw === 'number' ? new Date(raw) : new Date(String(raw))
    const time = date.getTime()
    return Number.isNaN(time) ? 0 : time
  }, [])

  // NEW: proper "updated" resolver
  const getUpdatedAtTimestamp = useCallback((record: any): number => {
    const raw =
      record?.updatedAt ?? record?.updated_at ??
      record?.modified_at ?? record?.updated_at_utc ?? record?.updated_at_iso
    if (!raw) return 0
    const d = typeof raw === 'number' ? new Date(raw) : new Date(String(raw))
    const t = d.getTime()
    return Number.isNaN(t) ? 0 : t
  }, [])

  const formatLocalDate = useCallback((raw: any): string => {
    if (!raw) return '—'
    const d = typeof raw === 'number' ? new Date(raw) : new Date(String(raw))
    if (Number.isNaN(d.getTime())) return '—'
    return new Intl.DateTimeFormat(undefined, { timeZone: OMAN_TZ, year: 'numeric', month: 'short', day: '2-digit' }).format(d)
  }, [])

  const formatLocalTime = useCallback((raw: any): string => {
    if (!raw) return '—'
    const d = typeof raw === 'number' ? new Date(raw) : new Date(String(raw))
    if (Number.isNaN(d.getTime())) return '—'
    return new Intl.DateTimeFormat(undefined, { 
      timeZone: OMAN_TZ, 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    }).format(d) + ' GST'
  }, [])

  // Get role-specific page title and description
  const getPageTitle = () => {
    switch (userRole) {
      case 'admin': return 'All Bookings Management'
      case 'provider': return 'My Service Bookings'
      case 'client': return 'My Bookings'
      default: return 'Bookings'
    }
  }
  
  const getPageDescription = () => {
    switch (userRole) {
      case 'admin': return 'Manage all bookings across the platform'
      case 'provider': return 'Track and manage your service bookings'
      case 'client': return 'View and manage your service requests'
      default: return 'Manage bookings'
    }
  }

  // Always use Supabase data on this page to avoid mock IDs in routes
  const bookingsSource = bookings
  const invoicesSource = invoices

  // Client-side filter augmentation (optional) using BookingFilters hook
  const { filters, setFilters, clearFilters } = useBookingFilters()
  const filteredBookings = applyBookingFilters(bookingsSource, filters)

  // Derive categories from current data
  const categories = useMemo(() => {
    const s = new Set<string>()
    for (const b of bookingsSource || []) {
      const c = String((b as any).service_category || (b as any).serviceCategory || '')
      if (c) s.add(c)
    }
    return Array.from(s).sort()
  }, [bookingsSource])

  // Load bookings summary for success rate and revenue
  useEffect(() => {
    ;(async () => {
      try {
        const supabase = await getSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        const headers: Record<string,string> = { 'Content-Type': 'application/json' }
        if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
        const res = await fetch('/api/bookings/summary', { headers, credentials: 'include', cache: 'no-store' })
        if (!res.ok) return
        const json = await res.json()
        setSummary(json)
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') console.log('Summary fetch failed')
      }
    })()
  }, [])

  // Pagination: Use server-side pagination results
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const paginatedBookings = filteredBookings // Already paginated by the API

  // Pagination window: show pages around current
  const pageWindow = useMemo(() => {
    const radius = 2
    const start = Math.max(1, currentPage - radius)
    const end = Math.min(totalPages, currentPage + radius)
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }, [currentPage, totalPages])

  // Calculate statistics - use summary stats when available for consistency across pages
  const stats = useMemo(() => {
    // If we have summary stats, use them for consistent metrics across all pages
    if (summaryStats) {
      console.log('📊 Using summary stats (CONSISTENT ACROSS ALL PAGES):', summaryStats)
      return {
        total: summaryStats.total,
        completed: summaryStats.completed,
        inProgress: summaryStats.inProgress,
        pending: summaryStats.pending,
        approved: summaryStats.approved,
        totalRevenue: summaryStats.totalRevenue,
        projectedBillings: summaryStats.projectedBillings,
        avgCompletionTime: summaryStats.avgCompletionTime,
        pendingApproval: summaryStats.pendingApproval,
        readyToLaunch: summaryStats.readyToLaunch
      }
    }

    // Fallback to current page calculation (inconsistent across pages)
    const bookingsData = bookings || []
    const total = totalCount
    
    const completed = bookingsData.filter((b:any) => getDerivedStatus(b) === 'delivered').length
    const inProgress = bookingsData.filter((b:any) => getDerivedStatus(b) === 'in_production').length
    const approved = bookingsData.filter((b:any) => 
      b.status === 'approved' || b.approval_status === 'approved'
    ).length
    const pending = bookingsData.filter((b:any) => getDerivedStatus(b) === 'pending_review').length
    
    const paidInvoices = invoices.filter(inv => inv.status === 'paid')
    const issuedInvoices = invoices.filter(inv => inv.status === 'issued')
    const totalRevenue = invoices
      .filter(inv => ['issued', 'paid'].includes(inv.status))
      .reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0)

    // Only log revenue calculation in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('💰 Revenue calculation (fallback):', {
        totalInvoices: invoices.length,
        paidInvoices: paidInvoices.length,
        issuedInvoices: issuedInvoices.length,
        totalRevenue
      })
    }
    
    const projectedBillings = bookingsData
      .filter(b => ['ready_to_launch', 'in_production'].includes(getDerivedStatus(b)))
      .reduce((sum: number, b: any) => sum + ((b.amount_cents ?? 0) / 100), 0)
    
    const avgCompletionTime = 7.2
    const pendingApproval = pending
    const readyToLaunch = bookingsData.filter((b:any) => getDerivedStatus(b) === 'ready_to_launch').length

    // Only log ready to launch calculation in development
    if (process.env.NODE_ENV !== 'production') {
      const readyToLaunchBookings = bookingsData.filter((b:any) => getDerivedStatus(b) === 'ready_to_launch')
      console.log('🚀 Ready to Launch calculation (fallback):', {
        totalBookings: bookingsData.length,
        readyToLaunchCount: readyToLaunch
      })
    }

    // Only log stats calculation in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('📊 Stats calculation (FALLBACK - PAGE DATA ONLY):', {
        total,
        completed,
        inProgress,
        approved,
        pending,
        totalRevenue,
        readyToLaunch,
        bookingsCount: bookingsData.length,
        invoicesCount: invoices.length
      })
    }

    return { 
      total, 
      completed, 
      inProgress, 
      pending, 
      approved, 
      totalRevenue, 
      projectedBillings, 
      avgCompletionTime,
      pendingApproval,
      readyToLaunch
    }
  }, [summaryStats, bookings, invoices, totalCount, currentPage])

  // Show loading skeleton only during initial user loading
  if (userLoading) {
    return (
      <div className="space-y-6">
        {/* Enhanced Professional Header Skeleton */}
        <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 rounded-2xl p-8 text-white shadow-2xl relative overflow-hidden">
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <Skeleton className="h-8 w-64 bg-white/20" />
              </div>
              <Skeleton className="h-5 w-80 bg-white/20 mb-6" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                    <Skeleton className="h-4 w-24 bg-white/20 mb-2" />
                    <Skeleton className="h-6 w-16 bg-white/20" />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-32 bg-white/20" />
              <Skeleton className="h-10 w-10 bg-white/20 rounded-full" />
            </div>
          </div>
        </div>

        {/* Filters Skeleton */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-24" />
              </div>
              <Skeleton className="h-8 w-24" />
            </div>
          </CardContent>
        </Card>

        {/* Table Skeleton */}
        <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-gray-50">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50">
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border-b border-gray-100">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show error state if user is not ready or there's an error
  if (!user || !userRole) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-md mx-auto">
          <AlertTriangle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Session Loading</h3>
          <p className="text-sm text-gray-600 mb-4">
            Please wait while we verify your session and role...
          </p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Reload Page
          </Button>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-2 text-red-500" />
          <h3 className="text-lg font-semibold">Error Loading Bookings</h3>
          <p className="text-sm mt-2 text-gray-600">{error}</p>
          <Button onClick={loadSupabaseData} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

	  return (
		<div className="space-y-6">
		  {/* Enhanced Header */}
		  <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
			{/* Background Pattern */}
			<div className="absolute inset-0 opacity-20">
			  <div className="w-full h-full" style={{
				backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
				backgroundRepeat: 'repeat'
			  }}></div>
			</div>
			
			<div className="relative z-10">
			  <div className="flex items-start justify-between gap-4 mb-6">
				<div>
				  <h1 className="text-3xl font-bold mb-2">Bookings Management</h1>
				  <p className="text-blue-200 text-sm mb-4">{getPageDescription()}</p>
				  
				  {/* Quick Stats */}
				  <div className="flex flex-wrap items-center gap-3 text-sm">
					<span className="bg-white/20 px-3 py-1.5 rounded-full border border-white/30 font-medium">
					  {stats.total} total
					</span>
					<span className="bg-white/20 px-3 py-1.5 rounded-full border border-white/30 font-medium">
					  {stats.inProgress + stats.approved} active
					</span>
					<span className="bg-white/20 px-3 py-1.5 rounded-full border border-white/30 font-medium">
					  {stats.pending} pending
					</span>
					<span className="bg-white/20 px-3 py-1.5 rounded-full border border-white/30 font-medium">
					  Revenue {formatCurrency(stats.totalRevenue)}
					</span>
				  </div>
				  
				  {/* Date Range & Last Updated */}
				  <div className="mt-3 text-xs text-blue-200">
					<span>
					  {(() => {
						const start = filters.dateStart
						const end = filters.dateEnd
						if (!start && !end) return 'All time'
						const fmt = (v: string) => new Date(v).toLocaleDateString()
						return `${start ? fmt(start) : '—'} to ${end ? fmt(end) : '—'}`
					  })()}
					</span>
					{lastUpdatedAt && (
					  <span className="ml-3">
						Last updated {new Date(lastUpdatedAt).toLocaleTimeString()} 
						{dataLoading && ' • refreshing…'}
					  </span>
					)}
				  </div>
				</div>
				
				{/* Quick Actions */}
				<div className="flex flex-col items-end gap-3">
				  <div className="flex flex-wrap gap-2">
					{canCreateBooking && (
					  <Button size="sm" variant="secondary" className="bg-white text-blue-900 hover:bg-blue-50">
						<FileText className="h-4 w-4 mr-2" />
						New Booking
					  </Button>
					)}
					<Button size="sm" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20" onClick={() => exportBookings('csv')}>
					  <Download className="h-4 w-4 mr-2" />
					  Export All
					</Button>
					<Button size="sm" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20" onClick={() => console.log('Import Bookings')}>
					  <Upload className="h-4 w-4 mr-2" />
					  Import
					</Button>
					<Button size="sm" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20" asChild>
					  <a href="/dashboard/analytics/bookings">
						<BarChart3 className="h-4 w-4 mr-2" />
						Analytics
					  </a>
					</Button>
					<Button size="sm" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20" onClick={() => window.open('https://docs', '_blank')}>
					  <HelpCircle className="h-4 w-4 mr-2" />
					  Help
					</Button>
					<Button 
					  variant="outline"
					  size="sm"
					  className="bg-white/10 border-white/30 text-white hover:bg-white/20"
					  onClick={loadSupabaseData}
					  disabled={dataLoading}
					>
					  <RefreshCw className={`h-4 w-4 mr-2 ${dataLoading ? 'animate-spin' : ''}`} />
					  Refresh
					</Button>
				  </div>
				  
				  {/* View Toggles */}
              <div className="flex items-center gap-2">
					<div className="bg-white/10 p-1 rounded-lg border border-white/20">
					  <Button 
						size="sm" 
						variant={viewMode === 'card' ? 'default' : 'ghost'}
						className={`px-3 py-1.5 text-xs ${viewMode === 'card' ? 'bg-white text-blue-900' : 'text-white hover:bg-white/10'}`}
						onClick={() => setViewMode('card')}
					  >
						<Grid3X3 className="h-3 w-3 mr-1" />
						Card
					  </Button>
					  <Button 
						size="sm" 
						variant={viewMode === 'calendar' ? 'default' : 'ghost'}
						className={`px-3 py-1.5 text-xs ${viewMode === 'calendar' ? 'bg-white text-blue-900' : 'text-white hover:bg-white/10'}`}
						onClick={() => setViewMode('calendar')}
					  >
						<Calendar className="h-3 w-3 mr-1" />
						Calendar
					  </Button>
					  <Button 
						size="sm" 
						variant={viewMode === 'table' ? 'default' : 'ghost'}
						className={`px-3 py-1.5 text-xs ${viewMode === 'table' ? 'bg-white text-blue-900' : 'text-white hover:bg-white/10'}`}
						onClick={() => setViewMode('table')}
					  >
						<Table className="h-3 w-3 mr-1" />
						Table
					  </Button>
					</div>
					
					<div className="bg-white/10 p-1 rounded-lg border border-white/20">
					  <Button 
						size="sm" 
						variant={density === 'compact' ? 'default' : 'ghost'}
						className={`px-2 py-1.5 text-xs ${density === 'compact' ? 'bg-white text-blue-900' : 'text-white hover:bg-white/10'}`}
						onClick={() => setDensity('compact')}
					  >
						Compact
					  </Button>
					  <Button 
						size="sm" 
						variant={density === 'comfortable' ? 'default' : 'ghost'}
						className={`px-2 py-1.5 text-xs ${density === 'comfortable' ? 'bg-white text-blue-900' : 'text-white hover:bg-white/10'}`}
						onClick={() => setDensity('comfortable')}
					  >
						Comfortable
					  </Button>
					  <Button 
						size="sm" 
						variant={density === 'spacious' ? 'default' : 'ghost'}
						className={`px-2 py-1.5 text-xs ${density === 'spacious' ? 'bg-white text-blue-900' : 'text-white hover:bg-white/10'}`}
						onClick={() => setDensity('spacious')}
					  >
						Spacious
					  </Button>
					</div>
				  </div>
				</div>
			  </div>
			</div>
		  </div>

      {/* Status Overview Cards - Matching Screenshot */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {/* Next Actions Required */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-900 mb-1">
                  {stats.total > 0 ? `${((stats.pendingApproval / stats.total) * 100).toFixed(1)}% of portfolio` : '0.0% of portfolio'}
                </div>
                <div className="text-sm text-green-700 font-medium">Next actions required • High priority</div>
              </div>
              <Play className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        {/* Success Rate */}
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-emerald-900 mb-1">
                  {stats.total > 0 ? `${((stats.completed / stats.total) * 100).toFixed(1)}% success rate` : '0.0% success rate'}
                </div>
                <div className="text-sm text-emerald-700 font-medium">Completed projects</div>
              </div>
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        {/* Revenue */}
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-orange-900 mb-1">
                  {formatCurrency(stats.totalRevenue)}
                </div>
                <div className="text-sm text-orange-700 font-medium">
                  OMR {(stats.totalRevenue / Math.max(stats.total, 1)).toFixed(2)} avg
                </div>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        {/* Awaiting Decision */}
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-purple-900 mb-1">
                  {stats.pendingApproval} Awaiting your decision
                </div>
                <div className="text-sm text-purple-700 font-medium">
                  Action needed • {stats.pendingApproval} waiting
                </div>
              </div>
              <Clock className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        {/* Ready to Launch */}
        <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-cyan-900 mb-1">
                  {stats.readyToLaunch} Ready to launch projects
                </div>
                <div className="text-sm text-cyan-700 font-medium">
                  All prerequisites met • Ready to launch projects • Active
                </div>
              </div>
              <Rocket className="h-8 w-8 text-cyan-600" />
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <StatusFilter
          currentStatus={statusFilter as any}
          onStatusChangeAction={(s) => { setStatusFilter(s as any); setCurrentPage(1) }}
          counts={{
            all: totalCount,
            pending: bookings.filter((b:any)=> normalizeStatus(b.status) === 'pending_provider_approval' || normalizeStatus(b.status) === 'draft').length,
            confirmed: bookings.filter((b:any)=> normalizeStatus(b.status) === 'approved').length,
            in_progress: bookings.filter((b:any)=> normalizeStatus(b.status) === 'in_progress').length,
            completed: bookings.filter((b:any)=> normalizeStatus(b.status) === 'completed').length,
            cancelled: bookings.filter((b:any)=> normalizeStatus(b.status) === 'cancelled').length,
          }}
        />
        <FilterDropdown
          label="Page Size"
          options={[
            { label: '10 / page', value: '10' },
            { label: '25 / page', value: '25' },
            { label: '50 / page', value: '50' },
          ]}
          value={String(pageSize)}
          onChange={(v) => { setPageSize(parseInt(String(v || 10), 10)); setCurrentPage(1) }}
        />
      </div>

		{/* Toolbar: Search/Sort */}
		<div className="mb-6 space-y-3">
        <SearchAndSort
          search={searchQuery}
          onSearch={(q)=> setSearchQuery(q)}
          sortBy={sortBy}
          onSortBy={(k)=> setSortBy(k)}
          sortOrder={sortOrder}
          onSortOrder={(o)=> setSortOrder(o)}
        />
			<div className="flex items-center gap-2">
			  <Button variant={showFilters ? 'default' : 'outline'} size="sm" onClick={()=> setShowFilters(v=>!v)}>
				{showFilters ? 'Hide Filters' : 'Show Filters'}
			  </Button>
			  {viewMode === 'table' && (
				<FilterDropdown
					label="Columns"
					options={[
					  { label: 'Service', value: 'serviceTitle' },
					  { label: 'Client', value: 'clientName' },
					  { label: 'Provider', value: 'providerName' },
					  { label: 'Status', value: 'status' },
					  { label: 'Progress', value: 'progress' },
					  { label: 'Payment', value: 'payment' },
					  { label: 'Amount', value: 'totalAmount' },
					  { label: 'Created', value: 'createdAt' },
					  { label: 'Actions', value: 'actions' },
					]}
					value={visibleColumns}
					onChange={(v)=> setVisibleColumns((v as string[]) || [])}
					multi
				/>
			  )}
			</div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="mb-6">
          <BookingFilters
            value={filters as any}
            onChange={setFilters as any}
            onClear={clearFilters}
            categories={categories}
          />
        </div>
      )}

		{/* Calendar (via view toggle) */}
		{viewMode === 'calendar' && (
		  <div className="mb-6">
			<BookingCalendar bookings={filteredBookings} onDateSelect={(d)=> console.log('date', d)} />
		  </div>
		)}

      {/* Bulk Actions Toolbar - Show when items are selected */}
      {selectedIds.size > 0 && (
        <div className="mb-4">
          <BulkActions
            selectedCount={selectedIds.size}
            onClear={() => { setSelectedIds(new Set()); setSelectAll(false) }}
            onExport={(fmt)=> exportBookings(fmt, Array.from(selectedIds) as string[])}
            // Note: Approvals must use the dedicated Approve action
            onUpdateStatus={async (status)=> {
              const ids = Array.from(selectedIds)
              if (ids.length === 0) return
              try {
                const supabase = await getSupabaseClient()
                const { data: { session } } = await supabase.auth.getSession()
                const headers: Record<string,string> = { 'Content-Type': 'application/json' }
                if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
                // Approvals must go through the approve endpoint to satisfy backend constraints
                if (status === 'approved' || status === 'confirmed') {
                  await Promise.all(ids.map(async (id) => {
                    const r = await fetch(`/api/bookings/${id}/approve`, { method: 'POST', headers, credentials: 'include' })
                    if (!r.ok) throw new Error('Approval failed')
                  }))
                } else {
                  const res = await fetch('/api/bookings/bulk', { method: 'POST', headers, credentials: 'include', body: JSON.stringify({ action: 'update_status', status, booking_ids: ids }) })
                  if (!res.ok) { toast.error('Bulk update failed'); return }
                }
                toast.success('Updated selected bookings')
                setSelectedIds(new Set())
                setSelectAll(false)
                setRefreshTrigger(v=>v+1)
              } catch (e) {
                toast.error('Bulk update failed')
              }
            }}
            onNotify={()=> console.log('Notify', Array.from(selectedIds))}
            onReport={()=> console.log('Report', Array.from(selectedIds))}
            onArchive={()=> console.log('Archive', Array.from(selectedIds))}
          />
        </div>
      )}

		{/* Bookings Content */}
		<div className="bg-white rounded-lg shadow-sm border border-gray-200 relative">
        {/* Watermark */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-gray-100 text-6xl font-bold opacity-5 select-none">
            smartPRO
          </div>
        </div>
        {dataLoading && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10 rounded-md">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Loading bookings...</p>
            </div>
          </div>
        )}
        
			{paginatedBookings.length > 0 ? (
			  viewMode === 'table' ? (
				<div className="p-4">
				  <DataTable
					stickyHeader
					columns={[
					  {
						key: 'select',
						header: (
						  <input
							aria-label="Select all visible"
							type="checkbox"
							checked={paginatedBookings.every((b:any)=> selectedIds.has(b.id)) && paginatedBookings.length > 0}
							onChange={(e)=> {
							  const checked = e.currentTarget.checked
							  if (checked) setSelectedIds(new Set([...(selectedIds as any), ...paginatedBookings.map((b:any)=> b.id)]))
							  else setSelectedIds(new Set())
							}}
						  />
						),
						widthClass: 'w-8',
						render: (r:any) => (
						  <input
							aria-label={`Select booking ${r.id}`}
							type="checkbox"
							checked={selectedIds.has(r.id)}
							onChange={(e)=>{
							  const checked = e.currentTarget.checked
							  setSelectedIds(prev=> {
								const next = new Set(prev)
								if (checked) next.add(r.id); else next.delete(r.id)
								return next
							  })
							}}
						  />
						)
					  },
					  { key: 'serviceTitle', header: 'Service', widthClass: 'w-1/4', sortable: true, render: (r:any) => r.service_title || r.serviceTitle || '—' },
					  { key: 'clientName', header: 'Client', widthClass: 'w-1/5', sortable: true, render: (r:any) => r.client_name || r.clientName || '—' },
					  { key: 'providerName', header: 'Provider', widthClass: 'w-1/5', sortable: true, render: (r:any) => r.provider_name || r.providerName || '—' },
                      { key: 'status', header: 'Status', widthClass: 'w-40', render: (r:any) => (
                        <StatusPill status={normalizeStatus(r.status)} />
                      ) },
					  { key: 'progress', header: 'Progress', widthClass: 'w-24', render: (r:any) => {
						const pct = Math.max(0, Math.min(100, Number(r.progress_percentage ?? r.progress?.percentage ?? 0)))
						return `${pct}%`
					  } },
					  { key: 'payment', header: 'Payment', widthClass: 'w-28', render: (r:any) => {
						const inv = invoiceByBooking.get(String(r.id))
						return inv?.status ? String(inv.status) : '—'
					  } },
					  { key: 'totalAmount', header: 'Amount', widthClass: 'w-32', sortable: true, render: (r:any) => (
						<AmountDisplay
						  amount_cents={r.amount_cents || (r.amount ? r.amount * 100 : 0)}
						  currency={r.currency || 'OMR'}
						  status={r.status}
						  invoice_status={invoiceByBooking.get(String(r.id))?.status}
						  compact={true}
						  showStatus={false}
						/>
					  ) },
                      { key: 'createdAt', header: 'Created', widthClass: 'w-32', sortable: true, render: (r:any) => (
                        formatMuscat(r.created_at || r.createdAt)
                      ) },
					  { key: 'actions', header: 'Actions', widthClass: 'w-40', render: (r:any) => (
						  <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={()=> router.push(`/dashboard/bookings/${r.id}`)} aria-label="View details">Details</Button>
								{canManageBookings && !((r?.approval_status === 'approved') || (r?.status === 'approved') || (r?.status === 'confirmed')) && (
							  <Button size="sm" variant="outline" onClick={()=> approveBooking(r.id)} aria-label="Approve booking">Approve</Button>
							)}
							<Select value={String(r.status || '')} onValueChange={async (v)=>{
							  try {
								const supabase = await getSupabaseClient()
								const { data: { session } } = await supabase.auth.getSession()
								const headers: Record<string,string> = { 'Content-Type': 'application/json' }
								if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
								await fetch('/api/bookings/bulk', { method: 'POST', headers, credentials: 'include', body: JSON.stringify({ action: 'update_status', status: v, booking_ids: [r.id] }) })
								setRefreshTrigger(x=>x+1)
								toast.success('Status updated')
							  } catch {}
							}}>
                              <SelectTrigger className="h-8 w-28"><SelectValue placeholder="Status" /></SelectTrigger>
							  <SelectContent>
								<SelectItem value="pending">Pending</SelectItem>
                                {/* Approvals require dedicated action */}
                                <div className="px-2 py-1 text-xs text-gray-500">Use Approve action for confirmations</div>
								<SelectItem value="in_progress">In Progress</SelectItem>
								<SelectItem value="completed">Completed</SelectItem>
								<SelectItem value="cancelled">Cancelled</SelectItem>
							  </SelectContent>
							</Select>
							<Button size="sm" variant="ghost" onClick={()=> {
							  const email = r.client_email || r.client?.email || ''
							  if (email) window.location.href = `mailto:${email}?subject=Booking%20Update&body=Hello%2C%20this%20is%20a%20gentle%20reminder%20regarding%20your%20booking%20${r.id}.`
							}} aria-label="Send reminder">Reminder</Button>
						  </div>
					  ) }
					]}
					data={paginatedBookings as any}
					page={currentPage}
					pageSize={pageSize}
					total={totalCount}
					onPageChange={(p)=> setCurrentPage(Math.max(1, Math.min(p, totalPages)))}
					onSortChange={(key, dir)=>{
					  // map table keys to page sort keys
					  const map: Record<string,string> = {
						createdAt: 'createdAt',
						totalAmount: 'totalAmount',
						serviceTitle: 'serviceTitle',
						clientName: 'clientName',
						providerName: 'providerName'
					  }
					  const uiKey = map[key] || 'createdAt'
					  setSortBy(uiKey)
					  setSortOrder(dir)
					}}
					sortKey={sortBy}
					sortDirection={sortOrder}
					className={density === 'compact' ? 'text-xs' : density === 'spacious' ? 'text-base' : 'text-sm'}
				  />
				</div>
			  ) : (
			  <div className="divide-y divide-gray-100">

              {/* Header row with select all */}
              <div className="px-4 py-2 bg-gray-50 flex items-center gap-3">
                <Checkbox
                  checked={selectAll}
                  onCheckedChange={(v)=>{
                    const checked = Boolean(v)
                    setSelectAll(checked)
                    if (checked) {
                      setSelectedIds(new Set(paginatedBookings.map((b:any)=>b.id)))
                    } else {
                      setSelectedIds(new Set())
                    }
                  }}
                />
                <span className="text-sm text-gray-500">Select all on this page</span>
              </div>
				  {paginatedBookings.map((booking) => (
					<div key={booking.id} className="mb-3">
					  <ImprovedBookingCard
						booking={booking}
						invoice={invoiceByBooking.get(String(booking.id))}
						isSelected={selectedIds.has(booking.id)}
						onSelect={(checked) => {
						  setSelectedIds(prev => {
							const next = new Set(prev)
							if (checked) next.add(booking.id); else next.delete(booking.id)
							return next
						  })
						}}
                        onQuickAction={async (action) => {
                          if (action === 'view') {
                            router.push(`/dashboard/bookings/${booking.id}`)
                          } else if (action === 'approve') {
                            await approveBooking(booking.id, booking.provider_id, booking.status)
                          } else if (action === 'decline') {
                            await declineBooking(booking.id, booking.provider_id, booking.status)
                          } else if (action === 'start_work' || action === 'start_project') {
                            await startProject(booking.id)
                          } else if (action === 'create_invoice') {
                            await handleCreateInvoice(booking)
                          } else if (action === 'send_invoice') {
                            const inv = invoiceByBooking.get(String(booking.id)); if (inv) await handleSendInvoice(inv.id)
                          } else if (action === 'mark_paid') {
                            const inv = invoiceByBooking.get(String(booking.id)); if (inv) await handleMarkInvoicePaid(inv.id)
                          } else if (action === 'pay_invoice') {
                            const inv = invoiceByBooking.get(String(booking.id)); if (inv) router.push(getInvoiceHref(inv.id))
                          } else if (action === 'view_invoice') {
                            const inv = invoiceByBooking.get(String(booking.id)); if (inv) router.push(getInvoiceHref(inv.id))
                          } else if (action === 'update_progress') {
                            router.push(`/dashboard/bookings/${booking.id}/milestones`)
                          } else if (action === 'message') {
                            router.push('/dashboard/messages')
                          }
                        }}
                        onViewDetails={(id) => { router.push(`/dashboard/bookings/${booking.id}`) }}
						density={density}
						userRole={userRole || undefined}
					  />
					</div>
				  ))}
            </div>
			  )
          ) : (
            <div className="text-center py-12">
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 bg-gray-100 rounded-full">
                  <Calendar className="h-8 w-8 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No bookings found</h3>
                  <p className="text-gray-500 mb-4">
                    {searchQuery || statusFilter !== 'all' 
                      ? 'No bookings match your current filters. Try adjusting your search criteria.'
                      : userRole === 'provider' 
                        ? 'You don\'t have any bookings yet. Create a service to start receiving bookings.'
                        : userRole === 'client'
                          ? 'You don\'t have any bookings yet. Browse services to make your first booking.'
                          : 'No bookings have been created yet.'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="p-4">
            <PaginationFooter
              page={currentPage}
              totalPages={totalPages}
              totalCount={totalCount}
              pageCount={paginatedBookings.length}
              onPrev={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              onNext={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              onGoTo={(p) => setCurrentPage(p)}
              onPageSizeChange={(size)=> { setPageSize(size); setCurrentPage(1) }}
              pageSize={pageSize}
            />
          </CardContent>
        </Card>
      )}
      
      {/* Detail Modal */}
      <BookingDetailModal 
        open={detailOpen} 
        onOpenChange={setDetailOpen} 
        booking={detailBooking}
        invoice={detailBooking ? invoiceByBooking.get(String(detailBooking.id)) : null}
        milestones={detailMilestones}
        communications={detailCommunications}
        files={detailFiles}
      />
    </div>
  )
}
