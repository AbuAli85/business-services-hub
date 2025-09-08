'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Activity, 
  BarChart3, 
  Calendar, 
  Shield, 
  Target, 
  Zap, 
  Eye, 
  Settings,
  RefreshCw,
  Download,
  Share2,
  Bell,
  Star,
  Award,
  TrendingUp,
  Users,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'
import { Milestone, Task, UserRole } from '@/types/progress'
import { ComprehensiveMilestoneDashboard } from './comprehensive-milestone-dashboard'
import { LiveProgressTracker } from './live-progress-tracker'
import { ProjectProofSystem } from './project-proof-system'
import { EnhancedApprovalWorkflow } from './enhanced-approval-workflow'
import { ProjectTimelineVisualization } from './project-timeline-visualization'

interface EnhancedMilestoneDashboardProps {
  milestones: Milestone[]
  userRole: UserRole
  onMilestoneUpdate?: (milestoneId: string, updates: Partial<Milestone>) => void
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void
  onTaskAdd?: (milestoneId: string, task: Partial<Task>) => void
  onTaskDelete?: (taskId: string) => void
  onCommentAdd?: (milestoneId: string, comment: string) => void
  onMilestoneApproval?: (milestoneId: string, action: 'approve' | 'reject', notes?: string) => void
  commentsByMilestone?: Record<string, any[]>
  approvalsByMilestone?: Record<string, any[]>
  timeEntries?: any[]
  className?: string
}

interface DashboardStats {
  totalMilestones: number
  completedMilestones: number
  inProgressMilestones: number
  pendingMilestones: number
  totalTasks: number
  completedTasks: number
  overdueItems: number
  overallProgress: number
  clientSatisfaction: number
  averageCompletionTime: number
  efficiency: number
  riskLevel: 'low' | 'medium' | 'high'
}

