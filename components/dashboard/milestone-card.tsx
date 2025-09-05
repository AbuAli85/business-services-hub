'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  ChevronDown, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Play,
  Pause,
  Calendar,
  Tag,
  Edit,
  MessageSquare,
  Eye,
  EyeOff
} from 'lucide-react'
import { format, parseISO } from 'date-fns'

interface Task {
  id: string
  title: string
  status: string
  progress_percentage: number
  due_date?: string
  editable: boolean
}

interface MilestoneCardProps {
  milestone: {
    id: string
    title: string
    description: string
    progress_percentage: number
    status: string
    due_date?: string
    weight: number
    order_index: number
    editable: boolean
    tasks: Task[]
    created_at?: string
    updated_at?: string
  }
  userRole: 'provider' | 'client'
  isExpanded: boolean
  onToggleExpanded: () => void
  onUpdateStep: (stepIndex: number, updatedStep: Task) => void
  onAddComment?: (milestoneId: string) => void
  className?: string
}

export function MilestoneCard({
  milestone,
  userRole,
  isExpanded,
  onToggleExpanded,
  onUpdateStep,
  onAddComment,
  className = ""
}: MilestoneCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editingStep, setEditingStep] = useState<number | null>(null)

  const getStepStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'in_progress':
        return <Play className="h-4 w-4 text-blue-600" />
      case 'delayed':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStepStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'delayed':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTagColor = (tag?: string) => {
    switch (tag) {
      case 'planning':
        return 'bg-purple-100 text-purple-800'
      case 'content':
        return 'bg-blue-100 text-blue-800'
      case 'posting':
        return 'bg-green-100 text-green-800'
      case 'reporting':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date() && milestone.status !== 'completed'
  }

  const handleStepStatusChange = (stepIndex: number, newStatus: string) => {
    if (userRole !== 'provider') return
    
    const updatedStep = {
      ...milestone.tasks[stepIndex],
      status: newStatus
    }
    onUpdateStep(stepIndex, updatedStep)
  }

  const handleStepEdit = (stepIndex: number) => {
    if (userRole !== 'provider') return
    setEditingStep(stepIndex)
    setIsEditing(true)
  }

  const completedSteps = milestone.tasks.filter(task => task.status === 'completed').length
  const totalSteps = milestone.tasks.length
  const overdue = isOverdue(milestone.due_date)

  return (
    <Card className={`border-0 shadow-lg transition-all duration-200 hover:shadow-xl ${className} ${
      overdue ? 'border-l-4 border-l-red-500 bg-red-50/30' : ''
    }`}>
      <CardHeader 
        className="cursor-pointer hover:bg-gray-50/50 transition-colors duration-200"
        onClick={onToggleExpanded}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button className="p-1 hover:bg-gray-200 rounded transition-colors duration-200">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-600" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-600" />
              )}
            </button>
            <div>
              <CardTitle className="text-lg flex items-center space-x-2">
                <span>{milestone.title}</span>
                {overdue && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Overdue
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                <Badge className="text-xs bg-blue-100 text-blue-800">
                  {milestone.status.replace('_', ' ')}
                </Badge>
                <span className="text-sm text-gray-500">
                  {completedSteps}/{totalSteps} tasks completed
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">
                {milestone.progress_percentage}%
              </div>
              <div className="text-xs text-gray-500">Progress</div>
            </div>
            {userRole === 'provider' && onAddComment && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation()
                  onAddComment(milestone.id)
                }}
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{milestone.progress_percentage}%</span>
          </div>
          <Progress 
            value={milestone.progress_percentage} 
            className="h-2"
            style={{
              '--progress-background': milestone.progress_percentage >= 100 ? '#10b981' : 
                                     milestone.progress_percentage >= 75 ? '#3b82f6' :
                                     milestone.progress_percentage >= 50 ? '#f59e0b' :
                                     milestone.progress_percentage >= 25 ? '#f97316' : '#ef4444'
            } as React.CSSProperties}
          />
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-3">
            {milestone.tasks.map((task, index) => (
              <div 
                key={index}
                className={`p-3 rounded-lg border transition-all duration-200 ${
                  task.status === 'completed' ? 'bg-green-50 border-green-200' :
                  task.status === 'in_progress' ? 'bg-blue-50 border-blue-200' :
                  task.status === 'delayed' ? 'bg-red-50 border-red-200' :
                  'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    {userRole === 'provider' ? (
                      <Checkbox
                        checked={task.status === 'completed'}
                        onCheckedChange={(checked) => {
                          handleStepStatusChange(index, checked ? 'completed' : 'pending')
                        }}
                        className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                      />
                    ) : (
                      <div className="w-4 h-4 flex items-center justify-center">
                        {getStepStatusIcon(task.status)}
                      </div>
                    )}
                    
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{task.title}</h4>
                      {task.due_date && (
                        <div className="flex items-center space-x-1 mt-1">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            Due: {format(new Date(task.due_date), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge className={`text-xs ${getStepStatusColor(task.status)}`}>
                      {getStepStatusIcon(task.status)}
                      <span className="ml-1 capitalize">{task.status.replace('_', ' ')}</span>
                    </Badge>
                    
                    {userRole === 'provider' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleStepEdit(index)}
                        className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {milestone.tasks.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No tasks defined for this milestone</p>
                {userRole === 'provider' && (
                  <p className="text-sm">Add tasks to track progress</p>
                )}
              </div>
            )}
          </div>
          
          {/* Milestone Actions */}
          {userRole === 'provider' && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-4">
              <div className="text-sm text-gray-500">
                Last updated: {milestone.updated_at ? format(parseISO(milestone.updated_at), 'MMM dd, yyyy HH:mm') : 'Unknown'}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  {isEditing ? <EyeOff className="h-4 w-4 mr-1" /> : <Edit className="h-4 w-4 mr-1" />}
                  {isEditing ? 'View' : 'Edit'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
