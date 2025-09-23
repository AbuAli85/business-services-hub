'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  const [loading, setLoading] = useState(true)
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
        setLoading(true)
        setError(null)
        
        const supabase = await getSupabaseClient()
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !currentUser) {
          console.error('Authentication error:', userError)
          router.push('/auth/sign-in')
          return
        }
        
        setUser(currentUser)
        
        // Determine user role from metadata first, then profile
        let detectedRole = currentUser.user_metadata?.role
        
        if (!detectedRole) {
          try {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('role, is_admin')
              .eq('id', currentUser.id)
              .single()
            
            if (!profileError && profile) {
              detectedRole = profile.is_admin ? 'admin' : profile.role
            }
          } catch (profileError) {
            console.warn('Could not fetch profile role:', profileError)
          }
        }
        
        // Default to client if no role found
        if (!detectedRole) {
          detectedRole = 'client'
        }
        
        setUserRole(detectedRole as 'client' | 'provider' | 'admin')
        console.log('User role detected:', detectedRole)
        
      } catch (error) {
        console.error('User initialization error:', error)
        setError('Failed to initialize user session')
        router.push('/auth/sign-in')
      } finally {
        setLoading(false)
      }
    }
    
    initializeUser()
  }, [router])

  // Load bookings via server API with proper role-based filtering
  const loadSupabaseData = useCallback(async () => {
    if (!user || !userRole) {
      return
    }
    
    try {
      setLoading(true)
      setError(null)
      
      // Build query params for server-side pagination/filtering
      const params = new URLSearchParams({
        role: userRole,
        status: statusFilter,
        q: debouncedQuery.replace(/^#/, '')
      })
      
      // Use appropriate API endpoint based on role
      const apiEndpoint = userRole === 'admin' 
        ? `/api/admin/bookings?page=${currentPage}&pageSize=${pageSize}&${params}`
        : `/api/bookings?${params}`
      
      const res = await fetch(apiEndpoint, { 
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData?.error || `API request failed: ${res.status}`)
      }
      
      const json = await res.json()
      
      // Handle different response formats
      if (userRole === 'admin') {
        setBookings(json.items || [])
        setTotalCount(Number(json.total || 0))
        // Extract invoices from embedded data
        const embedded = (json.items || []).flatMap((r: any) => r.invoices || [])
        setInvoices(embedded)
      } else {
        // Standard bookings API response
        const bookingsData = json.bookings || []
        setBookings(bookingsData)
        setTotalCount(bookingsData.length)
        
        // Load invoices separately for non-admin users
        try {
          const invoiceRes = await fetch('/api/invoices', {
            headers: { 'Content-Type': 'application/json' }
          })
          if (invoiceRes.ok) {
            const invoiceJson = await invoiceRes.json()
            setInvoices(invoiceJson.invoices || [])
          } else {
            console.warn('Invoice loading failed:', invoiceRes.status)
            setInvoices([]) // Continue without invoices if loading fails
          }
        } catch (invoiceError) {
          console.warn('Invoice loading error:', invoiceError)
          setInvoices([]) // Continue without invoices if loading fails
        }
      }
      
    } catch (e: any) {
      console.error('Data loading error:', e)
      setError(e?.message || 'Failed to load bookings data')
    } finally {
      setLoading(false)
    }
  }, [user, userRole, currentPage, pageSize, statusFilter, sortBy, sortOrder, debouncedQuery])

  useEffect(() => {
    loadSupabaseData()
  }, [loadSupabaseData])

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
        ((booking as any).service?.title || booking.serviceTitle || '').toLowerCase().includes(q) ||
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
          const av = safeStr(a.service?.title ?? a.serviceTitle)
          const bv = safeStr(b.service?.title ?? b.serviceTitle)
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

  // Pagination: server returns paged items and total count
  const totalPages = Math.max(1, Math.ceil((totalCount || 0) / pageSize))
  const paginatedBookings = bookingsSource

  // Get invoice for a booking
  const invoiceByBooking = useMemo(() => {
    const m = new Map<string, any>()
    invoicesSource.forEach((invoice: any) => {
      m.set(String(invoice.bookingId ?? invoice.booking_id), invoice)
    })
    return m
  }, [invoicesSource])
  const getInvoiceForBooking = (bookingId: string) => invoiceByBooking.get(String(bookingId))

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

  if (loading || !userRole) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading bookings...</p>
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
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
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
          <div className="rounded-md border">
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
                              {(booking as any).service?.title || (booking as any).title || 'Service'}
                            </Link>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">ID: {booking.id.substring(0, 8)}...</div>
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
                            onStatusChange={loadSupabaseData}
                          />
                        </TableCell>
                        
                        <TableCell>
                          {invoice ? (
                            <div className="flex items-center space-x-2">
                              <Badge 
                                variant="outline" 
                                className={
                                  invoice.status === 'paid' 
                                    ? 'text-green-600 border-green-200 bg-green-50'
                                    : invoice.status === 'sent'
                                    ? 'text-yellow-600 border-yellow-200 bg-yellow-50'
                                    : 'text-gray-600 border-gray-200 bg-gray-50'
                                }
                              >
                                {invoice.status}
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => router.push(getInvoiceHref(invoice.id))}
                              >
                                <Receipt className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400 text-sm">No invoice</span>
                              {canCreateInvoice && ['approved','confirmed','in_progress','completed'].includes(String(booking.status)) && (
                                <Button size="sm" variant="outline" onClick={() => handleCreateInvoice(booking)}>
                                  Create
                                </Button>
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
                              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Approve
                              </Button>
                            )}
                            
                            {booking.status === 'approved' && userRole === 'provider' && (
                              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" asChild>
                                <Link href={`/dashboard/bookings/${booking.id}/milestones`} prefetch={false}>
                                  <Play className="h-3 w-3 mr-1" />
                                  Start
                                </Link>
                              </Button>
                            )}
                            
                            {booking.status === 'in_progress' && (
                              <Button size="sm" variant="outline" asChild>
                                <Link href={`/dashboard/bookings/${booking.id}/milestones`} prefetch={false}>
                                  <Target className="h-3 w-3 mr-1" />
                                  Manage
                                </Link>
                              </Button>
                            )}
                            
                            {booking.status === 'completed' && userRole === 'client' && (
                              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                                <Award className="h-3 w-3 mr-1" />
                                Review
                              </Button>
                            )}

                            {/* Secondary Actions */}
                            <Button size="sm" variant="ghost" asChild title="View Details">
                              <Link href={`/dashboard/bookings/${booking.id}`} prefetch={false}>
                                <Eye className="h-3 w-3" />
                              </Link>
                            </Button>
                            
                            {invoice && (
                              <Button size="sm" variant="ghost" asChild title="View Invoice">
                                <Link href={getInvoiceHref(invoice.id)} prefetch={false}>
                                  <Receipt className="h-3 w-3" />
                                </Link>
                              </Button>
                            )}
                            
                            {userRole === 'admin' && (
                              <Button size="sm" variant="ghost" title="Admin Tools">
                                <Settings className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex flex-col items-center space-y-2">
                        <Calendar className="h-12 w-12 text-gray-400" />
                        <p className="text-gray-500">No bookings found</p>
                        <p className="text-sm text-gray-400">
                          {searchQuery || statusFilter !== 'all'
                            ? 'Try adjusting your filters'
                            : userRole === 'client' 
                              ? 'Start by creating your first booking'
                              : userRole === 'provider'
                              ? 'Bookings from clients will appear here'
                              : 'Bookings will appear here when created'}
                        </p>
                        {userRole === 'client' && !searchQuery && statusFilter === 'all' && (
                          <Button 
                            className="mt-4"
                            onClick={() => router.push('/dashboard/bookings/create')}
                          >
                            Create Your First Booking
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination controls - only show for admin with server-side pagination */}
      {userRole === 'admin' && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages} • {totalCount} results
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              disabled={currentPage === 1} 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button 
              variant="outline" 
              disabled={currentPage === totalPages} 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
      
      {/* Simple results count for non-admin users */}
      {userRole !== 'admin' && bookings.length > 0 && (
        <div className="text-center text-sm text-gray-600">
          Showing {bookings.length} booking{bookings.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}
