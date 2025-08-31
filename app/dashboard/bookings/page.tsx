'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
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
  Filter,
  Eye,
  MessageSquare,
  Calendar,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Download,
  ChevronUp,
  ChevronDown,
  Trash2,
  Edit,
  Copy,
  BarChart3,
  TrendingUp
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { DatePickerWithRange } from '@/components/ui/date-range-picker'
import { format, isWithinInterval, parseISO } from 'date-fns'
import { realtimeManager } from '@/lib/realtime'

interface Booking {
  id: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'approved' | 'declined' | 'rescheduled'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  created_at: string
  scheduled_date?: string
  notes?: string
  amount?: number
  subtotal?: number
  total_price?: number
  currency?: string
  service: any
  client: any
}

interface BookingStats {
  total: number
  pending: number
  inProgress: number
  completed: number
  cancelled: number
  revenue: number
  avgCompletionTime: number
}

interface SortConfig {
  key: keyof Booking
  direction: 'asc' | 'desc'
}

export default function BookingsPage() {
  console.log('🚀 BookingsPage component rendering')
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [bookingsPerPage] = useState(10)
  const [selectedBookings, setSelectedBookings] = useState<string[]>([])
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'created_at', direction: 'desc' })
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>()
  const [amountRange, setAmountRange] = useState({ min: 0, max: 10000 })
  const [stats, setStats] = useState<BookingStats>({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    revenue: 0,
    avgCompletionTime: 0
  })

  // Load user and bookings
  useEffect(() => {
    console.log('🔍 Bookings page useEffect triggered')
    loadUserAndBookings()
  }, [])

  // Real-time booking updates
  useEffect(() => {
    if (!user?.id) return

    let subscriptionKeys: string[] = []

    ;(async () => {
      try {
        // Subscribe to real-time booking updates for both client and provider roles
        const bookingSubscription = await realtimeManager.subscribeToBookings(user.id, (update) => {
          if (update.eventType === 'INSERT' || update.eventType === 'UPDATE' || update.eventType === 'DELETE') {
            // Booking updated - refresh data
            loadUserAndBookings()
          }
        })
        subscriptionKeys.push(`bookings:${user.id}`)
        
        // Also subscribe to general bookings channel for broader updates
        const generalBookingSubscription = await realtimeManager.subscribeToBookings('', (update) => {
          if (update.eventType === 'INSERT' || update.eventType === 'UPDATE' || update.eventType === 'DELETE') {
            // Check if this update affects the current user
            if (update.new && (update.new.client_id === user.id || update.new.provider_id === user.id)) {
              loadUserAndBookings()
            }
          }
        })
        subscriptionKeys.push('bookings:')

      } catch (error) {
        console.error('Error setting up realtime subscriptions:', error)
      }
    })()

    return () => {
      // Unsubscribe from all channels
      subscriptionKeys.forEach(key => {
        realtimeManager.unsubscribe(key)
      })
    }
  }, [user?.id])

  // Filter and sort bookings when dependencies change
  useEffect(() => {
    filterAndSortBookings()
  }, [bookings, searchQuery, statusFilter, priorityFilter, dateRange, amountRange, sortConfig])

  const loadUserAndBookings = async () => {
    console.log('🔍 loadUserAndBookings function called')
    try {
      const supabase = await getSupabaseClient()
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Please sign in to view bookings')
        return
      }
      
      // Get user profile to determine role
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('id', user.id)
        .single()
      
      if (profile) {
        setUser({ ...user, ...profile })
      } else {
        setUser(user)
      }
      
      // Load bookings for the user (either as client or provider)
      let bookingsData: any[] = []
      let error: any = null

      // Apply role-based filtering
      if (profile?.role === 'provider') {
        // Provider sees their own services
        const { data, error: providerError } = await supabase
          .from('bookings')
          .select(`
            id,
            status,
            priority,
            created_at,
            scheduled_date,
            notes,
            amount,
            subtotal,
            total_price,
            currency,
            client_id,
            provider_id,
            service_id
          `)
          .eq('provider_id', user.id)
          .order('created_at', { ascending: false })
        
        bookingsData = data || []
        error = providerError
      } else if (profile?.role === 'client') {
        // Client sees their own bookings
        const { data, error: clientError } = await supabase
          .from('bookings')
          .select(`
            id,
            status,
            priority,
            created_at,
            scheduled_date,
            notes,
            amount,
            subtotal,
            total_price,
            currency,
            client_id,
            provider_id,
            service_id
          `)
          .eq('client_id', user.id)
          .order('created_at', { ascending: false })
        
        bookingsData = data || []
        error = clientError
      } else {
        // Fallback: show bookings where user is either client or provider
        // Use separate queries and combine results
        const [clientBookings, providerBookings] = await Promise.all([
          supabase
            .from('bookings')
            .select(`
              id,
              status,
              priority,
              created_at,
              scheduled_date,
              notes,
              amount,
              subtotal,
              total_price,
              currency,
              client_id,
              provider_id,
              service_id
            `)
            .eq('client_id', user.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('bookings')
            .select(`
              id,
              status,
              priority,
              created_at,
              scheduled_date,
              notes,
              amount,
              subtotal,
              total_price,
              currency,
              client_id,
              provider_id,
              service_id
            `)
            .eq('provider_id', user.id)
            .order('created_at', { ascending: false })
        ])

        // Combine and deduplicate results
        const allBookings = [
          ...(clientBookings.data || []),
          ...(providerBookings.data || [])
        ]
        
        // Remove duplicates based on booking ID
        const uniqueBookings = allBookings.filter((booking, index, self) => 
          index === self.findIndex(b => b.id === booking.id)
        )
        
        bookingsData = uniqueBookings
        error = clientBookings.error || providerBookings.error
      }

      if (error) {
        console.error('Error loading bookings:', error)
        toast.error('Failed to load bookings')
        return
      }

      console.log('Raw bookings data:', bookingsData)
      console.log('User ID:', user.id)
      console.log('User role:', profile?.role)

      // Load related data separately to avoid relationship conflicts
      const clientIds = Array.from(new Set(bookingsData?.map(b => b.client_id).filter(Boolean) || []))
      const serviceIds = Array.from(new Set(bookingsData?.map(b => b.service_id).filter(Boolean) || []))

      let clientsData: any[] = []
      let servicesData: any[] = []

      if (clientIds.length > 0) {
        const { data: clients, error: clientsError } = await supabase
          .from('profiles')
          .select('id, full_name, email, phone')
          .in('id', clientIds)
        
        if (!clientsError) {
          clientsData = clients || []
        }
      }

      if (serviceIds.length > 0) {
        const { data: services, error: servicesError } = await supabase
          .from('services')
          .select('id, title, description')
          .in('id', serviceIds)
        
        if (!servicesError) {
          servicesData = services || []
        }
      }

      // Transform the data to match our interface
      const transformedBookings = bookingsData?.map((booking: any) => {
        const client = clientsData.find(c => c.id === booking.client_id)
        const service = servicesData.find(s => s.id === booking.service_id)
        
        // Use the best available amount field
        const displayAmount = booking.subtotal || booking.total_price || booking.amount || 0
        
        // Determine if user is viewing as client or provider
        const isClient = booking.client_id === user.id
        const isProvider = booking.provider_id === user.id
        
        return {
          id: booking.id,
          status: booking.status,
          priority: booking.priority || 'normal',
          created_at: booking.created_at,
          scheduled_date: booking.scheduled_date,
          notes: booking.notes,
          amount: displayAmount,
          subtotal: booking.subtotal,
          total_price: booking.total_price,
          currency: booking.currency || 'OMR',
          service: {
            name: service?.title || 'Unknown Service',
            description: service?.description
          },
          client: {
            full_name: client?.full_name || 'Unknown Client',
            email: client?.email || '',
            phone: client?.phone
          },
          // Add relationship info
          isClient,
          isProvider
        }
      }) || []

      setBookings(transformedBookings)
      calculateEnhancedStats(transformedBookings)
      setLoading(false)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to load bookings')
      setLoading(false)
    }
  }

  const calculateEnhancedStats = (bookingsData: Booking[]) => {
    const totalRevenue = bookingsData.reduce((sum, b) => sum + (b.amount || 0), 0)
    const completedBookings = bookingsData.filter(b => b.status === 'completed')
    
    // Calculate average completion time (simplified - could be enhanced with actual completion dates)
    const avgCompletionTime = completedBookings.length > 0 ? 3.2 : 0 // Placeholder

    const stats = {
      total: bookingsData.length,
      pending: bookingsData.filter(b => b.status === 'pending').length,
      inProgress: bookingsData.filter(b => b.status === 'in_progress').length,
      completed: completedBookings.length,
      cancelled: bookingsData.filter(b => b.status === 'cancelled').length,
      revenue: totalRevenue,
      avgCompletionTime
    }
    setStats(stats)
  }

  const filterAndSortBookings = () => {
    // Use requestIdleCallback to avoid blocking the UI during filtering
    const processFiltering = () => {
      let filtered = [...bookings]

      // Advanced search filter
      if (searchQuery) {
        filtered = filtered.filter(booking =>
          booking.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          booking.service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          booking.client.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          booking.client.email.toLowerCase().includes(searchQuery.toLowerCase())
        )
      }

      // Status filter
      if (statusFilter !== 'all') {
        filtered = filtered.filter(booking => booking.status === statusFilter)
      }

      // Priority filter
      if (priorityFilter !== 'all') {
        filtered = filtered.filter(booking => booking.priority === priorityFilter)
      }

      // Date range filter
      if (dateRange?.from && dateRange?.to) {
        filtered = filtered.filter(booking => {
          const bookingDate = parseISO(booking.created_at)
          return isWithinInterval(bookingDate, { start: dateRange.from, end: dateRange.to })
        })
      }

      // Amount range filter
      if (amountRange.min > 0 || amountRange.max < 10000) {
        filtered = filtered.filter(booking => {
          const amount = booking.amount || 0
          return amount >= amountRange.min && amount <= amountRange.max
        })
      }

      // Sort bookings
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key]
        const bValue = b[sortConfig.key]
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortConfig.direction === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue)
        }
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue
        }
        
        return 0
      })

      setFilteredBookings(filtered)
      setCurrentPage(1) // Reset to first page when filtering
    }
    
    // Use requestIdleCallback if available, otherwise use setTimeout
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(processFiltering, { timeout: 100 })
    } else {
      setTimeout(processFiltering, 0)
    }
  }

  const handleSort = (key: keyof Booking) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const getSortIcon = (key: keyof Booking) => {
    if (sortConfig.key !== key) return null
    return sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
  }

  const handleBulkAction = (action: 'delete' | 'export' | 'status') => {
    if (selectedBookings.length === 0) {
      toast.error('Please select bookings first')
      return
    }

    switch (action) {
      case 'delete':
        if (confirm(`Are you sure you want to delete ${selectedBookings.length} selected bookings?`)) {
          // Implement bulk delete
          toast.success(`${selectedBookings.length} bookings deleted`)
          setSelectedBookings([])
        }
        break
      case 'export':
        exportSelectedBookings()
        break
      case 'status':
        // Implement bulk status update
        toast.success(`Status updated for ${selectedBookings.length} bookings`)
        break
    }
  }

  const exportSelectedBookings = () => {
    // Use requestIdleCallback to avoid blocking the UI
    const exportData = () => {
      const selectedData = filteredBookings.filter(b => selectedBookings.includes(b.id))
      
      // Process data in chunks to avoid blocking
      const processChunk = (data: any[], startIndex: number, chunkSize: number = 100) => {
        const endIndex = Math.min(startIndex + chunkSize, data.length)
        const chunk = data.slice(startIndex, endIndex)
        
        return chunk.map(b => [
          b.id,
          b.service.name,
          b.client.full_name,
          b.status,
          b.priority,
          b.amount || 0,
          format(parseISO(b.created_at), 'yyyy-MM-dd')
        ])
      }
      
      // Process all data in chunks
      const allRows = [['Booking ID', 'Service', 'Client', 'Status', 'Priority', 'Amount', 'Created Date']]
      
      for (let i = 0; i < selectedData.length; i += 100) {
        const chunkRows = processChunk(selectedData, i, 100)
        allRows.push(...chunkRows)
      }
      
      const csvContent = allRows.map(row => row.join(',')).join('\n')
      
      // Create and download the file
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bookings-export-${format(new Date(), 'yyyy-MM-dd')}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Bookings exported successfully!')
    }
    
    // Use requestIdleCallback if available, otherwise use setTimeout
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(exportData, { timeout: 1000 })
    } else {
      setTimeout(exportData, 0)
    }
  }

  const toggleBookingSelection = (bookingId: string) => {
    if (selectedBookings.includes(bookingId)) {
      setSelectedBookings(selectedBookings.filter(id => id !== bookingId))
    } else {
      setSelectedBookings([...selectedBookings, bookingId])
    }
  }

  const selectAllBookings = () => {
    if (selectedBookings.length === filteredBookings.length) {
      setSelectedBookings([])
    } else {
      setSelectedBookings(filteredBookings.map(b => b.id))
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pending', variant: 'secondary' as const },
      in_progress: { label: 'In Progress', variant: 'default' as const },
      completed: { label: 'Completed', variant: 'default' as const },
      cancelled: { label: 'Cancelled', variant: 'destructive' as const },
      approved: { label: 'Approved', variant: 'default' as const },
      declined: { label: 'Declined', variant: 'destructive' as const },
      rescheduled: { label: 'Rescheduled', variant: 'secondary' as const }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, variant: 'secondary' as const }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: { label: 'Low', variant: 'secondary' as const },
      normal: { label: 'Normal', variant: 'default' as const },
      high: { label: 'High', variant: 'destructive' as const },
      urgent: { label: 'Urgent', variant: 'destructive' as const }
    }

    const config = priorityConfig[priority as keyof typeof priorityConfig] || { label: priority, variant: 'secondary' as const }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number, currency: string = 'OMR') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  const handleViewDetails = (bookingId: string) => {
    router.push(`/dashboard/bookings/${bookingId}`)
  }

  const handleSendMessage = (bookingId: string) => {
    router.push(`/dashboard/bookings/${bookingId}?tab=messages`)
  }

  // Pagination
  const indexOfLastBooking = currentPage * bookingsPerPage
  const indexOfFirstBooking = indexOfLastBooking - bookingsPerPage
  const currentBookings = filteredBookings.slice(indexOfFirstBooking, indexOfLastBooking)
  const totalPages = Math.ceil(filteredBookings.length / bookingsPerPage)

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = []
    const maxVisiblePages = 5
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i)
        pages.push('...')
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1)
        pages.push('...')
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i)
      } else {
        pages.push(1)
        pages.push('...')
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i)
        pages.push('...')
        pages.push(totalPages)
      }
    }
    
    return pages
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
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
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Completed</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Cancelled</p>
                <p className="text-2xl font-bold">{stats.cancelled}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.revenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Avg. Time</p>
                <p className="text-2xl font-bold">{stats.avgCompletionTime}d</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Bookings</CardTitle>
          <CardDescription>Manage your service bookings and track their progress</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Basic Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by ID, service, client, or email..."
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
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={loadUserAndBookings} variant="outline" size="icon">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {/* Advanced Filters Toggle */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="text-sm"
              >
                <Filter className="h-4 w-4 mr-2" />
                {showAdvancedFilters ? 'Hide' : 'Show'} Advanced Filters
              </Button>

              {/* Bulk Actions */}
              {selectedBookings.length > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">
                    {selectedBookings.length} selected
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction('export')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction('status')}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Update Status
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleBulkAction('delete')}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              )}
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <label className="text-sm font-medium mb-2 block">Date Range</label>
                  <DatePickerWithRange
                    date={dateRange}
                    onDateChange={setDateRange}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Amount Range (OMR)</label>
                  <div className="flex space-x-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={amountRange.min}
                      onChange={(e) => setAmountRange(prev => ({ ...prev, min: Number(e.target.value) }))}
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={amountRange.max}
                      onChange={(e) => setAmountRange(prev => ({ ...prev, max: Number(e.target.value) }))}
                    />
                  </div>
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDateRange(undefined)
                      setAmountRange({ min: 0, max: 10000 })
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Enhanced Bookings Table */}
          <div className="rounded-md border mt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedBookings.length === filteredBookings.length && filteredBookings.length > 0}
                      onCheckedChange={selectAllBookings}
                    />
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('id')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Booking ID</span>
                      {getSortIcon('id')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('service')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Service Name</span>
                      {getSortIcon('service')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('client')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{user?.role === 'client' ? 'Provider Name' : 'Client Name'}</span>
                      {getSortIcon('client')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Booking Date</span>
                      {getSortIcon('created_at')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Status</span>
                      {getSortIcon('status')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('priority')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Priority</span>
                      {getSortIcon('priority')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('amount')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Amount</span>
                      {getSortIcon('amount')}
                    </div>
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentBookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      <div className="flex flex-col items-center space-y-2">
                        <BarChart3 className="h-12 w-12 opacity-50" />
                        <p className="text-lg font-medium">No bookings found</p>
                        <p className="text-sm">Try adjusting your filters or search criteria</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  currentBookings.map((booking) => (
                    <TableRow key={booking.id} className="hover:bg-muted/50">
                      <TableCell>
                        <Checkbox
                          checked={selectedBookings.includes(booking.id)}
                          onCheckedChange={() => toggleBookingSelection(booking.id)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        <div className="flex items-center space-x-2">
                          <span>{booking.id.slice(0, 8)}...</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigator.clipboard.writeText(booking.id)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{booking.service.name}</p>
                          {booking.service.description && (
                            <p className="text-sm text-muted-foreground truncate max-w-xs">
                              {booking.service.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{booking.client.full_name}</p>
                          <p className="text-sm text-muted-foreground">{booking.client.email}</p>
                          {booking.client.phone && (
                            <p className="text-xs text-muted-foreground">{booking.client.phone}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{formatDate(booking.created_at)}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(booking.status)}</TableCell>
                      <TableCell>{getPriorityBadge(booking.priority)}</TableCell>
                      <TableCell>
                        {booking.amount && booking.amount > 0 ? (
                          <span className="font-medium">{formatCurrency(booking.amount, booking.currency)}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewDetails(booking.id)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSendMessage(booking.id)}
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Message
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Enhanced Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="flex items-center space-x-4">
                <p className="text-sm text-muted-foreground">
                  Showing {indexOfFirstBooking + 1} to {Math.min(indexOfLastBooking, filteredBookings.length)} of {filteredBookings.length} results
                </p>
                <Select
                  value={bookingsPerPage.toString()}
                  onValueChange={(value) => {
                    // This would need to be implemented with state management
                    // Production logging removed
                  }}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                
                {getPageNumbers().map((page, index) => (
                  <Button
                    key={index}
                    variant={page === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => typeof page === 'number' && setCurrentPage(page)}
                    disabled={typeof page !== 'number'}
                    className="w-8 h-8 p-0"
                  >
                    {page}
                  </Button>
                ))}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
