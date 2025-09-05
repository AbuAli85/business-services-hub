'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, Circle, Clock, AlertCircle, Calendar, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Milestone, Task } from '@/types/progress'

interface TimelineStepperProps {
  milestones: Milestone[]
  userRole: 'provider' | 'client'
  onMilestoneClick?: (milestoneId: string) => void
}

const timelineSteps = [
  { id: 'started', label: 'Started', icon: Circle, color: 'gray' },
  { id: 'in_progress', label: 'In Progress', icon: Clock, color: 'blue' },
  { id: 'review', label: 'Review', icon: AlertCircle, color: 'yellow' },
  { id: 'complete', label: 'Complete', icon: CheckCircle, color: 'green' }
]

export function TimelineStepper({
  milestones,
  userRole,
  onMilestoneClick
}: TimelineStepperProps) {
  const [currentStep, setCurrentStep] = useState('started')
  const [stepProgress, setStepProgress] = useState(0)

  // Sort milestones by order_index
  const sortedMilestones = [...milestones].sort((a, b) => a.order_index - b.order_index)

  useEffect(() => {
    calculateCurrentStep()
  }, [sortedMilestones])

  const calculateCurrentStep = () => {
    if (!sortedMilestones.length) return

    const completedMilestones = sortedMilestones.filter(m => m.status === 'completed')
    const inProgressMilestones = sortedMilestones.filter(m => m.status === 'in_progress')
    const pendingMilestones = sortedMilestones.filter(m => m.status === 'pending')

    if (completedMilestones.length === sortedMilestones.length) {
      setCurrentStep('complete')
      setStepProgress(100)
    } else if (inProgressMilestones.length > 0) {
      setCurrentStep('in_progress')
      setStepProgress(75)
    } else if (pendingMilestones.length > 0) {
      setCurrentStep('started')
      setStepProgress(25)
    } else {
      setCurrentStep('review')
      setStepProgress(50)
    }
  }

  const getStepColor = (stepId: string, isActive: boolean, isCompleted: boolean) => {
    if (isCompleted) return 'text-green-600 bg-green-100 border-green-200'
    if (isActive) return 'text-blue-600 bg-blue-100 border-blue-200'
    return 'text-gray-400 bg-gray-100 border-gray-200'
  }

  const getMilestoneStatus = (milestone: Milestone) => {
    if (milestone.status === 'completed') return 'complete'
    if (milestone.status === 'in_progress') return 'in_progress'
    if (milestone.status === 'pending') return 'started'
    return 'review'
  }

  const getMilestoneIcon = (title: string) => {
    const lowerTitle = title.toLowerCase()
    if (lowerTitle.includes('planning') || lowerTitle.includes('plan')) return '📋'
    if (lowerTitle.includes('development') || lowerTitle.includes('dev')) return '⚙️'
    if (lowerTitle.includes('testing') || lowerTitle.includes('test')) return '🧪'
    if (lowerTitle.includes('delivery') || lowerTitle.includes('deploy')) return '🚀'
    return '📌'
  }

  const getMilestoneColor = (title: string) => {
    const lowerTitle = title.toLowerCase()
    if (lowerTitle.includes('planning') || lowerTitle.includes('plan')) return 'blue'
    if (lowerTitle.includes('development') || lowerTitle.includes('dev')) return 'orange'
    if (lowerTitle.includes('testing') || lowerTitle.includes('test')) return 'purple'
    if (lowerTitle.includes('delivery') || lowerTitle.includes('deploy')) return 'green'
    return 'gray'
  }

  const isOverdue = (dueDate: string, status: string) => {
    if (status === 'completed') return false
    return new Date(dueDate) < new Date()
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Project Timeline</h3>
        <div className="text-sm text-gray-600">
          {milestones.filter(m => m.status === 'completed').length} of {milestones.length} milestones completed
        </div>
      </div>

      {/* Timeline Steps */}
      <div className="relative">
        <div className="flex items-center justify-between">
          {timelineSteps.map((step, index) => {
            const Icon = step.icon
            const isActive = currentStep === step.id
            const isCompleted = step.id === 'started' ? 
              milestones.some(m => m.status !== 'pending') :
              step.id === 'in_progress' ?
                milestones.some(m => m.status === 'in_progress') :
                step.id === 'review' ?
                  milestones.some(m => m.status === 'on_hold' || m.status === 'review') :
                  milestones.every(m => m.status === 'completed')

            return (
              <div key={step.id} className="flex flex-col items-center">
                <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${getStepColor(step.id, isActive, isCompleted)}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="mt-2 text-center">
                  <div className={`text-sm font-medium ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'}`}>
                    {step.label}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Progress Line */}
        <div className="absolute top-6 left-6 right-6 h-0.5 bg-gray-200 -z-10">
          <div 
            className={`h-full bg-blue-600 timeline-progress-line ${
              stepProgress >= 100 ? 'timeline-progress-100' :
              stepProgress >= 75 ? 'timeline-progress-75' :
              stepProgress >= 50 ? 'timeline-progress-50' :
              stepProgress >= 25 ? 'timeline-progress-25' : 'timeline-progress-0'
            }`}
          />
        </div>
      </div>

      {/* Milestones by Status */}
      <div className="mt-8 space-y-6">
        {timelineSteps.map((step) => {
          const stepMilestones = sortedMilestones.filter(m => getMilestoneStatus(m) === step.id)
          
          if (stepMilestones.length === 0) return null

          return (
            <div key={step.id} className="space-y-3">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-gray-900">{step.label}</h4>
                <Badge className="bg-gray-100 text-gray-800">
                  {stepMilestones.length} milestone{stepMilestones.length !== 1 ? 's' : ''}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stepMilestones.map((milestone) => {
                  const color = getMilestoneColor(milestone.title)
                  const icon = getMilestoneIcon(milestone.title)
                  const isOverdueMilestone = milestone.due_date && isOverdue(milestone.due_date, milestone.status)

                  return (
                    <div 
                      key={milestone.id}
                      className={`p-4 border border-${color}-200 rounded-lg cursor-pointer hover:shadow-md transition-shadow bg-${color}-50`}
                      onClick={() => onMilestoneClick?.(milestone.id)}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h5 className="font-medium text-gray-900 truncate">{milestone.title}</h5>
                            {isOverdueMilestone && (
                              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-600 line-clamp-2 mb-3">{milestone.description}</p>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Progress</span>
                              <span className="font-medium">{milestone.progress_percentage}%</span>
                            </div>
                            <Progress value={milestone.progress_percentage} className="h-2" />
                            
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>
                                {milestone.tasks?.filter(t => t.status === 'completed').length || 0} of {milestone.tasks?.length || 0} tasks
                              </span>
                              {milestone.due_date && (
                                <span className={isOverdueMilestone ? 'text-red-600' : ''}>
                                  Due: {new Date(milestone.due_date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Timeline Summary */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600">
              {sortedMilestones.filter(m => m.status === 'completed').length}
            </div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {sortedMilestones.filter(m => m.status === 'in_progress').length}
            </div>
            <div className="text-sm text-gray-600">In Progress</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-600">
              {sortedMilestones.filter(m => m.status === 'pending').length}
            </div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
        </div>
      </div>
    </div>
  )
}
