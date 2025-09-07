'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts'
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Target, 
  CheckCircle, 
  AlertTriangle,
  Calendar,
  Users,
  Zap,
  Activity,
  Download,
  RefreshCw
} from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'

interface ProgressAnalyticsProps {
  bookingId: string
  className?: string
}

interface AnalyticsData {
  overview: {
    total_projects: number
    completed_projects: number
    active_projects: number
    overdue_projects: number
    total_earnings: number
    avg_completion_time: number
  }
  progress_trends: Array<{
    date: string
    progress: number
    tasks_completed: number
    hours_logged: number
  }>
  milestone_performance: Array<{
    milestone: string
    estimated_hours: number
    actual_hours: number
    efficiency: number
    status: string
  }>
  time_analysis: {
    total_estimated: number
    total_actual: number
    efficiency: number
    daily_average: number
    peak_hours: Array<{ hour: number; count: number }>
  }
  team_performance: Array<{
    user: string
    tasks_completed: number
    hours_logged: number
    efficiency: number
  }>
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export function ProgressAnalytics({ bookingId, className = "" }: ProgressAnalyticsProps) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d')

  useEffect(() => {
    loadAnalyticsData()
  }, [bookingId, timeRange])

  const loadAnalyticsData = async () => {
    try {
      setLoading(true)
      setError(null)

      const supabase = await getSupabaseClient()
      
      // Load comprehensive analytics data
      const { data: progressData, error: progressError } = await supabase
        .rpc('get_booking_progress_data', { booking_uuid: bookingId })

      if (progressError) throw progressError

      // Load milestones with detailed data
      const { data: milestonesData, error: milestonesError } = await supabase
        .from('milestones')
        .select(`
          id,
          title,
          status,
          progress_percentage,
          estimated_hours,
          actual_hours,
          due_date,
          created_at,
          completed_at
        `)
        .eq('booking_id', bookingId)
        .order('order_index', { ascending: true })

      if (milestonesError) throw milestonesError

      // Load time entries
      const { data: timeEntriesData, error: timeEntriesError } = await supabase
        .from('time_entries')
        .select(`
          id,
          duration_hours,
          logged_at,
          user_id,
          description
        `)
        .eq('booking_id', bookingId)
        .order('logged_at', { ascending: true })

      if (timeEntriesError) throw timeEntriesError

      // Load tasks data
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          status,
          progress_percentage,
          estimated_hours,
          actual_hours,
          due_date,
          created_at,
          completed_at,
          milestone_id
        `)
        .in('milestone_id', milestonesData?.map(m => m.id) || [])
        .order('created_at', { ascending: true })

      if (tasksError) throw tasksError

      // Process analytics data
      const processedData = processAnalyticsData(
        progressData?.[0],
        milestonesData || [],
        timeEntriesData || [],
        tasksData || []
      )

      setAnalyticsData(processedData)
    } catch (err) {
      console.error('Error loading analytics data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  const processAnalyticsData = (
    progressData: any,
    milestones: any[],
    timeEntries: any[],
    tasks: any[]
  ): AnalyticsData => {
    // Calculate date range based on selection
    const now = new Date()
    const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365
    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)

    // Filter data by time range
    const filteredTimeEntries = timeEntries.filter(entry => 
      new Date(entry.logged_at) >= startDate
    )

    // Calculate progress trends
    const progressTrends = calculateProgressTrends(tasks, timeEntries, daysBack)
    
    // Calculate milestone performance
    const milestonePerformance = milestones.map(milestone => {
      const milestoneTasks = tasks.filter(task => task.milestone_id === milestone.id)
      const actualHours = milestoneTasks.reduce((sum, task) => sum + (task.actual_hours || 0), 0)
      const estimatedHours = milestone.estimated_hours || 0
      const efficiency = estimatedHours > 0 ? Math.round((actualHours / estimatedHours) * 100) : 0

      return {
        milestone: milestone.title,
        estimated_hours: estimatedHours,
        actual_hours: actualHours,
        efficiency: Math.min(efficiency, 200), // Cap at 200% for display
        status: milestone.status
      }
    })

    // Calculate time analysis
    const totalEstimated = milestones.reduce((sum, m) => sum + (m.estimated_hours || 0), 0)
    const totalActual = timeEntries.reduce((sum, entry) => sum + entry.duration_hours, 0)
    const efficiency = totalEstimated > 0 ? Math.round((totalActual / totalEstimated) * 100) : 0
    const dailyAverage = daysBack > 0 ? totalActual / daysBack : 0

    // Calculate peak hours
    const peakHours = calculatePeakHours(timeEntries)

    // Calculate team performance (if multiple users)
    const userStats = new Map()
    timeEntries.forEach(entry => {
      const userId = entry.user_id
      if (!userStats.has(userId)) {
        userStats.set(userId, {
          user: `User ${userId.slice(0, 8)}`,
          tasks_completed: 0,
          hours_logged: 0,
          efficiency: 0
        })
      }
      const stats = userStats.get(userId)
      stats.hours_logged += entry.duration_hours
    })

    // Count completed tasks per user
    tasks.forEach(task => {
      if (task.status === 'completed' && task.completed_at) {
        // This would need user_id from tasks table or time entries
        // For now, we'll use a simplified approach
      }
    })

    const teamPerformance = Array.from(userStats.values())

    return {
      overview: {
        total_projects: 1, // This booking
        completed_projects: progressData?.booking_status === 'completed' ? 1 : 0,
        active_projects: progressData?.booking_status === 'in_progress' ? 1 : 0,
        overdue_projects: progressData?.overdue_tasks > 0 ? 1 : 0,
        total_earnings: 0, // Would need to calculate from booking amount
        avg_completion_time: 0 // Would need historical data
      },
      progress_trends: progressTrends,
      milestone_performance: milestonePerformance,
      time_analysis: {
        total_estimated: totalEstimated,
        total_actual: totalActual,
        efficiency: Math.min(efficiency, 200),
        daily_average: Math.round(dailyAverage * 100) / 100,
        peak_hours: peakHours
      },
      team_performance: teamPerformance
    }
  }

  const calculateProgressTrends = (tasks: any[], timeEntries: any[], daysBack: number) => {
    const trends = []
    const now = new Date()
    
    for (let i = daysBack - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]
      
      // Count tasks completed on this date
      const tasksCompleted = tasks.filter(task => 
        task.completed_at && 
        task.completed_at.split('T')[0] === dateStr
      ).length

      // Sum hours logged on this date
      const hoursLogged = timeEntries
        .filter(entry => entry.logged_at.split('T')[0] === dateStr)
        .reduce((sum, entry) => sum + entry.duration_hours, 0)

      // Calculate progress percentage (simplified)
      const totalTasks = tasks.length
      const completedTasks = tasks.filter(task => 
        task.completed_at && 
        new Date(task.completed_at) <= date
      ).length
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

      trends.push({
        date: dateStr,
        progress,
        tasks_completed: tasksCompleted,
        hours_logged: Math.round(hoursLogged * 100) / 100
      })
    }

    return trends
  }

  const calculatePeakHours = (timeEntries: any[]) => {
    const hourCounts = new Array(24).fill(0)
    
    timeEntries.forEach(entry => {
      const hour = new Date(entry.logged_at).getHours()
      hourCounts[hour] += entry.duration_hours
    })

    return hourCounts.map((count, hour) => ({
      hour,
      count: Math.round(count * 100) / 100
    }))
  }

  const exportAnalytics = () => {
    if (!analyticsData) return

    const dataStr = JSON.stringify(analyticsData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `progress-analytics-${bookingId}-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading analytics...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-8">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Analytics</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={loadAnalyticsData} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!analyticsData) {
    return (
      <Card className={className}>
        <CardContent className="p-8">
          <div className="text-center text-gray-500">
            No analytics data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Progress Analytics</h2>
          <p className="text-gray-600">Comprehensive insights into project performance</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Select time range for analytics"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <Button onClick={exportAnalytics} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={loadAnalyticsData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Hours</p>
                <p className="text-2xl font-bold text-blue-600">
                  {Math.round(analyticsData.time_analysis.total_actual)}h
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
            <div className="mt-2">
              <span className="text-sm text-gray-500">
                of {Math.round(analyticsData.time_analysis.total_estimated)}h estimated
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Efficiency</p>
                <p className="text-2xl font-bold text-green-600">
                  {analyticsData.time_analysis.efficiency}%
                </p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
            <div className="mt-2">
              <span className="text-sm text-gray-500">
                {analyticsData.time_analysis.efficiency > 100 ? 'Over estimated' : 'Under estimated'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Daily Average</p>
                <p className="text-2xl font-bold text-purple-600">
                  {analyticsData.time_analysis.daily_average}h
                </p>
              </div>
              <Activity className="h-8 w-8 text-purple-600" />
            </div>
            <div className="mt-2">
              <span className="text-sm text-gray-500">per day</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Milestones</p>
                <p className="text-2xl font-bold text-orange-600">
                  {analyticsData.milestone_performance.length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-orange-600" />
            </div>
            <div className="mt-2">
              <span className="text-sm text-gray-500">
                {analyticsData.milestone_performance.filter(m => m.status === 'completed').length} completed
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Progress Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Progress Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analyticsData.progress_trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="progress" 
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Time Logged Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Time Logged Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.progress_trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <Bar dataKey="hours_logged" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Milestone Performance */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Milestone Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analyticsData.milestone_performance.map((milestone, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{milestone.milestone}</h4>
                    <Badge variant={
                      milestone.status === 'completed' ? 'default' :
                      milestone.status === 'in_progress' ? 'secondary' : 'outline'
                    }>
                      {milestone.status}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>Est: {milestone.estimated_hours}h</span>
                    <span>Act: {milestone.actual_hours}h</span>
                    <span className={`font-medium ${
                      milestone.efficiency > 100 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {milestone.efficiency}% efficiency
                    </span>
                  </div>
                  <div className="mt-2">
                    <Progress 
                      value={Math.min(milestone.efficiency, 100)} 
                      className="h-2"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Peak Hours */}
      <Card>
        <CardHeader>
          <CardTitle>Peak Working Hours</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analyticsData.time_analysis.peak_hours}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
