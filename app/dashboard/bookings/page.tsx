'use client'

import { useState, useMemo } from 'react'
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
  TrendingUp,
  Target,
  Receipt,
  ExternalLink
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useDashboardData } from '@/hooks/useDashboardData'
import { formatCurrency } from '@/lib/dashboard-data'
import toast from 'react-hot-toast'

export default function BookingsPage() {
  const router = useRouter()
  const { bookings, invoices, loading, error, refresh } = useDashboardData()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedBookings, setSelectedBookings] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)

  // Filter and sort bookings
  const filteredBookings = useMemo(() => {
    let filtered = bookings.filter(booking => {
      const matchesSearch = searchQuery === '' || 
        booking.serviceTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.providerName.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || booking.status === statusFilter
      
      return matchesSearch && matchesStatus
    })

    // Sort bookings
    filtered.sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortBy) {
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime()
          bValue = new Date(b.createdAt).getTime()
          break
        case 'totalAmount':
          aValue = a.totalAmount
          bValue = b.totalAmount
          break
        case 'serviceTitle':
          aValue = a.serviceTitle
          bValue = b.serviceTitle
          break
        case 'clientName':
          aValue = a.clientName
          bValue = b.clientName
          break
        default:
          aValue = new Date(a.createdAt).getTime()
          bValue = new Date(b.createdAt).getTime()
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    return filtered
  }, [bookings, searchQuery, statusFilter, sortBy, sortOrder])

  // Get invoice for a booking
  const getInvoiceForBooking = (bookingId: string) => {
    return invoices.find(invoice => invoice.bookingId === bookingId)
  }

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
    const total = bookings.length
    const completed = bookings.filter(b => b.status === 'completed').length
    const inProgress = bookings.filter(b => b.status === 'in_progress').length
    const pending = bookings.filter(b => b.status === 'pending').length
    const totalRevenue = bookings
      .filter(b => b.status === 'completed')
      .reduce((sum, b) => sum + b.totalAmount, 0)
    const avgCompletionTime = 7.2 // Mock data

    return { total, completed, inProgress, pending, totalRevenue, avgCompletionTime }
  }, [bookings])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading bookings</p>
          <Button onClick={refresh}>Retry</Button>
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
            <h1 className="text-4xl font-bold mb-2">Bookings Management</h1>
            <p className="text-green-100 text-lg mb-4">
              Manage and track all service bookings with integrated invoice tracking
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
              onClick={refresh}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button 
              variant="secondary"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={() => router.push('/dashboard/bookings/create')}
            >
              <Calendar className="h-4 w-4 mr-2" />
              New Booking
            </Button>
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
                  <TableHead>Client</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.length > 0 ? (
                  filteredBookings.map((booking) => {
                    const invoice = getInvoiceForBooking(booking.id)
                    
                    return (
                      <TableRow key={booking.id}>
                        <TableCell>
                          <div className="font-medium">{booking.serviceTitle}</div>
                          <div className="text-sm text-gray-500">ID: {booking.id}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{booking.clientName}</div>
                          <div className="text-sm text-gray-500">Client ID: {booking.clientId}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{booking.providerName}</div>
                          <div className="text-sm text-gray-500">Provider ID: {booking.providerId}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{formatCurrency(booking.totalAmount, booking.currency)}</div>
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
                                onClick={() => router.push(`/dashboard/invoices/${invoice.id}`)}
                              >
                                <Receipt className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">No invoice</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(booking.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(booking.createdAt).toLocaleTimeString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/dashboard/bookings/${booking.id}`)}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/dashboard/bookings/${booking.id}/edit`)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            {invoice && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => router.push(`/dashboard/invoices/${invoice.id}`)}
                              >
                                <ExternalLink className="h-3 w-3" />
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
                            : 'Bookings will appear here when created'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}