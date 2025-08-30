'use client'

import { useState, useEffect } from 'react'
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
  Filter,
  Eye,
  MessageSquare,
  Calendar,
  User,
  Package,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface Booking {
  id: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'approved' | 'declined' | 'rescheduled'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  created_at: string
  scheduled_date?: string
  notes?: string
  amount?: number
  service: any
  client: any
}

interface BookingStats {
  total: number
  pending: number
  inProgress: number
  completed: number
  cancelled: number
}

export default function BookingsTable() {
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
  const [stats, setStats] = useState<BookingStats>({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0
  })

  // Load user and bookings
  useEffect(() => {
    loadUserAndBookings()
  }, [])

  // Filter bookings when search or filters change
  useEffect(() => {
    filterBookings()
  }, [bookings, searchQuery, statusFilter, priorityFilter])

  const loadUserAndBookings = async () => {
    try {
      const supabase = await getSupabaseClient()
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Please sign in to view bookings')
        return
      }
      
      setUser(user)
      
      // Load bookings for the provider
      const { data: bookingsData, error } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          priority,
          created_at,
          scheduled_date,
          notes,
          amount,
          client_id,
          service_id
        `)
        .eq('provider_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading bookings:', error)
        toast.error('Failed to load bookings')
        return
      }

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
          .select('id, name, description')
          .in('id', serviceIds)
        
        if (!servicesError) {
          servicesData = services || []
        }
      }

      if (error) {
        console.error('Error loading bookings:', error)
        toast.error('Failed to load bookings')
        return
      }

      // Transform the data to match our interface
      const transformedBookings = bookingsData?.map((booking: any) => {
        const client = clientsData.find(c => c.id === booking.client_id)
        const service = servicesData.find(s => s.id === booking.service_id)
        
        return {
          id: booking.id,
          status: booking.status,
          priority: booking.priority || 'normal',
          created_at: booking.created_at,
          scheduled_date: booking.scheduled_date,
          notes: booking.notes,
          amount: booking.amount,
          service: {
            name: service?.name || 'Unknown Service',
            description: service?.description
          },
          client: {
            full_name: client?.full_name || 'Unknown Client',
            email: client?.email || '',
            phone: client?.phone
          }
        }
      }) || []

      setBookings(transformedBookings)
      calculateStats(transformedBookings)
      setLoading(false)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to load bookings')
      setLoading(false)
    }
  }

  const calculateStats = (bookingsData: Booking[]) => {
    const stats = {
      total: bookingsData.length,
      pending: bookingsData.filter(b => b.status === 'pending').length,
      inProgress: bookingsData.filter(b => b.status === 'in_progress').length,
      completed: bookingsData.filter(b => b.status === 'completed').length,
      cancelled: bookingsData.filter(b => b.status === 'cancelled').length
    }
    setStats(stats)
  }

  const filterBookings = () => {
    let filtered = [...bookings]

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(booking =>
        booking.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.client.full_name.toLowerCase().includes(searchQuery.toLowerCase())
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

    setFilteredBookings(filtered)
    setCurrentPage(1) // Reset to first page when filtering
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-muted-foreground" />
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
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Bookings</CardTitle>
          <CardDescription>Manage your service bookings and track their progress</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID, service, or client..."
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

          {/* Bookings Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking ID</TableHead>
                  <TableHead>Service Name</TableHead>
                  <TableHead>Client Name</TableHead>
                  <TableHead>Booking Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentBookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No bookings found
                    </TableCell>
                  </TableRow>
                ) : (
                  currentBookings.map((booking) => (
                    <TableRow key={booking.id} className="hover:bg-gray-50">
                      <TableCell className="font-mono text-sm">{booking.id.slice(0, 8)}...</TableCell>
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
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewDetails(booking.id)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {indexOfFirstBooking + 1} to {Math.min(indexOfLastBooking, filteredBookings.length)} of {filteredBookings.length} results
              </p>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
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
