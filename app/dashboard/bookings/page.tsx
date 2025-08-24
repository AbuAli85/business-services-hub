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
  CheckCircle2
} from 'lucide-react'

interface Booking {
  id: string
  service_id: string
  client_id: string
  provider_id: string
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  created_at: string
  notes?: string
  amount?: number
  service_name?: string
  client_name?: string
  provider_name?: string
}

interface BookingStats {
  total: number
  pending: number
  confirmed: number
  inProgress: number
  completed: number
  cancelled: number
  revenue: number
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
  const [stats, setStats] = useState<BookingStats>({
    total: 0,
    pending: 0,
    confirmed: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    revenue: 0
  })

  useEffect(() => {
    checkUserAndFetchBookings()
    // Try to check if enhanced data is available
    setTimeout(() => {
      tryFetchEnhancedData()
    }, 1000)
  }, [])

  useEffect(() => {
    filterBookings()
  }, [bookings, searchQuery, statusFilter])

  const checkUserAndFetchBookings = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        console.error('No authenticated user')
        return
      }

      setUser(user)
      setUserRole(user.user_metadata?.role || 'client')
      await fetchBookings(user.id)
    } catch (error) {
      console.error('Error checking user:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBookings = async (userId: string) => {
    try {
      const supabase = await getSupabaseClient()
      
      // Fetch basic booking data without complex joins - database relationships may not be set up yet
      let query = supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false })

      // Filter based on user role
      if (userRole === 'provider') {
        query = query.eq('provider_id', userId)
      } else if (userRole === 'client') {
        query = query.eq('client_id', userId)
      }

      const { data: bookingsData, error } = await query

      if (error) {
        console.error('Error fetching bookings:', error)
        // Set empty data to prevent infinite loading
        setBookings([])
        calculateStats([])
        return
      }

      // Transform the data to match our interface with fallbacks
      const transformedBookings = (bookingsData || []).map(booking => ({
        id: booking.id,
        service_id: booking.service_id,
        client_id: booking.client_id,
        provider_id: booking.provider_id,
        status: booking.status || 'pending',
        created_at: booking.created_at,
        notes: booking.notes || '',
        amount: 0, // Will be populated when service relationships are available
        service_name: `Service #${booking.service_id?.slice(0, 8) || 'N/A'}`,
        client_name: `Client #${booking.client_id?.slice(0, 8) || 'N/A'}`,
        provider_name: `Provider #${booking.provider_id?.slice(0, 8) || 'N/A'}`
      }))

      setBookings(transformedBookings)
      calculateStats(transformedBookings)
    } catch (error) {
      console.error('Error fetching bookings:', error)
      // Set empty data to prevent infinite loading
      setBookings([])
      calculateStats([])
    }
  }

  const calculateStats = (bookingsData: Booking[]) => {
    const stats: BookingStats = {
      total: bookingsData.length,
      pending: bookingsData.filter(b => b.status === 'pending').length,
      confirmed: bookingsData.filter(b => b.status === 'confirmed').length,
      inProgress: bookingsData.filter(b => b.status === 'in_progress').length,
      completed: bookingsData.filter(b => b.status === 'completed').length,
      cancelled: bookingsData.filter(b => b.status === 'cancelled').length,
      revenue: bookingsData.reduce((sum, b) => sum + (b.amount || 0), 0)
    }
    setStats(stats)
  }

  const filterBookings = () => {
    let filtered = [...bookings]

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(booking =>
        booking.service_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.provider_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter)
    }

    setFilteredBookings(filtered)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'in_progress': return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />
      case 'confirmed': return <CheckCircle className="h-4 w-4" />
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
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
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

  const exportBookings = () => {
    try {
      const csvData = [
        ['ID', 'Service', 'Client', 'Provider', 'Status', 'Created', 'Amount', 'Notes'],
        ...filteredBookings.map(booking => [
          booking.id,
          booking.service_name || 'N/A',
          booking.client_name || 'N/A',
          booking.provider_name || 'N/A',
          booking.status,
          formatDate(booking.created_at),
          formatCurrency(booking.amount || 0),
          booking.notes || ''
        ])
      ]

      const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `bookings-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error exporting bookings:', error)
    }
  }

  const tryFetchEnhancedData = async () => {
    try {
      const supabase = await getSupabaseClient()
      
      // Try to fetch enhanced data for the first booking to test if relationships work
      const { data: testData, error } = await supabase
        .from('bookings')
        .select(`
          *,
          services:service_id(name, price)
        `)
        .limit(1)

      if (!error && testData && testData[0]?.services) {
        console.log('Enhanced data relationships are available!')
        setShowEnhancedData(true)
        // You could implement full enhanced data fetching here
      } else {
        console.log('Enhanced data relationships not yet available')
        setShowEnhancedData(false)
      }
    } catch (error) {
      console.log('Enhanced data check failed:', error)
      setShowEnhancedData(false)
    }
  }

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
             Note: Enhanced data (service names, client names) will be available once database relationships are configured.
           </p>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => fetchBookings(user.id)}
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
                 Export
               </Button>
               <Button 
                 variant="outline" 
                 onClick={() => tryFetchEnhancedData()}
                 className="border-gray-200 hover:bg-gray-50"
               >
                 <RefreshCw className="h-4 w-4 mr-2" />
                 Test Enhanced Data
               </Button>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                New Booking
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
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
                    <p className="text-sm font-medium text-gray-600">Revenue</p>
                    <p className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.revenue)}</p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Filters and Search */}
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search bookings by service, client, or ID..."
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
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
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
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
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
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Package className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{booking.service_name}</p>
                        <p className="text-gray-500">Service</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{booking.client_name}</p>
                        <p className="text-gray-500">Client</p>
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
                        <p className="font-medium text-gray-900">{formatDate(booking.created_at)}</p>
                        <p className="text-gray-500">Booked on</p>
                      </div>
                    </div>
                  </div>

                  {booking.notes && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                      <p className="text-sm text-gray-700">{booking.notes}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="border-gray-200 hover:bg-gray-50">
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                      {booking.status === 'pending' && userRole === 'provider' && (
                        <>
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 shadow-sm">
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Accept
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50">
                            <XCircle className="h-4 w-4 mr-2" />
                            Decline
                          </Button>
                        </>
                      )}
                      {booking.status === 'confirmed' && (
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 shadow-sm">
                          <ClockIcon className="h-4 w-4 mr-2" />
                          Start Work
                        </Button>
                      )}
                      {booking.status === 'in_progress' && (
                        <Button size="sm" className="bg-amber-600 hover:bg-amber-700 shadow-sm">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark Complete
                        </Button>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        Last updated: {formatDate(booking.created_at)}
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
      </div>
    </div>
  )
}
