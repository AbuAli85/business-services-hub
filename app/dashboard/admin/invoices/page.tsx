'use client'

import { useState, useMemo, useEffect } from 'react'
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
  RefreshCw,
  Receipt,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  ExternalLink,
  Download,
  Eye,
  Edit,
  Radio
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useDashboardData } from '@/hooks/useDashboardData'
import { useInvoicesRealtime } from '@/hooks/useAdminRealtime'
import { RealtimeNotifications } from '@/components/dashboard/RealtimeNotifications'
import { formatCurrency } from '@/lib/dashboard-data'
import { toast } from 'sonner'

export default function AdminInvoicesPage() {
  const router = useRouter()
  const { bookings, invoices, loading, error, refresh } = useDashboardData()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [hasRecentUpdate, setHasRecentUpdate] = useState(false)
  
  // Real-time subscription for invoices
  const { isConnected: realtimeConnected, lastUpdate } = useInvoicesRealtime((update) => {
    // Show visual indicator for new updates
    setHasRecentUpdate(true)
    setTimeout(() => setHasRecentUpdate(false), 3000)
    
    // Auto-refresh data when invoice changes
    refresh()
    
    // Show notification for important updates
    if (update.event === 'INSERT') {
      toast.success('New invoice created')
    } else if (update.event === 'UPDATE' && update.record?.status === 'paid') {
      toast.success('Invoice marked as paid')
    }
  })
  
  // Clear hasRecentUpdate after 3 seconds
  useEffect(() => {
    if (hasRecentUpdate) {
      const timer = setTimeout(() => setHasRecentUpdate(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [hasRecentUpdate])

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter(invoice => {
      const searchLower = (searchQuery || '').toLowerCase()
      const matchesSearch = searchQuery === '' || 
        (invoice.clientName?.toLowerCase() ?? '').includes(searchLower) ||
        (invoice.providerName?.toLowerCase() ?? '').includes(searchLower) ||
        (invoice.serviceTitle?.toLowerCase() ?? '').includes(searchLower)
      
      const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter
      
      return matchesSearch && matchesStatus
    })
  }, [invoices, searchQuery, statusFilter])

  // Get booking for an invoice
  const getBookingForInvoice = (bookingId: string) => {
    return bookings.find(booking => booking.id === bookingId)
  }

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: 'Draft', className: 'text-gray-600 border-gray-200 bg-gray-50' },
      sent: { label: 'Sent', className: 'text-yellow-600 border-yellow-200 bg-yellow-50' },
      paid: { label: 'Paid', className: 'text-green-600 border-green-200 bg-green-50' },
      overdue: { label: 'Overdue', className: 'text-red-600 border-red-200 bg-red-50' },
      cancelled: { label: 'Cancelled', className: 'text-gray-600 border-gray-200 bg-gray-50' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft
    
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    )
  }

  // Calculate statistics
  const stats = useMemo(() => {
    const total = invoices.length
    const paid = invoices.filter(i => i.status === 'paid').length
    const sent = invoices.filter(i => i.status === 'sent').length
    const totalRevenue = invoices
      .filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + i.amount, 0)
    const pendingRevenue = invoices
      .filter(i => i.status === 'sent')
      .reduce((sum, i) => sum + i.amount, 0)

    return { total, paid, sent, totalRevenue, pendingRevenue }
  }, [invoices])

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
          <p className="text-red-600 mb-4">Error loading invoices</p>
          <Button onClick={refresh}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-8 text-white transition-all duration-300 ${hasRecentUpdate ? 'ring-4 ring-yellow-400' : ''}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold">Invoice Management</h1>
              {realtimeConnected && (
                <Badge className="bg-green-500/20 text-white border-white/30">
                  <Radio className="h-3 w-3 mr-1 animate-pulse" />
                  Live
                </Badge>
              )}
            </div>
            <p className="text-purple-100 text-lg mb-4">
              Manage invoices with integrated booking tracking and payment status
            </p>
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center">
                <Receipt className="h-4 w-4 mr-1" />
                <span>Total: {stats.total} invoices</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-1" />
                <span>Paid: {stats.paid}</span>
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                <span>Pending: {stats.sent}</span>
              </div>
              <div className="flex items-center">
                <DollarSign className="h-4 w-4 mr-1" />
                <span>Revenue: {formatCurrency(stats.totalRevenue)}</span>
              </div>
              {lastUpdate && (
                <div className="flex items-center text-xs opacity-75">
                  <Clock className="h-3 w-3 mr-1" />
                  <span>Updated: {lastUpdate.toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <RealtimeNotifications />
            <Button 
              variant="secondary"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={refresh}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Receipt className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Total Invoices</p>
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
                <p className="text-sm font-medium">Paid</p>
                <p className="text-2xl font-bold">{stats.paid}</p>
                <p className="text-xs text-green-600">
                  {stats.total > 0 ? ((stats.paid / stats.total) * 100).toFixed(1) : 0}% paid
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <div>
                <p className="text-sm font-medium">Pending</p>
                <p className="text-2xl font-bold">{stats.sent}</p>
                <p className="text-xs text-yellow-600">
                  {formatCurrency(stats.pendingRevenue)} pending
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-purple-600" />
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
                placeholder="Search invoices..."
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
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
          <CardDescription>Manage invoices with integrated booking tracking and payment status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Booking</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.length > 0 ? (
                  filteredInvoices.map((invoice) => {
                    const booking = getBookingForInvoice(invoice.bookingId)
                    
                    return (
                      <TableRow key={invoice.id}>
                        <TableCell>
                          <div className="font-medium">#{invoice.id}</div>
                          <div className="text-sm text-gray-500">
                            Due: {new Date(invoice.dueAt).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{invoice.clientName ?? 'N/A'}</div>
                          <div className="text-sm text-gray-500">ID: {invoice.clientId ?? 'N/A'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{invoice.providerName ?? 'N/A'}</div>
                          <div className="text-sm text-gray-500">ID: {invoice.providerId ?? 'N/A'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{invoice.serviceTitle ?? 'N/A'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{formatCurrency(invoice.amount, invoice.currency)}</div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(invoice.status)}
                        </TableCell>
                        <TableCell>
                          {booking ? (
                            <div className="flex items-center space-x-2">
                              <Badge 
                                variant="outline" 
                                className={
                                  booking.status === 'completed' 
                                    ? 'text-green-600 border-green-200 bg-green-50'
                                    : booking.status === 'in_progress'
                                    ? 'text-blue-600 border-blue-200 bg-blue-50'
                                    : 'text-gray-600 border-gray-200 bg-gray-50'
                                }
                              >
                                {booking.status}
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => router.push(`/dashboard/bookings/${booking.id}`)}
                              >
                                <Calendar className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">No booking</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(invoice.issuedAt).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(invoice.issuedAt).toLocaleTimeString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/dashboard/invoices/${invoice.id}`)}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/dashboard/invoices/${invoice.id}/edit`)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            {booking && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => router.push(`/dashboard/bookings/${booking.id}`)}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                try {
                                  // Generate invoice CSV
                                  const csvData = [
                                    ['Invoice ID', invoice.id],
                                    ['Client', invoice.clientName || 'N/A'],
                                    ['Provider', invoice.providerName || 'N/A'],
                                    ['Service', invoice.serviceTitle || 'N/A'],
                                    ['Amount', `${invoice.currency} ${invoice.amount}`],
                                    ['Status', invoice.status],
                                    ['Issued', new Date(invoice.issuedAt).toLocaleDateString()],
                                    ['Due', new Date(invoice.dueAt).toLocaleDateString()]
                                  ]
                                  
                                  const csv = csvData.map(row => row.join(',')).join('\n')
                                  const blob = new Blob([csv], { type: 'text/csv' })
                                  const url = window.URL.createObjectURL(blob)
                                  const a = document.createElement('a')
                                  a.href = url
                                  a.download = `invoice-${invoice.id}-${Date.now()}.csv`
                                  document.body.appendChild(a)
                                  a.click()
                                  document.body.removeChild(a)
                                  window.URL.revokeObjectURL(url)
                                  
                                  toast.success('Invoice downloaded')
                                } catch (err) {
                                  console.error('Download error:', err)
                                  toast.error('Failed to download invoice')
                                }
                              }}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="flex flex-col items-center space-y-2">
                        <Receipt className="h-12 w-12 text-gray-400" />
                        <p className="text-gray-500">No invoices found</p>
                        <p className="text-sm text-gray-400">
                          {searchQuery || statusFilter !== 'all'
                            ? 'Try adjusting your filters'
                            : 'Invoices will appear here when created'}
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
