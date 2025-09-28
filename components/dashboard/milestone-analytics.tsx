'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Users, 
  Target, 
  Download,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Play,
  Pause
} from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

interface MilestoneAnalyticsProps {
  bookingId: string
  className?: string
}

interface MilestoneData {
  id: string
  title: string
  status: string
  progress_percentage: number
  created_at: string
  completed_at?: string
  due_date?: string
  estimated_hours: number
  actual_hours: number
  priority: string
  risk_level: string
  tasks: TaskData[]
}

interface TaskData {
  id: string
  title: string
  status: string
  progress_percentage: number
  assigned_to?: string
  estimated_hours: number
  actual_hours: number
  created_at: string
  completed_at?: string
}

interface AnalyticsData {
  milestones: MilestoneData[]
  totalMilestones: number
  completedMilestones: number
  inProgressMilestones: number
  pendingMilestones: number
  overdueMilestones: number
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  pendingTasks: number
  totalEstimatedHours: number
  totalActualHours: number
  averageCompletionTime: number
  completionRate: number
  onTimeDeliveryRate: number
  riskDistribution: Record<string, number>
  priorityDistribution: Record<string, number>
  teamWorkload: Record<string, number>
  burnDownData: Array<{ date: string; completed: number; remaining: number }>
  velocityTrend: Array<{ week: string; completed: number }>
}

