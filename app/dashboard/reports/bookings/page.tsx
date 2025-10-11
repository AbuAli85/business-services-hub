'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { 
  Search, 
  Filter, 
  Download, 
  FileText, 
  Calendar as CalendarIcon,
  TrendingUp,
  DollarSign,
  Target,
  Clock,
  Eye,
  RefreshCw
} from 'lucide-react'
import { formatMuscat } from '@/lib/dates'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { BookingReportDetail } from '@/components/reports/BookingReportDetail'
import { apiRequest } from '@/lib/api-utils'

interface BookingSummary {
  id: string
  title: string
  status: string
  client_name: string
  provider_name: string
  service_title: string
  progress: number
  amount: number
  currency: string
  created_at: string
  due_at?: string
  // Additional properties for compatibility
  booking_title?: string
  total_amount?: number
}

interface ReportSummary {
  total_bookings: number
  total_revenue: number
  average_progress: number
  period: {
    from: string | null
    to: string | null
  }
}

interface StatusBreakdown {
  [key: string]: number
}

interface CategoryBreakdown {
  [key: string]: number
}

interface MonthlyBreakdown {
  [key: string]: {
    count: number
    revenue: number
  }
}

interface SummaryReportData {
  summary: ReportSummary
  breakdown: {
    by_status: StatusBreakdown
    by_category: CategoryBreakdown
    by_month: MonthlyBreakdown
  }
  bookings: BookingSummary[]
}

