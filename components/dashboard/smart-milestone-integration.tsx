'use client'

import React, { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Brain, 
  Bot, 
  BarChart3, 
  Settings, 
  Zap, 
  Target,
  Activity,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw
} from 'lucide-react'
import { SmartMilestoneFeatures } from './smart-milestone-features'
import { IntelligentTaskAutomation } from './intelligent-task-automation'
import { toast } from 'sonner'

interface SmartMilestoneIntegrationProps {
  bookingId: string
  milestones: any[]
  onMilestoneUpdate: (milestoneId: string, status: string) => Promise<void>
  onTaskUpdate: (taskId: string, status: string) => Promise<void>
  onRefresh: () => void
}

export function SmartMilestoneIntegration({
  bookingId,
  milestones,
  onMilestoneUpdate,
  onTaskUpdate,
  onRefresh
}: SmartMilestoneIntegrationProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await onRefresh()
      toast.success('Data refreshed successfully')
    } catch (error) {
      toast.error('Failed to refresh data')
    } finally {
      setIsRefreshing(false)
    }
  }

  const getProjectStatus = () => {
    const totalMilestones = milestones.length
    const completedMilestones = milestones.filter(m => m.status === 'completed').length
    const inProgressMilestones = milestones.filter(m => m.status === 'in_progress').length
    const overdueMilestones = milestones.filter(m => 
      m.due_date && new Date(m.due_date) < new Date() && m.status !== 'completed'
    ).length

    if (completedMilestones === totalMilestones && totalMilestones > 0) {
      return { status: 'completed', color: 'green', message: 'Project completed successfully!' }
    }
    if (overdueMilestones > 0) {
      return { status: 'overdue', color: 'red', message: `${overdueMilestones} milestone(s) overdue` }
    }
    if (inProgressMilestones > 0) {
      return { status: 'in_progress', color: 'blue', message: 'Project in progress' }
    }
    return { status: 'pending', color: 'gray', message: 'Project not started' }
  }

  const projectStatus = getProjectStatus()

  return (
    <div className="space-y-6">
      {/* Project Status Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Smart Project Management
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge 
                variant={projectStatus.color === 'green' ? 'default' : 
                        projectStatus.color === 'red' ? 'destructive' : 'secondary'}
                className="flex items-center gap-1"
              >
                {projectStatus.color === 'green' && <CheckCircle className="h-3 w-3" />}
                {projectStatus.color === 'red' && <AlertTriangle className="h-3 w-3" />}
                {projectStatus.color === 'blue' && <Activity className="h-3 w-3" />}
                {projectStatus.status.toUpperCase()}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          <Alert className={`border-l-4 ${
            projectStatus.color === 'green' ? 'border-green-500' :
            projectStatus.color === 'red' ? 'border-red-500' : 'border-blue-500'
          }`}>
            <AlertDescription>
              {projectStatus.message}
            </AlertDescription>
          </Alert>
        </CardHeader>
      </Card>

      {/* Smart Features Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Insights
          </TabsTrigger>
          <TabsTrigger value="automation" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Automation
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Milestones</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{milestones.length}</div>
                <p className="text-xs text-muted-foreground">
                  {milestones.filter(m => m.status === 'completed').length} completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {milestones.filter(m => m.status === 'in_progress').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Active milestones
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {milestones.filter(m => 
                    m.due_date && new Date(m.due_date) < new Date() && m.status !== 'completed'
                  ).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Need attention
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {milestones.slice(0, 5).map((milestone, index) => (
                  <div key={milestone.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="flex-shrink-0">
                      {milestone.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {milestone.status === 'in_progress' && <Clock className="h-4 w-4 text-blue-500" />}
                      {milestone.status === 'pending' && <Target className="h-4 w-4 text-gray-500" />}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{milestone.title}</div>
                      <div className="text-sm text-muted-foreground">
                        Status: {milestone.status} • Progress: {milestone.progress_percentage || 0}%
                      </div>
                    </div>
                    <Badge variant="outline">
                      {milestone.priority || 'normal'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights">
          <SmartMilestoneFeatures
            bookingId={bookingId}
            milestones={milestones}
            onMilestoneUpdate={onMilestoneUpdate}
            onTaskUpdate={onTaskUpdate}
          />
        </TabsContent>

        <TabsContent value="automation">
          <IntelligentTaskAutomation
            bookingId={bookingId}
            milestones={milestones}
            onMilestoneUpdate={onMilestoneUpdate}
            onTaskUpdate={onTaskUpdate}
          />
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Advanced Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Advanced Analytics Coming Soon</h3>
                <p className="text-muted-foreground mb-4">
                  Detailed project analytics, performance metrics, and predictive insights
                </p>
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Analytics
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