export function MilestoneAnalytics({ bookingId, className }: MilestoneAnalyticsProps) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d')

  useEffect(() => {
    loadAnalyticsData()
  }, [bookingId, selectedTimeRange])

  const loadAnalyticsData = async () => {
    try {
      setLoading(true)
      const supabase = await getSupabaseClient()
      
      // Load milestones with tasks
      const { data: milestones, error } = await supabase
        .from('milestones')
        .select(`
          id,
          title,
          status,
          progress_percentage,
          created_at,
          completed_at,
          due_date,
          estimated_hours,
          actual_hours,
          priority,
          risk_level,
          tasks (
            id,
            title,
            status,
            progress_percentage,
            assigned_to,
            estimated_hours,
            actual_hours,
            created_at,
            completed_at
          )
        `)
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Calculate analytics
      const analytics = calculateAnalytics(milestones || [])
      setAnalyticsData(analytics)
    } catch (error) {
      console.error('Error loading analytics:', error)
      toast.error('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  const calculateAnalytics = (milestones: MilestoneData[]): AnalyticsData => {
    const now = new Date()
    const timeRangeFilter = getTimeRangeFilter(selectedTimeRange)
    
    const filteredMilestones = milestones.filter(m => {
      const createdDate = new Date(m.created_at)
      return timeRangeFilter(createdDate)
    })

    const totalMilestones = filteredMilestones.length
    const completedMilestones = filteredMilestones.filter(m => m.status === 'completed').length
    const inProgressMilestones = filteredMilestones.filter(m => m.status === 'in_progress').length
    const pendingMilestones = filteredMilestones.filter(m => m.status === 'pending').length
    const overdueMilestones = filteredMilestones.filter(m => 
      m.due_date && new Date(m.due_date) < now && m.status !== 'completed'
    ).length

    const allTasks = filteredMilestones.flatMap(m => m.tasks || [])
    const totalTasks = allTasks.length
    const completedTasks = allTasks.filter(t => t.status === 'completed').length
    const inProgressTasks = allTasks.filter(t => t.status === 'in_progress').length
    const pendingTasks = allTasks.filter(t => t.status === 'pending').length

    const totalEstimatedHours = filteredMilestones.reduce((sum, m) => sum + (m.estimated_hours || 0), 0)
    const totalActualHours = filteredMilestones.reduce((sum, m) => sum + (m.actual_hours || 0), 0)

    // Calculate completion times
    const completedMilestonesWithTimes = filteredMilestones.filter(m => 
      m.status === 'completed' && m.completed_at && m.created_at
    )
    const averageCompletionTime = completedMilestonesWithTimes.length > 0
      ? completedMilestonesWithTimes.reduce((sum, m) => {
          const created = new Date(m.created_at)
          const completed = new Date(m.completed_at!)
          return sum + (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24) // days
        }, 0) / completedMilestonesWithTimes.length
      : 0

    const completionRate = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0

    // Calculate on-time delivery rate
    const onTimeMilestones = completedMilestonesWithTimes.filter(m => 
      m.due_date && new Date(m.completed_at!) <= new Date(m.due_date)
    ).length
    const onTimeDeliveryRate = completedMilestonesWithTimes.length > 0 
      ? (onTimeMilestones / completedMilestonesWithTimes.length) * 100 
      : 0

    // Risk and priority distribution
    const riskDistribution = filteredMilestones.reduce((acc, m) => {
      acc[m.risk_level] = (acc[m.risk_level] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const priorityDistribution = filteredMilestones.reduce((acc, m) => {
      acc[m.priority] = (acc[m.priority] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Team workload
    const teamWorkload = allTasks.reduce((acc, t) => {
      if (t.assigned_to) {
        acc[t.assigned_to] = (acc[t.assigned_to] || 0) + (t.estimated_hours || 0)
      }
      return acc
    }, {} as Record<string, number>)

    // Burn-down data (last 30 days)
    const burnDownData = generateBurnDownData(filteredMilestones, 30)
    
    // Velocity trend (weekly completion)
    const velocityTrend = generateVelocityTrend(filteredMilestones, 8)

    return {
      milestones: filteredMilestones,
      totalMilestones,
      completedMilestones,
      inProgressMilestones,
      pendingMilestones,
      overdueMilestones,
      totalTasks,
      completedTasks,
      inProgressTasks,
      pendingTasks,
      totalEstimatedHours,
      totalActualHours,
      averageCompletionTime,
      completionRate,
      onTimeDeliveryRate,
      riskDistribution,
      priorityDistribution,
      teamWorkload,
      burnDownData,
      velocityTrend
    }
  }

  const getTimeRangeFilter = (range: string) => {
    const now = new Date()
    switch (range) {
      case '7d':
        return (date: Date) => date >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      case '30d':
        return (date: Date) => date >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      case '90d':
        return (date: Date) => date >= new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      default:
        return () => true
    }
  }

  const generateBurnDownData = (milestones: MilestoneData[], days: number) => {
    const data = []
    const now = new Date()
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]
      
      const completed = milestones.filter(m => 
        m.completed_at && m.completed_at.split('T')[0] <= dateStr
      ).length
      
      const remaining = milestones.length - completed
      
      data.push({ date: dateStr, completed, remaining })
    }
    
    return data
  }

  const generateVelocityTrend = (milestones: MilestoneData[], weeks: number) => {
    const data = []
    const now = new Date()
    
    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000)
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000)
      const weekStr = `Week ${weeks - i}`
      
      const completed = milestones.filter(m => 
        m.completed_at && 
        new Date(m.completed_at) >= weekStart && 
        new Date(m.completed_at) < weekEnd
      ).length
      
      data.push({ week: weekStr, completed })
    }
    
    return data
  }

  const exportToCSV = () => {
    if (!analyticsData) return

    const csvData = [
      ['Metric', 'Value'],
      ['Total Milestones', analyticsData.totalMilestones],
      ['Completed Milestones', analyticsData.completedMilestones],
      ['In Progress Milestones', analyticsData.inProgressMilestones],
      ['Pending Milestones', analyticsData.pendingMilestones],
      ['Overdue Milestones', analyticsData.overdueMilestones],
      ['Total Tasks', analyticsData.totalTasks],
      ['Completed Tasks', analyticsData.completedTasks],
      ['Completion Rate (%)', analyticsData.completionRate.toFixed(2)],
      ['On-Time Delivery Rate (%)', analyticsData.onTimeDeliveryRate.toFixed(2)],
      ['Average Completion Time (days)', analyticsData.averageCompletionTime.toFixed(2)],
      ['Total Estimated Hours', analyticsData.totalEstimatedHours],
      ['Total Actual Hours', analyticsData.totalActualHours]
    ]

    const csvContent = csvData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `milestone-analytics-${bookingId}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    
    toast.success('Analytics exported to CSV')
  }

  const exportToPDF = () => {
    // This would integrate with a PDF generation library like jsPDF
    toast.info('PDF export coming soon!')
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading analytics...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!analyticsData) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">No analytics data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-6 w-6 text-blue-600" />
              <CardTitle>Milestone Analytics & Reporting</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value as any)}
                className="px-3 py-1 border rounded-md text-sm"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="all">All time</option>
              </select>
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={exportToPDF}>
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="progress">Progress</TabsTrigger>
              <TabsTrigger value="team">Team</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Milestones</p>
                        <p className="text-2xl font-bold">{analyticsData.totalMilestones}</p>
                      </div>
                      <Target className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                        <p className="text-2xl font-bold">{analyticsData.completionRate.toFixed(1)}%</p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">On-Time Delivery</p>
                        <p className="text-2xl font-bold">{analyticsData.onTimeDeliveryRate.toFixed(1)}%</p>
                      </div>
                      <Clock className="h-8 w-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Avg. Completion</p>
                        <p className="text-2xl font-bold">{analyticsData.averageCompletionTime.toFixed(1)}d</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Status Distribution */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Milestone Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Completed</span>
                      </div>
                      <Badge variant="outline">{analyticsData.completedMilestones}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Play className="h-4 w-4 text-blue-600" />
                        <span className="text-sm">In Progress</span>
                      </div>
                      <Badge variant="outline">{analyticsData.inProgressMilestones}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Pause className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm">Pending</span>
                      </div>
                      <Badge variant="outline">{analyticsData.pendingMilestones}</Badge>
                    </div>
                    {analyticsData.overdueMilestones > 0 && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <span className="text-sm">Overdue</span>
                        </div>
                        <Badge variant="destructive">{analyticsData.overdueMilestones}</Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Task Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Completed</span>
                      </div>
                      <Badge variant="outline">{analyticsData.completedTasks}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Play className="h-4 w-4 text-blue-600" />
                        <span className="text-sm">In Progress</span>
                      </div>
                      <Badge variant="outline">{analyticsData.inProgressTasks}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Pause className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm">Pending</span>
                      </div>
                      <Badge variant="outline">{analyticsData.pendingTasks}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="progress" className="space-y-6">
              {/* Progress Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Overall Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Milestone Progress</span>
                          <span>{analyticsData.completionRate.toFixed(1)}%</span>
                        </div>
                        <Progress value={analyticsData.completionRate} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Task Progress</span>
                          <span>{analyticsData.totalTasks > 0 ? ((analyticsData.completedTasks / analyticsData.totalTasks) * 100).toFixed(1) : 0}%</span>
                        </div>
                        <Progress value={analyticsData.totalTasks > 0 ? (analyticsData.completedTasks / analyticsData.totalTasks) * 100 : 0} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Hours Tracking</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-sm">Estimated Hours</span>
                        <span className="font-medium">{analyticsData.totalEstimatedHours}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Actual Hours</span>
                        <span className="font-medium">{analyticsData.totalActualHours}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Efficiency</span>
                        <span className="font-medium">
                          {analyticsData.totalEstimatedHours > 0 
                            ? ((analyticsData.totalActualHours / analyticsData.totalEstimatedHours) * 100).toFixed(1)
                            : 0}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="team" className="space-y-6">
              {/* Team Workload */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Team Workload Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.keys(analyticsData.teamWorkload).length > 0 ? (
                    <div className="space-y-3">
                      {Object.entries(analyticsData.teamWorkload).map(([userId, hours]) => (
                        <div key={userId} className="flex items-center justify-between">
                          <span className="text-sm">{userId.substring(0, 8)}...</span>
                          <div className="flex items-center gap-2">
                            <Progress value={(hours / Math.max(...Object.values(analyticsData.teamWorkload))) * 100} className="w-32 h-2" />
                            <span className="text-sm font-medium">{hours}h</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No team workload data available</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trends" className="space-y-6">
              {/* Trends and Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Burn-down Chart</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {analyticsData.burnDownData.slice(-7).map((data, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span>{new Date(data.date).toLocaleDateString()}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-green-600">✓ {data.completed}</span>
                            <span className="text-gray-600">⏳ {data.remaining}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Velocity Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {analyticsData.velocityTrend.map((data, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span>{data.week}</span>
                          <div className="flex items-center gap-2">
                            <Progress value={(data.completed / Math.max(...analyticsData.velocityTrend.map(v => v.completed))) * 100} className="w-20 h-2" />
                            <span className="font-medium">{data.completed}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
