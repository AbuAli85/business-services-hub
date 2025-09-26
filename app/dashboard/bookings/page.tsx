'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipProvider,
} from '@/components/ui/tooltip'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Search,
  Eye,
  Calendar,
  RefreshCw,
  Clock,
  CheckCircle,
  Download,
  ChevronUp,
  ChevronDown,
  BarChart3,
  TrendingUp,
  Receipt,
  ExternalLink,
  AlertTriangle,
  Target,
  Zap,
  Settings,
  Play,
  Award,
  User
} from 'lucide-react'
import { CompactBookingStatus } from '@/components/dashboard/smart-booking-status'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency } from '@/lib/dashboard-data'
import toast from 'react-hot-toast'
import { getSupabaseClient } from '@/lib/supabase'

export default function BookingsPage() {
  const router = useRouter()
  const [userLoading, setUserLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)
  const isLoadingRef = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [bookings, setBookings] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<'client' | 'provider' | 'admin' | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedBookings, setSelectedBookings] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [realtimeReady, setRealtimeReady] = useState(false)
  const [enableRealtime, setEnableRealtime] = useState(false) // Temporarily disable realtime
  const lastRefreshTimeRef = useRef(0)

  // Helper for custom tooltips
  const Tip: React.FC<{label: string; children: React.ReactNode}> = ({ label, children }) => (
    <Tooltip content={label}>
      {children}
    </Tooltip>
    )

  // Data sourced from centralized dashboard store

  // Safely resolve and format dates regardless of field naming or value shape
  const getCreatedAtTimestamp = useCallback((record: any): number => {
    const raw = record?.createdAt ?? record?.created_at ?? record?.created_at_utc ?? record?.created_at_iso
    if (!raw) return 0
    const date = typeof raw === 'number' ? new Date(raw) : new Date(String(raw))
    const time = date.getTime()
    return Number.isNaN(time) ? 0 : time
  }, [])

  const OMAN_TZ = 'Asia/Muscat'
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
    return new Intl.DateTimeFormat(undefined, { timeZone: OMAN_TZ, hour: '2-digit', minute: '2-digit' }).format(d)
  }, [])

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

  // Load bookings via server API with proper role-based filtering
  const loadSupabaseData = useCallback(async () => {
    if (isLoadingRef.current) {
      console.log('⏸️ Skipping load - request already in progress')
      return
    }
    isLoadingRef.current = true
    if (!user || !userRole) {
      console.log('Skipping data load - user or role not ready:', { user: !!user, userRole })
      isLoadingRef.current = false
      return
    }
    
    try {
      console.log('📊 Loading bookings data for role:', userRole)
      setDataLoading(true)
      setError(null)
      
      // Build query params for server-side pagination/filtering
      // Map UI status to DB status
      const statusForApi = statusFilter === 'confirmed' ? 'approved' : statusFilter
      const params = new URLSearchParams({
        role: userRole,
        status: statusForApi,
        q: debouncedQuery.replace(/^#/, '')
      })
      
      // Use appropriate API endpoint based on role
      const apiEndpoint = userRole === 'admin' 
        ? `/api/admin/bookings?page=${currentPage}&pageSize=${pageSize}&${params}`
        : `/api/bookings?${params}`
      
      console.log('📡 Fetching from:', apiEndpoint)
      
      // Use authenticated API request with fallback
      const { apiRequest } = await import('@/lib/api-utils')

      // 429-aware backoff wrapper with jitter
      const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
      const doFetch = async () => {
        let attempt = 0
        const maxRetries = 4
        const base = 300
        const cap = 5000
        while (true) {
          const res = await apiRequest(apiEndpoint, { cache: 'no-store' })
          if (res.status !== 429) return res
          const ra = res.headers.get('retry-after')
          const delay = ra ? Number(ra) * 1000 : Math.min(cap, base * 2 ** attempt)
          const wait = Math.floor(Math.random() * Math.max(300, delay))
          if (attempt >= maxRetries) return res
          await sleep(wait)
          attempt++
        }
      }

      // Try the request with automatic token refresh handling
      let res = await doFetch()
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        console.error('❌ API request failed:', res.status, errorData)

        // Handle authentication errors (401)
        if (res.status === 401) {
          console.log('🔐 Authentication required (401). Token refresh should have been handled automatically.')

          // Check if we have a valid session after the automatic refresh attempt
          const supabase = await getSupabaseClient()
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()

          if (sessionError || !session) {
            console.log('❌ Session check failed after automatic refresh attempt')
            setError('Your session has expired. Please sign in again to continue.')
            router.push('/auth/sign-in')
            return
          } else {
            console.log('✅ Session appears valid after refresh, but API still returned 401')
            // Try one more time in case there was a timing issue
            await new Promise(r => setTimeout(r, 500))
            const retryRes = await doFetch()
            if (!retryRes.ok) {
              setError('Authentication failed. Please sign in again to continue.')
              router.push('/auth/sign-in')
              return
            }
            res = retryRes // Use the successful retry response
          }
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
        type: userRole === 'admin' ? 'admin' : 'standard',
        itemCount: userRole === 'admin' ? json.items?.length : json.bookings?.length
      })
      
      // Handle different response formats
      if (userRole === 'admin') {
        const items = json.items || []
        setBookings(items)
        setTotalCount(Number(json.total || 0))
        // Extract invoices from embedded data
        const embedded = items.flatMap((r: any) => r.invoices || [])
        setInvoices(embedded)
        console.log('✅ Admin data loaded:', { bookings: items.length, invoices: embedded.length })
      } else {
        // Standard bookings API response
        const bookingsData = json.bookings || []
        setBookings(bookingsData)
        setTotalCount(bookingsData.length)
        console.log('✅ Bookings data loaded:', bookingsData.length)
        
        // Load invoices separately for non-admin users
        try {
          const invoiceRes = await fetch('/api/invoices', {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
          })
          if (invoiceRes.ok) {
            const invoiceJson = await invoiceRes.json()
            const invoicesData = invoiceJson.invoices || []
            setInvoices(invoicesData)
            console.log('✅ Invoices data loaded:', invoicesData.length)
          } else {
            console.warn('⚠️ Invoice loading failed:', invoiceRes.status)
            setInvoices([]) // Continue without invoices if loading fails
          }
        } catch (invoiceError) {
          console.warn('⚠️ Invoice loading error:', invoiceError)
          setInvoices([]) // Continue without invoices if loading fails
        }
      }
      
    } catch (e: any) {
      console.error('❌ Data loading error:', e)
      setError(e?.message || 'Failed to load bookings data')
    } finally {
      setDataLoading(false)
      console.log('✅ Data loading complete')
      isLoadingRef.current = false
    }
  }, [user, userRole, currentPage, pageSize, statusFilter, debouncedQuery, router])

  // Only load data when user and role are ready
  useEffect(() => {
    if (user && userRole && !userLoading) {
      const now = Date.now()
      // Add throttling to prevent excessive data loading
      if (now - lastRefreshTimeRef.current > 2000) {
        console.log('🚀 Triggering data load - user and role ready')
        lastRefreshTimeRef.current = now
        loadSupabaseData()
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
  }, [user, userRole, userLoading, currentPage, pageSize, statusFilter, debouncedQuery])

  // Separate effect for refresh trigger to prevent infinite loops
  useEffect(() => {
    if (refreshTrigger > 0 && user && userRole && !userLoading && realtimeReady) {
      const now = Date.now()
      // Only refresh if it's been at least 5 seconds since last refresh
      if (now - lastRefreshTimeRef.current > 5000) {
        console.log('🔄 Refresh triggered by realtime update')
        lastRefreshTimeRef.current = now
        loadSupabaseData()
      } else {
        console.log('⏸️ Skipping refresh - too soon since last refresh (', now - lastRefreshTimeRef.current, 'ms ago)')
      }
    }
  }, [refreshTrigger, user, userRole, userLoading, realtimeReady])

  // Realtime subscriptions for live updates
  useEffect(() => {
    if (!user || !userRole || !enableRealtime) return

    let bookingsChannel: any
    let milestonesChannel: any  
    let invoicesChannel: any
    let isMounted = true

    const setupRealtimeSubscriptions = async () => {
      try {
        // Add a delay to prevent immediate refresh triggers after initial load
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        if (!isMounted) return
        
        console.log('🔄 Setting up realtime subscriptions for:', userRole)
        const supabase = await getSupabaseClient()

        if (!isMounted) return

        // Subscribe to bookings changes
        bookingsChannel = supabase
          .channel(`bookings-changes-${user.id}`)
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'bookings',
            filter: userRole === 'admin' ? undefined : 
                   userRole === 'client' ? `client_id=eq.${user.id}` :
                   `provider_id=eq.${user.id}`
          }, (payload: any) => {
            if (!isMounted) return
            console.log('📡 Bookings realtime update:', payload.eventType, payload.new?.id)
            
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

        // Subscribe to milestones changes for progress updates - only for user's bookings
        milestonesChannel = supabase
          .channel(`milestones-changes-${user.id}`)
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'milestones',
            filter: userRole === 'admin' ? undefined :
                   userRole === 'client' ? `booking_id.in.(select id from bookings where client_id=eq.${user.id})` :
                   `booking_id.in.(select id from bookings where provider_id=eq.${user.id})`
          }, (payload: any) => {
            if (!isMounted) return
            console.log('📡 Milestones realtime update:', payload.eventType, payload.new?.booking_id)
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
        invoicesChannel = supabase
          .channel(`invoices-changes-${user.id}`)
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'invoices',
            filter: userRole === 'admin' ? undefined :
                   userRole === 'client' ? `client_id=eq.${user.id}` :
                   `provider_id=eq.${user.id}`
          }, (payload: any) => {
            if (!isMounted) return
            console.log('📡 Invoices realtime update:', payload.eventType)
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

  // Debounce searchQuery for smoother UX
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 250)
    return () => clearTimeout(t)
  }, [searchQuery])

  // Always use Supabase data on this page to avoid mock IDs in routes
  const bookingsSource = bookings
  const invoicesSource = invoices

  // Filter and sort bookings
  const filteredBookings = useMemo(() => {
    let filtered = bookingsSource.filter(booking => {
      const q = debouncedQuery.trim().replace(/^#/, '').toLowerCase()
      const matchesSearch = q === '' || 
        ((booking as any).services?.title || booking.serviceTitle || '').toLowerCase().includes(q) ||
        ((booking as any).client_profile?.full_name || booking.clientName || '').toLowerCase().includes(q) ||
        ((booking as any).provider_profile?.full_name || booking.providerName || '').toLowerCase().includes(q) ||
        String((booking as any).id || '').toLowerCase().includes(q)
      
      const matchesStatus = statusFilter === 'all' || booking.status === statusFilter
      
      return matchesSearch && matchesStatus
    })

    const safeStr = (v: any) => (v ?? '').toString()
    const safeNum = (v: any) => (typeof v === 'number' && !Number.isNaN(v)) ? v : Number(v ?? 0) || 0
    const cmp = (a: any, b: any) => {
      switch (sortBy) {
        case 'createdAt': {
          const av = getCreatedAtTimestamp(a); const bv = getCreatedAtTimestamp(b)
          return sortOrder === 'asc' ? av - bv : bv - av
  }
        case 'totalAmount': {
          const av = safeNum(a.totalAmount ?? a.amount ?? a.total_price)
          const bv = safeNum(b.totalAmount ?? b.amount ?? b.total_price)
          return sortOrder === 'asc' ? av - bv : bv - av
  }
        case 'serviceTitle': {
          const av = safeStr(a.services?.title ?? a.serviceTitle)
          const bv = safeStr(b.services?.title ?? b.serviceTitle)
          const res = av.localeCompare(bv, undefined, { sensitivity: 'base' })
          return sortOrder === 'asc' ? res : -res
  }
        case 'clientName': {
          const av = safeStr(a.client_profile?.full_name ?? a.clientName)
          const bv = safeStr(b.client_profile?.full_name ?? b.clientName)
          const res = av.localeCompare(bv, undefined, { sensitivity: 'base' })
          return sortOrder === 'asc' ? res : -res
  }
        default: {
          const av = getCreatedAtTimestamp(a); const bv = getCreatedAtTimestamp(b)
          return sortOrder === 'asc' ? av - bv : bv - av
  }
  }
  }
    filtered.sort(cmp)

    return filtered
  }, [bookingsSource, debouncedQuery, statusFilter, sortBy, sortOrder, getCreatedAtTimestamp])

  // Pagination: server returns paged items and total count for admin, client-side for others
  const totalPages = Math.max(1, Math.ceil((totalCount || filteredBookings.length) / pageSize))
  const paginatedBookings = userRole === 'admin' 
    ? bookingsSource // Server-side pagination for admin
    : filteredBookings.slice((currentPage - 1) * pageSize, currentPage * pageSize) // Client-side for others

  // Memoized invoice lookup for performance
  const invoiceByBooking = useMemo(() => {
    console.log('🔄 Rebuilding invoice lookup map with', invoicesSource.length, 'invoices')
    const m = new Map<string, any>()
    invoicesSource.forEach((invoice: any) => {
      const bookingId = String(invoice.bookingId ?? invoice.booking_id)
      m.set(bookingId, invoice)
    })
    return m
  }, [invoicesSource])
  
  const getInvoiceForBooking = useCallback((bookingId: string) => {
    return invoiceByBooking.get(String(bookingId))
  }, [invoiceByBooking])

  const getInvoiceHref = (invoiceId: string) => {
    if (userRole === 'admin') return `/dashboard/invoices/template/${invoiceId}`
    if (userRole === 'provider') return `/dashboard/provider/invoices/template/${invoiceId}`
    return `/dashboard/client/invoices/template/${invoiceId}`
  }

  // Role-based permissions
  const canCreateBooking = userRole === 'client' || userRole === 'admin'
  const canManageBookings = userRole === 'admin'
  const canViewAllBookings = userRole === 'admin'
  const canCreateInvoice = userRole === 'provider' || userRole === 'admin'
  
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

  const handleCreateInvoice = useCallback(async (booking: any) => {
    try {
      const eligibleStatuses = ['approved', 'confirmed', 'in_progress', 'completed']
      if (!eligibleStatuses.includes(String(booking.status))) {
        toast.error('Invoice can be created only after approval')
        return
  }
      
      if (!canCreateInvoice) {
        toast.error('You do not have permission to create invoices')
        return
  }
      
      const supabase = await getSupabaseClient()
      const amount = Number(booking.totalAmount ?? booking.amount ?? booking.total_price ?? 0)
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
          status: 'sent',
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

  // Calculate statistics
  const stats = useMemo(() => {
    const total = bookingsSource.length
    const completed = bookingsSource.filter((b:any) => b.status === 'completed').length
    const inProgress = bookingsSource.filter((b:any) => b.status === 'in_progress').length
    const pending = bookingsSource.filter((b:any) => b.status === 'pending').length
    const totalRevenue = bookingsSource
      .filter(b => b.status === 'completed')
      .reduce((sum: number, b: any) => sum + (b.totalAmount ?? b.amount ?? b.total_price ?? 0), 0)
    const avgCompletionTime = 7.2 // Mock data

    return { total, completed, inProgress, pending, totalRevenue, avgCompletionTime }
  }, [bookingsSource])

  // Show loading skeleton only during initial user loading
  if (userLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <Skeleton className="h-40 w-full rounded-xl" />
        
        {/* Statistics Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-l-4 border-l-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-12 w-12 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Filters Skeleton */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="flex gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-20 rounded-full" />
                ))}
              </div>
              <div className="flex gap-4">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-10 w-10" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Table Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
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
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-md mx-auto">
          <div className="text-red-600 mb-4">
            <AlertTriangle className="h-12 w-12 mx-auto mb-2" />
            <h3 className="text-lg font-semibold">Error Loading Bookings</h3>
            <p className="text-sm mt-2 text-gray-600">{error}</p>
          </div>
          <div className="space-x-2">
            <Button onClick={() => loadSupabaseData()} variant="default">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
            <Button onClick={() => router.push('/dashboard')} variant="outline">
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    )
  }
  return (
    <TooltipProvider>
      <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">{getPageTitle()}</h1>
            <p className="text-green-100 text-lg mb-4">
              {getPageDescription()}
            </p>
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                <span>Total: {stats.total} bookings</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-1" />
                <span>Completed: {stats.completed}</span>
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                <span>In Progress: {stats.inProgress}</span>
              </div>
              <div className="flex items-center">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span>Revenue: {formatCurrency(stats.totalRevenue)}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <Button 
              variant="secondary"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={loadSupabaseData}
              disabled={dataLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${dataLoading ? 'animate-spin' : ''}`} />
              {dataLoading ? 'Refreshing...' : 'Refresh'}
            </Button>
            {canCreateBooking && (
              <Button 
                variant="secondary"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={() => router.push('/dashboard/bookings/create')}
              >
                <Calendar className="h-4 w-4 mr-2" />
                New Booking
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Smart Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Projects</p>
                <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
                <p className="text-xs text-blue-600 mt-1">
                  {stats.total > 0 ? ((stats.inProgress / stats.total) * 100).toFixed(1) : 0}% of portfolio
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Play className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            {stats.inProgress > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="text-xs text-gray-500">
                  Next actions required • High priority
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
                <p className="text-xs text-green-600 mt-1">
                  {stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : 0}% success rate
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Award className="h-6 w-6 text-green-600" />
              </div>
            </div>
            {stats.completed > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="text-xs text-gray-500">
                  Avg. completion: {stats.avgCompletionTime} days
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {userRole === 'provider' ? 'Earnings' : 'Total Value'}
                </p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
                <p className="text-xs text-orange-600 mt-1">
                  {stats.total > 0 ? formatCurrency(stats.totalRevenue / stats.total) : formatCurrency(0)} avg
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            {stats.totalRevenue > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="text-xs text-gray-500">
                  Monthly trend: +12.5% ↗
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Approval</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                <p className="text-xs text-purple-600 mt-1">
                  {userRole === 'provider' ? 'Awaiting your decision' : 'Under review'}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            {stats.pending > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="text-xs text-gray-500">
                  Action needed • {stats.pending} waiting
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Quick status chips */}
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all', label: 'All' },
                { key: 'pending', label: 'Pending' },
                { key: 'confirmed', label: 'Confirmed' },
                { key: 'in_progress', label: 'In Progress' },
                { key: 'completed', label: 'Completed' },
                { key: 'cancelled', label: 'Cancelled' }
              ].map(s => (
                <button
                  key={s.key}
                  onClick={() => { setStatusFilter(s.key as any); setCurrentPage(1) }}
                  className={`px-3 py-1 rounded-full text-sm border ${statusFilter === s.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-gray-50'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search bookings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Date Created</SelectItem>
                <SelectItem value="totalAmount">Amount</SelectItem>
                <SelectItem value="serviceTitle">Service</SelectItem>
                <SelectItem value="clientName">Client</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
              <Select value={String(pageSize)} onValueChange={(v)=> { setPageSize(Number(v)); setCurrentPage(1) }}>
                <SelectTrigger className="w-28">
                  <SelectValue placeholder="Page size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 / page</SelectItem>
                  <SelectItem value="25">25 / page</SelectItem>
                  <SelectItem value="50">50 / page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Filters Summary */}
      {(searchQuery || statusFilter !== 'all' || sortBy !== 'createdAt' || sortOrder !== 'desc') && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-white">
                    Active Filters
                  </Badge>
                  {searchQuery && (
                    <Badge className="bg-blue-600 text-white">
                      Search: "{searchQuery}"
                    </Badge>
                  )}
                  {statusFilter !== 'all' && (
                    <Badge className="bg-purple-600 text-white">
                      Status: {statusFilter}
                    </Badge>
                  )}
                  {sortBy !== 'createdAt' && (
                    <Badge className="bg-orange-600 text-white">
                      Sort: {sortBy} ({sortOrder})
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-blue-700">
                  {filteredBookings.length} result{filteredBookings.length !== 1 ? 's' : ''} found
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSearchQuery('')
                  setStatusFilter('all')
                  setSortBy('createdAt')
                  setSortOrder('desc')
                  setCurrentPage(1)
                }}
                className="text-blue-600 border-blue-300"
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Professional Bookings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Project Portfolio
          </CardTitle>
          <CardDescription>
            Professional project management with intelligent status tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border relative">
            {dataLoading && (
              <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10 rounded-md">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Loading bookings...</p>
                </div>
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Project
                    </div>
                  </TableHead>
                  {userRole === 'admin' && (
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Client
                      </div>
                    </TableHead>
                  )}
                  {(userRole === 'admin' || userRole === 'client') && (
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Provider
                      </div>
                    </TableHead>
                  )}
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4" />
                      Value
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <Play className="h-4 w-4" />
                      Smart Status
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4" />
                      Billing
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Timeline
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Actions
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedBookings.length > 0 ? (
                  paginatedBookings.map((booking) => {
                    const invoice = getInvoiceForBooking(booking.id)
                    
                    return (
                      <TableRow key={booking.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="font-medium">
                            <Link href={`/dashboard/bookings/${booking.id}`} prefetch={false} className="hover:underline text-blue-600">
                              {(booking as any).services?.title || (booking as any).title || 'Service'}
                            </Link>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">ID: {String(booking.id).slice(0, 8)}...</div>
                          <div className="text-xs mt-1 space-x-2">
                            <Link href={`/dashboard/bookings/${booking.id}`} prefetch={false} className="text-blue-600 hover:underline">Details</Link>
                            <span className="text-gray-300">|</span>
                            <Link href={`/dashboard/bookings/${booking.id}/milestones`} prefetch={false} className="text-purple-600 hover:underline">Milestones</Link>
                          </div>
                        </TableCell>
                        
                        {userRole === 'admin' && (
                          <TableCell>
                            <div className="font-medium">{(booking as any).client_profile?.full_name || 'Client'}</div>
                            <div className="text-sm text-gray-500">{(booking as any).client_profile?.email || 'No email'}</div>
                          </TableCell>
                        )}
                        
                        {(userRole === 'admin' || userRole === 'client') && (
                          <TableCell>
                            <div className="font-medium">{(booking as any).provider_profile?.full_name || 'Provider'}</div>
                            <div className="text-sm text-gray-500">{(booking as any).provider_profile?.email || 'No email'}</div>
                          </TableCell>
                        )}
                        
                        <TableCell>
                          <div className="font-medium">
                            {formatCurrency(
                              Number((booking as any).totalAmount ?? (booking as any).amount ?? (booking as any).total_price ?? 0),
                              String((booking as any).currency ?? 'OMR')
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <CompactBookingStatus
                            bookingId={booking.id}
                            userRole={userRole as 'client' | 'provider' | 'admin'}
                            onStatusChange={() => setRefreshTrigger(prev => prev + 1)}
                          />
                        </TableCell>
                        
                        <TableCell>
                          {invoice ? (
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${
                                    invoice.status === 'paid' 
                                      ? 'text-green-600 border-green-200 bg-green-50'
                                      : invoice.status === 'sent'
                                      ? 'text-yellow-600 border-yellow-200 bg-yellow-50'
                                      : invoice.status === 'draft'
                                      ? 'text-blue-600 border-blue-200 bg-blue-50'
                                      : 'text-gray-600 border-gray-200 bg-gray-50'
                                  }`}
                                >
                                  {invoice.status}
                                </Badge>
                                <Tip label="View invoice details">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => router.push(getInvoiceHref(invoice.id))}
                                  >
                                    <Receipt className="h-3 w-3" />
                                  </Button>
                                </Tip>
                              </div>
                              
                              {/* Quick Invoice Actions */}
                              {canCreateInvoice && (
                                <div className="flex gap-1">
                                  {invoice.status === 'draft' && (
                                    <Tip label="Send invoice to client">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-xs h-6 px-2"
                                        onClick={() => handleSendInvoice(invoice.id)}
                                      >
                                        Send
                                      </Button>
                                    </Tip>
                                  )}
                                  {invoice.status === 'sent' && (
                                    <Tip label="Mark invoice as paid">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-xs h-6 px-2 text-green-600 border-green-300"
                                        onClick={() => handleMarkInvoicePaid(invoice.id)}
                                      >
                                        Mark Paid
                                      </Button>
                                    </Tip>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400 text-sm">No invoice</span>
                              {canCreateInvoice && ['approved','confirmed','in_progress','completed'].includes(String(booking.status)) && (
                                <Tip label="Create invoice for this booking">
                                  <Button size="sm" variant="outline" onClick={() => handleCreateInvoice(booking)}>
                                    Create
                                  </Button>
                                </Tip>
                              )}
                            </div>
                          )}
                        </TableCell>
                        
                        <TableCell>
                          <div className="text-sm">
                            {formatLocalDate((booking as any).createdAt ?? (booking as any).created_at)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatLocalTime((booking as any).createdAt ?? (booking as any).created_at)}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center space-x-1">
                              {/* Primary Action based on booking status and user role */}
                              {booking.status === 'pending' && userRole === 'provider' && (
                                <Tip label="Approve this booking to start the project">
                                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Approve
                                  </Button>
                                </Tip>
                              )}

                              {booking.status === 'pending' && userRole === 'client' && (
                                <Tip label="Waiting for provider approval">
                                  <Button size="sm" variant="outline" disabled>
                                    <Clock className="h-3 w-3 mr-1" />
                                    Pending
                                  </Button>
                                </Tip>
                              )}

                              {booking.status === 'approved' && userRole === 'provider' && (
                                <Tip label="Begin project work and create milestones">
                                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" asChild>
                                    <Link href={`/dashboard/bookings/${booking.id}/milestones`} prefetch={false}>
                                      <Play className="h-3 w-3 mr-1" />
                                      Start
                                    </Link>
                                  </Button>
                                </Tip>
                              )}

                              {booking.status === 'approved' && userRole === 'client' && (
                                <Tip label="Waiting for provider to start work">
                                  <Button size="sm" variant="outline" disabled>
                                    <Clock className="h-3 w-3 mr-1" />
                                    Approved
                                  </Button>
                                </Tip>
                              )}

                              {booking.status === 'in_progress' && (
                                <Tip label="View progress and manage project milestones">
                                  <Button size="sm" variant="outline" asChild>
                                    <Link href={`/dashboard/bookings/${booking.id}/milestones`} prefetch={false}>
                                      <Target className="h-3 w-3 mr-1" />
                                      Manage
                                    </Link>
                                  </Button>
                                </Tip>
                              )}

                              {booking.status === 'completed' && userRole === 'client' && (
                                <Tip label="Review completed project and provide feedback">
                                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                                    <Award className="h-3 w-3 mr-1" />
                                    Review
                                  </Button>
                                </Tip>
                              )}

                              {booking.status === 'completed' && userRole === 'provider' && (
                                <Tip label="Project completed - awaiting client review">
                                  <Button size="sm" variant="outline" disabled>
                                    <Award className="h-3 w-3 mr-1" />
                                    Complete
                                  </Button>
                                </Tip>
                              )}

                              {/* Secondary Actions */}
                              <Tip label="View detailed project information">
                                <Button size="sm" variant="ghost" asChild>
                                  <Link href={`/dashboard/bookings/${booking.id}`} prefetch={false}>
                                    <Eye className="h-3 w-3" />
                                  </Link>
                                </Button>
                              </Tip>

                              {invoice && (
                                <Tip label="View and manage invoice">
                                  <Button size="sm" variant="ghost" asChild>
                                    <Link href={getInvoiceHref(invoice.id)} prefetch={false}>
                                      <Receipt className="h-3 w-3" />
                                    </Link>
                                  </Button>
                                </Tip>
                              )}

                              {userRole === 'admin' && (
                                <Tip label="Access admin management tools">
                                  <Button size="sm" variant="ghost">
                                    <Settings className="h-3 w-3" />
                                  </Button>
                                </Tip>
                              )}
                            </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex flex-col items-center space-y-4 py-8">
                        <div className={`p-6 rounded-full ${
                          userRole === 'client' ? 'bg-blue-100' :
                          userRole === 'provider' ? 'bg-purple-100' :
                          'bg-gray-100'
                        }`}>
                          <Calendar className={`h-12 w-12 ${
                            userRole === 'client' ? 'text-blue-600' :
                            userRole === 'provider' ? 'text-purple-600' :
                            'text-gray-400'
                          }`} />
                        </div>
                        
                        <div className="text-center space-y-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {searchQuery || statusFilter !== 'all' ? 'No Results Found' : 'No Bookings Yet'}
                          </h3>
                          <p className="text-sm text-gray-600 max-w-md">
                            {searchQuery || statusFilter !== 'all'
                              ? 'Try adjusting your search filters or check different status categories to find what you\'re looking for.'
                              : userRole === 'client' 
                                ? 'Ready to get started? Create your first booking to begin working with our professional service providers.'
                                : userRole === 'provider'
                                ? 'Your service bookings from clients will appear here. Make sure your services are published and visible.'
                                : 'Bookings from across the platform will appear here as they are created by clients and providers.'}
                          </p>
                        </div>

                        {/* Role-specific CTAs */}
                        <div className="flex flex-col sm:flex-row gap-3">
                          {userRole === 'client' && !searchQuery && statusFilter === 'all' && (
                            <>
                              <Button 
                                className="bg-blue-600 hover:bg-blue-700"
                                onClick={() => router.push('/dashboard/bookings/create')}
                              >
                                <Calendar className="h-4 w-4 mr-2" />
                                Create Your First Booking
                              </Button>
                              <Button 
                                variant="outline"
                                onClick={() => router.push('/services')}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Browse Services
                              </Button>
                            </>
                          )}
                          
                          {userRole === 'provider' && !searchQuery && statusFilter === 'all' && (
                            <>
                              <Button 
                                className="bg-purple-600 hover:bg-purple-700"
                                onClick={() => router.push('/dashboard/provider/provider-services')}
                              >
                                <Settings className="h-4 w-4 mr-2" />
                                Manage Your Services
                              </Button>
                              <Button 
                                variant="outline"
                                onClick={() => router.push('/dashboard/provider/create-service')}
                              >
                                <Target className="h-4 w-4 mr-2" />
                                Create New Service
                              </Button>
                            </>
                          )}
                          
                          {userRole === 'admin' && !searchQuery && statusFilter === 'all' && (
                            <Button 
                              variant="outline"
                              onClick={() => router.push('/dashboard/admin/analytics')}
                            >
                              <BarChart3 className="h-4 w-4 mr-2" />
                              View Platform Analytics
                            </Button>
                          )}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Smart Pagination - works for all user roles */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-600">
                {userRole === 'admin' 
                  ? `Page ${currentPage} of ${totalPages} • ${totalCount} total results`
                  : `Page ${currentPage} of ${totalPages} • ${filteredBookings.length} results`
  }
                {paginatedBookings.length !== filteredBookings.length && (
                  <span className="text-blue-600 ml-2">
                    (Showing {paginatedBookings.length} per page)
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={currentPage === 1} 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                >
                  <ChevronDown className="h-4 w-4 rotate-90" />
                  Previous
                </Button>
                
                {/* Page numbers for better navigation */}
                {totalPages <= 7 ? (
                  // Show all pages if 7 or fewer
                  Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <Button
                      key={page}
                      variant={page === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-10"
                    >
                      {page}
                    </Button>
                  ))
                ) : (
                  // Show abbreviated pagination for many pages
                  <>
                    {currentPage > 3 && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} className="w-10">1</Button>
                        {currentPage > 4 && <span className="text-gray-400">...</span>}
                      </>
                    )}
                    {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                      const page = Math.max(1, Math.min(totalPages - 2, currentPage - 1)) + i
                      return page <= totalPages ? (
                        <Button
                          key={page}
                          variant={page === currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="w-10"
                        >
                          {page}
                        </Button>
                      ) : null
                    })}
                    {currentPage < totalPages - 2 && (
                      <>
                        {currentPage < totalPages - 3 && <span className="text-gray-400">...</span>}
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} className="w-10">{totalPages}</Button>
                      </>
                    )}
                  </>
                )}
                
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={currentPage === totalPages} 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                >
                  Next
                  <ChevronDown className="h-4 w-4 -rotate-90" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Smart Results Summary */}
      {!dataLoading && totalPages <= 1 && bookings.length > 0 && (
        <div className="text-center">
          <Badge variant="outline" className="text-gray-600">
            <BarChart3 className="h-3 w-3 mr-1" />
            {bookings.length} project{bookings.length !== 1 ? 's' : ''} in your portfolio
          </Badge>
        </div>
      )}
      </div>
    </TooltipProvider>
    )
  }
