'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Play,
  Calendar,
  Target,
  ArrowRight,
  ArrowDown
} from 'lucide-react'
import { Milestone } from '@/lib/progress-tracking'
import { format, formatDistanceToNow, isAfter, isBefore } from 'date-fns'

interface TimelineViewProps {
  milestones: Milestone[]
  userRole: 'provider' | 'client'
  onMilestoneClick: (milestoneId: string) => void
}

type TimelineStage = 'started' | 'in_progress' | 'review' | 'complete'

export function TimelineView({
  milestones,
  userRole,
  onMilestoneClick
}: TimelineViewProps) {
  const [expandedStage, setExpandedStage] = useState<TimelineStage | null>(null)

  // Define timeline stages
  const stages: { key: TimelineStage; label: string; color: string; icon: any }[] = [
    { key: 'started', label: 'Started', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Play },
    { key: 'in_progress', label: 'In Progress', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: Clock },
    { key: 'review', label: 'Review', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Target },
    { key: 'complete', label: 'Complete', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle }
  ]

  // Categorize milestones by stage
  const categorizeMilestones = () => {
    const categorized = {
      started: [] as Milestone[],
      in_progress: [] as Milestone[],
      review: [] as Milestone[],
      complete: [] as Milestone[]
    }

    milestones.forEach(milestone => {
      switch (milestone.status) {
        case 'pending':
          categorized.started.push(milestone)
          break
        case 'in_progress':
          categorized.in_progress.push(milestone)
          break
        case 'completed':
          categorized.complete.push(milestone)
          break
        case 'on_hold':
        case 'cancelled':
          // These could go in review or started depending on context
          if (milestone.progress_percentage > 0) {
            categorized.review.push(milestone)
          } else {
            categorized.started.push(milestone)
          }
          break
        default:
          categorized.started.push(milestone)
      }
    })

    return categorized
  }

  const categorizedMilestones = categorizeMilestones()

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'on_hold':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Check if milestone is overdue
  const isOverdue = (milestone: Milestone) => {
    if (!milestone.due_date || milestone.status === 'completed' || milestone.status === 'cancelled') {
      return false
    }
    return isBefore(new Date(milestone.due_date), new Date())
  }

  // Get connector color based on stage completion
  const getConnectorColor = (stage: TimelineStage, nextStage: TimelineStage) => {
    const currentStageMilestones = categorizedMilestones[stage]
    const nextStageMilestones = categorizedMilestones[nextStage]
    
    if (currentStageMilestones.length === 0) return 'bg-gray-200'
    if (nextStageMilestones.length > 0) return 'bg-green-500'
    return 'bg-blue-500'
  }

  return (
    <div className="space-y-6">
      {/* Timeline Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Project Timeline</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600">
            Track your project progress through different stages. Click on milestones to view details.
          </div>
        </CardContent>
      </Card>

      {/* Timeline Stepper */}
      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>

        {/* Timeline Stages */}
        <div className="space-y-8">
          {stages.map((stage, index) => {
            const stageMilestones = categorizedMilestones[stage.key]
            const isExpanded = expandedStage === stage.key
            const nextStage = stages[index + 1]
            const connectorColor = nextStage ? getConnectorColor(stage.key, nextStage.key) : 'bg-gray-200'

            return (
              <div key={stage.key} className="relative">
                {/* Stage Header */}
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className={`w-16 h-16 rounded-full border-2 ${stage.color} flex items-center justify-center z-10 relative`}>
                      <stage.icon className="h-6 w-6" />
                    </div>
                    {/* Connector to next stage */}
                    {nextStage && (
                      <div className={`absolute top-8 left-1/2 transform -translate-x-1/2 w-0.5 h-8 ${connectorColor}`}></div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{stage.label}</h3>
                        <p className="text-sm text-gray-600">
                          {stageMilestones.length} milestone{stageMilestones.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className={stage.color}>
                          {stageMilestones.length}
                        </Badge>
                        {stageMilestones.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedStage(isExpanded ? null : stage.key)}
                            className="flex items-center space-x-1"
                          >
                            {isExpanded ? (
                              <ArrowDown className="h-4 w-4" />
                            ) : (
                              <ArrowRight className="h-4 w-4" />
                            )}
                            <span>{isExpanded ? 'Hide' : 'Show'}</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stage Milestones */}
                {isExpanded && stageMilestones.length > 0 && (
                  <div className="ml-20 mt-4 space-y-3">
                    {stageMilestones.map((milestone) => {
                      const completedTasks = milestone.tasks?.filter(t => t.status === 'completed').length || 0
                      const totalTasks = milestone.tasks?.length || 0
                      const overdue = isOverdue(milestone)

                      return (
                        <Card
                          key={milestone.id}
                          className={`cursor-pointer hover:shadow-md transition-shadow ${
                            overdue ? 'border-red-200 bg-red-50' : 'border-gray-200'
                          }`}
                          onClick={() => onMilestoneClick(milestone.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <h4 className="font-medium text-gray-900">{milestone.title}</h4>
                                  <Badge className={getStatusColor(milestone.status)}>
                                    {milestone.status.replace('_', ' ')}
                                  </Badge>
                                  {overdue && (
                                    <AlertTriangle className="h-4 w-4 text-red-500" />
                                  )}
                                </div>
                                
                                <p className="text-sm text-gray-600 mb-3">{milestone.description}</p>
                                
                                <div className="flex items-center space-x-4 text-xs text-gray-500">
                                  <div className="flex items-center space-x-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>
                                      {milestone.due_date 
                                        ? format(new Date(milestone.due_date), 'MMM dd, yyyy')
                                        : 'No due date'
                                      }
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <Target className="h-3 w-3" />
                                    <span>{completedTasks}/{totalTasks} tasks</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <Clock className="h-3 w-3" />
                                    <span>{milestone.estimated_hours || 0}h estimated</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="text-right">
                                <div className="text-2xl font-bold text-gray-900">
                                  {milestone.progress_percentage}%
                                </div>
                                <div className="w-20 h-2 bg-gray-200 rounded-full mt-1">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${milestone.progress_percentage}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}

                {/* Empty State */}
                {isExpanded && stageMilestones.length === 0 && (
                  <div className="ml-20 mt-4">
                    <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                      <stage.icon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">No milestones in this stage</p>
                      <p className="text-sm text-gray-400">Milestones will appear here as they progress</p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Timeline Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Timeline Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stages.map((stage) => {
              const stageMilestones = categorizedMilestones[stage.key]
              const completedCount = stageMilestones.filter(m => m.status === 'completed').length
              
              return (
                <div key={stage.key} className="text-center">
                  <div className={`w-12 h-12 rounded-full ${stage.color} flex items-center justify-center mx-auto mb-2`}>
                    <stage.icon className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-medium text-gray-900">{stage.label}</p>
                  <p className="text-lg font-bold text-gray-900">{stageMilestones.length}</p>
                  {completedCount > 0 && (
                    <p className="text-xs text-green-600">{completedCount} completed</p>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
