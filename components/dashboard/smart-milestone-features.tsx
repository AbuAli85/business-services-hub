'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Brain, 
  Zap, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Target,
  BarChart3,
  Lightbulb,
  RefreshCw,
  ArrowRight,
  Calendar,
  Users,
  Activity
} from 'lucide-react'
import { toast } from 'sonner'

interface SmartMilestoneFeaturesProps {
  bookingId: string
  milestones: any[]
  onMilestoneUpdate: (milestoneId: string, status: string) => Promise<void>
  onTaskUpdate: (taskId: string, status: string) => Promise<void>
}

export function SmartMilestoneFeatures({ 
  bookingId, 
  milestones, 
  onMilestoneUpdate, 
  onTaskUpdate 
}: SmartMilestoneFeaturesProps) {
  const [insights, setInsights] = useState<any>(null)
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [predictions, setPredictions] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    generateInsights()
  }, [milestones])

  const generateInsights = async () => {
    setLoading(true)
    try {
      // Calculate project insights
      const totalMilestones = milestones.length
      const completedMilestones = milestones.filter(m => m.status === 'completed').length
      const inProgressMilestones = milestones.filter(m => m.status === 'in_progress').length
      const overdueMilestones = milestones.filter(m => 
        m.due_date && new Date(m.due_date) < new Date() && m.status !== 'completed'
      ).length

      const totalTasks = milestones.reduce((acc, m) => acc + (m.tasks?.length || 0), 0)
      const completedTasks = milestones.reduce((acc, m) => 
        acc + (m.tasks?.filter((t: any) => t.status === 'completed').length || 0), 0
      )
      const overdueTasks = milestones.reduce((acc, m) => 
        acc + (m.tasks?.filter((t: any) => 
          t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed'
        ).length || 0), 0
      )

      // Calculate project health score
      const healthScore = calculateHealthScore({
        totalMilestones,
        completedMilestones,
        inProgressMilestones,
        overdueMilestones,
        totalTasks,
        completedTasks,
        overdueTasks
      })

      // Generate recommendations
      const recommendations = generateRecommendations({
        milestones,
        healthScore,
        overdueMilestones,
        overdueTasks
      })

      // Calculate predictions
      const predictions = calculatePredictions(milestones)

      setInsights({
        healthScore,
        totalMilestones,
        completedMilestones,
        inProgressMilestones,
        overdueMilestones,
        totalTasks,
        completedTasks,
        overdueTasks,
        completionRate: totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0,
        taskCompletionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
      })

      setRecommendations(recommendations)
      setPredictions(predictions)

    } catch (error) {
      console.error('Error generating insights:', error)
      toast.error('Failed to generate insights')
    } finally {
      setLoading(false)
    }
  }

  const calculateHealthScore = (metrics: any) => {
    let score = 100

    // Deduct for overdue items
    score -= (metrics.overdueMilestones * 15)
    score -= (metrics.overdueTasks * 5)

    // Deduct for low completion rates
    if (metrics.completionRate < 50) score -= 20
    if (metrics.taskCompletionRate < 30) score -= 15

    // Bonus for good progress
    if (metrics.completionRate > 80) score += 10
    if (metrics.taskCompletionRate > 70) score += 10

    return Math.max(0, Math.min(100, score))
  }

  const generateRecommendations = (data: any) => {
    const recommendations = []

    // Overdue items
    if (data.overdueMilestones > 0) {
      recommendations.push({
        type: 'urgent',
        icon: AlertTriangle,
        title: 'Overdue Milestones',
        description: `${data.overdueMilestones} milestone(s) are overdue`,
        action: 'Review and update due dates or reassign resources',
        priority: 'high'
      })
    }

    if (data.overdueTasks > 0) {
      recommendations.push({
        type: 'warning',
        icon: Clock,
        title: 'Overdue Tasks',
        description: `${data.overdueTasks} task(s) are overdue`,
        action: 'Prioritize and complete overdue tasks',
        priority: 'medium'
      })
    }

    // Low completion rates
    if (data.healthScore < 60) {
      recommendations.push({
        type: 'info',
        icon: TrendingUp,
        title: 'Project Health Low',
        description: 'Project health score is below optimal',
        action: 'Focus on completing in-progress items and reducing bottlenecks',
        priority: 'high'
      })
    }

    // Resource optimization
    const inProgressCount = data.milestones.filter((m: any) => m.status === 'in_progress').length
    if (inProgressCount > 3) {
      recommendations.push({
        type: 'info',
        icon: Users,
        title: 'Resource Spread',
        description: 'Many milestones in progress simultaneously',
        action: 'Consider focusing on fewer milestones at once for better efficiency',
        priority: 'medium'
      })
    }

    // Completion predictions
    if (data.predictions?.estimatedCompletion && data.predictions.riskLevel === 'high') {
      recommendations.push({
        type: 'warning',
        icon: Target,
        title: 'Completion Risk',
        description: 'High risk of missing project deadline',
        action: 'Consider extending timeline or adding resources',
        priority: 'high'
      })
    }

    return recommendations
  }

  const calculatePredictions = (milestones: any[]) => {
    const now = new Date()
    const totalEstimatedHours = milestones.reduce((acc, m) => acc + (m.estimated_hours || 0), 0)
    const completedHours = milestones.reduce((acc, m) => {
      if (m.status === 'completed') return acc + (m.estimated_hours || 0)
      if (m.status === 'in_progress') return acc + ((m.estimated_hours || 0) * (m.progress_percentage || 0) / 100)
      return acc
    }, 0)

    const remainingHours = totalEstimatedHours - completedHours
    const completionRate = totalEstimatedHours > 0 ? completedHours / totalEstimatedHours : 0

    // Estimate completion date based on current velocity
    const avgDailyHours = completionRate > 0 ? completedHours / Math.max(1, getDaysSinceStart(milestones)) : 8
    const estimatedDaysToComplete = avgDailyHours > 0 ? remainingHours / avgDailyHours : 30
    const estimatedCompletion = new Date(now.getTime() + estimatedDaysToComplete * 24 * 60 * 60 * 1000)

    // Calculate risk level
    let riskLevel = 'low'
    const overdueCount = milestones.filter(m => 
      m.due_date && new Date(m.due_date) < now && m.status !== 'completed'
    ).length

    if (overdueCount > 2 || completionRate < 0.3) riskLevel = 'high'
    else if (overdueCount > 0 || completionRate < 0.6) riskLevel = 'medium'

    return {
      estimatedCompletion,
      estimatedDaysToComplete,
      completionRate,
      riskLevel,
      totalEstimatedHours,
      completedHours,
      remainingHours
    }
  }

  const getDaysSinceStart = (milestones: any[]) => {
    const startDates = milestones
      .map(m => m.start_date ? new Date(m.start_date) : null)
      .filter(Boolean)
      .sort((a, b) => a!.getTime() - b!.getTime())
    
    if (startDates.length === 0) return 1
    const startDate = startDates[0]!
    return Math.max(1, Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
  }

  const handleRecommendationAction = async (recommendation: any) => {
    switch (recommendation.type) {
      case 'urgent':
        // Focus on overdue milestones
        toast.info('Filtering to show overdue milestones')
        break
      case 'warning':
        // Show task prioritization
        toast.info('Opening task prioritization view')
        break
      case 'info':
        // Show detailed analytics
        toast.info('Opening detailed project analytics')
        break
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Generating insights...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Project Health Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Project Health Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Health Score */}
            <div className="text-center">
              <div className={`text-3xl font-bold mb-2 ${
                insights?.healthScore > 80 ? 'text-green-600' : 
                insights?.healthScore > 60 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {insights?.healthScore?.toFixed(0) || 0}
              </div>
              <div className="text-sm text-muted-foreground">Health Score</div>
              <Progress 
                value={insights?.healthScore || 0} 
                className="mt-2"
              />
            </div>

            {/* Completion Rate */}
            <div className="text-center">
              <div className="text-3xl font-bold mb-2 text-blue-600">
                {insights?.completionRate?.toFixed(1) || 0}%
              </div>
              <div className="text-sm text-muted-foreground">Milestone Completion</div>
              <div className="text-xs text-muted-foreground mt-1">
                {insights?.completedMilestones || 0} of {insights?.totalMilestones || 0} completed
              </div>
            </div>

            {/* Task Progress */}
            <div className="text-center">
              <div className="text-3xl font-bold mb-2 text-green-600">
                {insights?.taskCompletionRate?.toFixed(1) || 0}%
              </div>
              <div className="text-sm text-muted-foreground">Task Completion</div>
              <div className="text-xs text-muted-foreground mt-1">
                {insights?.completedTasks || 0} of {insights?.totalTasks || 0} completed
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Smart Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recommendations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p>Great job! No immediate actions needed.</p>
                <p className="text-sm">Your project is on track.</p>
              </div>
            ) : (
              recommendations.map((rec, index) => (
                <Alert key={index} className={`border-l-4 ${
                  rec.priority === 'high' ? 'border-red-500' :
                  rec.priority === 'medium' ? 'border-yellow-500' : 'border-blue-500'
                }`}>
                  <rec.icon className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold">{rec.title}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {rec.description}
                        </div>
                        <div className="text-sm mt-2">{rec.action}</div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRecommendationAction(rec)}
                        className="ml-4"
                      >
                        Take Action
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Predictive Analytics */}
      {predictions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Predictive Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Estimated Completion</h4>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {predictions.estimatedCompletion?.toLocaleDateString() || 'N/A'}
                  </span>
                  <Badge variant={
                    predictions.riskLevel === 'high' ? 'destructive' :
                    predictions.riskLevel === 'medium' ? 'secondary' : 'default'
                  }>
                    {predictions.riskLevel} risk
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  ~{Math.round(predictions.estimatedDaysToComplete || 0)} days remaining
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Progress Breakdown</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Completed:</span>
                    <span>{Math.round(predictions.completedHours || 0)}h</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Remaining:</span>
                    <span>{Math.round(predictions.remainingHours || 0)}h</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Total:</span>
                    <span>{Math.round(predictions.totalEstimatedHours || 0)}h</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-20 flex flex-col gap-2"
              onClick={() => toast.info('Opening milestone templates')}
            >
              <Target className="h-6 w-6" />
              <span className="text-sm">Templates</span>
            </Button>
            
            <Button
              variant="outline"
              className="h-20 flex flex-col gap-2"
              onClick={() => toast.info('Opening resource allocation')}
            >
              <Users className="h-6 w-6" />
              <span className="text-sm">Resources</span>
            </Button>
            
            <Button
              variant="outline"
              className="h-20 flex flex-col gap-2"
              onClick={() => generateInsights()}
            >
              <RefreshCw className="h-6 w-6" />
              <span className="text-sm">Refresh</span>
            </Button>
            
            <Button
              variant="outline"
              className="h-20 flex flex-col gap-2"
              onClick={() => toast.info('Opening detailed analytics')}
            >
              <BarChart3 className="h-6 w-6" />
              <span className="text-sm">Analytics</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
