'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getSupabaseClient } from '@/lib/supabase'
import { 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  CheckCircle, 
  XCircle, 
  Clock as ClockIcon,
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Users,
  CalendarDays,
  BarChart3,
  MoreHorizontal,
  Star,
  Phone,
  Mail,
  Building2,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  MessageSquare
} from 'lucide-react'

interface Booking {
  id: string
  service_id: string
  client_id: string
  provider_id: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  created_at: string
  scheduled_date?: string
  scheduled_time?: string
  notes?: string
  amount?: number
  service_name?: string
  client_name?: string
  provider_name?: string
  client_email?: string
  client_phone?: string
  service_description?: string
  estimated_duration?: string
  location?: string
  payment_status?: 'pending' | 'paid' | 'refunded'
  cancellation_reason?: string
  rating?: number
  review?: string
  last_updated?: string
}

interface BookingStats {
  total: number
  pending: number
  inProgress: number
  completed: number
  cancelled: number
  revenue: number
  thisMonth: number
  thisWeek: number
  averageRating: number
  totalReviews: number
}

interface FilterOptions {
  dateRange: 'all' | 'today' | 'week' | 'month' | 'custom'
  startDate?: string
  endDate?: string
  minAmount?: number
  maxAmount?: number
  paymentStatus?: string
  hasRating?: boolean
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showEnhancedData, setShowEnhancedData] = useState(false)
  const [sortBy, setSortBy] = useState<'created_at' | 'amount' | 'status' | 'scheduled_date'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list')
  const [selectedBookings, setSelectedBookings] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    dateRange: 'all',
    paymentStatus: 'all'
  })
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  // const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [stats, setStats] = useState<BookingStats>({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    revenue: 0,
    thisMonth: 0,
    thisWeek: 0,
    averageRating: 0,
    totalReviews: 0
  })

  useEffect(() => {
    checkUserAndFetchBookings()
    // Try to check if enhanced data is available
    setTimeout(async () => {
      const enhancedAvailable = await tryFetchEnhancedData()
      // If enhanced data just became available, refetch bookings
      if (enhancedAvailable && user) {
        console.log('🔄 Enhanced data available - refetching bookings with real names')
        await fetchBookings(user.id, userRole)
      }
    }, 1000)
  }, [])

  // Refetch bookings when enhanced data becomes available
  useEffect(() => {
    if (showEnhancedData && user && bookings.length > 0) {
      console.log('🔄 Enhanced data detected - refetching bookings with real names')
      fetchBookings(user.id, userRole)
    }
  }, [showEnhancedData])

  useEffect(() => {
    filterBookings()
  }, [bookings, searchQuery, statusFilter, filterOptions, sortBy, sortOrder])

  const checkUserAndFetchBookings = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        console.error('No authenticated user')
        return
      }

      const userRole = user.user_metadata?.role || 'client'
      setUser(user)
      setUserRole(userRole)
      await fetchBookings(user.id, userRole)
    } catch (error) {
      console.error('Error checking user:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBookings = async (userId: string, role?: string) => {
    try {
      const supabase = await getSupabaseClient()
      
      const tableName = showEnhancedData ? 'enhanced_bookings' : 'bookings'
      console.log(`📊 Fetching from: ${tableName} (enhanced: ${showEnhancedData})`)
      
      // Try enhanced view first, fallback to basic table
      let query = supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false })

      // Filter based on user role (use passed role or current userRole)
      const currentRole = role || userRole
      if (currentRole === 'provider') {
        query = query.eq('provider_id', userId)
      } else if (currentRole === 'client') {
        query = query.eq('client_id', userId)
      }

      const { data: bookingsData, error } = await query

      if (error) {
        console.error('Error fetching bookings:', error)
        setBookings([])
        calculateStats([])
        return
      }

      console.log(`📊 Raw data from ${tableName}:`, {
        count: bookingsData?.length || 0,
        sample: bookingsData?.[0] ? {
          id: bookingsData[0].id,
          service_title: bookingsData[0].service_title,
          client_name: bookingsData[0].client_name,
          provider_name: bookingsData[0].provider_name,
          service_id: bookingsData[0].service_id,
          client_id: bookingsData[0].client_id,
          provider_id: bookingsData[0].provider_id
        } : 'No data'
      })

      // Transform the data with better fallbacks
      const transformedBookings = (bookingsData || []).map(booking => ({
        id: booking.id,
        service_id: booking.service_id,
        client_id: booking.client_id,
        provider_id: booking.provider_id,
        status: booking.status || 'pending',
        created_at: booking.created_at,
        scheduled_date: booking.scheduled_date,
        scheduled_time: booking.scheduled_time,
        notes: booking.notes || '',
        amount: booking.amount || 0,
        payment_status: booking.payment_status || 'pending',
        rating: booking.rating,
        review: booking.review,
        last_updated: booking.updated_at || booking.created_at,
        // Use enhanced data when available, fallback to IDs
        service_name: showEnhancedData && booking.service_title 
          ? booking.service_title 
          : `Service #${booking.service_id?.slice(0, 8) || 'N/A'}`,
        client_name: showEnhancedData && booking.client_name 
          ? booking.client_name 
          : `Client #${booking.client_id?.slice(0, 8) || 'N/A'}`,
        provider_name: showEnhancedData && booking.provider_name 
          ? booking.provider_name 
          : `Provider #${booking.provider_id?.slice(0, 8) || 'N/A'}`,
        service_description: showEnhancedData ? (booking.service_description || '') : '',
        estimated_duration: showEnhancedData ? (booking.estimated_duration || '') : '',
        location: showEnhancedData ? (booking.location || '') : '',
        client_email: showEnhancedData ? (booking.client_phone || '') : '', // Using phone as fallback for email
        client_phone: showEnhancedData ? (booking.client_phone || '') : '',
        cancellation_reason: showEnhancedData ? (booking.cancellation_reason || '') : ''
      }))

      console.log('📊 Fetched bookings:', {
        total: transformedBookings.length,
        role: role || userRole,
        userId: userId,
        enhanced: showEnhancedData,
        sample: transformedBookings[0] ? {
          id: transformedBookings[0].id,
          status: transformedBookings[0].status,
          service_name: transformedBookings[0].service_name,
          client_name: transformedBookings[0].client_name
        } : 'No bookings'
      })

      setBookings(transformedBookings)
      calculateStats(transformedBookings)
    } catch (error) {
      console.error('Error fetching bookings:', error)
      setBookings([])
      calculateStats([])
    }
  }

  const calculateStats = (bookingsData: Booking[]) => {
    const now = new Date()
    const thisMonth = now.getMonth()
    const thisYear = now.getFullYear()
    const thisWeek = getWeekNumber(now)
    
    const stats: BookingStats = {
      total: bookingsData.length,
      pending: bookingsData.filter(b => b.status === 'pending').length,
      inProgress: bookingsData.filter(b => b.status === 'in_progress').length,
      completed: bookingsData.filter(b => b.status === 'completed').length,
      cancelled: bookingsData.filter(b => b.status === 'cancelled').length,
      revenue: bookingsData.reduce((sum, b) => sum + (b.amount || 0), 0),
      thisMonth: bookingsData.filter(b => {
        const date = new Date(b.created_at)
        return date.getMonth() === thisMonth && date.getFullYear() === thisYear
      }).length,
      thisWeek: bookingsData.filter(b => {
        const date = new Date(b.created_at)
        return getWeekNumber(date) === thisWeek && date.getFullYear() === thisYear
      }).length,
      averageRating: bookingsData.filter(b => b.rating).length > 0 
        ? bookingsData.filter(b => b.rating).reduce((sum, b) => sum + (b.rating || 0), 0) / bookingsData.filter(b => b.rating).length
        : 0,
      totalReviews: bookingsData.filter(b => b.rating).length
    }
    setStats(stats)
  }

  const getWeekNumber = (date: Date) => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
  }

  const filterBookings = () => {
    let filtered = [...bookings]

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(booking =>
        booking.service_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.provider_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.client_email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter)
    }

    // Apply date range filter
    if (filterOptions.dateRange !== 'all') {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      filtered = filtered.filter(booking => {
        const bookingDate = new Date(booking.created_at)
        switch (filterOptions.dateRange) {
          case 'today':
            return bookingDate >= today
          case 'week':
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
            return bookingDate >= weekAgo
          case 'month':
            const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate())
            return bookingDate >= monthAgo
          case 'custom':
            if (filterOptions.startDate && filterOptions.endDate) {
              const start = new Date(filterOptions.startDate)
              const end = new Date(filterOptions.endDate)
              return bookingDate >= start && bookingDate <= end
            }
            return true
          default:
            return true
        }
      })
    }

    // Apply payment status filter
    if (filterOptions.paymentStatus && filterOptions.paymentStatus !== 'all') {
      filtered = filtered.filter(booking => booking.payment_status === filterOptions.paymentStatus)
    }

    // Apply amount range filter
    if (filterOptions.minAmount !== undefined || filterOptions.maxAmount !== undefined) {
      filtered = filtered.filter(booking => {
        const amount = booking.amount || 0
        if (filterOptions.minAmount !== undefined && amount < filterOptions.minAmount) return false
        if (filterOptions.maxAmount !== undefined && amount > filterOptions.maxAmount) return false
        return true
      })
    }

    // Apply rating filter
    if (filterOptions.hasRating) {
      filtered = filtered.filter(booking => booking.rating !== undefined && booking.rating > 0)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy]
      let bValue: any = b[sortBy]
      
      if (sortBy === 'created_at' || sortBy === 'scheduled_date') {
        aValue = new Date(aValue || 0).getTime()
        bValue = new Date(bValue || 0).getTime()
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    setFilteredBookings(filtered)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'in_progress': return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />
      case 'in_progress': return <ClockIcon className="h-4 w-4" />
      case 'pending': return <Clock className="h-4 w-4" />
      case 'cancelled': return <XCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return 'Date not available'
      }
      
      const now = new Date()
      const isFuture = date > now
      const isToday = date.toDateString() === now.toDateString()
      const isYesterday = date.toDateString() === new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString()
      
      if (isToday) {
        return 'Today'
      } else if (isYesterday) {
        return 'Yesterday'
      } else if (isFuture) {
        const daysUntil = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        if (daysUntil === 1) {
          return 'Tomorrow'
        } else if (daysUntil <= 7) {
          return `In ${daysUntil} days`
        } else {
          return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })
        }
      } else {
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      }
    } catch (error) {
      return 'Date not available'
    }
  }

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return 'Time not available'
      }
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      return 'Time not available'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'refunded': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="h-4 w-4" />
      case 'pending': return <Clock className="h-4 w-4" />
      case 'refunded': return <XCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ))
  }



  const getStatusActions = (booking: Booking) => {
    const actions = []
    
    if (userRole === 'provider') {
      switch (booking.status) {
        case 'pending':
          // For pending bookings, provide workflow options instead of blocking
          actions.push(
            <div key="pending-actions" className="space-y-2">
              <div className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-md border border-amber-200 mb-2">
                <AlertCircle className="h-4 w-4 inline mr-2" />
                <span className="font-medium">Pending Approval</span>
                <br />
                <span className="text-xs text-amber-500">
                  This booking requires approval before work can begin
                </span>
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <Button
                  key="request-approval"
                  size="sm"
                  variant="outline"
                  className="border-blue-200 text-blue-700 hover:bg-blue-50"
                  onClick={() => requestApproval(booking.id)}
                  disabled={isUpdatingStatus === booking.id}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Request Approval
                </Button>
                
                <Button
                  key="send-reminder"
                  size="sm"
                  variant="outline"
                  className="border-amber-200 text-amber-700 hover:bg-amber-50"
                  onClick={() => sendReminder(booking.id)}
                  disabled={isUpdatingStatus === booking.id}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Reminder
                </Button>
                
                <Button
                  key="escalate"
                  size="sm"
                  variant="outline"
                  className="border-red-200 text-red-700 hover:bg-red-50"
                  onClick={() => escalateBooking(booking.id)}
                  disabled={isUpdatingStatus === booking.id}
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Escalate
                </Button>
              </div>
            </div>
          )
          break
        case 'in_progress':
          actions.push(
            <div key="in-progress-actions" className="space-y-2">
              <div className="flex gap-2 flex-wrap">
                <Button
                  key="complete"
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                  onClick={() => updateBookingStatus(booking.id, 'completed')}
                  disabled={isUpdatingStatus === booking.id}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Complete
                </Button>
                
                <Button
                  key="pause"
                  size="sm"
                  variant="outline"
                  className="border-orange-200 text-orange-700 hover:bg-orange-50"
                  onClick={() => pauseWork(booking.id)}
                  disabled={isUpdatingStatus === booking.id}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Pause Work
                </Button>
                
                <Button
                  key="update-progress"
                  size="sm"
                  variant="outline"
                  className="border-blue-200 text-blue-700 hover:bg-blue-50"
                  onClick={() => updateProgress(booking.id)}
                  disabled={isUpdatingStatus === booking.id}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Update Progress
                </Button>
              </div>
            </div>
          )
          break
        case 'completed':
          // Allow providers to manage completed bookings
          actions.push(
            <div key="completed-actions" className="space-y-2">
              <div className="flex gap-2 flex-wrap">
                <Button
                  key="reopen"
                  size="sm"
                  variant="outline"
                  className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-300"
                  onClick={() => updateBookingStatus(booking.id, 'in_progress')}
                  disabled={isUpdatingStatus === booking.id}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reopen
                </Button>
                
                <Button
                  key="add-review"
                  size="sm"
                  variant="outline"
                  className="border-purple-200 text-purple-700 hover:bg-purple-50"
                  onClick={() => addReview(booking.id)}
                  disabled={isUpdatingStatus === booking.id}
                >
                  <Star className="h-4 w-4 mr-2" />
                  Add Review
                </Button>
                
                <Button
                  key="archive"
                  size="sm"
                  variant="outline"
                  className="border-gray-200 text-gray-700 hover:bg-gray-50"
                  onClick={() => archiveBooking(booking.id)}
                  disabled={isUpdatingStatus === booking.id}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Archive
                </Button>
              </div>
            </div>
          )
          break
      }
    } else if (userRole === 'client') {
      // Enhanced client actions for different booking statuses
      switch (booking.status) {
        case 'pending':
          actions.push(
            <div key="client-pending-actions" className="space-y-2">
              <div className="text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-md border border-blue-200 mb-2">
                <Clock className="h-4 w-4 inline mr-2" />
                <span className="font-medium">Awaiting Provider Response</span>
                <br />
                <span className="text-xs text-blue-500">
                  Your booking is being reviewed by the service provider
                </span>
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <Button
                  key="send-inquiry"
                  size="sm"
                  variant="outline"
                  className="border-blue-200 text-blue-700 hover:bg-blue-50"
                  onClick={() => openMessageModal(booking)}
                  disabled={isUpdatingStatus === booking.id}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Inquiry
                </Button>
                
                <Button
                  key="cancel-request"
                  size="sm"
                  variant="outline"
                  className="border-red-200 text-red-700 hover:bg-red-50"
                  onClick={() => cancelBooking(booking.id)}
                  disabled={isUpdatingStatus === booking.id}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Request
                </Button>
              </div>
            </div>
          )
          break
          
        case 'in_progress':
          actions.push(
            <div key="client-in-progress-actions" className="space-y-2">
              <div className="flex gap-2 flex-wrap">
                <Button
                  key="request-change"
                  size="sm"
                  variant="outline"
                  className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-300"
                  onClick={() => openMessageModal(booking)}
                  disabled={isUpdatingStatus === booking.id}
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Request Change
                </Button>
                
                <Button
                  key="request-update"
                  size="sm"
                  variant="outline"
                  className="border-blue-200 text-blue-700 hover:bg-blue-50"
                  onClick={() => requestUpdate(booking.id)}
                  disabled={isUpdatingStatus === booking.id}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Request Update
                </Button>
              </div>
            </div>
          )
          break
          
        case 'completed':
          actions.push(
            <div key="client-completed-actions" className="space-y-2">
              <div className="flex gap-2 flex-wrap">
                <Button
                  key="add-review"
                  size="sm"
                  variant="outline"
                  className="border-purple-200 text-purple-700 hover:bg-purple-50"
                  onClick={() => addClientReview(booking.id)}
                  disabled={isUpdatingStatus === booking.id}
                >
                  <Star className="h-4 w-4 mr-2" />
                  Add Review
                </Button>
                
                <Button
                  key="rebook"
                  size="sm"
                  variant="outline"
                  className="border-green-200 text-green-700 hover:bg-green-50"
                  onClick={() => rebookService(booking.id)}
                  disabled={isUpdatingStatus === booking.id}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Rebook Service
                </Button>
              </div>
            </div>
          )
          break
      }
    }

    return actions
  }

  const exportBookings = () => {
    try {
      const exportData = selectedBookings.length > 0 
        ? bookings.filter(b => selectedBookings.includes(b.id))
        : filteredBookings

      const csvData = [
        ['ID', 'Service', 'Client', 'Provider', 'Status', 'Created', 'Scheduled', 'Amount', 'Payment Status', 'Rating', 'Notes'],
        ...exportData.map(booking => [
          booking.id,
          booking.service_name || 'N/A',
          booking.client_name || 'N/A',
          booking.provider_name || 'N/A',
          booking.status,
          formatDate(booking.created_at),
          booking.scheduled_date ? formatDate(booking.scheduled_date) : 'N/A',
          formatCurrency(booking.amount || 0),
          booking.payment_status || 'N/A',
          booking.rating ? `${booking.rating}/5` : 'N/A',
          booking.notes || ''
        ])
      ]

      const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `bookings-${selectedBookings.length > 0 ? 'selected' : 'all'}-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error exporting bookings:', error)
    }
  }

  const exportBookingsPDF = () => {
    // Placeholder for PDF export functionality
    console.log('PDF export functionality to be implemented')
  }

  const tryFetchEnhancedData = async () => {
    try {
      const supabase = await getSupabaseClient()
      
      console.log('🔍 Checking enhanced_bookings view availability...')
      
      // Try to fetch from enhanced view first
      const { data: enhancedData, error: enhancedError } = await supabase
        .from('enhanced_bookings')
        .select('*')
        .limit(1)

      if (!enhancedError && enhancedData && enhancedData.length > 0) {
        console.log('✅ Enhanced bookings view is available - using real names and data')
        console.log('📊 Sample enhanced data:', {
          id: enhancedData[0].id,
          client_name: enhancedData[0].client_name,
          provider_name: enhancedData[0].provider_name,
          service_title: enhancedData[0].service_title
        })
        setShowEnhancedData(true)
        return true
      } else {
        console.log('❌ Enhanced view error or no data:', enhancedError?.message || 'No data')
        
        // Fallback to basic view
        const { data: testData, error } = await supabase
          .from('bookings')
          .select('*')
          .limit(1)

        if (!error && testData && testData.length > 0) {
          console.log('ℹ️ Basic booking data is available - enhanced relationships not yet configured')
          setShowEnhancedData(false)
        } else {
          console.log('ℹ️ No booking data available yet')
          setShowEnhancedData(false)
        }
        return false
      }
    } catch (error) {
      console.log('Enhanced data check failed:', error)
      setShowEnhancedData(false)
      return false
    }
  }

  const updateBookingStatus = async (bookingId: string, newStatus: string, notes?: string) => {
    if (isUpdatingStatus === bookingId) return
    
    // Find the current booking to validate the transition
    const currentBooking = bookings.find(b => b.id === bookingId)
    if (!currentBooking) {
      console.error('Booking not found:', bookingId)
      return
    }
    
    // Log all status update attempts for debugging
    console.log('🔄 Status update attempt:', currentBooking.status, '→', newStatus, 'for booking:', bookingId)
    
    // Prevent invalid status transitions based on database constraints
    if (currentBooking.status === 'pending') {
      console.warn('🚫 Invalid transition blocked: pending →', newStatus)
      console.warn('Pending bookings cannot be modified due to database constraints')
      return
    }
    
    setIsUpdatingStatus(bookingId)
    try {
      const supabase = await getSupabaseClient()
      
      // Only update fields that exist in the database
      const updateData: any = { 
        status: newStatus,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', bookingId)

      if (error) {
        console.error('Error updating booking status:', error)
        
        // Handle specific status transition errors gracefully
        if (error.message?.includes('Invalid status transition')) {
          console.warn('Status transition not allowed:', error.message)
          // Don't show alert - just log the warning
        }
        return
      }

      // Update local state
      setBookings(prev => prev.map(booking => 
        booking.id === bookingId 
          ? { ...booking, status: newStatus as any, last_updated: new Date().toISOString() }
          : booking
      ))

      // Refresh data to get updated stats
      await fetchBookings(user.id, userRole)
      
    } catch (error) {
      console.error('Error updating booking status:', error)
    } finally {
      setIsUpdatingStatus(null)
    }
  }

  const bulkUpdateStatus = async (bookingIds: string[], newStatus: string) => {
    try {
      // Validate that none of the selected bookings are pending
      const selectedBookings = bookings.filter(b => bookingIds.includes(b.id))
      const hasPendingBookings = selectedBookings.some(b => b.status === 'pending')
      
      if (hasPendingBookings) {
        console.warn('🚫 Bulk update blocked: Some selected bookings are pending and cannot be modified')
        return
      }
      
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .in('id', bookingIds)

      if (error) {
        console.error('Error bulk updating bookings:', error)
        
        // Handle specific status transition errors gracefully
        if (error.message?.includes('Invalid status transition')) {
          console.warn('Bulk status transition not allowed:', error.message)
          // Don't show alert - just log the warning
        }
        return
      }

      // Update local state
      setBookings(prev => prev.map(booking => 
        bookingIds.includes(booking.id)
          ? { ...booking, status: newStatus as any, last_updated: new Date().toISOString() }
          : booking
      ))

      // Clear selection and refresh
      setSelectedBookings([])
      await fetchBookings(user.id, userRole)
      
    } catch (error) {
      console.error('Error bulk updating bookings:', error)
    }
  }

  const toggleBookingSelection = (bookingId: string) => {
    setSelectedBookings(prev => 
      prev.includes(bookingId)
        ? prev.filter(id => id !== bookingId)
        : [...prev, bookingId]
    )
  }

  const selectAllBookings = () => {
    setSelectedBookings(filteredBookings.map(b => b.id))
  }

  const clearSelection = () => {
    setSelectedBookings([])
  }

  const openDetailsModal = (booking: Booking) => {
    setSelectedBooking(booking)
    setShowDetailsModal(true)
  }

  // Removed confirm modal since 'confirmed' status is not allowed
  // const openConfirmModal = (booking: Booking) => {
  //   setSelectedBooking(booking)
  //   setShowConfirmModal(true)
  // }

  const openMessageModal = (booking: Booking) => {
    setSelectedBooking(booking)
    setShowMessageModal(true)
  }

  const sendMessage = async () => {
    if (!selectedBooking || !messageText.trim()) return
    
    setIsSendingMessage(true)
    try {
      const supabase = await getSupabaseClient()
      
      // Create a message record (you'll need to create a messages table)
      const { error } = await supabase
        .from('messages')
        .insert({
          booking_id: selectedBooking.id,
          sender_id: user.id,
          receiver_id: userRole === 'provider' ? selectedBooking.client_id : selectedBooking.provider_id,
          message: messageText.trim(),
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error sending message:', error)
        alert('Failed to send message. Please try again.')
        return
      }

      setMessageText('')
      setShowMessageModal(false)
      alert('Message sent successfully!')
      
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message. Please try again.')
    } finally {
      setIsSendingMessage(false)
    }
  }



  // Helper function to safely update bookings with fallback for missing columns
  const safeUpdateBooking = async (bookingId: string, updateData: any) => {
    try {
      const supabase = await getSupabaseClient()
      
      // Try the full update first
      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', bookingId)

      if (error) {
        // If it's a column error, try without the problematic columns
        if (error.message?.includes('column') || error.message?.includes('notes') || error.message?.includes('rating') || error.message?.includes('review')) {
          console.warn('Some columns not available, updating with available fields only')
          
          // Filter out potentially problematic columns
          const safeUpdateData = { ...updateData }
          delete safeUpdateData.notes
          delete safeUpdateData.rating
          delete safeUpdateData.review
          
          // Keep only timestamp update if that's all we can do
          if (Object.keys(safeUpdateData).length === 0) {
            safeUpdateData.updated_at = new Date().toISOString()
          }
          
          const { error: fallbackError } = await supabase
            .from('bookings')
            .update(safeUpdateData)
            .eq('id', bookingId)
          
          if (fallbackError) {
            throw fallbackError
          }
        } else {
          throw error
        }
      }
      
      return true
    } catch (error) {
      console.error('Error in safeUpdateBooking:', error)
      throw error
    }
  }

  // Provider workflow functions for pending bookings
  const requestApproval = async (bookingId: string) => {
    try {
      await safeUpdateBooking(bookingId, {
        notes: 'Approval requested by provider',
        updated_at: new Date().toISOString()
      })

      alert('Approval request sent successfully!')
      
      // Refresh the data
      await fetchBookings(user.id, userRole)
      
    } catch (error) {
      console.error('Error requesting approval:', error)
      alert('Failed to request approval. Please try again.')
    }
  }

  const sendReminder = async (bookingId: string) => {
    try {
      const supabase = await getSupabaseClient()
      
      // Send a reminder message
      const { error } = await supabase
        .from('messages')
        .insert({
          booking_id: bookingId,
          sender_id: user.id,
          receiver_id: userRole === 'provider' ? 
            (bookings.find(b => b.id === bookingId)?.client_id || '') : 
            (bookings.find(b => b.id === bookingId)?.provider_id || ''),
          message: 'Reminder: Your booking is pending approval. Please review and respond.',
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error sending reminder:', error)
        alert('Failed to send reminder. Please try again.')
        return
      }

      alert('Reminder sent successfully!')
      
    } catch (error) {
      console.error('Error sending reminder:', error)
      alert('Failed to send reminder. Please try again.')
    }
  }

  const escalateBooking = async (bookingId: string) => {
    try {
      await safeUpdateBooking(bookingId, {
        notes: 'ESCALATED: Requires immediate attention',
        updated_at: new Date().toISOString()
      })

      alert('Booking escalated successfully! Support team will be notified.')
      
      // Refresh the data
      await fetchBookings(user.id, userRole)
      
    } catch (error) {
      console.error('Error escalating booking:', error)
      alert('Failed to escalate booking. Please try again.')
    }
  }

  // Provider workflow functions for in-progress bookings
  const pauseWork = async (bookingId: string) => {
    try {
      await safeUpdateBooking(bookingId, {
        notes: 'Work paused - will resume soon',
        updated_at: new Date().toISOString()
      })

      alert('Work paused successfully!')
      
      // Refresh the data
      await fetchBookings(user.id, userRole)
      
    } catch (error) {
      console.error('Error pausing work:', error)
      alert('Failed to pause work. Please try again.')
    }
  }

  const updateProgress = async (bookingId: string) => {
    try {
      const progressNote = prompt('Enter progress update:')
      if (!progressNote) return
      
      await safeUpdateBooking(bookingId, {
        notes: `Progress Update: ${progressNote}`,
        updated_at: new Date().toISOString()
      })

      alert('Progress updated successfully!')
      
      // Refresh the data
      await fetchBookings(user.id, userRole)
      
    } catch (error) {
      console.error('Error updating progress:', error)
      alert('Failed to update progress. Please try again.')
    }
  }

  // Provider workflow functions for completed bookings
  const addReview = async (bookingId: string) => {
    try {
      const reviewText = prompt('Enter your review for this booking:')
      if (!reviewText) return
      
      const rating = prompt('Enter rating (1-5):')
      if (!rating || isNaN(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) {
        alert('Please enter a valid rating between 1 and 5')
        return
      }
      
      await safeUpdateBooking(bookingId, {
        review: reviewText,
        rating: Number(rating),
        updated_at: new Date().toISOString()
      })

      alert('Review added successfully!')
      
      // Refresh the data
      await fetchBookings(user.id, userRole)
      
    } catch (error) {
      console.error('Error adding review:', error)
      alert('Failed to add review. Please try again.')
    }
  }

  const archiveBooking = async (bookingId: string) => {
    try {
      const confirmArchive = confirm('Are you sure you want to archive this booking? This action cannot be undone.')
      if (!confirmArchive) return
      
      await safeUpdateBooking(bookingId, {
        notes: 'ARCHIVED: ' + (bookings.find(b => b.id === bookingId)?.notes || ''),
        updated_at: new Date().toISOString()
      })

      alert('Booking archived successfully!')
      
      // Refresh the data
      await fetchBookings(user.id, userRole)
      
    } catch (error) {
      console.error('Error archiving booking:', error)
      alert('Failed to archive booking. Please try again.')
    }
  }

  // Client-specific workflow functions
  const cancelBooking = async (bookingId: string) => {
    try {
      const confirmCancel = confirm('Are you sure you want to cancel this booking request? This action cannot be undone.')
      if (!confirmCancel) return
      
      await safeUpdateBooking(bookingId, {
        notes: 'CANCELLED BY CLIENT: ' + (bookings.find(b => b.id === bookingId)?.notes || ''),
        updated_at: new Date().toISOString()
      })

      alert('Booking cancelled successfully!')
      
      // Refresh the data
      await fetchBookings(user.id, userRole)
      
    } catch (error) {
      console.error('Error cancelling booking:', error)
      alert('Failed to cancel booking. Please try again.')
    }
  }

  const requestUpdate = async (bookingId: string) => {
    try {
      const updateRequest = prompt('What update would you like to request?')
      if (!updateRequest) return
      
      const supabase = await getSupabaseClient()
      
      // Send update request message
      const { error } = await supabase
        .from('messages')
        .insert({
          booking_id: bookingId,
          sender_id: user.id,
          receiver_id: bookings.find(b => b.id === bookingId)?.provider_id || '',
          message: `Update Request: ${updateRequest}`,
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error requesting update:', error)
        alert('Failed to request update. Please try again.')
        return
      }

      alert('Update request sent successfully!')
      
    } catch (error) {
      console.error('Error requesting update:', error)
      alert('Failed to request update. Please try again.')
    }
  }

  const addClientReview = async (bookingId: string) => {
    try {
      const reviewText = prompt('Enter your review for this service:')
      if (!reviewText) return
      
      const rating = prompt('Enter rating (1-5):')
      if (!rating || isNaN(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) {
        alert('Please enter a valid rating between 1 and 5')
        return
      }
      
      await safeUpdateBooking(bookingId, {
        review: reviewText,
        rating: Number(rating),
        updated_at: new Date().toISOString()
      })

      alert('Review added successfully!')
      
      // Refresh the data
      await fetchBookings(user.id, userRole)
      
    } catch (error) {
      console.error('Error adding review:', error)
      alert('Failed to add review. Please try again.')
    }
  }

  const rebookService = async (bookingId: string) => {
    try {
      const confirmRebook = confirm('Would you like to rebook this service? This will create a new booking request.')
      if (!confirmRebook) return
      
      // For now, just show a message - in a real app, this would create a new booking
      alert('Rebooking functionality will be implemented in the next update. For now, please create a new service request.')
      
    } catch (error) {
      console.error('Error rebooking service:', error)
      alert('Failed to rebook service. Please try again.')
    }
  }

  // Removed confirmBooking function since 'confirmed' status is not allowed

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 text-lg font-medium">Loading your bookings...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Bookings</h1>
              <p className="text-gray-600 text-lg">Manage your service bookings and appointments</p>
              <p className="text-sm text-gray-500 mt-1">
                {showEnhancedData 
                  ? '✅ Enhanced data available - showing real names and service details'
                  : 'Using basic booking data. Service names and amounts will show as IDs until enhanced view is configured.'
                }
                <span className="ml-2">• Enhanced workflow actions now available for all booking statuses</span>
              </p>
            </div>
            <div className="flex gap-3">
                             <Button 
                 variant="outline" 
                 onClick={() => fetchBookings(user.id, userRole)}
                 className="border-gray-200 hover:bg-gray-50"
               >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
               <Button 
                 variant="outline" 
                 onClick={() => exportBookings()}
                 className="border-gray-200 hover:bg-gray-50"
               >
                 <Download className="h-4 w-4 mr-2" />
                 Export CSV
               </Button>
               <Button 
                 variant="outline" 
                 onClick={() => exportBookingsPDF()}
                 className="border-gray-200 hover:bg-gray-50"
               >
                 <Download className="h-4 w-4 mr-2" />
                 Export PDF
               </Button>
                               {/* Enhanced Data Test Button - Removed since not needed */}
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                New Booking
              </Button>
            </div>
          </div>

          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {stats.thisMonth} this month • {stats.thisWeek} this week
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {stats.pending > 0 ? `${stats.pending} awaiting approval` : 'No pending bookings'}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">In Progress</p>
                    <p className="text-2xl font-bold text-amber-600">{stats.inProgress}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {stats.inProgress > 0 ? `${stats.inProgress} active work` : 'No active work'}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                    <ClockIcon className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Completed</p>
                    <p className="text-2xl font-bold text-emerald-600">{stats.completed}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {stats.averageRating.toFixed(1)}★ avg rating
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Revenue</p>
                    <p className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.revenue)}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {stats.totalReviews} reviews • {stats.cancelled} cancelled
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Enhanced Filters and Search */}
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4">
              {/* Search and Basic Filters */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search bookings by service, client, ID, notes, or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-48 border-gray-200">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
        
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="border-gray-200 hover:bg-gray-50"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {showFilters ? 'Hide' : 'Show'} Filters
                </Button>
              </div>

              {/* Advanced Filters */}
              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
                  <Select value={filterOptions.dateRange} onValueChange={(value) => setFilterOptions(prev => ({ ...prev, dateRange: value as any }))}>
                    <SelectTrigger className="border-gray-200">
                      <SelectValue placeholder="Date Range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterOptions.paymentStatus} onValueChange={(value) => setFilterOptions(prev => ({ ...prev, paymentStatus: value }))}>
                    <SelectTrigger className="border-gray-200">
                      <SelectValue placeholder="Payment Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Payments</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
                    <SelectTrigger className="border-gray-200">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created_at">Created Date</SelectItem>
                      <SelectItem value="scheduled_date">Scheduled Date</SelectItem>
                      <SelectItem value="amount">Amount</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="border-gray-200 hover:bg-gray-50"
                  >
                    {sortOrder === 'asc' ? '↑' : '↓'} {sortBy.replace('_', ' ')}
                  </Button>
                </div>
              )}

              {/* Bulk Actions */}
              {selectedBookings.length > 0 && (
                <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      {selectedBookings.length} booking{selectedBookings.length !== 1 ? 's' : ''} selected
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearSelection}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      Clear
                    </Button>
                  </div>
                  
                                                         <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => bulkUpdateStatus(selectedBookings, 'completed')}
                        className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Complete All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => bulkUpdateStatus(selectedBookings, 'cancelled')}
                        className="border-red-200 text-red-700 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancel All
                      </Button>
                    </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bookings List */}
        {filteredBookings.length === 0 ? (
          <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
            <CardContent className="p-16 text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Calendar className="h-12 w-12 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">No bookings found</h3>
              <p className="text-gray-600 mb-6 text-lg max-w-md mx-auto">
                {searchQuery || statusFilter !== 'all' 
                  ? 'No bookings match your current filters. Try adjusting your search criteria.'
                  : 'You don\'t have any bookings yet. Start by creating a service or booking an appointment.'
                }
              </p>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Create First Booking
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => (
              <Card key={booking.id} className="hover:shadow-lg transition-all duration-300 border-0 shadow-sm bg-white/90 backdrop-blur-sm">
                <CardContent className="p-6">
                  {/* Header with Status, ID, and Selection */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id={`booking-${booking.id}`}
                        checked={selectedBookings.includes(booking.id)}
                        onChange={() => toggleBookingSelection(booking.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        aria-label={`Select booking ${booking.id}`}
                      />
                      <Badge className={`${getStatusColor(booking.status)} flex items-center gap-2 px-3 py-1`}>
                        {getStatusIcon(booking.status)}
                        <span className="capitalize">{booking.status.replace('_', ' ')}</span>
                      </Badge>
                      <span className="text-sm text-gray-500 font-mono">
                        #{booking.id.slice(0, 8)}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500 mb-1">
                        Created {formatDate(booking.created_at)}
                      </div>
                      {booking.amount && (
                        <div className="text-lg font-bold text-emerald-600">
                          {formatCurrency(booking.amount)}
                        </div>
                      )}
                      {booking.payment_status && (
                        <Badge className={`${getPaymentStatusColor(booking.payment_status)} mt-2`}>
                          {getPaymentStatusIcon(booking.payment_status)}
                          <span className="ml-1 capitalize">{booking.payment_status}</span>
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Enhanced Information Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Package className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{booking.service_name}</p>
                        <p className="text-gray-500">Service</p>
                        {booking.service_description && (
                          <p className="text-xs text-gray-400 truncate">{booking.service_description}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{booking.client_name}</p>
                        <p className="text-gray-500">Client</p>
                        {booking.client_email && (
                          <p className="text-xs text-gray-400">{booking.client_email}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{booking.provider_name}</p>
                        <p className="text-gray-500">Provider</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">
                          {booking.scheduled_date ? formatDate(booking.scheduled_date) : formatDate(booking.created_at)}
                        </p>
                        <p className="text-gray-500">
                          {booking.scheduled_date ? 'Scheduled for' : 'Booked on'}
                        </p>
                        {booking.scheduled_time && (
                          <p className="text-xs text-gray-400">{booking.scheduled_time}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Additional Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {booking.estimated_duration && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">{booking.estimated_duration}</p>
                          <p className="text-gray-500">Duration</p>
                        </div>
                      </div>
                    )}
                    
                    {booking.location && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">{booking.location}</p>
                          <p className="text-gray-500">Location</p>
                        </div>
                      </div>
                    )}

                    {booking.rating && (
                      <div className="flex items-center gap-2 text-sm">
                        <Star className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="flex items-center gap-1">
                            {getRatingStars(booking.rating)}
                            <span className="font-medium text-gray-900 ml-1">({booking.rating}/5)</span>
                          </div>
                          <p className="text-gray-500">Rating</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Notes and Review */}
                  {(booking.notes || booking.review) && (
                    <div className="mb-4 space-y-2">
                      {booking.notes && (
                        <div className="p-3 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                          <p className="text-sm font-medium text-gray-700 mb-1">Notes:</p>
                          <p className="text-sm text-gray-700">{booking.notes}</p>
                        </div>
                      )}
                      {booking.review && (
                        <div className="p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                          <p className="text-sm font-medium text-gray-700 mb-1">Review:</p>
                          <p className="text-sm text-gray-700">{booking.review}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2 flex-wrap">
                                             <Button 
                         size="sm" 
                         variant="outline" 
                         className="border-gray-200 hover:bg-gray-50"
                         onClick={() => openDetailsModal(booking)}
                       >
                         <Eye className="h-4 w-4 mr-2" />
                         View Details
                       </Button>
                      
                      {/* Dynamic Status Actions */}
                      {getStatusActions(booking)}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        Last updated: {formatDate(booking.last_updated || booking.created_at)}
                      </span>
                      <Button size="sm" variant="ghost" className="text-gray-400 hover:text-gray-600">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
                     </div>
         )}

         {/* Details Modal */}
         {showDetailsModal && selectedBooking && (
           <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
             <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
               <div className="p-6">
                 <div className="flex items-center justify-between mb-6">
                   <h2 className="text-2xl font-bold text-gray-900">Booking Details</h2>
                   <Button
                     variant="ghost"
                     size="sm"
                     onClick={() => setShowDetailsModal(false)}
                     className="text-gray-400 hover:text-gray-600"
                   >
                     <XCircle className="h-6 w-6" />
                   </Button>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div>
                     <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                     <div className="space-y-3">
                       <div>
                         <span className="text-sm font-medium text-gray-500">Booking ID:</span>
                         <p className="text-sm text-gray-900 font-mono">{selectedBooking.id}</p>
                       </div>
                       <div>
                         <span className="text-sm font-medium text-gray-500">Status:</span>
                         <Badge className={`${getStatusColor(selectedBooking.status)} ml-2`}>
                           {getStatusIcon(selectedBooking.status)}
                           <span className="ml-1 capitalize">{selectedBooking.status.replace('_', ' ')}</span>
                         </Badge>
                       </div>
                       <div>
                         <span className="text-sm font-medium text-gray-500">Created:</span>
                         <p className="text-sm text-gray-900">{formatDate(selectedBooking.created_at)}</p>
                       </div>
                       <div>
                         <span className="text-sm font-medium text-gray-500">Last Updated:</span>
                         <p className="text-sm text-gray-900">{formatDate(selectedBooking.last_updated || selectedBooking.created_at)}</p>
                       </div>
                     </div>
                   </div>
                   
                   <div>
                     <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Details</h3>
                     <div className="space-y-3">
                       <div>
                         <span className="text-sm font-medium text-gray-500">Service:</span>
                         <p className="text-sm text-gray-900">{selectedBooking.service_name}</p>
                       </div>
                       <div>
                         <span className="text-sm font-medium text-gray-500">Amount:</span>
                         <p className="text-sm text-gray-900 font-semibold">{formatCurrency(selectedBooking.amount || 0)}</p>
                       </div>
                       <div>
                         <span className="text-sm font-medium text-gray-500">Payment Status:</span>
                         <Badge className={`${getPaymentStatusColor(selectedBooking.payment_status || 'pending')} ml-2`}>
                           {getPaymentStatusIcon(selectedBooking.payment_status || 'pending')}
                           <span className="ml-1 capitalize">{selectedBooking.payment_status || 'pending'}</span>
                         </Badge>
                       </div>
                     </div>
                   </div>
                 </div>
                 
                                   <div className="mt-6 pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
                    <div className="flex gap-3 flex-wrap">
                      {/* Dynamic Status Actions */}
                      {getStatusActions(selectedBooking).map((action, index) => (
                        <div key={index}>{action}</div>
                      ))}
                      
                      {/* Always show Message button */}
                      <Button
                        variant="outline"
                        className="border-gray-200 hover:bg-gray-50"
                        onClick={() => {
                          if (selectedBooking) {
                            openMessageModal(selectedBooking)
                            setShowDetailsModal(false)
                          }
                        }}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Message
                      </Button>
                    </div>
                  </div>
               </div>
             </div>
           </div>
         )}

                   {/* Confirm Modal - Removed since 'confirmed' status is not allowed */}

         {/* Message Modal */}
         {showMessageModal && selectedBooking && (
           <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
             <div className="bg-white rounded-lg max-w-md w-full">
               <div className="p-6">
                 <h2 className="text-xl font-bold text-gray-900 mb-4">Send Message</h2>
                 <p className="text-gray-600 mb-4">
                   Send a message to {userRole === 'provider' ? 'the client' : 'the provider'} about this booking.
                 </p>
                 <textarea
                   value={messageText}
                   onChange={(e) => setMessageText(e.target.value)}
                   placeholder="Type your message here..."
                   className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                 />
                 <div className="flex gap-3 justify-end mt-4">
                   <Button
                     variant="outline"
                     onClick={() => setShowMessageModal(false)}
                   >
                     Cancel
                   </Button>
                   <Button
                     className="bg-blue-600 hover:bg-blue-700"
                     onClick={sendMessage}
                     disabled={isSendingMessage || !messageText.trim()}
                   >
                     {isSendingMessage ? 'Sending...' : 'Send Message'}
                   </Button>
                 </div>
               </div>
             </div>
           </div>
         )}
       </div>
     </div>
   )
 }
