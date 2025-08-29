'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getSupabaseClient } from '@/lib/supabase'
import { getApiUrl } from '@/lib/api-utils'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  Search,
  Filter,
  Plus,
  Eye,
  MessageSquare,
  Package,
  BarChart3,
  Star,
  Building2,
  RefreshCw,
  MoreHorizontal,
  Copy
} from 'lucide-react'

interface Booking {
  id: string
  service_id: string
  client_id: string
  provider_id: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'approved' | 'declined' | 'rescheduled'
  created_at: string
  scheduled_date?: string
  scheduled_time?: string
  notes?: string
  amount?: number
  service_name?: string
  client_name?: string
  provider_name?: string
  client_company_name?: string
  provider_company_name?: string
  client_email?: string
  client_phone?: string
  service_description?: string
  estimated_duration?: string
  location?: string
  payment_status?: 'pending' | 'paid' | 'refunded'
  rating?: number
  review?: string
  last_updated?: string
  priority?: 'low' | 'normal' | 'high' | 'urgent'
}

interface BookingStats {
  total: number
  pending: number
  inProgress: number
  completed: number
  cancelled: number
  revenue: number
  thisMonth: number
  lastMonth: number
  averageRating: number
  totalReviews: number
}

export default function BookingsPage() {
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'created_at' | 'amount' | 'status' | 'scheduled_date'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedBookings, setSelectedBookings] = useState<string[]>([])
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [stats, setStats] = useState<BookingStats>({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    revenue: 0,
    thisMonth: 0,
    lastMonth: 0,
    averageRating: 0,
    totalReviews: 0
  })

  // Fetch user and bookings on component mount
  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        setUser(user)
        const role = user.user_metadata?.role || 'client'
        setUserRole(role)
        await fetchBookings(user.id, role)
      } else {
        router.push('/auth/sign-in')
      }
    } catch (error) {
      console.error('Error checking user:', error)
      router.push('/auth/sign-in')
    }
  }

  const fetchBookings = async (userId: string, role: string) => {
    try {
      setLoading(true)
      const supabase = await getSupabaseClient()
      
      // First, fetch the basic booking data
      let query = supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false })

      // Role-based filtering
      if (role === 'client') {
        query = query.eq('client_id', userId)
      } else if (role === 'provider') {
        query = query.eq('provider_id', userId)
      }

      const { data: bookingsData, error: bookingsError } = await query

      if (bookingsError) {
        console.error('Supabase query error:', bookingsError)
        throw bookingsError
      }

      if (!bookingsData || bookingsData.length === 0) {
        setBookings([])
        setFilteredBookings([])
        calculateStats([])
        return
      }

      // Extract unique IDs for related data
      const serviceIds = Array.from(new Set(bookingsData.map(b => b.service_id).filter(Boolean)))
      const clientIds = Array.from(new Set(bookingsData.map(b => b.client_id).filter(Boolean)))
      const providerIds = Array.from(new Set(bookingsData.map(b => b.provider_id).filter(Boolean)))

      // Fetch related data in parallel
      const [servicesData, clientsData, providersData] = await Promise.all([
        // Fetch services data
        serviceIds.length > 0 ? supabase
          .from('services')
          .select('id, service_name, description')
          .in('id', serviceIds)
          .then(({ data, error }) => {
            if (error) {
              console.warn('Error fetching services:', error)
              return []
            }
            return data || []
          }) : Promise.resolve([]),
        
        // Fetch clients data
        clientIds.length > 0 ? supabase
          .from('profiles')
          .select('id, full_name, company_name, email, phone')
          .in('id', clientIds)
          .then(({ data, error }) => {
            if (error) {
              console.warn('Error fetching clients:', error)
              return []
            }
            return data || []
          }) : Promise.resolve([]),
        
        // Fetch providers data
        providerIds.length > 0 ? supabase
          .from('profiles')
          .select('id, full_name, company_name')
          .in('id', providerIds)
          .then(({ data, error }) => {
            if (error) {
              console.warn('Error fetching providers:', error)
              return []
            }
            return data || []
          }) : Promise.resolve([])
      ])

      // Create lookup maps for efficient data access
      const servicesMap = new Map(servicesData.map(s => [s.id, s]))
      const clientsMap = new Map(clientsData.map(c => [c.id, c]))
      const providersMap = new Map(providersData.map(p => [p.id, p]))

      // Transform the data with related information
      const transformedBookings = bookingsData.map(booking => {
        const service = servicesMap.get(booking.service_id)
        const client = clientsMap.get(booking.client_id)
        const provider = providersMap.get(booking.provider_id)

        return {
          ...booking,
          service_name: service?.service_name || null,
          service_description: service?.description || null,
          client_name: client?.full_name || null,
          client_company_name: client?.company_name || null,
          client_email: client?.email || null,
          client_phone: client?.phone || null,
          provider_name: provider?.full_name || null,
          provider_company_name: provider?.company_name || null,
        }
      })

      setBookings(transformedBookings)
      setFilteredBookings(transformedBookings)
      calculateStats(transformedBookings)
    } catch (error) {
      console.error('Error fetching bookings:', error)
      toast.error('Failed to fetch bookings')
      
      // Set empty state on error
      setBookings([])
      setFilteredBookings([])
      calculateStats([])
    } finally {
      setLoading(false)
    }
  }



  const calculateStats = (bookingsData: Booking[]) => {
    const now = new Date()
    const thisMonth = now.getMonth()
    const thisYear = now.getFullYear()
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1
    const lastYear = thisMonth === 0 ? thisYear - 1 : thisYear

    // Calculate revenue only from completed bookings
    const completedBookings = bookingsData.filter(b => b.status === 'completed')
    const revenue = completedBookings.reduce((sum, b) => sum + (b.amount || 0), 0)
    
    // Calculate ratings only from completed bookings with ratings
    const completedWithRatings = completedBookings.filter(b => b.rating && b.rating > 0)
    const averageRating = completedWithRatings.length > 0 
      ? completedWithRatings.reduce((sum, b) => sum + (b.rating || 0), 0) / completedWithRatings.length
      : 0

    const stats: BookingStats = {
      total: bookingsData.length,
      pending: bookingsData.filter(b => b.status === 'pending').length,
      inProgress: bookingsData.filter(b => b.status === 'in_progress').length,
      completed: completedBookings.length,
      cancelled: bookingsData.filter(b => b.status === 'cancelled').length,
      revenue: revenue,
      thisMonth: bookingsData.filter(b => {
        const date = new Date(b.created_at)
        return date.getMonth() === thisMonth && date.getFullYear() === thisYear
      }).length,
      lastMonth: bookingsData.filter(b => {
        const date = new Date(b.created_at)
        return date.getMonth() === lastMonth && date.getFullYear() === lastYear
      }).length,
      averageRating: averageRating,
      totalReviews: completedWithRatings.length
    }
    setStats(stats)
  }

  // Filter and search functionality
  useEffect(() => {
    let filtered = bookings

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter)
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(booking =>
        (booking.service_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (booking.client_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (booking.provider_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Sorting
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
  }, [bookings, statusFilter, searchQuery, sortBy, sortOrder])

  // Status update functions
  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      setIsUpdatingStatus(bookingId)
      
      const response = await fetch('/api/bookings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: bookingId,
          status: newStatus,
          updated_at: new Date().toISOString()
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update booking')
      }

      toast.success('Booking status updated successfully')
      await fetchBookings(user.id, userRole)
    } catch (error) {
      console.error('Error updating booking status:', error)
      toast.error('Failed to update booking status')
    } finally {
      setIsUpdatingStatus('')
    }
  }

  const getStatusActions = (booking: Booking) => {
    const actions = []
    
    if (userRole === 'provider') {
      if (booking.status === 'pending') {
        actions.push(
          <Button
            key="approve"
            size="sm"
            className="bg-green-600 hover:bg-green-700"
            onClick={() => updateBookingStatus(booking.id, 'approved')}
            disabled={isUpdatingStatus === booking.id}
          >
            {isUpdatingStatus === booking.id ? 'Updating...' : 'Approve'}
          </Button>
        )
        actions.push(
          <Button
            key="decline"
            size="sm"
            variant="outline"
            className="border-red-200 text-red-700 hover:bg-red-50"
            onClick={() => updateBookingStatus(booking.id, 'declined')}
            disabled={isUpdatingStatus === booking.id}
          >
            {isUpdatingStatus === booking.id ? 'Updating...' : 'Decline'}
          </Button>
        )
      } else if (booking.status === 'approved') {
        actions.push(
          <Button
            key="start"
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => updateBookingStatus(booking.id, 'in_progress')}
            disabled={isUpdatingStatus === booking.id}
          >
            {isUpdatingStatus === booking.id ? 'Updating...' : 'Start Work'}
          </Button>
        )
      } else if (booking.status === 'in_progress') {
        actions.push(
          <Button
            key="complete"
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => updateBookingStatus(booking.id, 'completed')}
            disabled={isUpdatingStatus === booking.id}
          >
            {isUpdatingStatus === booking.id ? 'Updating...' : 'Mark Complete'}
          </Button>
        )
      }
    } else if (userRole === 'client') {
      if (booking.status === 'pending') {
        actions.push(
          <Button
            key="cancel"
            size="sm"
            variant="outline"
            className="border-red-200 text-red-700 hover:bg-red-50"
            onClick={() => updateBookingStatus(booking.id, 'cancelled')}
            disabled={isUpdatingStatus === booking.id}
          >
            {isUpdatingStatus === booking.id ? 'Updating...' : 'Cancel'}
          </Button>
        )
      }
    }

    return actions
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'approved': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'in_progress': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'
      case 'declined': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳'
      case 'approved': return '✅'
      case 'in_progress': return '🔄'
      case 'completed': return '🎉'
      case 'cancelled': return '❌'
      case 'declined': return '🚫'
      default: return '📋'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return '🚨'
      case 'high': return '⚠️'
      case 'normal': return '📌'
      case 'low': return '📎'
      default: return '📎'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getRatingStars = (rating: number) => {
    return '⭐'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating))
  }

  const openDetailsModal = (booking: Booking) => {
    setSelectedBooking(booking)
    setShowDetailsModal(true)
  }

  const openMessageModal = (booking: Booking) => {
    setSelectedBooking(booking)
    setShowMessageModal(true)
  }

  const sendMessage = async () => {
    if (!selectedBooking || !messageText.trim()) return

    try {
      setIsSendingMessage(true)
      const supabase = await getSupabaseClient()
      
      const receiverId = userRole === 'provider' ? selectedBooking.client_id : selectedBooking.provider_id
      
      const { error } = await supabase
        .from('messages')
        .insert({
          booking_id: selectedBooking.id,
          sender_id: user.id,
          receiver_id: receiverId,
          message: messageText,
          created_at: new Date().toISOString()
        })

      if (error) throw error

      toast.success('Message sent successfully')
      setMessageText('')
      setShowMessageModal(false)
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    } finally {
      setIsSendingMessage(false)
    }
  }

  const toggleBookingSelection = (bookingId: string) => {
    setSelectedBookings(prev => 
      prev.includes(bookingId) 
        ? prev.filter(id => id !== bookingId)
        : [...prev, bookingId]
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading bookings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bookings</h1>
            <p className="text-gray-600 mt-2">
              Manage your {userRole === 'provider' ? 'service requests' : 'bookings'} efficiently
            </p>
          </div>
          
          <div className="flex gap-3">
            {/* New Booking button - Only show for clients */}
            {userRole === 'client' && (
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => router.push('/dashboard/bookings/create')}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Booking
              </Button>
            )}
            
            {/* Provider-specific actions */}
            {userRole === 'provider' && (
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={() => router.push('/dashboard/services')}
                  className="border-green-200 text-green-700 hover:bg-green-50"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Manage Services
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => router.push('/dashboard/provider')}
                  className="border-purple-200 text-purple-700 hover:bg-purple-50"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Analytics
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white border-gray-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">{stats.total}</div>
              <p className="text-sm text-gray-600">Total Bookings</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-gray-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">{stats.pending}</div>
              <p className="text-sm text-gray-600">Pending</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-gray-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600 mb-1">{stats.inProgress}</div>
              <p className="text-sm text-gray-600">In Progress</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-gray-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">{formatCurrency(stats.revenue)}</div>
              <p className="text-sm text-gray-600">Revenue</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6 bg-white border-gray-200">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search bookings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Date Created</SelectItem>
                <SelectItem value="scheduled_date">Scheduled Date</SelectItem>
                <SelectItem value="amount">Amount</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="w-full md:w-auto"
            >
              {sortOrder === 'asc' ? '↑' : '↓'} Sort
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <Card className="bg-white border-gray-200">
          <CardContent className="p-8 text-center">
            <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters'
                : userRole === 'client' 
                  ? 'Create your first booking to get started'
                  : 'No service requests at the moment'
              }
            </p>
            {userRole === 'client' && !searchQuery && statusFilter === 'all' && (
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => router.push('/dashboard/bookings/create')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First Booking
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking) => (
            <Card key={booking.id} className="hover:shadow-lg transition-all duration-300 border border-gray-200 shadow-sm bg-white hover:border-gray-300">
              <CardContent className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      id={`booking-${booking.id}`}
                      checked={selectedBookings.includes(booking.id)}
                      onChange={() => toggleBookingSelection(booking.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                      aria-label={`Select booking ${booking.id}`}
                    />
                    
                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                      <Badge className={`${getStatusColor(booking.status)} flex items-center gap-2 px-3 py-1.5 font-medium`}>
                        {getStatusIcon(booking.status)}
                        <span className="capitalize">{booking.status.replace('_', ' ')}</span>
                      </Badge>
                      
                      {/* Priority Indicator */}
                      {booking.priority && (
                        <Badge className={`${getPriorityColor(booking.priority)} text-xs px-2.5 py-1 font-medium`}>
                          {getPriorityIcon(booking.priority)} {booking.priority.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                    
                    <span className="text-sm text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
                      #{booking.id.slice(0, 8)}
                    </span>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm text-gray-500 mb-2 bg-gray-50 px-3 py-1 rounded-lg inline-block">
                      Created {formatDate(booking.created_at)}
                    </div>
                    
                    {booking.amount && (
                      <div className="text-lg font-bold text-emerald-600 mb-2">
                        {formatCurrency(booking.amount)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Package className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {booking.service_name || `Service ID: ${booking.service_id?.slice(0, 8) || 'Unknown'}`}
                      </p>
                      <p className="text-sm text-gray-500">Service</p>
                      {booking.service_description && (
                        <p className="text-xs text-gray-400 truncate mt-1">{booking.service_description}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <User className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {booking.client_name || `Client ID: ${booking.client_id?.slice(0, 8) || 'Unknown'}`}
                      </p>
                      <p className="text-sm text-gray-500">Client{booking.client_company_name ? ` • ${booking.client_company_name}` : ''}</p>
                      {booking.client_email && (
                        <p className="text-xs text-gray-400 truncate mt-1">{booking.client_email}</p>
                      )}
                    </div>
                  </div>

                  {/* Provider info - Only show for clients */}
                  {userRole === 'client' && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {booking.provider_name || `Provider ID: ${booking.provider_id?.slice(0, 8) || 'Unknown'}`}
                        </p>
                        <p className="text-sm text-gray-500">Provider{booking.provider_company_name ? ` • ${booking.provider_company_name}` : ''}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">
                        {booking.scheduled_date ? formatDate(booking.scheduled_date) : formatDate(booking.created_at)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {booking.scheduled_date ? 'Scheduled for' : 'Booked on'}
                      </p>
                      {booking.scheduled_time && (
                        <p className="text-xs text-gray-400 mt-1">{booking.scheduled_time}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Additional Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                  {booking.estimated_duration && (
                    <div className="flex items-center gap-2 text-sm p-2 bg-blue-50 rounded-lg border border-blue-100">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="font-medium text-blue-900">{booking.estimated_duration}</p>
                        <p className="text-blue-600 text-xs">Duration</p>
                      </div>
                    </div>
                  )}
                  
                  {booking.location && (
                    <div className="flex items-center gap-2 text-sm p-2 bg-orange-50 rounded-lg border border-orange-100">
                      <MapPin className="h-4 w-4 text-orange-500" />
                      <div>
                        <p className="font-medium text-orange-900">{booking.location}</p>
                        <p className="text-orange-600 text-xs">Location</p>
                      </div>
                    </div>
                  )}

                  {booking.rating && (
                    <div className="flex items-center gap-2 text-sm p-2 bg-yellow-50 rounded-lg border border-yellow-100">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <div>
                        <div className="flex items-center gap-1">
                          {getRatingStars(booking.rating)}
                          <span className="font-medium text-yellow-900 ml-1">({booking.rating}/5)</span>
                        </div>
                        <p className="text-yellow-600 text-xs">Rating</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {booking.notes && (
                  <div className="mb-6 p-3 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                    <p className="text-sm font-medium text-gray-700 mb-1">Notes:</p>
                    <p className="text-sm text-gray-700">{booking.notes}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex gap-2 flex-wrap">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-gray-200 hover:bg-gray-50 text-gray-700"
                      onClick={() => openDetailsModal(booking)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    
                    <Button 
                      size="sm"
                      variant="outline"
                      className="border-blue-200 hover:bg-blue-50 text-blue-700"
                      onClick={() => openMessageModal(booking)}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Send Message
                    </Button>
                   
                    {/* Dynamic Status Actions */}
                    {getStatusActions(booking)}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      Last updated: {formatDate(booking.last_updated || booking.created_at)}
                    </span>
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
                  ✕
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
                      <span className="text-sm font-medium text-gray-500">Duration:</span>
                      <p className="text-sm text-gray-900">{selectedBooking.estimated_duration || 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Location:</span>
                      <p className="text-sm text-gray-900">{selectedBooking.location || 'Not specified'}</p>
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
                      setShowDetailsModal(false)
                      openMessageModal(selectedBooking)
                    }}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send Message
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {showMessageModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Send Message</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMessageModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </Button>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Send a message to {userRole === 'provider' ? selectedBooking.client_name : selectedBooking.provider_name}
                </p>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type your message here..."
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none"
                  rows={4}
                />
              </div>
              
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowMessageModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={sendMessage}
                  disabled={!messageText.trim() || isSendingMessage}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSendingMessage ? 'Sending...' : 'Send Message'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {successMessage}
        </div>
      )}
      
      {errorMessage && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {errorMessage}
        </div>
      )}
    </div>
  )
}

 
