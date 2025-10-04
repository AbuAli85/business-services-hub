'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase-client'
import { useBookingProgressRealtime } from '@/hooks/useBookingProgressRealtime'
import { EnhancedBookingTable } from '@/components/dashboard/bookings/EnhancedBookingTable'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RefreshCw, Search, Filter, Plus, Calendar, Table, Grid } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface BookingData {
  id: string
  booking_title?: string
  service_title: string
  service_description?: string
  service_category?: string
  client_name: string
  client_email?: string
  client_company?: string
  client_avatar?: string
  provider_name: string
  provider_email?: string
  provider_company?: string
  provider_avatar?: string
  progress: number
  total_milestones: number
  completed_milestones: number
  raw_status: string
  approval_status?: string
  display_status: string
  payment_status: string
  invoice_status?: string
  amount_cents?: number
  amount?: number
  currency: string
  created_at: string
  updated_at?: string
  due_at?: string
  requirements?: string
  notes?: string
}

export default function BookingsPageNew() {
  const router = useRouter()
  const { user, userRole } = useAuth()
  const [bookings, setBookings] = useState<BookingData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [refreshing, setRefreshing] = useState(false)

  // Fetch bookings from the new unified view
  const fetchBookings = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const supabase = await getSupabaseClient()
      
      let query = supabase
        .from('v_booking_status')
        .select('*')
        .order('created_at', { ascending: false })

      // Apply role-based filtering
      if (userRole === 'client') {
        query = query.eq('client_id', user.id)
      } else if (userRole === 'provider') {
        query = query.eq('provider_id', user.id)
      }
      // Admin can see all bookings

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('display_status', statusFilter)
      }

      // Apply search filter
      if (searchQuery.trim()) {
        query = query.or(`service_title.ilike.%${searchQuery}%,client_name.ilike.%${searchQuery}%,booking_title.ilike.%${searchQuery}%`)
      }

      const { data, error: queryError } = await query

      if (queryError) {
        console.error('Error fetching bookings:', queryError)
        setError('Failed to load bookings')
        return
      }

      setBookings(data || [])
    } catch (err) {
      console.error('Error in fetchBookings:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }, [user, userRole, statusFilter, searchQuery])

  // Initial load
  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  // Realtime updates from milestones
  useBookingProgressRealtime({
    onUpdate: ({ booking_id, new_progress, new_status }) => {
      setBookings(prev => 
        prev.map(booking => 
          booking.id === booking_id 
            ? { 
                ...booking, 
                progress: new_progress || booking.progress,
                display_status: new_status || booking.display_status,
                updated_at: new Date().toISOString()
              }
            : booking
        )
      )
    },
    showToast: true,
    toastMessage: ({ booking_id, new_progress, new_status }) => {
      if (new_progress !== undefined) {
        return `Progress updated to ${new_progress}% for booking ${booking_id.slice(-6)}`
      }
      if (new_status) {
        return `Status changed to ${new_status} for booking ${booking_id.slice(-6)}`
      }
      return `Booking ${booking_id.slice(-6)} updated`
    }
  })

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchBookings()
    setRefreshing(false)
    toast.success('Bookings refreshed')
  }

  const handleViewDetails = (bookingId: string) => {
    router.push(`/dashboard/bookings/${bookingId}`)
  }

  const handleViewMilestones = (bookingId: string) => {
    router.push(`/dashboard/bookings/${bookingId}/milestones`)
  }

  const handleViewInvoice = (bookingId: string) => {
    router.push(`/dashboard/invoices?booking=${bookingId}`)
  }

  const handleMessageClient = (clientName: string) => {
    router.push(`/dashboard/messages?client=${encodeURIComponent(clientName)}`)
  }

  const handleCreateBooking = () => {
    router.push('/dashboard/bookings/create')
  }

  // Calculate summary stats
  const stats = {
    total: bookings.length,
    completed: bookings.filter(b => b.display_status === 'completed').length,
    inProgress: bookings.filter(b => b.display_status === 'in_progress').length,
    pending: bookings.filter(b => b.display_status === 'pending_review').length,
    totalRevenue: bookings.reduce((sum, b) => sum + (b.amount || 0), 0)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
            <p className="text-gray-600">Loading your bookings...</p>
          </div>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="text-gray-600">Manage your service bookings and track progress</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={handleCreateBooking}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Booking
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
              </div>
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <div className="h-4 w-4 bg-blue-500 rounded-full animate-pulse"></div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <div className="h-4 w-4 bg-green-500 rounded-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
              </div>
              <div className="h-8 w-8 bg-amber-100 rounded-full flex items-center justify-center">
                <div className="h-4 w-4 bg-amber-500 rounded-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search bookings, services, or clients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending_review">Pending Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                <Table className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              <span>{error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="ml-auto"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bookings Table */}
      <EnhancedBookingTable
        data={bookings}
        userRole={userRole}
        onViewDetails={handleViewDetails}
        onViewMilestones={handleViewMilestones}
        onViewInvoice={handleViewInvoice}
        onMessageClient={handleMessageClient}
      />
    </div>
  )
}
