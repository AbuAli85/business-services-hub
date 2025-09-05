'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus, Edit, Trash2, MessageSquare, CheckCircle, Circle, Clock, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Milestone, Task } from '@/types/progress'

interface MilestoneAccordionCardsProps {
  milestones: Milestone[]
  userRole: 'provider' | 'client'
  onMilestoneUpdate: (milestoneId: string, updates: Partial<Milestone>) => void
  onTaskUpdate: (milestoneId: string, taskId: string, updates: Partial<Task>) => void
  onAddTask: (milestoneId: string, task: Omit<Task, 'id'>) => void
  onDeleteTask: (milestoneId: string, taskId: string) => void
  onAddComment: (milestoneId: string, comment: string) => void
  onRequestChanges: (milestoneId: string, reason: string) => void
}

export function MilestoneAccordionCards({
  milestones,
  userRole,
  onMilestoneUpdate,
  onTaskUpdate,
  onAddTask,
  onDeleteTask,
  onAddComment,
  onRequestChanges
}: MilestoneAccordionCardsProps) {
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set())
  const [editingMilestone, setEditingMilestone] = useState<string | null>(null)
  const [editingTask, setEditingTask] = useState<string | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newComment, setNewComment] = useState('')
  const [changeRequest, setChangeRequest] = useState('')

  const toggleMilestone = (milestoneId: string) => {
    const newExpanded = new Set(expandedMilestones)
    if (newExpanded.has(milestoneId)) {
      newExpanded.delete(milestoneId)
    } else {
      newExpanded.add(milestoneId)
    }
    setExpandedMilestones(newExpanded)
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'on_hold': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTaskStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'in_progress': return <Clock className="h-4 w-4 text-blue-600" />
      case 'overdue': return <AlertCircle className="h-4 w-4 text-red-600" />
      default: return <Circle className="h-4 w-4 text-gray-400" />
    }
  }

  const handleTaskToggle = (milestoneId: string, taskId: string, completed: boolean) => {
    const updates = {
      status: completed ? 'completed' : 'pending',
      progress_percentage: completed ? 100 : 0
    }
    onTaskUpdate(milestoneId, taskId, updates)
  }

  const handleAddTask = (milestoneId: string) => {
    if (newTaskTitle.trim()) {
      onAddTask(milestoneId, {
        title: newTaskTitle,
        status: 'pending',
        progress_percentage: 0,
        editable: true
      })
      setNewTaskTitle('')
    }
  }

  const handleAddComment = (milestoneId: string) => {
    if (newComment.trim()) {
      onAddComment(milestoneId, newComment)
      setNewComment('')
    }
  }

  const handleRequestChanges = (milestoneId: string) => {
    if (changeRequest.trim()) {
      onRequestChanges(milestoneId, changeRequest)
      setChangeRequest('')
    }
  }

  const isOverdue = (dueDate: string, status: string) => {
    if (status === 'completed') return false
    return new Date(dueDate) < new Date()
  }

  return (
    <div className="space-y-4">
      {milestones.map((milestone) => {
        const isExpanded = expandedMilestones.has(milestone.id)
        const color = getMilestoneColor(milestone.title)
        const icon = getMilestoneIcon(milestone.title)
        const completedTasks = milestone.tasks?.filter(t => t.status === 'completed').length || 0
        const totalTasks = milestone.tasks?.length || 0

        return (
          <div key={milestone.id} className={`bg-white border border-${color}-200 rounded-lg shadow-sm hover:shadow-md transition-shadow`}>
            {/* Milestone Header */}
            <div 
              className={`p-4 cursor-pointer border-l-4 border-${color}-500`}
              onClick={() => toggleMilestone(milestone.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{milestone.title}</h3>
                      <Badge className={`text-xs ${getStatusColor(milestone.status)}`}>
                        {milestone.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-1">{milestone.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-lg font-semibold text-gray-900">{milestone.progress_percentage}%</div>
                    <div className="text-xs text-gray-500">{completedTasks}/{totalTasks} tasks</div>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-3">
                <Progress value={milestone.progress_percentage} className="h-2" />
              </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="border-t border-gray-200 p-4">
                <div className="space-y-4">
                  {/* Tasks Section */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">Tasks</h4>
                      {userRole === 'provider' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingTask(milestone.id)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Task
                        </Button>
                      )}
                    </div>

                    {/* Add Task Form */}
                    {editingTask === milestone.id && userRole === 'provider' && (
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Task title..."
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleAddTask(milestone.id)}
                            disabled={!newTaskTitle.trim()}
                          >
                            Add
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingTask(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Tasks List */}
                    <div className="space-y-2">
                      {milestone.tasks?.map((task) => (
                        <div key={task.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                          <Checkbox
                            checked={task.status === 'completed'}
                            onCheckedChange={(checked) => 
                              handleTaskToggle(milestone.id, task.id, checked as boolean)
                            }
                            disabled={userRole === 'client' || !task.editable}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {getTaskStatusIcon(task.status)}
                              <span className={`text-sm ${task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                {task.title}
                              </span>
                              {task.due_date && isOverdue(task.due_date, task.status) && (
                                <Badge variant="destructive" className="text-xs">
                                  Overdue
                                </Badge>
                              )}
                            </div>
                            {task.due_date && (
                              <div className="text-xs text-gray-500 mt-1">
                                Due: {new Date(task.due_date).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                          
                          {userRole === 'provider' && task.editable && (
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingTask(task.id)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onDeleteTask(milestone.id, task.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {(!milestone.tasks || milestone.tasks.length === 0) && (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          No tasks yet. {userRole === 'provider' && 'Add a task to get started.'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Comments & Actions Section */}
                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="font-medium text-gray-900 mb-3">Comments & Actions</h4>
                    
                    {/* Add Comment */}
                    <div className="space-y-2">
                      <Textarea
                        placeholder={userRole === 'client' ? 'Add a comment or feedback...' : 'Add a comment...'}
                        value={userRole === 'client' ? newComment : newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="min-h-[80px]"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAddComment(milestone.id)}
                          disabled={!newComment.trim()}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Add Comment
                        </Button>
                        
                        {userRole === 'client' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setChangeRequest(milestone.id)}
                          >
                            Request Changes
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Request Changes Modal */}
                    {changeRequest === milestone.id && userRole === 'client' && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <Textarea
                          placeholder="What changes would you like to request?"
                          value={changeRequest}
                          onChange={(e) => setChangeRequest(e.target.value)}
                          className="min-h-[60px] mb-2"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleRequestChanges(milestone.id)}
                            disabled={!changeRequest.trim()}
                          >
                            Submit Request
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setChangeRequest('')}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
