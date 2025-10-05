'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Calendar,
  Users,
  Target,
  BarChart3,
  RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'

interface ProgressAnalytics {
  booking_id: string
  booking_title: string
  booking_progress: number
  booking_status: string
  total_milestones: number
  completed_milestones: number
  in_progress_milestones: number
  pending_milestones: number
  total_tasks: number
  completed_tasks: number
  in_progress_tasks: number
  pending_tasks: number
  overdue_tasks: number
  total_estimated_hours: number
  total_actual_hours: number
  avg_milestone_progress: number
  avg_task_progress: number
  created_at: string
  updated_at: string
}

interface ProgressAnalyticsProps {
  bookingId: string
  className?: string
}

export function ProgressAnalytics({ bookingId, className = '' }: ProgressAnalyticsProps) {
  const [analytics, setAnalytics] = useState<ProgressAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Load progress analytics
  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/progress/calculate?booking_id=${bookingId}`)
      
      if (!response.ok) {
        throw new Error('Failed to load progress analytics')
      }

      const result = await response.json()
      
      if (result.success && result.analytics) {
        setAnalytics(result.analytics)
      } else {
        throw new Error(result.error || 'Failed to load analytics')
      }
    } catch (err) {
      console.error('Error loading progress analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [bookingId])

  // Refresh analytics
  const refreshAnalytics = useCallback(async () => {
    try {
      setRefreshing(true)
      await loadAnalytics()
      toast.success('Analytics refreshed successfully')
    } catch (err) {
      toast.error('Failed to refresh analytics')
    } finally {
      setRefreshing(false)
    }
  }, [loadAnalytics])

  // Calculate efficiency metrics
  const calculateEfficiency = useCallback((analytics: ProgressAnalytics) => {
    const timeEfficiency = analytics.total_estimated_hours > 0 
      ? Math.round((analytics.total_estimated_hours / analytics.total_actual_hours) * 100)
      : 0

    const taskCompletionRate = analytics.total_tasks > 0
      ? Math.round((analytics.completed_tasks / analytics.total_tasks) * 100)
      : 0

    const milestoneCompletionRate = analytics.total_milestones > 0
      ? Math.round((analytics.completed_milestones / analytics.total_milestones) * 100)
      : 0

    const overdueRate = analytics.total_tasks > 0
      ? Math.round((analytics.overdue_tasks / analytics.total_tasks) * 100)
      : 0

    return {
      timeEfficiency: Math.min(100, timeEfficiency),
      taskCompletionRate,
      milestoneCompletionRate,
      overdueRate
    }
  }, [])

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Load analytics on mount
  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !analytics) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Error Loading Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600 mb-4">{error || 'Failed to load analytics'}</p>
            <Button onClick={loadAnalytics} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const efficiency = calculateEfficiency(analytics)

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Progress Analytics</h2>
          <p className="text-gray-600">Detailed insights into project progress and performance</p>
        </div>
        <Button
          onClick={refreshAnalytics}
          disabled={refreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overall Progress</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.booking_progress}%</p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
            <Progress value={analytics.booking_progress} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Milestones</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics.completed_milestones}/{analytics.total_milestones}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="mt-2 text-sm text-gray-600">
              {efficiency.milestoneCompletionRate}% complete
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tasks</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics.completed_tasks}/{analytics.total_tasks}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-600" />
            </div>
            <div className="mt-2 text-sm text-gray-600">
              {efficiency.taskCompletionRate}% complete
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Time Efficiency</p>
                <p className="text-2xl font-bold text-gray-900">{efficiency.timeEfficiency}%</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
            <div className="mt-2 text-sm text-gray-600">
              {analytics.total_actual_hours}h / {analytics.total_estimated_hours}h
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Milestone Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Milestone Status
            </CardTitle>
            <CardDescription>
              Breakdown of milestone completion status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Completed</span>
                </div>
                <div className="text-sm font-medium">
                  {analytics.completed_milestones} ({efficiency.milestoneCompletionRate}%)
                </div>
              </div>
              <Progress value={efficiency.milestoneCompletionRate} className="h-2" />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">In Progress</span>
                </div>
                <div className="text-sm font-medium">
                  {analytics.in_progress_milestones} ({Math.round((analytics.in_progress_milestones / analytics.total_milestones) * 100)}%)
                </div>
              </div>
              <Progress value={Math.round((analytics.in_progress_milestones / analytics.total_milestones) * 100)} className="h-2" />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm">Pending</span>
                </div>
                <div className="text-sm font-medium">
                  {analytics.pending_milestones} ({Math.round((analytics.pending_milestones / analytics.total_milestones) * 100)}%)
                </div>
              </div>
              <Progress value={Math.round((analytics.pending_milestones / analytics.total_milestones) * 100)} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Task Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Task Status
            </CardTitle>
            <CardDescription>
              Breakdown of task completion status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Completed</span>
                </div>
                <div className="text-sm font-medium">
                  {analytics.completed_tasks} ({efficiency.taskCompletionRate}%)
                </div>
              </div>
              <Progress value={efficiency.taskCompletionRate} className="h-2" />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">In Progress</span>
                </div>
                <div className="text-sm font-medium">
                  {analytics.in_progress_tasks} ({Math.round((analytics.in_progress_tasks / analytics.total_tasks) * 100)}%)
                </div>
              </div>
              <Progress value={Math.round((analytics.in_progress_tasks / analytics.total_tasks) * 100)} className="h-2" />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm">Pending</span>
                </div>
                <div className="text-sm font-medium">
                  {analytics.pending_tasks} ({Math.round((analytics.pending_tasks / analytics.total_tasks) * 100)}%)
                </div>
              </div>
              <Progress value={Math.round((analytics.pending_tasks / analytics.total_tasks) * 100)} className="h-2" />
              
              {analytics.overdue_tasks > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-sm">Overdue</span>
                  </div>
                  <div className="text-sm font-medium text-red-600">
                    {analytics.overdue_tasks} ({efficiency.overdueRate}%)
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Time Efficiency</span>
                <span className="text-sm font-medium">{efficiency.timeEfficiency}%</span>
              </div>
              <Progress value={efficiency.timeEfficiency} className="h-2" />
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Task Completion</span>
                <span className="text-sm font-medium">{efficiency.taskCompletionRate}%</span>
              </div>
              <Progress value={efficiency.taskCompletionRate} className="h-2" />
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Milestone Completion</span>
                <span className="text-sm font-medium">{efficiency.milestoneCompletionRate}%</span>
              </div>
              <Progress value={efficiency.milestoneCompletionRate} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Time Tracking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Estimated Hours</span>
                <span className="text-sm font-medium">{analytics.total_estimated_hours}h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Actual Hours</span>
                <span className="text-sm font-medium">{analytics.total_actual_hours}h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Variance</span>
                <span className={`text-sm font-medium ${
                  analytics.total_actual_hours <= analytics.total_estimated_hours 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {analytics.total_estimated_hours - analytics.total_actual_hours}h
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Project Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <Badge className={getStatusColor(analytics.booking_status)}>
                  {analytics.booking_status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Created</span>
                <span className="text-sm font-medium">
                  {new Date(analytics.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Last Updated</span>
                <span className="text-sm font-medium">
                  {new Date(analytics.updated_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
