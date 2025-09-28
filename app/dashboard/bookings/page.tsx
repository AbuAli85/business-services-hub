'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  DollarSign
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency } from '@/lib/dashboard-data'
import toast from 'react-hot-toast'
import { getSupabaseClient } from '@/lib/supabase-client'

// Constants
const OMAN_TZ = 'Asia/Muscat'

// Helper for custom tooltips - simplified for now
const TitleTip: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div title={label}>
    {children}
  </div>
)

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
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<'client' | 'provider' | 'admin' | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('lastUpdated')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [realtimeReady, setRealtimeReady] = useState(false)
  const [enableRealtime, setEnableRealtime] = useState(false) // Temporarily disable realtime
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set())
  const lastRefreshTimeRef = useRef(0)
  const abortControllerRef = useRef<AbortController | null>(null)

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
        return
      }
      
      if (!session) {
        console.error('❌ No session found - user not authenticated')
        setError('Please sign in to view bookings.')
        router.push('/auth/sign-in')
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
          return
        }
        
        // For non-critical errors, show empty state instead of error
        if (res.status === 404 || res.status === 403) {
          console.log('📝 No bookings found or access denied - showing empty state')
          setBookings([])
          setTotalCount(0)
          setInvoices([])
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
  const approveBooking = async (id: string) => {
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
      
      const res = await fetch('/api/bookings', {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({ booking_id: id, action: 'approve' })
      })
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

  // Since we're using server-side pagination, we don't need client-side filtering
  // The API handles all filtering and sorting
  const filteredBookings = bookingsSource

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

    console.log('💰 Revenue calculation (fallback):', {
      totalInvoices: invoices.length,
      paidInvoices: paidInvoices.length,
      issuedInvoices: issuedInvoices.length,
      paidAmount: paidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0),
      issuedAmount: issuedInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0),
      totalRevenue,
      sampleInvoices: invoices.slice(0, 3).map(inv => ({
        id: inv.id,
        status: inv.status,
        amount: inv.amount,
        booking_id: inv.booking_id
      }))
    })
    
    const projectedBillings = bookingsData
      .filter(b => ['ready_to_launch', 'in_production'].includes(getDerivedStatus(b)))
      .reduce((sum: number, b: any) => sum + ((b.amount_cents ?? 0) / 100), 0)
    
    const avgCompletionTime = 7.2
    const pendingApproval = pending
    const readyToLaunch = bookingsData.filter((b:any) => getDerivedStatus(b) === 'ready_to_launch').length

    console.log('📊 Stats calculation (CURRENT PAGE ONLY - INCONSISTENT ACROSS PAGES):', {
      total,
      completed,
      inProgress,
      approved,
      pending,
      totalRevenue,
      projectedBillings,
      pendingApproval,
      readyToLaunch,
      bookingsCount: bookingsData.length,
      totalCountFromAPI: totalCount,
      invoicesCount: invoices.length,
      currentPage: currentPage,
      warning: 'Using current page data - will be different on each page!'
    })

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
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Bookings</h1>
      </div>

      {/* My Service Bookings Header - Matching Screenshot */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">My Service Bookings</h2>
            <p className="text-blue-200 text-sm">Track and manage your service bookings</p>
          </div>
          <Button 
            variant="secondary"
            size="sm"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            onClick={loadSupabaseData}
            disabled={dataLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${dataLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="text-2xl font-bold text-white mb-1">Total Projects</div>
            <div className="text-3xl font-bold text-white">{stats.total}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="text-2xl font-bold text-white mb-1">Delivered</div>
            <div className="text-3xl font-bold text-white">{stats.completed}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="text-2xl font-bold text-white mb-1">In Production</div>
            <div className="text-3xl font-bold text-white">{stats.inProgress}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="text-2xl font-bold text-white mb-1">Revenue (to date)</div>
            <div className="text-3xl font-bold text-white">{formatCurrency(stats.totalRevenue)}</div>
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
                  {stats.pendingApproval} {stats.pendingApproval > 0 ? `${((stats.pendingApproval / stats.total) * 100).toFixed(1)}% of portfolio` : '0 0.0% of portfolio'}
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
                  {stats.completed} {stats.total > 0 ? `${((stats.completed / stats.total) * 100).toFixed(1)}% success rate` : '0 0.0% success rate'}
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


      {/* Filter Tabs - Matching Screenshot */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { key: 'all', label: 'All' },
          { key: 'pending_review', label: 'Pending Review' },
          { key: 'approved', label: 'Approved' },
          { key: 'ready_to_launch', label: 'Ready to Launch' },
          { key: 'in_production', label: 'In Production' },
          { key: 'delivered', label: 'Delivered' },
          { key: 'on_hold', label: 'On Hold' },
          { key: 'cancelled', label: 'Cancelled' }
        ].map(s => (
          <button
            key={s.key}
            onClick={() => { setStatusFilter(s.key as any); setCurrentPage(1) }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              statusFilter === s.key 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Search and Controls - Matching Screenshot */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search bookings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending_review">Pending Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="ready_to_launch">Ready to Launch</SelectItem>
            <SelectItem value="in_production">In Production</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Last Updated" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lastUpdated">Last Updated</SelectItem>
            <SelectItem value="createdAt">Date Created</SelectItem>
            <SelectItem value="totalAmount">Amount</SelectItem>
            <SelectItem value="serviceTitle">Service</SelectItem>
          </SelectContent>
        </Select>
        <Select value={String(pageSize)} onValueChange={(v)=> { setPageSize(Number(v)); setCurrentPage(1) }}>
          <SelectTrigger className="w-28">
            <SelectValue placeholder="10 / page" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10 / page</SelectItem>
            <SelectItem value="25">25 / page</SelectItem>
            <SelectItem value="50">50 / page</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bookings List - Matching Screenshot */}
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
          <div className="divide-y divide-gray-100">
              {paginatedBookings.map((booking) => {
                const invoice = getInvoiceForBooking(booking.id)
                const derivedStatus = getDerivedStatus(booking)
                
                return (
                  <div key={booking.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      {/* Service Title */}
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-base mb-1">
                          {booking.service_title || 'Service'}
                        </h3>
                        
                        {/* ID and View Details */}
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                          <span className="font-mono">ID: {String(booking.id).slice(0, 8)}...</span>
                          <Link href={`/dashboard/bookings/${booking.id}`} className="text-blue-600 hover:underline">
                            View Details
                          </Link>
                        </div>
                        
                        {/* Price */}
                        <div className="text-lg font-bold text-gray-900 mb-2">
                          {Number(booking.amount_cents ?? 0) === 0 ? (
                            <span className="text-gray-500">No amount set</span>
                          ) : (
                            formatCurrency(
                              Number((booking.amount_cents ?? 0) / 100),
                              String(booking.currency ?? 'OMR')
                            )
                          )}
                        </div>
                        
                        {/* Status Badge - Matching Screenshot */}
                        <div className="flex items-center gap-2 mb-2">
                          <Badge 
                            variant="outline" 
                            className={`text-xs font-semibold px-2 py-1 ${
                              derivedStatus === 'delivered' 
                                ? 'text-green-700 border-green-300 bg-green-100'
                                : derivedStatus === 'in_production'
                                ? 'text-blue-700 border-blue-300 bg-blue-100'
                                : derivedStatus === 'ready_to_launch'
                                ? 'text-purple-700 border-purple-300 bg-purple-100'
                                : derivedStatus === 'approved'
                                ? 'text-orange-700 border-orange-300 bg-orange-100'
                                : derivedStatus === 'cancelled'
                                ? 'text-red-700 border-red-300 bg-red-100'
                                : 'text-yellow-700 border-yellow-300 bg-yellow-100'
                            }`}
                          >
                            {derivedStatus === 'delivered' ? 'Delivered' :
                             derivedStatus === 'in_production' ? 'In Production' :
                             derivedStatus === 'ready_to_launch' ? 'Ready to Launch' :
                             derivedStatus === 'approved' ? 'Approved' :
                             derivedStatus === 'cancelled' ? 'Cancelled' :
                             'Pending'}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            {derivedStatus === 'ready_to_launch' ? 'All prerequisites met' : getStatusSubtitle(derivedStatus)}
                          </span>
                          {derivedStatus === 'ready_to_launch' && (
                            <span className="text-sm text-gray-600">• Ready to launch</span>
                          )}
                        </div>
                        
                        {/* Invoice Status - Matching Screenshot */}
                        <div className="flex items-center gap-2 mb-2">
                          {invoice ? (
                            <>
                              <span className="text-sm text-gray-500">Invoice:</span>
                              <Badge 
                                variant="outline" 
                                className={`text-xs font-semibold ${
                                  invoice.status === 'paid' 
                                    ? 'text-green-700 border-green-300 bg-green-100'
                                    : invoice.status === 'issued'
                                    ? 'text-yellow-700 border-yellow-300 bg-yellow-100'
                                    : 'text-gray-700 border-gray-300 bg-gray-100'
                                }`}
                              >
                                {invoice.status === 'paid' ? 'Paid' : 
                                 invoice.status === 'issued' ? 'Issued' : 
                                 invoice.status}
                              </Badge>
                              {invoice.status === 'issued' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-6 px-2 text-green-600 border-green-300"
                                  onClick={() => handleMarkInvoicePaid(invoice.id)}
                                >
                                  Mark Paid
                                </Button>
                              )}
                              {invoice.status === 'draft' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-6 px-2 text-blue-600 border-blue-300"
                                  onClick={() => handleSendInvoice(invoice.id)}
                                >
                                  Send Invoice
                                </Button>
                              )}
                            </>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-500">Invoice:</span>
                              <Badge 
                                variant="outline" 
                                className="text-xs font-semibold text-gray-600 border-gray-300 bg-gray-100"
                              >
                                No Invoice
                              </Badge>
                              {canCreateInvoice && (['approved','confirmed','in_progress','completed'].includes(String(booking.status)) || booking.approval_status === 'approved') && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-xs h-6 px-2"
                                  onClick={() => handleCreateInvoice(booking)}
                                >
                                  Create
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* Date */}
                        <div className="text-sm text-gray-500">
                          {booking.scheduled_date ? formatLocalDate(booking.scheduled_date) : '—'} {booking.scheduled_date ? formatLocalTime(booking.scheduled_date) : ''}
                        </div>
                      </div>
                      
                      {/* Action Button */}
                      <div className="ml-4">
                        {/* Primary Action based on booking status and user role - ORDER MATTERS! */}
                        {booking.status === 'completed' && userRole === 'client' && (
                          <Button size="sm" className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white">
                            <Award className="h-4 w-4 mr-2" />
                            Review Project
                          </Button>
                        )}
                        
                        {derivedStatus === 'in_production' && (
                          <Button size="sm" className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white" asChild>
                            <Link href={`/dashboard/bookings/${booking.id}/milestones`}>
                              <Settings className="h-4 w-4 mr-2" />
                              Manage Project
                            </Link>
                          </Button>
                        )}
                        
                        {booking.status !== 'completed' && derivedStatus === 'ready_to_launch' && userRole === 'provider' && (
                          <Button size="sm" className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white" asChild>
                            <Link href={`/dashboard/bookings/${booking.id}/milestones`}>
                              <Play className="h-4 w-4 mr-2" />
                              Launch Project
                            </Link>
                          </Button>
                        )}
                        
                        {derivedStatus === 'pending_review' && userRole === 'provider' && (
                          <Button 
                            size="sm" 
                            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                            onClick={() => approveBooking(booking.id)}
                            disabled={approvingIds.has(booking.id)}
                          >
                            {approvingIds.has(booking.id) ? (
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4 mr-2" />
                            )}
                            Approve Project
                          </Button>
                        )}
                        
                        {derivedStatus === 'approved' && userRole === 'provider' && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="border-orange-200 text-orange-700 bg-orange-50"
                            onClick={() => handleCreateInvoice(booking)}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Create Invoice
                          </Button>
                        )}
                        
                        {derivedStatus === 'cancelled' && (
                          <Button size="sm" variant="outline" disabled className="border-red-200 text-red-700 bg-red-50">
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            Cancelled
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
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
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-600">
                {`Page ${currentPage} of ${totalPages} • ${totalCount} total results`}
                <span className="text-blue-600 ml-2">
                  (Showing {paginatedBookings.length} on this page)
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {pageWindow.map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
