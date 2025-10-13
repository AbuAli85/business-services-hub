'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDashboardData } from '@/hooks/useDashboardData'
import { useAdminRealtime } from '@/hooks/useAdminRealtime'
import { formatCurrency } from '@/lib/dashboard-data'
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Calendar, 
  DollarSign, 
  Building2,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Award,
  Clock,
  Radio,
  RefreshCw
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { RealtimeAnalytics } from '@/components/dashboard/RealtimeAnalytics'
import { RealtimeNotifications } from '@/components/dashboard/RealtimeNotifications'

export default function AdminAnalyticsPage() {
  const { metrics, bookings, invoices, users, services, loading, error, refresh } = useDashboardData()
  const [timeRange, setTimeRange] = useState('30')
  const [selectedMetric, setSelectedMetric] = useState('overview')
  const [hasRecentUpdate, setHasRecentUpdate] = useState(false)

  // Real-time subscription for all analytics data
  const { status: realtimeStatus, lastUpdate } = useAdminRealtime({
    enableUsers: true,
    enableServices: true,
    enableBookings: true,
    enableInvoices: true,
    enablePermissions: false,
    enableVerifications: false,
    debounceMs: 2000,
    showToasts: false
  })

  // Auto-refresh on real-time updates
  useEffect(() => {
    if (lastUpdate) {
      setHasRecentUpdate(true)
      refresh()
      setTimeout(() => setHasRecentUpdate(false), 3000)
    }
  }, [lastUpdate, refresh])

  // Calculate derived metrics from centralized data
  const totalRevenue = invoices
    .filter(invoice => invoice.status === 'paid')
    .reduce((sum, invoice) => sum + invoice.amount, 0)

  const completedBookings = bookings.filter(booking => booking.status === 'completed').length
  const completionRate = bookings.length > 0 ? (completedBookings / bookings.length) * 100 : 0

  const topCategories = services.reduce((acc, service) => {
    const category = service.category
    if (!acc[category]) {
      acc[category] = { name: category, count: 0, percentage: 0 }
    }
    acc[category].count++
    return acc
  }, {} as Record<string, { name: string; count: number; percentage: number }>)

  // Calculate percentages
  Object.values(topCategories).forEach(category => {
    category.percentage = (category.count / services.length) * 100
  })

  const topCategoriesArray = Object.values(topCategories)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const recentActivity = bookings
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 4)
    .map(booking => ({
      type: 'booking_completion' as const,
      description: `Booking completed: ${booking.serviceTitle}`,
      timestamp: booking.updatedAt,
      impact: 'positive' as const
    }))

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
          <p className="text-red-600 mb-4">Error loading analytics data</p>
          <Button onClick={refresh}>Retry</Button>
        </div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No analytics data available</p>
          <Button onClick={refresh}>Refresh</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className={`bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-8 text-white transition-all duration-300 ${hasRecentUpdate ? 'ring-4 ring-yellow-400' : ''}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold">Analytics Dashboard</h1>
              {realtimeStatus.connected && (
                <Badge className="bg-green-500/20 text-white border-white/30">
                  <Radio className="h-3 w-3 mr-1 animate-pulse" />
                  Live
                </Badge>
              )}
            </div>
            <p className="text-purple-100 text-lg mb-4">
              Real-time business intelligence and performance insights
            </p>
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-1" />
                <span>Users: {metrics.totalUsers}</span>
              </div>
              <div className="flex items-center">
                <DollarSign className="h-4 w-4 mr-1" />
                <span>Revenue: {formatCurrency(totalRevenue)}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                <span>Bookings: {metrics.totalBookings}</span>
              </div>
              <div className="flex items-center">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span>Growth: +{metrics.revenueGrowth.toFixed(1)}%</span>
              </div>
              {lastUpdate && (
                <div className="flex items-center text-xs opacity-75">
                  <RefreshCw className="h-3 w-3 mr-1" />
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
              onClick={() => {
                // Generate CSV export
                const csvData = [
                  ['Metric', 'Value'],
                  ['Total Users', metrics.totalUsers],
                  ['Total Revenue', totalRevenue],
                  ['Total Bookings', metrics.totalBookings],
                  ['Total Services', metrics.totalServices],
                  ['User Growth', `${metrics.userGrowth}%`],
                  ['Revenue Growth', `${metrics.revenueGrowth}%`],
                  ['Booking Growth', `${metrics.bookingGrowth}%`],
                  ['Service Growth', `${metrics.serviceGrowth}%`],
                  ['Completion Rate', `${completionRate.toFixed(1)}%`]
                ]
                const csv = csvData.map(row => row.join(',')).join('\n')
                const blob = new Blob([csv], { type: 'text/csv' })
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.csv`
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                window.URL.revokeObjectURL(url)
              }}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>
      </div>

      {/* Real-time Analytics Dashboard */}
      <RealtimeAnalytics className="mb-8" />

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Total Users</p>
                <p className="text-2xl font-bold">{metrics.totalUsers}</p>
                <p className="text-xs text-green-600">+{metrics.userGrowth.toFixed(1)}% this month</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
                <p className="text-xs text-green-600">+{metrics.revenueGrowth.toFixed(1)}% this month</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Total Bookings</p>
                <p className="text-2xl font-bold">{metrics.totalBookings}</p>
                <p className="text-xs text-green-600">+{metrics.bookingGrowth.toFixed(1)}% this month</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm font-medium">Total Services</p>
                <p className="text-2xl font-bold">{metrics.totalServices}</p>
                <p className="text-xs text-green-600">+{metrics.serviceGrowth.toFixed(1)}% this month</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Services & User Roles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Top Service Categories
            </CardTitle>
            <CardDescription>Most popular service categories by booking count</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topCategoriesArray.map((category, index) => (
                <div key={category.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium">{category.name}</p>
                      <p className="text-sm text-gray-500">{category.count} services</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{category.percentage.toFixed(1)}%</p>
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${category.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Distribution
            </CardTitle>
            <CardDescription>Breakdown of users by role</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium">Clients</span>
                </div>
                <span className="font-medium">{users.filter(u => u.role === 'client').length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium">Providers</span>
                </div>
                <span className="font-medium">{users.filter(u => u.role === 'provider').length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-sm font-medium">Admins</span>
                </div>
                <span className="font-medium">{users.filter(u => u.role === 'admin').length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Performance Metrics
          </CardTitle>
          <CardDescription>Key performance indicators and completion rates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{completionRate.toFixed(1)}%</div>
              <p className="text-sm text-gray-600">Completion Rate</p>
              <p className="text-xs text-gray-500">{completedBookings} of {bookings.length} bookings completed</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{bookings.length}</div>
              <p className="text-sm text-gray-600">Total Bookings</p>
              <p className="text-xs text-gray-500">All time platform bookings</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{services.length}</div>
              <p className="text-sm text-gray-600">Active Services</p>
              <p className="text-xs text-gray-500">Available on platform</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>Latest system events and updates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs text-green-600 border-green-200 bg-green-50">
                    {activity.impact}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No recent activity</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}