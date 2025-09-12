'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Timer,
  Users,
  FileText,
  Activity,
  Zap,
  Brain,
  Cpu,
  Database,
  Server,
  Cloud,
  Wifi,
  WifiOff,
  Signal,
  SignalZero,
  SignalLow,
  SignalMedium,
  SignalHigh,
  Battery,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
  Power,
  PowerOff,
  Heart,
  UserCheck,
  UserX,
  UserPlus,
  UserMinus,
  Users2,
  UserCog,
  Award,
  Trophy,
  Medal,
  Crown,
  Sparkles,
  Rocket,
  Zap as ZapIcon,
  Lightbulb,
  MapPin,
  Tag,
  Hash,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Save,
  X,
  Plus,
  Minus,
  ExternalLink,
  Lock,
  Unlock,
  Shield,
  ShieldCheck
} from 'lucide-react'
import { Milestone, TimeEntry, UserRole } from '@/types/progress'
import { formatDistanceToNow, isAfter, isBefore, addDays, differenceInDays } from 'date-fns'
import { safeFormatDate, safeFormatDistanceToNow } from '@/lib/date-utils'
import { motion } from 'framer-motion'

interface ProgressAnalyticsProps {
  milestones: Milestone[]
  timeEntries: TimeEntry[]
  stats: {
    totalMilestones: number
    completedMilestones: number
    inProgressMilestones: number
    overdueMilestones: number
    totalTasks: number
    completedTasks: number
    overdueTasks: number
    totalEstimatedHours: number
    totalActualHours: number
    progressPercentage: number
  }
  userRole: UserRole
}

