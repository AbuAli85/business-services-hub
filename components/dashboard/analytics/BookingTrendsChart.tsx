'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts'
import { TrendingUp, TrendingDown, Calendar, BarChart3 } from 'lucide-react'

interface BookingTrend {
  period_start: string
  period_end: string
  total_bookings: number
  completed_bookings: number
  in_progress_bookings: number
  pending_bookings: number
  cancelled_bookings: number
  avg_progress: number
  total_revenue: number
  completed_revenue: number
  completion_rate: number
}

interface BookingTrendsChartProps {
  className?: string
}

export function BookingTrendsChart({ className }: BookingTrendsChartProps) {
  const [trends, setTrends] = useState<BookingTrend[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [daysBack, setDaysBack] = useState(30)
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day')
  const [chartType, setChartType] = useState<'line' | 'bar'>('line')

  const fetchTrends = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/analytics/booking-trends', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          days_back: daysBack,
          group_by: groupBy
        })
      })

      if (!response.ok) {
        throw new Error('Failed to fetch booking trends')
      }

      const data = await response.json()
      setTrends(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching booking trends:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrends()
  }, [daysBack, groupBy])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    switch (groupBy) {
      case 'day':
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      case 'week':
        return `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      case 'month':
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      default:
        return date.toLocaleDateString()
    }
  }

  const chartData = trends.map(trend => ({
    ...trend,
    period: formatDate(trend.period_start),
    completion_rate: Math.round(trend.completion_rate * 10) / 10
  })).reverse() // Reverse to show chronological order

  const totalBookings = trends.reduce((sum, trend) => sum + trend.total_bookings, 0)
  const totalRevenue = trends.reduce((sum, trend) => sum + trend.total_revenue, 0)
  const avgCompletionRate = trends.length > 0 
    ? Math.round((trends.reduce((sum, trend) => sum + trend.completion_rate, 0) / trends.length) * 10) / 10
    : 0

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp className="h-4 w-4 text-green-500" />
    if (current < previous) return <TrendingDown className="h-4 w-4 text-red-500" />
    return <div className="h-4 w-4" />
  }

  const getTrendColor = (current: number, previous: number) => {
    if (current > previous) return 'text-green-600'
    if (current < previous) return 'text-red-600'
    return 'text-gray-600'
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Booking Trends
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
            <BarChart3 className="h-5 w-5" />
            Booking Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-600 py-8">
            <p>Error loading trends: {error}</p>
            <button 
              onClick={fetchTrends}
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
            <BarChart3 className="h-5 w-5" />
            Booking Trends
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={chartType} onValueChange={(value: 'line' | 'bar') => setChartType(value)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line">Line</SelectItem>
                <SelectItem value="bar">Bar</SelectItem>
              </SelectContent>
            </Select>
            <Select value={groupBy} onValueChange={(value: 'day' | 'week' | 'month') => setGroupBy(value)}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
              </SelectContent>
            </Select>
            <Select value={daysBack.toString()} onValueChange={(value) => setDaysBack(parseInt(value))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7d</SelectItem>
                <SelectItem value="30">30d</SelectItem>
                <SelectItem value="90">90d</SelectItem>
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
            <div className="text-2xl font-bold text-blue-600">{totalBookings}</div>
            <div className="text-sm text-gray-600">Total Bookings</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">${totalRevenue.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Total Revenue</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{avgCompletionRate}%</div>
            <div className="text-sm text-gray-600">Avg Completion Rate</div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'line' ? (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="period" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: any, name: string) => [
                    name === 'total_revenue' || name === 'completed_revenue' 
                      ? `$${value.toLocaleString()}` 
                      : value,
                    name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                  ]}
                  labelFormatter={(label) => `Period: ${label}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="total_bookings" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Total Bookings"
                />
                <Line 
                  type="monotone" 
                  dataKey="completed_bookings" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Completed"
                />
                <Line 
                  type="monotone" 
                  dataKey="in_progress_bookings" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  name="In Progress"
                />
                <Line 
                  type="monotone" 
                  dataKey="total_revenue" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  name="Revenue"
                  yAxisId="revenue"
                />
              </LineChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="period" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: any, name: string) => [
                    name === 'total_revenue' || name === 'completed_revenue' 
                      ? `$${value.toLocaleString()}` 
                      : value,
                    name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                  ]}
                  labelFormatter={(label) => `Period: ${label}`}
                />
                <Legend />
                <Bar dataKey="total_bookings" fill="#3b82f6" name="Total Bookings" />
                <Bar dataKey="completed_bookings" fill="#10b981" name="Completed" />
                <Bar dataKey="in_progress_bookings" fill="#f59e0b" name="In Progress" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Status Legend */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            Total: {totalBookings}
          </Badge>
          <Badge variant="outline" className="bg-green-50 text-green-700">
            Completed: {trends.reduce((sum, t) => sum + t.completed_bookings, 0)}
          </Badge>
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
            In Progress: {trends.reduce((sum, t) => sum + t.in_progress_bookings, 0)}
          </Badge>
          <Badge variant="outline" className="bg-gray-50 text-gray-700">
            Pending: {trends.reduce((sum, t) => sum + t.pending_bookings, 0)}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