export function EnhancedMilestoneDashboard({
  milestones,
  userRole,
  onMilestoneUpdate,
  onTaskUpdate,
  onTaskAdd,
  onTaskDelete,
  onCommentAdd,
  onMilestoneApproval,
  commentsByMilestone = {},
  approvalsByMilestone = {},
  timeEntries = [],
  className = ""
}: EnhancedMilestoneDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalMilestones: 0,
    completedMilestones: 0,
    inProgressMilestones: 0,
    pendingMilestones: 0,
    totalTasks: 0,
    completedTasks: 0,
    overdueItems: 0,
    overallProgress: 0,
    clientSatisfaction: 0,
    averageCompletionTime: 0,
    efficiency: 0,
    riskLevel: 'low'
  })
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // Calculate dashboard statistics
  useEffect(() => {
    const calculateStats = () => {
      const totalMilestones = milestones.length
      const completedMilestones = milestones.filter(m => m.status === 'completed').length
      const inProgressMilestones = milestones.filter(m => m.status === 'in_progress').length
      const pendingMilestones = milestones.filter(m => m.status === 'pending').length
      
      const allTasks = milestones.flatMap(m => m.tasks || [])
      const totalTasks = allTasks.length
      const completedTasks = allTasks.filter(t => t.status === 'completed').length
      
      const overdueItems = milestones.filter(m => {
        if (!m.due_date || m.status === 'completed') return false
        return new Date() > new Date(m.due_date)
      }).length + allTasks.filter(t => {
        if (!t.due_date || t.status === 'completed') return false
        return new Date() > new Date(t.due_date)
      }).length
      
      const overallProgress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0
      
      // Calculate client satisfaction based on approvals
      const allApprovals = Object.values(approvalsByMilestone).flat()
      const approvedCount = allApprovals.filter(a => a.status === 'approved').length
      const totalApprovals = allApprovals.length
      const clientSatisfaction = totalApprovals > 0 ? Math.round((approvedCount / totalApprovals) * 100) : 0
      
      // Calculate efficiency (simplified)
      const estimatedHours = milestones.reduce((sum, m) => sum + (m.estimated_hours || 0), 0)
      const actualHours = timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0)
      const efficiency = estimatedHours > 0 ? Math.round((actualHours / estimatedHours) * 100) : 0
      
      // Calculate average completion time (simplified)
      const completedMilestonesWithDates = milestones.filter(m => 
        m.status === 'completed' && m.completed_at
      )
      const averageCompletionTime = completedMilestonesWithDates.length > 0
        ? completedMilestonesWithDates.reduce((sum, m) => {
            const startDate = new Date(m.created_at)
            const endDate = new Date(m.completed_at!)
            const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
            return sum + days
          }, 0) / completedMilestonesWithDates.length
        : 0
      
      // Determine risk level
      let riskLevel: 'low' | 'medium' | 'high' = 'low'
      if (overdueItems > 0) riskLevel = 'high'
      else if (efficiency > 120 || overallProgress < 30) riskLevel = 'medium'
      
      setDashboardStats({
        totalMilestones,
        completedMilestones,
        inProgressMilestones,
        pendingMilestones,
        totalTasks,
        completedTasks,
        overdueItems,
        overallProgress,
        clientSatisfaction,
        averageCompletionTime: Math.round(averageCompletionTime),
        efficiency,
        riskLevel
      })
    }
    
    calculateStats()
  }, [milestones, approvalsByMilestone, timeEntries])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Simulate refresh delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    setLastUpdated(new Date())
    setIsRefreshing(false)
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'text-red-600 bg-red-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'low': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'high': return <AlertTriangle className="h-5 w-5 text-red-600" />
      case 'medium': return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case 'low': return <CheckCircle className="h-5 w-5 text-green-600" />
      default: return <Activity className="h-5 w-5 text-gray-600" />
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <Target className="h-8 w-8 text-blue-600" />
                Enhanced Project Milestone Dashboard
              </CardTitle>
              <p className="text-gray-600 mt-1">
                Comprehensive project tracking with real-time updates, proof system, and client transparency
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
            <div className="flex items-center gap-4">
              <span>Role: {userRole}</span>
              <Badge className={getRiskColor(dashboardStats.riskLevel)}>
                {getRiskIcon(dashboardStats.riskLevel)}
                <span className="ml-1">{dashboardStats.riskLevel.toUpperCase()} RISK</span>
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Overall Progress</p>
                <p className="text-2xl font-bold text-blue-600">{dashboardStats.overallProgress}%</p>
                <p className="text-xs text-gray-500">
                  {dashboardStats.completedMilestones}/{dashboardStats.totalMilestones} milestones
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Tasks Completed</p>
                <p className="text-2xl font-bold text-green-600">{dashboardStats.completedTasks}</p>
                <p className="text-xs text-gray-500">
                  of {dashboardStats.totalTasks} total tasks
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Efficiency</p>
                <p className="text-2xl font-bold text-purple-600">{dashboardStats.efficiency}%</p>
                <p className="text-xs text-gray-500">Actual vs Estimated</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-full">
                <Star className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Client Satisfaction</p>
                <p className="text-2xl font-bold text-orange-600">{dashboardStats.clientSatisfaction}%</p>
                <p className="text-xs text-gray-500">Based on approvals</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="live" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Live Tracking
          </TabsTrigger>
          <TabsTrigger value="proof" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Proof System
          </TabsTrigger>
          <TabsTrigger value="approvals" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            Approvals
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Timeline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <ComprehensiveMilestoneDashboard
            milestones={milestones}
            userRole={userRole}
            onMilestoneUpdate={onMilestoneUpdate}
            onTaskUpdate={onTaskUpdate}
            onTaskAdd={onTaskAdd}
            onTaskDelete={onTaskDelete}
            onCommentAdd={onCommentAdd}
            onMilestoneApproval={onMilestoneApproval}
            commentsByMilestone={commentsByMilestone}
            approvalsByMilestone={approvalsByMilestone}
            timeEntries={timeEntries}
          />
        </TabsContent>

        <TabsContent value="live" className="space-y-6">
          <LiveProgressTracker
            milestones={milestones}
            userRole={userRole}
            onMilestoneUpdate={onMilestoneUpdate}
            onTaskUpdate={onTaskUpdate}
            timeEntries={timeEntries}
          />
        </TabsContent>

        <TabsContent value="proof" className="space-y-6">
          <ProjectProofSystem
            milestones={milestones}
            userRole={userRole}
            onMilestoneUpdate={onMilestoneUpdate}
            onTaskUpdate={onTaskUpdate}
            commentsByMilestone={commentsByMilestone}
            approvalsByMilestone={approvalsByMilestone}
            timeEntries={timeEntries}
          />
        </TabsContent>

        <TabsContent value="approvals" className="space-y-6">
          <EnhancedApprovalWorkflow
            milestones={milestones}
            userRole={userRole}
            onMilestoneUpdate={onMilestoneUpdate}
            onMilestoneApproval={onMilestoneApproval}
            commentsByMilestone={commentsByMilestone}
            approvalsByMilestone={approvalsByMilestone}
          />
        </TabsContent>

        <TabsContent value="timeline" className="space-y-6">
          <ProjectTimelineVisualization
            milestones={milestones}
            userRole={userRole}
            onMilestoneUpdate={onMilestoneUpdate}
            onTaskUpdate={onTaskUpdate}
            commentsByMilestone={commentsByMilestone}
            approvalsByMilestone={approvalsByMilestone}
            timeEntries={timeEntries}
          />
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center gap-2"
              onClick={() => setActiveTab('live')}
            >
              <Activity className="h-6 w-6" />
              <span>Live Updates</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center gap-2"
              onClick={() => setActiveTab('proof')}
            >
              <Shield className="h-6 w-6" />
              <span>View Proof</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center gap-2"
              onClick={() => setActiveTab('approvals')}
            >
              <Award className="h-6 w-6" />
              <span>Manage Approvals</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center gap-2"
              onClick={() => setActiveTab('timeline')}
            >
              <Calendar className="h-6 w-6" />
              <span>View Timeline</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Footer Stats */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Project Health Summary
            </h3>
            <div className="flex justify-center items-center gap-8 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>{dashboardStats.completedMilestones} Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span>{dashboardStats.inProgressMilestones} In Progress</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span>{dashboardStats.overdueItems} Overdue</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600" />
                <span>{dashboardStats.clientSatisfaction}% Satisfaction</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
