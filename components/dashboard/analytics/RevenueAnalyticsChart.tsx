'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts'
import { DollarSign, TrendingUp, TrendingDown, PieChart as PieChartIcon, BarChart3 } from 'lucide-react'

interface RevenueAnalytic {
  status: string
  booking_count: number
  total_revenue: number
  avg_booking_value: number
  revenue_last_30_days: number
  revenue_trend: number
}

interface RevenueAnalyticsChartProps {
  className?: string
}

const STATUS_COLORS = {
  completed: '#10b981',
  in_progress: '#f59e0b',
  pending: '#6b7280',
  cancelled: '#ef4444',
  approved: '#3b82f6',
  declined: '#8b5cf6'
}

const STATUS_LABELS = {
  completed: 'Completed',
  in_progress: 'In Progress',
  pending: 'Pending',
  cancelled: 'Cancelled',
  approved: 'Approved',
  declined: 'Declined'
}

export function RevenueAnalyticsChart({ className }: RevenueAnalyticsChartProps) {
  const [analytics, setAnalytics] = useState<RevenueAnalytic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [daysBack, setDaysBack] = useState(90)
  const [chartType, setChartType] = useState<'pie' | 'bar' | 'line'>('pie')

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/analytics/revenue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          days_back: daysBack
        })
      })

      if (!response.ok) {
        throw new Error('Failed to fetch revenue analytics')
      }

      const data = await response.json()
      setAnalytics(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching revenue analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [daysBack])

  const totalRevenue = analytics.reduce((sum, item) => sum + item.total_revenue, 0)
  const totalBookings = analytics.reduce((sum, item) => sum + item.booking_count, 0)
  const avgBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0

  const pieData = analytics.map(item => ({
    name: STATUS_LABELS[item.status as keyof typeof STATUS_LABELS] || item.status,
    value: item.total_revenue,
    count: item.booking_count,
    percentage: totalRevenue > 0 ? (item.total_revenue / totalRevenue) * 100 : 0,
    color: STATUS_COLORS[item.status as keyof typeof STATUS_COLORS] || '#6b7280'
  }))

  const barData = analytics.map(item => ({
    status: STATUS_LABELS[item.status as keyof typeof STATUS_LABELS] || item.status,
    revenue: item.total_revenue,
    bookings: item.booking_count,
    avg_value: item.avg_booking_value,
    trend: item.revenue_trend
  }))

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-green-500" />
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-red-500" />
    return <div className="h-4 w-4" />
  }

  const getTrendColor = (trend: number) => {
    if (trend > 0) return 'text-green-600'
    if (trend < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-blue-600">Revenue: ${data.value?.toLocaleString() || data.revenue?.toLocaleString()}</p>
          {data.count && <p className="text-gray-600">Bookings: {data.count}</p>}
          {data.percentage && <p className="text-gray-600">Share: {data.percentage.toFixed(1)}%</p>}
          {data.trend !== undefined && (
            <p className={getTrendColor(data.trend)}>
              Trend: {data.trend > 0 ? '+' : ''}{data.trend.toFixed(1)}%
            </p>
          )}
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Revenue Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Revenue Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-600 py-8">
            <p>Error loading analytics: {error}</p>
            <button 
              onClick={fetchAnalytics}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Revenue Analytics
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={chartType} onValueChange={(value: 'pie' | 'bar' | 'line') => setChartType(value)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pie">Pie</SelectItem>
                <SelectItem value="bar">Bar</SelectItem>
                <SelectItem value="line">Line</SelectItem>
              </SelectContent>
            </Select>
            <Select value={daysBack.toString()} onValueChange={(value) => setDaysBack(parseInt(value))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30d</SelectItem>
                <SelectItem value="90">90d</SelectItem>
                <SelectItem value="180">180d</SelectItem>
                <SelectItem value="365">1y</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">${totalRevenue.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Total Revenue</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{totalBookings}</div>
            <div className="text-sm text-gray-600">Total Bookings</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">${avgBookingValue.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Avg Booking Value</div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'pie' ? (
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} (${percentage.toFixed(1)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            ) : chartType === 'bar' ? (
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="status" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="revenue" fill="#3b82f6" name="Revenue ($)" />
                <Bar dataKey="bookings" fill="#10b981" name="Bookings" />
              </BarChart>
            ) : (
              <LineChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="status" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Revenue ($)"
                />
                <Line 
                  type="monotone" 
                  dataKey="bookings" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Bookings"
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Status Breakdown */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          {analytics.map((item) => (
            <div key={item.status} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: STATUS_COLORS[item.status as keyof typeof STATUS_COLORS] || '#6b7280' }}
                />
                <div>
                  <div className="font-medium">
                    {STATUS_LABELS[item.status as keyof typeof STATUS_LABELS] || item.status}
                  </div>
                  <div className="text-sm text-gray-600">
                    {item.booking_count} bookings
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-green-600">
                  ${item.total_revenue.toLocaleString()}
                </div>
                <div className="flex items-center gap-1 text-sm">
                  {getTrendIcon(item.revenue_trend)}
                  <span className={getTrendColor(item.revenue_trend)}>
                    {item.revenue_trend > 0 ? '+' : ''}{item.revenue_trend.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
