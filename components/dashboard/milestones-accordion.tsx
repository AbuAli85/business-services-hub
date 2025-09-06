'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Play, 
  Pause,
  Plus,
  Edit,
  Trash2,
  MessageSquare,
  Timer,
  Calendar,
  User
} from 'lucide-react'
import { Milestone, Task, TimeEntry } from '@/lib/progress-tracking'
import { format, formatDistanceToNow, isAfter, isBefore } from 'date-fns'
import { TaskManagement } from './task-management'
import { TimeTrackingWidget } from './time-tracking-widget'
import { CommentsSection } from './comments-section'

interface MilestonesAccordionProps {
  milestones: Milestone[]
  userRole: 'provider' | 'client'
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>
  onTaskCreate: (milestoneId: string, taskData: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'is_overdue' | 'actual_hours'>) => Promise<void>
  onTaskDelete: (taskId: string) => Promise<void>
  onMilestoneUpdate: (milestoneId: string, updates: Partial<Milestone>) => Promise<void>
  onStartTimeTracking: (taskId: string, description?: string) => Promise<void>
  onStopTimeTracking: (entryId: string) => Promise<void>
  timeEntries: TimeEntry[]
}

export function MilestonesAccordion({
  milestones,
  userRole,
  onTaskUpdate,
  onTaskCreate,
  onTaskDelete,
  onMilestoneUpdate,
  onStartTimeTracking,
  onStopTimeTracking,
  timeEntries
}: MilestonesAccordionProps) {
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set())
  const [activeTimeEntry, setActiveTimeEntry] = useState<TimeEntry | null>(null)

  // Auto-expand the first non-completed milestone
  useEffect(() => {
    const firstIncomplete = milestones.find(m => m.status !== 'completed' && m.status !== 'cancelled')
    if (firstIncomplete) {
      setExpandedMilestones(new Set([firstIncomplete.id]))
    }
  }, [milestones])

  // Get active time entry
  useEffect(() => {
    const active = timeEntries.find(entry => entry.is_active)
    setActiveTimeEntry(active || null)
  }, [timeEntries])

  // Get phase color based on milestone order
  const getPhaseColor = (index: number) => {
    const phases = [
      { name: 'Planning', color: 'bg-blue-100 text-blue-800 border-blue-200' },
      { name: 'Development', color: 'bg-orange-100 text-orange-800 border-orange-200' },
      { name: 'Testing', color: 'bg-purple-100 text-purple-800 border-purple-200' },
      { name: 'Delivery', color: 'bg-green-100 text-green-800 border-green-200' }
    ]
    return phases[index % phases.length]
  }

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

  // Handle milestone status change
  const handleMilestoneStatusChange = async (milestoneId: string, status: string) => {
    await onMilestoneUpdate(milestoneId, { 
      status: status as any,
      ...(status === 'completed' && { completed_at: new Date().toISOString() })
    })
  }

  // Handle accordion change
  const handleAccordionChange = (value: string) => {
    if (value) {
      setExpandedMilestones(new Set([value]))
    } else {
      setExpandedMilestones(new Set())
    }
  }

  if (milestones.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-center">
            <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">No milestones found</p>
            <p className="text-sm text-gray-400">Milestones will appear here once created</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Accordion 
        type="single" 
        collapsible 
        value={Array.from(expandedMilestones)[0]}
        onValueChange={handleAccordionChange}
        className="space-y-2"
      >
        {milestones.map((milestone, index) => {
          const phase = getPhaseColor(index)
          const overdue = isOverdue(milestone)
          const completedTasks = milestone.tasks?.filter(t => t.status === 'completed').length || 0
          const totalTasks = milestone.tasks?.length || 0

          return (
            <AccordionItem 
              key={milestone.id} 
              value={milestone.id}
              className="border rounded-lg"
            >
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center space-x-3">
                    <div className={`px-2 py-1 rounded text-xs font-medium ${phase.color}`}>
                      {phase.name}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {milestone.title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {milestone.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    {/* Progress */}
                    <div className="text-right">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900">
                          {milestone.progress_percentage}%
                        </span>
                        <Progress 
                          value={milestone.progress_percentage} 
                          className="w-20 h-2"
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        {completedTasks}/{totalTasks} tasks
                      </p>
                    </div>

                    {/* Status */}
                    <Badge className={getStatusColor(milestone.status)}>
                      {milestone.status.replace('_', ' ')}
                    </Badge>

                    {/* Overdue indicator */}
                    {overdue && (
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="px-6 pb-6">
                <div className="space-y-6">
                  {/* Milestone Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Due Date</p>
                      <p className="text-sm text-gray-900">
                        {milestone.due_date ? format(new Date(milestone.due_date), 'MMM dd, yyyy') : 'No due date'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Last Updated</p>
                      <p className="text-sm text-gray-900">
                        {formatDistanceToNow(new Date(milestone.updated_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Estimated Hours</p>
                      <p className="text-sm text-gray-900">
                        {milestone.estimated_hours || 0}h
                      </p>
                    </div>
                  </div>

                  {/* Milestone Actions */}
                  {userRole === 'provider' && (
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMilestoneStatusChange(milestone.id, 'in_progress')}
                        disabled={milestone.status === 'in_progress'}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Start
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMilestoneStatusChange(milestone.id, 'on_hold')}
                        disabled={milestone.status === 'on_hold'}
                      >
                        <Pause className="h-4 w-4 mr-1" />
                        Pause
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMilestoneStatusChange(milestone.id, 'completed')}
                        disabled={milestone.status === 'completed'}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Complete
                      </Button>
                    </div>
                  )}

                  {/* Tasks Management */}
                  <TaskManagement
                    milestone={milestone}
                    userRole={userRole}
                    onTaskUpdate={onTaskUpdate}
                    onTaskCreate={onTaskCreate}
                    onTaskDelete={onTaskDelete}
                    onStartTimeTracking={onStartTimeTracking}
                    onStopTimeTracking={onStopTimeTracking}
                    activeTimeEntry={activeTimeEntry}
                  />

                  {/* Time Tracking */}
                  {userRole === 'provider' && (
                    <TimeTrackingWidget
                      milestone={milestone}
                      activeTimeEntry={activeTimeEntry}
                      onStartTimeTracking={onStartTimeTracking}
                      onStopTimeTracking={onStopTimeTracking}
                    />
                  )}

                  {/* Comments Section */}
                  <CommentsSection
                    milestone={milestone}
                    userRole={userRole}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </div>
  )
}
