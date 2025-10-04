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
  Bar,
  ComposedChart,
  Area,
  AreaChart
} from 'recharts'
import { Clock, TrendingUp, TrendingDown, Calendar, Target } from 'lucide-react'

interface CompletionAnalytic {
  period_start: string
  period_end: string
  total_bookings: number
  completed_bookings: number
  avg_completion_days: number
  avg_progress: number
  total_revenue: number
  completion_rate: number
}

interface CompletionAnalyticsChartProps {
  className?: string
}

export function CompletionAnalyticsChart({ className }: CompletionAnalyticsChartProps) {
  const [analytics, setAnalytics] = useState<CompletionAnalytic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [daysBack, setDaysBack] = useState(90)
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('week')
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area'>('line')

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/analytics/completion', {
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
        throw new Error('Failed to fetch completion analytics')
      }

      const data = await response.json()
      setAnalytics(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching completion analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
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

  const chartData = analytics.map(analytic => ({
    ...analytic,
    period: formatDate(analytic.period_start),
    completion_rate: Math.round(analytic.completion_rate * 10) / 10
  })).reverse() // Reverse to show chronological order

  const avgCompletionDays = 0 // Completion time calculation not available without completion timestamp

  const avgCompletionRate = analytics.length > 0 
    ? Math.round((analytics.reduce((sum, a) => sum + a.completion_rate, 0) / analytics.length) * 10) / 10
    : 0

  const totalCompleted = analytics.reduce((sum, a) => sum + a.completed_bookings, 0)
  const totalBookings = analytics.reduce((sum, a) => sum + a.total_bookings, 0)

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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.name.includes('revenue') ? `$${entry.value?.toLocaleString()}` : entry.value}
              {entry.name.includes('rate') && '%'}
              {entry.name.includes('days') && ' days'}
            </p>
          ))}
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
            <Clock className="h-5 w-5" />
            Completion Analytics
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
            <Clock className="h-5 w-5" />
            Completion Analytics
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
            <Clock className="h-5 w-5" />
            Completion Analytics
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={chartType} onValueChange={(value: 'line' | 'bar' | 'area') => setChartType(value)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line">Line</SelectItem>
                <SelectItem value="bar">Bar</SelectItem>
                <SelectItem value="area">Area</SelectItem>
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
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{avgCompletionDays}</div>
            <div className="text-sm text-gray-600">Avg Completion Days</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{avgCompletionRate}%</div>
            <div className="text-sm text-gray-600">Avg Completion Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{totalCompleted}</div>
            <div className="text-sm text-gray-600">Total Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{totalBookings}</div>
            <div className="text-sm text-gray-600">Total Bookings</div>
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
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {/* Completion days chart disabled - completion timestamp not available */}
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="completion_rate" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Completion Rate (%)"
                />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="completed_bookings" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  name="Completed Bookings"
                />
              </LineChart>
            ) : chartType === 'bar' ? (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="period" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {/* Completion days bar disabled - completion timestamp not available */}
                <Bar yAxisId="right" dataKey="completion_rate" fill="#10b981" name="Completion Rate (%)" />
                <Bar yAxisId="left" dataKey="completed_bookings" fill="#f59e0b" name="Completed Bookings" />
              </BarChart>
            ) : (
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="period" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {/* Completion days area disabled - completion timestamp not available */}
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="completion_rate" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Completion Rate (%)"
                />
                <Bar yAxisId="left" dataKey="completed_bookings" fill="#f59e0b" name="Completed Bookings" />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Performance Indicators */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-5 w-5 text-blue-600" />
              <h4 className="font-medium text-blue-900">Completion Performance</h4>
            </div>
            <div className="text-sm text-blue-700">
              Completion time: <span className="font-bold">Not available</span>
            </div>
            <div className="text-sm text-blue-700">
              Completion rate: <span className="font-bold">{avgCompletionRate}%</span>
            </div>
          </div>
          
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <h4 className="font-medium text-green-900">Efficiency Metrics</h4>
            </div>
            <div className="text-sm text-green-700">
              Total completed: <span className="font-bold">{totalCompleted}</span>
            </div>
            <div className="text-sm text-green-700">
              Success rate: <span className="font-bold">
                {totalBookings > 0 ? Math.round((totalCompleted / totalBookings) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Trend Analysis */}
        {analytics.length >= 2 && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Trend Analysis</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="font-medium text-gray-700">Completion Days</div>
                <div className="flex items-center justify-center gap-1">
                  <span className="text-gray-500">Not available</span>
                </div>
              </div>
              <div className="text-center">
                <div className="font-medium text-gray-700">Completion Rate</div>
                <div className="flex items-center justify-center gap-1">
                  {getTrendIcon(
                    analytics[0]?.completion_rate || 0,
                    analytics[1]?.completion_rate || 0
                  )}
                  <span className={getTrendColor(
                    analytics[0]?.completion_rate || 0,
                    analytics[1]?.completion_rate || 0
                  )}>
                    {analytics[0]?.completion_rate || 0}%
                  </span>
                </div>
              </div>
              <div className="text-center">
                <div className="font-medium text-gray-700">Completed Bookings</div>
                <div className="flex items-center justify-center gap-1">
                  {getTrendIcon(
                    analytics[0]?.completed_bookings || 0,
                    analytics[1]?.completed_bookings || 0
                  )}
                  <span className={getTrendColor(
                    analytics[0]?.completed_bookings || 0,
                    analytics[1]?.completed_bookings || 0
                  )}>
                    {analytics[0]?.completed_bookings || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