export function ProgressAnalytics({
  milestones,
  timeEntries,
  stats,
  userRole
}: ProgressAnalyticsProps) {
  
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('30d')
  const [selectedMetric, setSelectedMetric] = useState<'progress' | 'time' | 'tasks' | 'milestones'>('progress')

  // Calculate analytics data
  const analyticsData = {
    // Progress trends
    progressTrend: calculateProgressTrend(milestones),
    
    // Time tracking analytics
    timeAnalytics: calculateTimeAnalytics(timeEntries, selectedPeriod),
    
    // Task completion rates
    taskCompletionRates: calculateTaskCompletionRates(milestones),
    
    // Milestone performance
    milestonePerformance: calculateMilestonePerformance(milestones),
    
    // Productivity metrics
    productivityMetrics: calculateProductivityMetrics(milestones, timeEntries),
    
    // Risk indicators
    riskIndicators: calculateRiskIndicators(milestones)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Progress Analytics</h3>
        <div className="flex items-center space-x-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="text-sm border border-gray-300 rounded px-3 py-1"
            aria-label="Select time period for analytics"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overall Progress</p>
                <p className="text-2xl font-bold text-blue-600">{stats.progressPercentage}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
            <Progress value={stats.progressPercentage} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tasks Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completedTasks}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.totalTasks - stats.completedTasks} remaining
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Time Logged</p>
                <p className="text-2xl font-bold text-purple-600">{stats.totalActualHours}h</p>
              </div>
              <Timer className="h-8 w-8 text-purple-500" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.totalEstimatedHours}h estimated
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overdue Items</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdueTasks}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.overdueMilestones} milestones
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Progress Trends</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analyticsData.progressTrend.map((trend, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${trend.color}`} />
                  <div>
                    <p className="font-medium text-gray-900">{trend.label}</p>
                    <p className="text-sm text-gray-600">{trend.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{trend.value}</p>
                  <p className="text-xs text-gray-500">{trend.change}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Time Tracking Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Timer className="h-5 w-5" />
            <span>Time Tracking</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{analyticsData.timeAnalytics.totalHours}h</p>
              <p className="text-sm text-gray-600">Total Logged</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{analyticsData.timeAnalytics.averageHours}h</p>
              <p className="text-sm text-gray-600">Daily Average</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{analyticsData.timeAnalytics.efficiency}%</p>
              <p className="text-sm text-gray-600">Efficiency</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task Completion Rates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Task Completion Rates</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analyticsData.taskCompletionRates.map((rate, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{rate.category}</span>
                  <span>{rate.percentage}%</span>
                </div>
                <Progress value={rate.percentage} className="h-2" />
                <p className="text-xs text-gray-500">{rate.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Milestone Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Award className="h-5 w-5" />
            <span>Milestone Performance</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analyticsData.milestonePerformance.map((performance, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${performance.color}`} />
                  <div>
                    <p className="font-medium text-gray-900">{performance.milestone}</p>
                    <p className="text-sm text-gray-600">{performance.status}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{performance.progress}%</p>
                  <p className="text-xs text-gray-500">{performance.tasks}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Productivity Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Productivity Metrics</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Tasks per Day</p>
              <p className="text-2xl font-bold text-blue-600">{analyticsData.productivityMetrics.tasksPerDay}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Hours per Task</p>
              <p className="text-2xl font-bold text-green-600">{analyticsData.productivityMetrics.hoursPerTask}h</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Completion Rate</p>
              <p className="text-2xl font-bold text-purple-600">{analyticsData.productivityMetrics.completionRate}%</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Efficiency Score</p>
              <p className="text-2xl font-bold text-orange-600">{analyticsData.productivityMetrics.efficiencyScore}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Indicators */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Risk Indicators</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analyticsData.riskIndicators.map((risk, index) => (
              <div key={index} className={`p-3 rounded border-l-4 ${
                risk.severity === 'high' ? 'border-red-500 bg-red-50' :
                risk.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                'border-green-500 bg-green-50'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{risk.title}</p>
                    <p className="text-sm text-gray-600">{risk.description}</p>
                  </div>
                  <Badge variant={risk.severity === 'high' ? 'destructive' : risk.severity === 'medium' ? 'default' : 'secondary'}>
                    {risk.severity}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Helper functions for analytics calculations
function calculateProgressTrend(milestones: Milestone[]) {
  const now = new Date()
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  
  const recentMilestones = milestones.filter(m => 
    new Date(m.updated_at) >= lastWeek
  )
  
  const completedThisWeek = recentMilestones.filter(m => m.status === 'completed').length
  const totalThisWeek = recentMilestones.length
  
  return [
    {
      label: 'This Week',
      description: 'Milestones completed in the last 7 days',
      value: completedThisWeek,
      change: totalThisWeek > 0 ? `+${Math.round((completedThisWeek / totalThisWeek) * 100)}%` : '0%',
      color: 'bg-blue-500'
    },
    {
      label: 'Overall',
      description: 'Total project completion',
      value: milestones.filter(m => m.status === 'completed').length,
      change: `${milestones.length} total milestones`,
      color: 'bg-green-500'
    }
  ]
}

function calculateTimeAnalytics(timeEntries: TimeEntry[], period: string) {
  const now = new Date()
  let startDate: Date
  
  switch (period) {
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      break
    default:
      startDate = new Date(0)
  }
  
  const filteredEntries = timeEntries.filter(te => 
    new Date(te.logged_at) >= startDate
  )
  
  const totalHours = filteredEntries.reduce((sum, te) => sum + te.duration_hours, 0)
  const days = Math.max(1, differenceInDays(now, startDate))
  const averageHours = totalHours / days
  const efficiency = 85 // Placeholder calculation
  
  return {
    totalHours: Math.round(totalHours * 10) / 10,
    averageHours: Math.round(averageHours * 10) / 10,
    efficiency
  }
}

function calculateTaskCompletionRates(milestones: Milestone[]) {
  const allTasks = milestones.flatMap(m => m.tasks)
  const totalTasks = allTasks.length
  const completedTasks = allTasks.filter(t => t.status === 'completed').length
  
  const byPriority = ['urgent', 'high', 'normal', 'low'].map(priority => {
    const priorityTasks = allTasks.filter(t => t.priority === priority)
    const completed = priorityTasks.filter(t => t.status === 'completed').length
    return {
      category: `${priority.charAt(0).toUpperCase() + priority.slice(1)} Priority`,
      percentage: priorityTasks.length > 0 ? Math.round((completed / priorityTasks.length) * 100) : 0,
      description: `${completed} of ${priorityTasks.length} tasks completed`
    }
  })
  
  return [
    {
      category: 'Overall',
      percentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      description: `${completedTasks} of ${totalTasks} tasks completed`
    },
    ...byPriority
  ]
}

function calculateMilestonePerformance(milestones: Milestone[]) {
  return milestones.map(milestone => ({
    milestone: milestone.title,
    status: milestone.status,
    progress: milestone.progress || 0,
    tasks: `${milestone.tasks.filter(t => t.status === 'completed').length}/${milestone.tasks.length}`,
    color: milestone.status === 'completed' ? 'bg-green-500' : 
           milestone.status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-500'
  }))
}

function calculateProductivityMetrics(milestones: Milestone[], timeEntries: TimeEntry[]) {
  const allTasks = milestones.flatMap(m => m.tasks)
  const completedTasks = allTasks.filter(t => t.status === 'completed')
  const totalHours = timeEntries.reduce((sum, te) => sum + te.duration_hours, 0)
  
  const days = 30 // Assume 30-day period
  const tasksPerDay = completedTasks.length / days
  const hoursPerTask = completedTasks.length > 0 ? totalHours / completedTasks.length : 0
  const completionRate = allTasks.length > 0 ? (completedTasks.length / allTasks.length) * 100 : 0
  const efficiencyScore = Math.min(100, Math.round(completionRate * 0.8 + (100 - (hoursPerTask * 10))))
  
  return {
    tasksPerDay: Math.round(tasksPerDay * 10) / 10,
    hoursPerTask: Math.round(hoursPerTask * 10) / 10,
    completionRate: Math.round(completionRate),
    efficiencyScore: Math.max(0, efficiencyScore)
  }
}

function calculateRiskIndicators(milestones: Milestone[]) {
  const risks = []
  
  // Overdue milestones
  const overdueMilestones = milestones.filter(m => 
    m.due_date && new Date(m.due_date) < new Date() && m.status !== 'completed'
  )
  
  if (overdueMilestones.length > 0) {
    risks.push({
      title: 'Overdue Milestones',
      description: `${overdueMilestones.length} milestone(s) are past their due date`,
      severity: 'high' as const
    })
  }
  
  // Slow progress
  const slowProgress = milestones.filter(m => {
    if (m.status === 'completed') return false
    const progress = m.progress || 0
    const startDate = new Date(m.created_at)
    const endDate = new Date(m.due_date)
    const totalDays = differenceInDays(endDate, startDate)
    const elapsedDays = differenceInDays(new Date(), startDate)
    const expectedProgress = Math.min(Math.round((elapsedDays / totalDays) * 100), 100)
    return progress < expectedProgress - 20
  })
  
  if (slowProgress.length > 0) {
    risks.push({
      title: 'Slow Progress',
      description: `${slowProgress.length} milestone(s) are behind schedule`,
      severity: 'medium' as const
    })
  }
  
  // No recent activity
  const inactiveMilestones = milestones.filter(m => {
    if (m.status === 'completed') return false
    const lastUpdate = new Date(m.updated_at)
    const daysSinceUpdate = differenceInDays(new Date(), lastUpdate)
    return daysSinceUpdate >= 3
  })
  
  if (inactiveMilestones.length > 0) {
    risks.push({
      title: 'Inactive Milestones',
      description: `${inactiveMilestones.length} milestone(s) haven't been updated recently`,
      severity: 'low' as const
    })
  }
  
  return risks
}