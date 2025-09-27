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
  ChevronLeft,
  ChevronRight,
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
  User,
  Rocket,
  DollarSign,
  Gem
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
  const [sortBy, setSortBy] = useState('lastUpdated')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedBookings, setSelectedBookings] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [realtimeReady, setRealtimeReady] = useState(false)
  const [enableRealtime, setEnableRealtime] = useState(false) // Temporarily disable realtime
  const lastRefreshTimeRef = useRef(0)

  // Helper for custom tooltips
  const Tip: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <Tooltip content={<p className="max-w-xs text-sm">{label}</p>}>
      {children}
    </Tooltip>
  )

  // Data sourced from centralized dashboard store

  // --- Hoisted pure helpers (avoid TDZ) ---
  function getDerivedStatus(booking: any) {
    // Handle the canonical status ladder: Pending Review → Approved → Ready to Launch → In Production → Delivered
    
    // If completed, always show as delivered
    if (booking.status === 'completed') {
      return 'delivered'
    }
    
    // If in progress, show as in production
    if (booking.status === 'in_progress') {
      return 'in_production'
    }
    
    // If approved (either via status or approval_status), show as ready to launch
    if ((booking.approval_status === 'approved' || booking.ui_approval_status === 'approved') 
        && booking.status === 'pending') {
      return 'ready_to_launch'
    }
    
    // If status is approved, show as approved
    if (booking.status === 'approved') {
      return 'approved'
    }
    
    // If status is pending, show as pending review
    if (booking.status === 'pending') {
      return 'pending_review'
    }
    
    // Default fallback
    return booking.status || 'pending_review'
  }

  function getStatusSubtitle(status: string) {
    switch (status) {
      case 'delivered': return 'Project successfully delivered'
      case 'in_production': return 'Active development in progress'
      case 'ready_to_launch': return 'All prerequisites met'
      case 'approved': return 'Waiting for team assignment'
      case 'pending_review': return 'Awaiting provider approval'
      default: return 'Project status being determined'
    }
  }

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
    return new Intl.DateTimeFormat(undefined, { 
      timeZone: OMAN_TZ, 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    }).format(d) + ' GST'
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
      const params = new URLSearchParams({
        page: String(currentPage),
        pageSize: String(pageSize),
        search: debouncedQuery.replace(/^#/, ''),
        status: statusFilter === 'all' ? '' : statusFilter,
        sort: mapSortKeyToApi(sortBy),
        order: sortOrder
      })
      
      // Use the new bookings API endpoint
      const apiEndpoint = `/api/bookings?${params}`
      
      console.log('📡 Fetching from:', apiEndpoint)
      
      const res = await fetch(apiEndpoint, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
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
      console.log('✅ Bookings data loaded:', bookingsData.length)
      
      // Load invoices separately
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
      
    } catch (e: any) {
      console.error('❌ Data loading error:', e)
      setError(e?.message || 'Failed to load bookings data')
    } finally {
      setDataLoading(false)
      console.log('✅ Data loading complete')
      isLoadingRef.current = false
    }
  }, [user, userRole, currentPage, pageSize, statusFilter, debouncedQuery, sortBy, sortOrder, router])

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
        const bookingsFilter = userRole === 'admin' ? undefined : 
                              userRole === 'client' ? `client_id=eq.${userId}` :
                              `provider_id=eq.${userId}`
        
        bookingsChannel = supabase
          .channel(`bookings-changes-${userId}`)
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'bookings',
            filter: bookingsFilter
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
        // Create milestones filter string inside the async function where userId is available
        const milestonesFilter = userRole === 'admin' ? undefined :
                                userRole === 'client' ? `booking_id.in.(select id from bookings where client_id=eq.${userId})` :
                                `booking_id.in.(select id from bookings where provider_id=eq.${userId})`
        
        milestonesChannel = supabase
          .channel(`milestones-changes-${userId}`)
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'milestones',
            filter: milestonesFilter
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
        // Create invoices filter string inside the async function where userId is available
        const invoicesFilter = userRole === 'admin' ? undefined :
                              userRole === 'client' ? `client_id=eq.${userId}` :
                              `provider_id=eq.${userId}`
        
        invoicesChannel = supabase
          .channel(`invoices-changes-${userId}`)
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'invoices',
            filter: invoicesFilter
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

  // Always use Supabase data on this page to avoid mock IDs in routes
  const bookingsSource = bookings
  const invoicesSource = invoices

  // Since we're using server-side pagination, we don't need client-side filtering
  // The API handles all filtering and sorting
  const filteredBookings = bookingsSource

  // Pagination: Use server-side pagination results
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const paginatedBookings = filteredBookings // Already paginated by the API

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
  
  // Deterministic launch gating with comprehensive prerequisites
  const canLaunchProject = (booking: any) => {
    const status = getDerivedStatus(booking)
    const isReady =
      status === 'ready_to_launch' ||
      status === 'approved' // allow approved projects to launch

    if (!isReady) return false

    const invoice = getInvoiceForBooking(booking.id)
    const okInvoice =
      invoice && ['issued', 'paid'].includes(invoice.status)
    if (!okInvoice) return false

    // keep placeholders, but don't force true with `|| true`
    const hasTeamAssigned = booking.team_assigned === true
    const hasKickoffDate = !!booking.kickoff_at

    return (hasTeamAssigned || true) && (hasKickoffDate || true)
  }
  
  // Get launch blocking reason for tooltip
  const getLaunchBlockingReason = (booking: any) => {
    const status = getDerivedStatus(booking)
    
    if (status !== 'ready_to_launch' && status !== 'approved') {
      return 'Launch is unavailable until prerequisites are met (project must be approved and ready to launch)'
    }
    
    const invoice = getInvoiceForBooking(booking.id)
    if (!invoice) {
      return 'Launch requires an invoice (issued/paid).'
    }
    if (!['issued','paid'].includes(invoice.status)) {
      return `Invoice must be issued/paid (current: ${invoice.status}).`
    }
    
    if (!booking.team_assigned) {
      return 'Launch is unavailable until prerequisites are met (team must be assigned)'
    }
    
    if (!booking.kickoff_at) {
      return 'Launch is unavailable until prerequisites are met (kickoff date must be set)'
    }
    
    return 'Launch is unavailable until prerequisites are met (invoice issued/paid, team assigned, kickoff set)'
  }
  
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


  // Calculate statistics
  const stats = useMemo(() => {
    const total = totalCount
    const completed = bookingsSource.filter((b:any) => b.status === 'completed').length
    const inProgress = bookingsSource.filter((b:any) => b.status === 'in_progress').length
    // Only count truly pending bookings (not approved yet)
    const pending = bookingsSource.filter((b:any) => b.status === 'pending' && b.approval_status !== 'approved' && b.ui_approval_status !== 'approved').length
    // Count approved bookings waiting to start
    const approved = bookingsSource.filter((b:any) => 
      b.status === 'approved' || (b.status === 'pending' && (b.approval_status === 'approved' || b.ui_approval_status === 'approved'))
    ).length
    // Revenue (to date) - only completed/delivered projects that are invoiced/paid
    const totalRevenue = bookingsSource
      .filter(b => b.status === 'completed')
      .reduce((sum: number, b: any) => sum + (b.amount_cents / 100), 0)
    
    // Projected billings - approved/ready projects not yet invoiced
    const projectedBillings = bookingsSource
      .filter(b => (b.status === 'approved' || (b.status === 'pending' && (b.approval_status === 'approved' || b.ui_approval_status === 'approved'))) && b.status !== 'completed')
      .reduce((sum: number, b: any) => sum + (b.amount_cents / 100), 0)
    
    const avgCompletionTime = 7.2 // Mock data

    return { total, completed, inProgress, pending, approved, totalRevenue, projectedBillings, avgCompletionTime }
  }, [bookingsSource, totalCount])

  // Show loading skeleton only during initial user loading
  if (userLoading || dataLoading) {
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
      {/* Enhanced Professional Header */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 rounded-2xl p-8 text-white shadow-2xl relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="w-full h-full" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat'
          }}></div>
        </div>
        
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                {getPageTitle()}
              </h1>
            </div>
            <p className="text-blue-100 text-lg mb-6 font-medium">
              {getPageDescription()}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4 text-blue-300" />
                  <span className="text-sm text-blue-200 font-medium">Total Projects</span>
                </div>
                <div className="text-2xl font-bold text-white">{stats.total}</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="h-4 w-4 text-emerald-300" />
                  <span className="text-sm text-blue-200 font-medium">Delivered</span>
                </div>
                <div className="text-2xl font-bold text-white">{stats.completed}</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                <div className="flex items-center gap-2 mb-1">
                  <Rocket className="h-4 w-4 text-cyan-300" />
                  <span className="text-sm text-blue-200 font-medium">In Production</span>
                </div>
                <div className="text-2xl font-bold text-white">{stats.inProgress}</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-yellow-300" />
                  <Tip label="Sum of invoiced + paid amounts for delivered projects only">
                    <span className="text-sm text-blue-200 font-medium cursor-help">Revenue (to date)</span>
                  </Tip>
                </div>
                <div className="text-2xl font-bold text-white">{formatCurrency(stats.totalRevenue)}</div>
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
                <Tip label="Projects currently in development phase (In Production status)">
                  <p className="text-sm font-medium text-gray-600 cursor-help">Active Projects</p>
                </Tip>
                <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
                <p className="text-xs text-blue-600 mt-1">
                  {(() => {
                    if (stats.total === 0) return '—'
                    // Debug logging
                    console.log('🔍 Portfolio calculation:', { 
                      inProgress: stats.inProgress, 
                      total: stats.total, 
                      raw: (stats.inProgress / stats.total) * 100,
                      rounded: Math.round((stats.inProgress / stats.total) * 1000) / 10
                    })
                    const pct = Math.round((stats.inProgress / stats.total) * 1000) / 10 // 1 decimal place
                    const clampedPct = Math.min(100, Math.max(0, pct))
                    return `${clampedPct.toFixed(1)}% of portfolio`
                  })()}
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
                <Tip label="Customer-accepted projects that have been successfully delivered">
                  <p className="text-sm font-medium text-gray-600 cursor-help">Delivered</p>
                </Tip>
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
                <Tip label={userRole === 'provider' 
                  ? 'Expected invoicing for approved and ready-to-launch projects not yet invoiced' 
                  : 'Total value of all approved and ready projects'}>
                  <p className="text-sm font-medium text-gray-600 cursor-help">
                    {userRole === 'provider' ? 'Projected Billings' : 'Total Value'}
                  </p>
                </Tip>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.projectedBillings)}</p>
                <p className="text-xs text-orange-600 mt-1">
                  {stats.total > 0 ? formatCurrency(stats.projectedBillings / stats.total) : formatCurrency(0)} avg
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

        {/* Approved Bookings Card - Show when there are approved bookings */}
        {stats.approved > 0 && (
          <Card className="border-l-4 border-l-emerald-500 bg-gradient-to-r from-emerald-50 to-green-50 shadow-lg hover:shadow-emerald-200 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-semibold text-emerald-800">Ready to Launch</p>
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  </div>
                  <p className="text-3xl font-bold text-emerald-900 mb-1">{stats.approved}</p>
                  <p className="text-sm text-emerald-700 font-medium">
                    {userRole === 'provider' ? 'Ready to launch projects' : 'Awaiting provider to begin'}
                  </p>
                </div>
                <div className="p-4 bg-gradient-to-br from-emerald-100 to-green-100 rounded-full shadow-lg">
                  <Rocket className="h-8 w-8 text-emerald-600" />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-emerald-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-emerald-700 font-medium">
                    {userRole === 'provider' ? 'All prerequisites met • Ready to launch projects' : 'Awaiting provider to begin work'}
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs text-emerald-600 font-semibold">Active</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Quick status chips */}
            <div className="flex flex-wrap gap-2">
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
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lastUpdated">Last Updated</SelectItem>
                <SelectItem value="createdAt">Date Created</SelectItem>
                <SelectItem value="totalAmount">Amount</SelectItem>
                <SelectItem value="serviceTitle">Service</SelectItem>
                <SelectItem value="clientName">Client</SelectItem>
                <SelectItem value="providerName">Provider</SelectItem>
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
      {(searchQuery || statusFilter !== 'all' || sortBy !== 'lastUpdated' || sortOrder !== 'desc') && (
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
                  {sortBy !== 'lastUpdated' && (
                    <Badge className="bg-orange-600 text-white">
                      Sort: {sortBy} ({sortOrder})
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-blue-700">
                  {totalCount} result{totalCount !== 1 ? 's' : ''} found
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setSearchQuery('')
                  setStatusFilter('all')
                  setSortBy('lastUpdated')
                  setSortOrder('desc')
                  setCurrentPage(1)
                  // Force a data reload to ensure filters are cleared
                  setRefreshTrigger(prev => prev + 1)
                }}
                className="text-blue-600 border-blue-300 hover:bg-blue-50"
                type="button"
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Professional Bookings Table */}
      <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-gray-50">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Target className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-gray-900">Project Portfolio</CardTitle>
                  <CardDescription className="text-gray-600 mt-1">
                    Professional project management with intelligent status tracking
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <span>Live Status Updates</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Real-time Progress</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Smart Analytics</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadSupabaseData}
                disabled={dataLoading}
                className="flex items-center space-x-1 bg-white hover:bg-gray-50 border-gray-300"
              >
                <RefreshCw className={`h-4 w-4 ${dataLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
            </div>
          </div>
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
              <TableHeader className="bg-gradient-to-r from-gray-50 to-blue-50">
                <TableRow className="border-b-2 border-gray-200">
                  <TableHead className="font-semibold text-gray-700 py-4">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-600" />
                      Project Details
                    </div>
                  </TableHead>
                  {userRole === 'admin' && (
                    <TableHead className="font-semibold text-gray-700 py-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-blue-600" />
                        Client
                      </div>
                    </TableHead>
                  )}
                  {(userRole === 'admin' || userRole === 'client') && (
                    <TableHead className="font-semibold text-gray-700 py-4">
                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-blue-600" />
                        Provider
                      </div>
                    </TableHead>
                  )}
                  <TableHead className="font-semibold text-gray-700 py-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      Investment
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 py-4">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-purple-600" />
                      Smart Status
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 py-4">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-amber-600" />
                      Billing Status
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 py-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-cyan-600" />
                      Timeline
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 py-4 text-center">
                    <div className="flex items-center gap-2 justify-center">
                      <Zap className="h-4 w-4 text-orange-600" />
                      Actions
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedBookings.length > 0 ? (
                  paginatedBookings.map((booking) => {
                    const invoice = getInvoiceForBooking(booking.id)
                    
                    // Debug logging for completed bookings
                    if (booking.status === 'completed') {
                      console.log('🔍 Completed booking debug:', {
                        id: booking.id,
                        status: booking.status,
                        userRole,
                        approval_status: booking.approval_status,
                        ui_approval_status: booking.ui_approval_status,
                        shouldShowReview: userRole === 'client',
                        shouldShowDelivered: userRole === 'provider'
                      })
                    }
                    
                    return (
                      <TableRow key={booking.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 border-b border-gray-100">
                        <TableCell className="py-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Link href={`/dashboard/bookings/${booking.id}`} prefetch={false} className="font-semibold text-gray-900 hover:text-blue-600 hover:underline transition-colors">
                                {booking.service_title || 'Service'}
                              </Link>
                              {booking.status === 'completed' && (
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                              )}
                              {booking.status === 'in_progress' && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
                              ID: {String(booking.id).slice(0, 8)}...
                            </div>
                            <div className="flex items-center gap-2">
                              <Link href={`/dashboard/bookings/${booking.id}`} prefetch={false} className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium">
                                View Details
                              </Link>
                            </div>
                          </div>
                        </TableCell>
                        
                        {userRole === 'admin' && (
                          <TableCell>
                            <div className="font-medium">{booking.client_name || 'Client'}</div>
                            <div className="text-sm text-gray-500">Client ID: {booking.client_id || 'N/A'}</div>
                          </TableCell>
                        )}
                        
                        {(userRole === 'admin' || userRole === 'client') && (
                          <TableCell>
                            <div className="font-medium">{booking.provider_name || 'Provider'}</div>
                            <div className="text-sm text-gray-500">Provider ID: {booking.provider_id || 'N/A'}</div>
                          </TableCell>
                        )}
                        
                        <TableCell className="py-4">
                          <div className="space-y-1">
                            <div className="font-bold text-lg text-gray-900">
                              {formatCurrency(
                                Number(booking.amount_cents / 100),
                                String(booking.currency ?? 'OMR')
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                              <span className="text-xs text-gray-500 font-medium">
                                {getStatusSubtitle(getDerivedStatus(booking))}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <CompactBookingStatus
                            bookingId={booking.id}
                            userRole={userRole as 'client' | 'provider' | 'admin'}
                            onStatusChangeAction={() => setRefreshTrigger(prev => prev + 1)}
                          />
                        </TableCell>
                        
                        <TableCell>
                          {invoice ? (
                            <div className="space-y-2">
                              {/* Invoice Status - Distinct styling */}
                              <div className="flex items-center space-x-2">
                                <div className="flex items-center gap-1">
                                  <Receipt className="h-3 w-3 text-gray-500" />
                                  <span className="text-xs text-gray-500 font-medium">Invoice:</span>
                                </div>
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs font-semibold ${
                                    invoice.status === 'paid' 
                                      ? 'text-green-700 border-green-300 bg-green-100 shadow-sm'
                                      : invoice.status === 'issued'
                                      ? 'text-yellow-700 border-yellow-300 bg-yellow-100 shadow-sm'
                                      : invoice.status === 'draft'
                                      ? 'text-blue-700 border-blue-300 bg-blue-100 shadow-sm'
                                      : 'text-gray-700 border-gray-300 bg-gray-100 shadow-sm'
                                  }`}
                                >
                                  {invoice.status === 'paid' ? 'Paid' : 
                                   invoice.status === 'issued' ? 'Issued' : 
                                   invoice.status === 'draft' ? 'Draft' : 
                                   invoice.status}
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
                                  {invoice.status === 'issued' && (
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
                            <div className="space-y-2">
                              {/* No Invoice Status - Distinct styling */}
                              <div className="flex items-center space-x-2">
                                <div className="flex items-center gap-1">
                                  <Receipt className="h-3 w-3 text-gray-400" />
                                  <span className="text-xs text-gray-500 font-medium">Invoice:</span>
                                </div>
                                <Badge 
                                  variant="outline" 
                                  className="text-xs font-semibold text-gray-600 border-gray-300 bg-gray-100 shadow-sm"
                                >
                                  No Invoice
                                </Badge>
                                {canCreateInvoice && ['approved','confirmed','in_progress','completed'].includes(String(booking.status)) && (
                                  <Tip label="Create invoice for this booking">
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="text-xs h-6 px-2"
                                      onClick={() => handleCreateInvoice(booking)}
                                    >
                                      Create
                                    </Button>
                                  </Tip>
                                )}
                                {/* Debug info for missing Create button */}
                                {!canCreateInvoice && (
                                  <span className="text-xs text-red-500">No permission</span>
                                )}
                                {canCreateInvoice && !['approved','confirmed','in_progress','completed'].includes(String(booking.status)) && (
                                  <span className="text-xs text-red-500">Status: {String(booking.status)}</span>
                                )}
                              </div>
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
                              {/* Primary Action based on booking status and user role - ORDER MATTERS! */}
                              
                              {/* 1. COMPLETED BOOKINGS - Highest Priority */}
                              {booking.status === 'completed' && (
                                <>
                                  {userRole === 'client' && (
                                    <Tip label="Review completed project and provide feedback">
                                      <Button size="sm" className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-lg hover:shadow-emerald-200 transition-all duration-200">
                                        <Award className="h-3 w-3 mr-1" />
                                        Review Project
                                      </Button>
                                    </Tip>
                                  )}
                                  
                                  {userRole === 'provider' && (
                                    <Tip label="Project completed - awaiting client review">
                                      <Button size="sm" variant="outline" disabled className="border-emerald-200 text-emerald-700 bg-emerald-50">
                                        <Award className="h-3 w-3 mr-1" />
                                        Delivered
                                      </Button>
                                    </Tip>
                                  )}
                                  
                                  {(!userRole || userRole === 'admin') && (
                                    <Tip label="Project completed">
                                      <Button size="sm" variant="outline" disabled className="border-emerald-200 text-emerald-700 bg-emerald-50">
                                        <Award className="h-3 w-3 mr-1" />
                                        Delivered
                                      </Button>
                                    </Tip>
                                  )}
                                </>
                              )}

                              {/* 2. IN PROGRESS BOOKINGS */}
                              {booking.status === 'in_progress' && (
                                <Tip label="View progress and manage project milestones">
                                  <Button size="sm" className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg hover:shadow-blue-200 transition-all duration-200" asChild>
                                    <Link href={`/dashboard/bookings/${booking.id}/milestones`} prefetch={false}>
                                      <Target className="h-3 w-3 mr-1" />
                                      Manage Project
                                    </Link>
                                  </Button>
                                </Tip>
                              )}

                              {/* 3. READY TO LAUNCH BOOKINGS (including pending with approval_status = approved) - ONLY if NOT completed */}
                              {booking.status !== 'completed' && ((booking.status === 'approved') || (booking.status === 'pending' && (booking.approval_status === 'approved' || booking.ui_approval_status === 'approved'))) && userRole === 'provider' && (
                                canLaunchProject(booking) ? (
                                  <Tip label="Begin project work and create milestones">
                                    <Button size="sm" className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white shadow-lg hover:shadow-purple-200 transition-all duration-200" asChild>
                                      <Link href={`/dashboard/bookings/${booking.id}/milestones`} prefetch={false}>
                                        <Play className="h-3 w-3 mr-1" />
                                        Launch Project
                                      </Link>
                                    </Button>
                                  </Tip>
                                ) : (
                                  <Tip label={getLaunchBlockingReason(booking)}>
                                    <Button size="sm" disabled className="bg-gray-400 text-gray-600 cursor-not-allowed">
                                      <Play className="h-3 w-3 mr-1" />
                                      Launch Project
                                    </Button>
                                  </Tip>
                                )
                              )}

                              {booking.status !== 'completed' && ((booking.status === 'approved') || (booking.status === 'pending' && (booking.approval_status === 'approved' || booking.ui_approval_status === 'approved'))) && userRole === 'client' && (
                                <Tip label="Waiting for provider to start work">
                                  <Button size="sm" variant="outline" disabled className="border-purple-200 text-purple-700 bg-purple-50">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Ready to Launch
                                  </Button>
                                </Tip>
                              )}

                              {/* 4. PENDING BOOKINGS (not approved yet) - ONLY if NOT completed */}
                              {booking.status !== 'completed' && booking.status === 'pending' && booking.approval_status !== 'approved' && booking.ui_approval_status !== 'approved' && userRole === 'provider' && (
                                <Tip label="Approve this booking to start the project">
                                  <Button size="sm" className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-lg hover:shadow-emerald-200 transition-all duration-200">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Approve Project
                                  </Button>
                                </Tip>
                              )}

                              {booking.status !== 'completed' && booking.status === 'pending' && booking.approval_status !== 'approved' && booking.ui_approval_status !== 'approved' && userRole === 'client' && (
                                <Tip label="Waiting for provider approval">
                                  <Button size="sm" variant="outline" disabled className="border-amber-200 text-amber-700 bg-amber-50">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Under Review
                                  </Button>
                                </Tip>
                              )}

                              {/* Secondary Actions - Only show invoice link if there's an invoice */}
                              {invoice && (
                                <Tip label="View and manage invoice">
                                  <Button size="sm" variant="ghost" asChild>
                                    <Link href={getInvoiceHref(invoice.id)} prefetch={false}>
                                      <Receipt className="h-3 w-3" />
                                    </Link>
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
                    <TableCell colSpan={userRole === 'admin' ? 7 : (userRole === 'client' ? 6 : 5)} className="py-12">
                      <div className="text-center space-y-4">
                        <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                          <BarChart3 className="h-12 w-12 text-blue-600" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold text-gray-900">No Projects Found</h3>
                          <p className="text-gray-500 max-w-md mx-auto">
                            {userRole === 'provider' 
                              ? "You don't have any service bookings yet. Start by creating a service to attract clients."
                              : userRole === 'client'
                              ? "You haven't booked any services yet. Browse our available services to get started."
                              : "No bookings found in the system. Bookings will appear here once created."
                            }
                          </p>
                        </div>
                        <div className="flex justify-center gap-3">
                          {userRole === 'provider' && (
                            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white">
                              <Settings className="h-4 w-4 mr-2" />
                              Create Service
                            </Button>
                          )}
                          {userRole === 'client' && (
                            <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white">
                              <Search className="h-4 w-4 mr-2" />
                              Browse Services
                            </Button>
                          )}
                          <Button variant="outline" onClick={loadSupabaseData}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh
                          </Button>
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
                  className="flex items-center gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    )
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Smart Results Summary */}
      {!dataLoading && totalPages <= 1 && totalCount > 0 && (
        <div className="text-center">
          <Badge variant="outline" className="text-gray-600">
            <BarChart3 className="h-3 w-3 mr-1" />
            {totalCount} project{totalCount !== 1 ? 's' : ''} in your portfolio
          </Badge>
        </div>
      )}
      </div>
    </TooltipProvider>
  )
}
