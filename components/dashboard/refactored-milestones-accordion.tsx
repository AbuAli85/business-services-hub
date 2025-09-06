'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, Plus, Edit, Trash2, MessageSquare, CheckCircle, Circle, Clock, AlertCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Milestone, Task } from '@/lib/progress-tracking'
import { isMilestoneOverdue, isTaskOverdue } from '@/lib/progress-calculations'

interface RefactoredMilestonesAccordionProps {
  milestones: Milestone[]
  userRole: 'provider' | 'client'
  onMilestoneUpdate: (milestoneId: string, updates: Partial<Milestone>) => void
  onTaskUpdate: (milestoneId: string, taskId: string, updates: Partial<Task>) => void
  onAddTask: (milestoneId: string, task: Omit<Task, 'id'>) => void
  onDeleteTask: (milestoneId: string, taskId: string) => void
  onAddComment: (milestoneId: string, comment: string) => void
  onRequestChanges: (milestoneId: string, reason: string) => void
}

export function RefactoredMilestonesAccordion({
  milestones,
  userRole,
  onMilestoneUpdate,
  onTaskUpdate,
  onAddTask,
  onDeleteTask,
  onAddComment,
  onRequestChanges
}: RefactoredMilestonesAccordionProps) {
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set())
  const [editingTask, setEditingTask] = useState<string | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newComment, setNewComment] = useState('')
  const [changeRequest, setChangeRequest] = useState('')

  // Sort milestones by order_index and find current milestone (first non-completed milestone)
  const sortedMilestones = [...milestones].sort((a, b) => a.order_index - b.order_index)
  const currentMilestone = sortedMilestones.find(m => m.status !== 'completed') || sortedMilestones[0]

  useEffect(() => {
    // Only expand the current milestone by default
    if (currentMilestone) {
      setExpandedMilestones(new Set([currentMilestone.id]))
    }
  }, [currentMilestone])

  // Ensure proper phase ordering: Phase 1 → Phase 2 → Phase 3 → Phase 4
  const phaseOrder = ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4']
  const properlyOrderedMilestones = sortedMilestones.sort((a, b) => {
    const aPhaseIndex = phaseOrder.findIndex(phase => a.title.includes(phase))
    const bPhaseIndex = phaseOrder.findIndex(phase => b.title.includes(phase))
    
    // If both have phase numbers, sort by phase order
    if (aPhaseIndex !== -1 && bPhaseIndex !== -1) {
      return aPhaseIndex - bPhaseIndex
    }
    
    // Fallback to order_index
    return a.order_index - b.order_index
  })

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

  const getRelativeTime = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours} hours ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays} days ago`
    
    const diffInWeeks = Math.floor(diffInDays / 7)
    if (diffInWeeks < 4) return `${diffInWeeks} weeks ago`
    
    const diffInMonths = Math.floor(diffInDays / 30)
    return `${diffInMonths} months ago`
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

  const handleTaskToggle = async (milestoneId: string, taskId: string, completed: boolean) => {
    const updates = {
      status: (completed ? 'completed' : 'pending') as 'completed' | 'pending',
      progress_percentage: completed ? 100 : 0,
      updated_at: new Date().toISOString()
    }
    
    try {
      // Update the task
      onTaskUpdate(milestoneId, taskId, updates)
      
      // Update milestone progress based on task completion
      const milestone = milestones.find(m => m.id === milestoneId)
      if (milestone && milestone.tasks) {
        const completedTasks = milestone.tasks.filter(t => 
          t.id === taskId ? completed : t.status === 'completed'
        ).length
        const totalTasks = milestone.tasks.length
        const newMilestoneProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
        
        onMilestoneUpdate(milestoneId, { 
          progress_percentage: newMilestoneProgress,
          updated_at: new Date().toISOString()
        })
      }
    } catch (error) {
      console.error('Failed to update task:', error)
    }
  }

  const handleAddTask = async (milestoneId: string) => {
    if (newTaskTitle.trim()) {
      const newTask = {
        milestone_id: milestoneId,
        title: newTaskTitle,
        description: '',
        status: 'pending' as 'pending',
        priority: 'medium' as 'medium',
        due_date: undefined,
        progress_percentage: 0,
        estimated_hours: 0,
        actual_hours: 0,
        tags: [],
        steps: [],
        completed_at: undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: undefined,
        assigned_to: undefined,
        is_overdue: false,
        overdue_since: undefined,
        approval_status: 'pending' as 'pending',
        approved_by: undefined,
        approved_at: undefined,
        approval_notes: undefined,
        comments: [],
        time_entries: []
      }
      
      try {
        onAddTask(milestoneId, newTask)
        setNewTaskTitle('')
        setEditingTask(null)
      } catch (error) {
        console.error('Failed to add task:', error)
      }
    }
  }

  const handleAddComment = async (milestoneId: string) => {
    if (newComment.trim()) {
      try {
        // In a real implementation, this would save to Supabase
        const comment = {
          id: `comment_${Date.now()}`,
          milestone_id: milestoneId,
          content: newComment,
          author: userRole,
          created_at: new Date().toISOString()
        }
        
        onAddComment(milestoneId, newComment)
        setNewComment('')
        
        // Update milestone timestamp
        onMilestoneUpdate(milestoneId, { 
          updated_at: new Date().toISOString()
        })
      } catch (error) {
        console.error('Failed to add comment:', error)
      }
    }
  }

  const handleRequestChanges = async (milestoneId: string) => {
    if (changeRequest.trim()) {
      try {
        // In a real implementation, this would save to Supabase
        onRequestChanges(milestoneId, changeRequest)
        setChangeRequest('')
        
        // Update milestone status and timestamp
        onMilestoneUpdate(milestoneId, {
          status: 'in_progress',
          updated_at: new Date().toISOString()
        })
      } catch (error) {
        console.error('Failed to request changes:', error)
      }
    }
  }

  return (
    <div className="space-y-4">
      {properlyOrderedMilestones.map((milestone) => {
        const isExpanded = expandedMilestones.has(milestone.id)
        const color = getMilestoneColor(milestone.title)
        const icon = getMilestoneIcon(milestone.title)
        const completedTasks = milestone.tasks?.filter(t => t.status === 'completed').length || 0
        const totalTasks = milestone.tasks?.length || 0
        const isOverdue = isMilestoneOverdue(milestone)
        const isCurrent = milestone.id === currentMilestone?.id

        return (
          <div 
            key={milestone.id}
            id={`milestone-${milestone.id}`}
            className={`bg-white border rounded-lg shadow-sm hover:shadow-md transition-all duration-200 ${
              isCurrent ? `border-${color}-300 bg-${color}-50` : `border-${color}-200`
            }`}
          >
            {/* Milestone Header */}
            <div 
              className={`p-4 cursor-pointer border-l-4 border-${color}-500 transition-all duration-200 ${
                isExpanded ? 'bg-gray-50' : ''
              }`}
              onClick={() => toggleMilestone(milestone.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{milestone.title}</h3>
                      {isCurrent && (
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                          Current
                        </Badge>
                      )}
                      <Badge className={`text-xs ${getStatusColor(milestone.status)}`}>
                        {milestone.status.replace('_', ' ')}
                      </Badge>
                      {isOverdue && (
                        <Badge variant="destructive" className="text-xs">
                          Overdue
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-1">{milestone.description}</p>
                    {milestone.updated_at && (
                      <p className="text-xs text-gray-500 mt-1">
                        Last updated: {getRelativeTime(milestone.updated_at)}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-lg font-semibold text-gray-900">{milestone.progress_percentage}%</div>
                    <div className="text-xs text-gray-500">{completedTasks}/{totalTasks} tasks</div>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-gray-400 transition-transform duration-200" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-400 transition-transform duration-200" />
                  )}
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-3">
                <Progress 
                  value={milestone.progress_percentage} 
                  className="h-2"
                />
              </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="border-t border-gray-200 p-4 animate-in slide-in-from-top-2 duration-200">
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
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg animate-in slide-in-from-top-2 duration-200">
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
                      {milestone.tasks?.map((task) => {
                        const isOverdueTask = task.due_date && isTaskOverdue(task)
                        
                        return (
                          <div key={task.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <Checkbox
                              checked={task.status === 'completed'}
                              onCheckedChange={(checked) => 
                                handleTaskToggle(milestone.id, task.id, checked as boolean)
                              }
                              disabled={userRole === 'client'}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                {getTaskStatusIcon(task.status)}
                                <span className={`text-sm ${task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                  {task.title}
                                </span>
                                {isOverdueTask && (
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
                            
                            {userRole === 'provider' && (
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
                        )
                      })}
                      
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
                    
                    {/* Client Actions */}
                    {userRole === 'client' && (
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-900">Client Actions</span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => onMilestoneUpdate(milestone.id, { status: 'completed' })}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve Milestone
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => onMilestoneUpdate(milestone.id, { status: 'cancelled' })}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject Milestone
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Provider Actions */}
                    {userRole === 'provider' && (
                      <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Edit className="h-4 w-4 text-purple-600" />
                          <span className="text-sm font-medium text-purple-900">Provider Actions</span>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onMilestoneUpdate(milestone.id, { status: 'in_progress' })}
                          >
                            Mark In Progress
                          </Button>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => onMilestoneUpdate(milestone.id, { status: 'completed' })}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Mark Complete
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onMilestoneUpdate(milestone.id, { status: 'on_hold' })}
                          >
                            Put On Hold
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* Add Comment */}
                    <div className="space-y-2">
                      <Textarea
                        placeholder={userRole === 'client' ? 'Add a comment or feedback...' : 'Add a comment or response...'}
                        value={newComment}
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
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg animate-in slide-in-from-top-2 duration-200">
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

                    {/* Comments History */}
                    <div className="mt-4">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Comments History</h5>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {/* Mock comments - in real implementation, these would come from Supabase */}
                        <div className="text-xs text-gray-500 italic">
                          No comments yet. Be the first to comment!
                        </div>
                      </div>
                    </div>
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