export default function BookingReportsPage() {
  const { user, userRole } = useAuth()
  const [loading, setLoading] = useState(false)
  const [summaryData, setSummaryData] = useState<SummaryReportData | null>(null)
  
  // Safe getter for summaryData
  const safeSummaryData = summaryData || {
    summary: {
      total_bookings: 0,
      total_revenue: 0,
      average_progress: 0,
      period: { from: null, to: null }
    },
    breakdown: {
      by_status: {},
      by_category: {},
      by_month: {}
    },
    bookings: []
  }
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null)
  const [detailedReport, setDetailedReport] = useState<any>(null)
  const [showDetailedReport, setShowDetailedReport] = useState(false)
  
  // Filters
  const [dateFrom, setDateFrom] = useState<Date | undefined>()
  const [dateTo, setDateTo] = useState<Date | undefined>()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const loadSummaryReport = async () => {
    if (!user) return

    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (dateFrom) params.append('date_from', dateFrom.toISOString())
      if (dateTo) params.append('date_to', dateTo.toISOString())
      if (statusFilter !== 'all') params.append('status', statusFilter)

      const response = await apiRequest(`/api/reports/bookings?${params}`)
      const data = await response.json()

      if (data.success) {
        // Ensure the report data has the expected structure
        const bookings = (data.report.bookings || []).map((booking: any) => ({
          id: booking.id || '',
          title: booking.title || booking.booking_title || booking.service_title || 'Untitled Booking',
          status: booking.status || 'unknown',
          client_name: booking.client_name || 'Unknown Client',
          provider_name: booking.provider_name || 'Unknown Provider',
          service_title: booking.service_title || booking.title || 'Untitled Service',
          progress: booking.progress || 0,
          amount: booking.amount || booking.total_amount || 0,
          currency: booking.currency || 'OMR',
          created_at: booking.created_at || new Date().toISOString(),
          due_at: booking.due_at || null
        }))
        
        const reportData = {
          ...data.report,
          bookings: bookings
        }
        setSummaryData(reportData)
      } else {
        toast.error('Failed to load reports')
      }
    } catch (error) {
      console.error('Error loading reports:', error)
      // Set empty data structure to prevent crashes
      setSummaryData({
        summary: {
          total_bookings: 0,
          total_revenue: 0,
          average_progress: 0,
          period: { from: null, to: null }
        },
        breakdown: {
          by_status: {},
          by_category: {},
          by_month: {}
        },
        bookings: []
      })
      toast.error('Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  const loadDetailedReport = async (bookingId: string) => {
    setLoading(true)
    try {
      const response = await apiRequest(`/api/reports/bookings?booking_id=${bookingId}&type=detailed`)
      const data = await response.json()

      if (data.success) {
        setDetailedReport(data.report)
        setShowDetailedReport(true)
      } else {
        toast.error('Failed to load detailed report')
      }
    } catch (error) {
      console.error('Error loading detailed report:', error)
      toast.error('Failed to load detailed report')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format: 'pdf' | 'excel') => {
    try {
      const params = new URLSearchParams()
      if (dateFrom) params.append('date_from', dateFrom.toISOString())
      if (dateTo) params.append('date_to', dateTo.toISOString())
      if (statusFilter !== 'all') params.append('status', statusFilter)
      params.append('format', format)

      const response = await apiRequest(`/api/reports/bookings?${params}`)
      const blob = await response.blob()
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `booking-reports-${new Date().toISOString().split('T')[0]}.${format === 'pdf' ? 'pdf' : 'xlsx'}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success(`Report exported as ${format.toUpperCase()}`)
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export report')
    }
  }

  useEffect(() => {
    loadSummaryReport()
  }, [user, dateFrom, dateTo, statusFilter])

  if (showDetailedReport && detailedReport) {
    return (
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => setShowDetailedReport(false)}
            className="mb-4"
          >
            ← Back to Reports
          </Button>
        </div>
        <BookingReportDetail 
          data={detailedReport}
          onExport={handleExport}
          onPrint={() => window.print()}
          onShare={() => navigator.share?.({ title: 'Booking Report', url: window.location.href })}
        />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Booking Reports</h1>
          <p className="text-gray-600 mt-2">
            Comprehensive reports and analytics for your bookings
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => loadSummaryReport()}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={() => handleExport('pdf')} disabled={loading}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="outline" onClick={() => handleExport('excel')} disabled={loading}>
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Search Bookings</label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by title, client, or provider..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">From Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full mt-1 justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? formatMuscat(dateFrom.toISOString()) : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">To Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full mt-1 justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? formatMuscat(dateTo.toISOString()) : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {safeSummaryData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{safeSummaryData.summary.total_bookings}</div>
              <p className="text-xs text-muted-foreground">
                {safeSummaryData.summary.period.from && safeSummaryData.summary.period.to
                  ? `${formatMuscat(safeSummaryData.summary.period.from)} - ${formatMuscat(safeSummaryData.summary.period.to)}`
                  : 'All time'
                }
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(safeSummaryData.summary.total_revenue, 'USD')}
              </div>
              <p className="text-xs text-muted-foreground">
                Average: {formatCurrency(safeSummaryData.summary.total_revenue / Math.max(safeSummaryData.summary.total_bookings, 1), 'USD')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Progress</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{safeSummaryData.summary.average_progress.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                Across all active bookings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {safeSummaryData.breakdown.by_status.completed || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {safeSummaryData.summary.total_bookings > 0 
                  ? ((safeSummaryData.breakdown.by_status.completed || 0) / safeSummaryData.summary.total_bookings * 100).toFixed(1)
                  : 0
                }% of total bookings
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status Breakdown */}
      {safeSummaryData && (
        <Card>
          <CardHeader>
            <CardTitle>Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(safeSummaryData.breakdown.by_status).map(([status, count]) => (
                <div key={status} className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{count}</div>
                  <Badge variant="secondary" className="mt-2">
                    {status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bookings List */}
      {safeSummaryData && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            {!safeSummaryData.bookings || safeSummaryData.bookings.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">No bookings found</p>
                <p className="text-sm">Try adjusting your filters or date range</p>
              </div>
            ) : (
            <div className="space-y-4">
              {(() => {
                try {
                  return (safeSummaryData.bookings || [])
                    .filter(booking => {
                      // Comprehensive safety check
                      if (!booking || typeof booking !== 'object' || !booking.id) return false
                      
                      // Ensure all required properties exist with fallbacks
                      const safeBooking = {
                        id: booking.id || '',
                        title: booking.title || booking.booking_title || booking.service_title || 'Untitled Booking',
                        service_title: booking.service_title || booking.title || 'Untitled Service',
                        client_name: booking.client_name || 'Unknown Client',
                        provider_name: booking.provider_name || 'Unknown Provider',
                        status: booking.status || 'unknown',
                        amount: booking.amount || booking.total_amount || 0,
                        currency: booking.currency || 'OMR',
                        progress: booking.progress || 0,
                        created_at: booking.created_at || new Date().toISOString(),
                        due_at: booking.due_at || null
                      }
                      
                      // Replace the booking object with the safe version
                      Object.assign(booking, safeBooking)
                      
                      return true
                    })
                    .filter(booking => 
                      searchQuery === '' || 
                      (booking.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (booking.service_title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (booking.client_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (booking.provider_name || '').toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((booking) => booking && typeof booking === 'object' ? (
                <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium">{booking.title || booking.service_title || 'Untitled Booking'}</h3>
                      <Badge variant="secondary">{booking.status || 'unknown'}</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Client:</span> {booking.client_name || 'Unknown Client'}
                      </div>
                      <div>
                        <span className="font-medium">Provider:</span> {booking.provider_name || 'Unknown Provider'}
                      </div>
                      <div>
                        <span className="font-medium">Amount:</span> {formatCurrency(booking.amount || 0, booking.currency || 'OMR')}
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>Progress: {booking.progress || 0}%</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${booking.progress || 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadDetailedReport(booking.id)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Report
                    </Button>
                  </div>
                </div>
              ) : null)
                } catch (error) {
                  console.error('Error rendering bookings:', error)
                  return (
                    <div className="text-center py-12 text-red-500">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-red-300" />
                      <p className="text-lg font-medium mb-2">Error displaying bookings</p>
                      <p className="text-sm">Please refresh the page and try again</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => window.location.reload()}
                        className="mt-4"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh Page
                      </Button>
                    </div>
                  )
                }
              })()}
            </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
