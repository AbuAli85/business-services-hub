'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { RefreshCw, TrendingUp, Users, DollarSign, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface BookingStats {
  total: number
  active: number
  pending: number
  completed: number
  cancelled: number
  disputed: number
  revenue: {
    total: number
    completed: number
    pending: number
  }
  progress: {
    average: number
    milestone_average: number
  }
  rates: {
    success: number
    portfolio: number
  }
  milestones: {
    bookings_with_milestones: number
  }
}

interface Booking {
  id: string
  booking_number: string
  service_title: string
  client_name: string
  provider_name: string
  status: string
  normalized_status: string
  total_amount: number
  currency: string
  revenue_status: string
  progress_percentage: number
  progress_status: string
  milestone_count: number
  completed_milestones: number
  rating: number | null
  rating_text: string
  created_at: string
  updated_at: string
}

interface DashboardData {
  stats: BookingStats
  bookings: Booking[]
  last_updated: string
}

export default function BookingDashboardImproved() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true)
      const response = await fetch('/api/dashboard/bookings')
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch dashboard data')
      }

      setData(result.data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'approved': return 'bg-yellow-100 text-yellow-800'
      case 'pending_approval': return 'bg-orange-100 text-orange-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'disputed': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getProgressColor = (percentage: number) => {
    if (percentage === 0) return 'bg-gray-200'
    if (percentage < 30) return 'bg-red-500'
    if (percentage < 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading dashboard...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchDashboardData} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">No data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bookings Dashboard</h1>
          <p className="text-gray-600">
            Last updated: {new Date(data.last_updated).toLocaleString()}
          </p>
        </div>
        <Button 
          onClick={fetchDashboardData} 
          disabled={refreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {data.stats.active} active, {data.stats.pending} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.stats.revenue.total, 'OMR')}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(data.stats.revenue.completed, 'OMR')} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.rates.success}%</div>
            <p className="text-xs text-muted-foreground">
              {data.stats.completed} completed out of {data.stats.total}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.rates.portfolio}%</div>
            <p className="text-xs text-muted-foreground">
              Active projects
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Progress Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Average Progress</span>
              <span className="text-sm text-muted-foreground">
                {data.stats.progress.average}%
              </span>
            </div>
            <Progress 
              value={data.stats.progress.average} 
              className="h-2"
            />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Milestone Progress</span>
              <span className="text-sm text-muted-foreground">
                {data.stats.progress.milestone_average}%
              </span>
            </div>
            <Progress 
              value={data.stats.progress.milestone_average} 
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Bookings List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {data.bookings.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No bookings yet
              </h3>
              <p className="text-gray-600 mb-4">
                You don't have any bookings yet. Create a service to start receiving client bookings.
              </p>
              <Button>
                Create Service
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {data.bookings.map((booking) => (
                <div key={booking.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium">{booking.booking_number}</h3>
                      <Badge className={getStatusColor(booking.normalized_status)}>
                        {booking.normalized_status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {formatCurrency(booking.total_amount, booking.currency)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {booking.revenue_status}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-2">
                    <p className="text-sm text-gray-600">
                      <strong>Service:</strong> {booking.service_title}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Client:</strong> {booking.client_name}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">Progress:</span>
                        <span className="text-sm text-muted-foreground">
                          {booking.progress_percentage}%
                        </span>
                      </div>
                      <div className="w-24">
                        <Progress 
                          value={booking.progress_percentage} 
                          className={`h-2 ${getProgressColor(booking.progress_percentage)}`}
                        />
                      </div>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      {booking.completed_milestones}/{booking.milestone_count} milestones
                    </div>
                  </div>
                  
                  <div className="mt-2 text-xs text-gray-500">
                    Updated: {new Date(booking.updated_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
