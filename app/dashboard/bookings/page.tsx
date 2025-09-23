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
  ExternalLink
} from 'lucide-react'
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
        const invoiceRes = await fetch('/api/invoices', {
          headers: { 'Content-Type': 'application/json' }
        })
        if (invoiceRes.ok) {
          const invoiceJson = await invoiceRes.json()
          setInvoices(invoiceJson.invoices || [])
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
  }, [bookingsSource, debouncedQuery, statusFilter, sortBy, sortOrder])

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
      const supabase = await getSupabaseClient()
      const amount = Number(booking.totalAmount ?? booking.amount ?? booking.total_price ?? 0)
      const currency = String(booking.currency ?? 'OMR')
      const payload: any = {
        booking_id: booking.id,
        client_id: booking.client_id,
        provider_id: booking.provider_id,
        amount,
        currency,
        status: 'sent',
        created_at: new Date().toISOString()
      }
      const { data, error } = await supabase.from('invoices').insert(payload).select('id, booking_id, status').single()
      if (error) throw error
      // Update local map
      setInvoices(prev => [{ id: data.id, booking_id: data.booking_id, status: data.status }, ...prev])
      toast.success('Invoice created')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create invoice')
    }
  }, [])

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pending', className: 'text-yellow-600 border-yellow-200 bg-yellow-50' },
      confirmed: { label: 'Confirmed', className: 'text-blue-600 border-blue-200 bg-blue-50' },
      in_progress: { label: 'In Progress', className: 'text-purple-600 border-purple-200 bg-purple-50' },
      completed: { label: 'Completed', className: 'text-green-600 border-green-200 bg-green-50' },
      cancelled: { label: 'Cancelled', className: 'text-red-600 border-red-200 bg-red-50' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    )
  }

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
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading bookings</p>
          <Button onClick={() => { loadSupabaseData() }}>Retry</Button>
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

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Total Bookings</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">Completed</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-xs text-green-600">
                  {stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : 0}% completion rate
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm font-medium">In Progress</p>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm font-medium">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
              </div>
            </div>
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

      {/* Bookings Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Bookings</CardTitle>
          <CardDescription>Manage and track service bookings with integrated invoice tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  {userRole === 'admin' && <TableHead>Client</TableHead>}
                  {(userRole === 'admin' || userRole === 'client') && <TableHead>Provider</TableHead>}
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedBookings.length > 0 ? (
                  paginatedBookings.map((booking) => {
                    const invoice = getInvoiceForBooking(booking.id)
                    
                    return (
                      <TableRow key={booking.id}>
                        <TableCell>
                          <div className="font-medium">
                            <Link href={`/dashboard/bookings/${booking.id}`} prefetch={false} className="hover:underline">
                              {(booking as any).service?.title || (booking as any).title || 'Service'}
                            </Link>
                          </div>
                          <div className="text-xs text-gray-500">ID: {booking.id}</div>
                          <div className="text-xs mt-1 space-x-2">
                            <Link href={`/dashboard/bookings/${booking.id}`} prefetch={false} className="text-blue-600 hover:underline">Details</Link>
                            <span className="text-gray-300">|</span>
                            <Link href={`/dashboard/bookings/${booking.id}/milestones`} prefetch={false} className="text-blue-600 hover:underline">Milestones</Link>
                          </div>
                        </TableCell>
                        {userRole === 'admin' && (
                          <TableCell>
                            <div className="font-medium">{(booking as any).client_profile?.full_name || 'Client'}</div>
                            <div className="text-sm text-gray-500">Client ID: {(booking as any).client_id}</div>
                          </TableCell>
                        )}
                        {(userRole === 'admin' || userRole === 'client') && (
                          <TableCell>
                            <div className="font-medium">{(booking as any).provider_profile?.full_name || 'Provider'}</div>
                            <div className="text-sm text-gray-500">Provider ID: {(booking as any).provider_id}</div>
                          </TableCell>
                        )}
                        <TableCell>
                          {(() => {
                            const amount = Number((booking as any).totalAmount ?? (booking as any).amount ?? (booking as any).total_price ?? 0)
                            const currency = String((booking as any).currency ?? 'OMR')
                            return <div className="font-medium">{formatCurrency(amount, currency)}</div>
                          })()}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(booking.status)}
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
                          <div className="flex items-center space-x-2">
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/dashboard/bookings/${booking.id}`} prefetch={false}>
                                <Eye className="h-3 w-3" />
                              </Link>
                            </Button>
                            {/* If no edit route exists, comment this out or point to an existing route */}
                            {/* <Button size="sm" variant="outline" asChild>
                              <Link href={`/dashboard/bookings/${booking.id}/edit`} prefetch={false}>
                                <Edit className="h-3 w-3" />
                              </Link>
                            </Button> */}
                            {invoice && (
                              <Button size="sm" variant="outline" asChild>
                                <Link href={getInvoiceHref(invoice.id)} prefetch={false}>
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              </Button>
                            )}
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/dashboard/bookings/${booking.id}/milestones`} prefetch={false}>
                                <BarChart3 className="h-3 w-3" />
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={userRole === 'admin' ? 8 : userRole === 'client' ? 7 : 6} className="text-center py-8">
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

      {/* Pagination controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">Page {currentPage} of {totalPages} • {totalCount} results</div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>Prev</Button>
          <Button variant="outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>Next</Button>
        </div>
      </div>
      <div className="h-2" />
    </div>
  )
}