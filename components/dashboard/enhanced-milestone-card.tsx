'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  Edit, 
  Save, 
  X, 
  MoreVertical, 
  Calendar, 
  Clock, 
  User, 
  AlertTriangle, 
  CheckCircle, 
  Play, 
  Pause,
  Flag,
  Target,
  GripVertical,
  Eye,
  EyeOff,
  MessageSquare,
  XCircle
} from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

interface EnhancedMilestoneCardProps {
  milestone: {
    id: string
    title: string
    description?: string
    status: string
    progress_percentage: number
    priority: string
    risk_level: string
    due_date?: string
    estimated_hours: number
    actual_hours: number
    created_at: string
    updated_at: string
    tasks?: Array<{
      id: string
      title: string
      status: string
      progress_percentage: number
    }>
  }
  onUpdate: (milestoneId: string, updates: any) => Promise<void>
  onDelete: (milestoneId: string) => Promise<void>
  onStatusChange: (milestoneId: string, status: string) => Promise<void>
  onProgressChange: (milestoneId: string, progress: number) => Promise<void>
  onApprove?: (milestoneId: string, action: 'approve' | 'reject', feedback?: string) => Promise<void>
  onComment?: (milestoneId: string, content: string, commentType?: string) => Promise<void>
  className?: string
}

export function EnhancedMilestoneCard({
  milestone,
  onUpdate,
  onDelete,
  onStatusChange,
  onProgressChange,
  onApprove,
  onComment,
  className
}: EnhancedMilestoneCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [editForm, setEditForm] = useState({
    title: milestone.title,
    description: milestone.description || '',
    priority: milestone.priority,
    risk_level: milestone.risk_level,
    due_date: milestone.due_date ? milestone.due_date.split('T')[0] : '',
    estimated_hours: milestone.estimated_hours
  })

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showProgressSlider, setShowProgressSlider] = useState(false)
  const [tempProgress, setTempProgress] = useState(milestone.progress_percentage)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [showCommentModal, setShowCommentModal] = useState(false)
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | null>(null)
  const [approvalFeedback, setApprovalFeedback] = useState('')
  const [newComment, setNewComment] = useState('')
  const [commentType, setCommentType] = useState('general')

  const titleInputRef = useRef<HTMLInputElement>(null)
  const descriptionTextareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isEditing && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [isEditing])

  const handleEdit = () => {
    setIsEditing(true)
    setEditForm({
      title: milestone.title,
      description: milestone.description || '',
      priority: milestone.priority,
      risk_level: milestone.risk_level,
      due_date: milestone.due_date ? milestone.due_date.split('T')[0] : '',
      estimated_hours: milestone.estimated_hours
    })
  }

  const handleSave = async () => {
    try {
      setIsUpdating(true)
      await onUpdate(milestone.id, {
        title: editForm.title,
        description: editForm.description,
        priority: editForm.priority,
        risk_level: editForm.risk_level,
        due_date: editForm.due_date ? new Date(editForm.due_date).toISOString() : null,
        estimated_hours: editForm.estimated_hours
      })
      setIsEditing(false)
      toast.success('Milestone updated successfully')
    } catch (error) {
      console.error('Error updating milestone:', error)
      toast.error('Failed to update milestone')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditForm({
      title: milestone.title,
      description: milestone.description || '',
      priority: milestone.priority,
      risk_level: milestone.risk_level,
      due_date: milestone.due_date ? milestone.due_date.split('T')[0] : '',
      estimated_hours: milestone.estimated_hours
    })
  }

  const handleDelete = async () => {
    try {
      await onDelete(milestone.id)
      toast.success('Milestone deleted successfully')
    } catch (error) {
      console.error('Error deleting milestone:', error)
      toast.error('Failed to delete milestone')
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    try {
      await onStatusChange(milestone.id, newStatus)
      toast.success('Status updated successfully')
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update status')
    }
  }

  const handleProgressChange = async (newProgress: number) => {
    try {
      await onProgressChange(milestone.id, newProgress)
      setShowProgressSlider(false)
      toast.success('Progress updated successfully')
    } catch (error) {
      console.error('Error updating progress:', error)
      toast.error('Failed to update progress')
    }
  }

  const handleApproval = async (action: 'approve' | 'reject') => {
    if (!onApprove) return
    
    try {
      await onApprove(milestone.id, action, approvalFeedback)
      setShowApprovalModal(false)
      setApprovalFeedback('')
      setApprovalAction(null)
      toast.success(`Milestone ${action}d successfully`)
    } catch (error) {
      console.error('Error approving milestone:', error)
      toast.error(`Failed to ${action} milestone`)
    }
  }

  const handleComment = async () => {
    if (!onComment || !newComment.trim()) return
    
    try {
      await onComment(milestone.id, newComment, commentType)
      setShowCommentModal(false)
      setNewComment('')
      setCommentType('general')
      toast.success('Comment added successfully')
    } catch (error) {
      console.error('Error adding comment:', error)
      toast.error('Failed to add comment')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'in_progress':
        return <Play className="h-4 w-4 text-blue-600" />
      case 'pending':
        return <Pause className="h-4 w-4 text-yellow-600" />
      case 'cancelled':
        return <X className="h-4 w-4 text-red-600" />
      case 'on_hold':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />
      default:
        return <Target className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'on_hold':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800'
      case 'high':
        return 'bg-orange-100 text-orange-800'
      case 'normal':
        return 'bg-blue-100 text-blue-800'
      case 'low':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'critical':
        return 'bg-red-100 text-red-800'
      case 'high':
        return 'bg-orange-100 text-orange-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const isOverdue = milestone.due_date && new Date(milestone.due_date) < new Date() && milestone.status !== 'completed'
  const daysUntilDue = milestone.due_date ? Math.ceil((new Date(milestone.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null

  return (
    <TooltipProvider>
      <Card className={`${className} ${isOverdue ? 'border-red-200 bg-red-50' : ''} transition-all duration-200 hover:shadow-md`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <Input
                  ref={titleInputRef}
                  value={editForm.title}
                  onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                  className="text-lg font-semibold"
                  placeholder="Milestone title"
                />
              ) : (
                <CardTitle className="text-lg truncate">{milestone.title}</CardTitle>
              )}
              {isOverdue && (
                <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Overdue</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 ml-2">
              <Tooltip content={`${isExpanded ? 'Collapse' : 'Expand'} details`}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </Tooltip>
              
              {!isEditing ? (
                <Tooltip content="Edit milestone">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleEdit}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </Tooltip>
              ) : (
                <div className="flex items-center gap-1">
                  <Tooltip content="Save changes">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSave}
                      disabled={isUpdating}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  </Tooltip>
                  <Tooltip content="Cancel editing">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancel}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </Tooltip>
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Description */}
          {isEditing ? (
            <Textarea
              ref={descriptionTextareaRef}
              value={editForm.description}
              onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Milestone description"
              rows={2}
            />
          ) : (
            milestone.description && (
              <p className="text-sm text-gray-600 line-clamp-2">{milestone.description}</p>
            )
          )}

          {/* Status and Progress */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(milestone.status)}
              <Badge className={getStatusColor(milestone.status)}>
                {milestone.status.replace('_', ' ')}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{milestone.progress_percentage}%</span>
              <Tooltip content="Update progress">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowProgressSlider(!showProgressSlider)}
                >
                  <Target className="h-4 w-4" />
                </Button>
              </Tooltip>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={milestone.progress_percentage} className="h-2" />
            {showProgressSlider && (
              <div className="space-y-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={tempProgress}
                  onChange={(e) => setTempProgress(parseInt(e.target.value))}
                  className="w-full"
                  aria-label="Adjust milestone progress percentage"
                  title="Drag to adjust milestone progress percentage"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0%</span>
                  <span className="font-medium">{tempProgress}%</span>
                  <span>100%</span>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowProgressSlider(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleProgressChange(tempProgress)}
                  >
                    Update
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Expanded Details */}
          {isExpanded && (
            <div className="space-y-4 pt-4 border-t">
              {/* Priority and Risk */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500">Priority</label>
                  {isEditing ? (
                    <Select
                      value={editForm.priority}
                      onValueChange={(value) => setEditForm(prev => ({ ...prev, priority: value }))}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className={getPriorityColor(milestone.priority)}>
                      {milestone.priority}
                    </Badge>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Risk Level</label>
                  {isEditing ? (
                    <Select
                      value={editForm.risk_level}
                      onValueChange={(value) => setEditForm(prev => ({ ...prev, risk_level: value }))}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className={getRiskColor(milestone.risk_level)}>
                      {milestone.risk_level}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Due Date and Hours */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500">Due Date</label>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={editForm.due_date}
                      onChange={(e) => setEditForm(prev => ({ ...prev, due_date: e.target.value }))}
                      className="h-8"
                    />
                  ) : (
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="h-3 w-3 text-gray-400" />
                      <span>
                        {milestone.due_date 
                          ? new Date(milestone.due_date).toLocaleDateString()
                          : 'No due date'
                        }
                      </span>
                      {daysUntilDue !== null && (
                        <span className={`text-xs ${
                          daysUntilDue < 0 ? 'text-red-600' : 
                          daysUntilDue < 3 ? 'text-orange-600' : 
                          'text-gray-500'
                        }`}>
                          ({daysUntilDue < 0 ? `${Math.abs(daysUntilDue)} days overdue` : 
                            daysUntilDue === 0 ? 'Due today' : 
                            `${daysUntilDue} days left`})
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Estimated Hours</label>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={editForm.estimated_hours}
                      onChange={(e) => setEditForm(prev => ({ ...prev, estimated_hours: parseInt(e.target.value) || 0 }))}
                      className="h-8"
                    />
                  ) : (
                    <div className="flex items-center gap-1 text-sm">
                      <Clock className="h-3 w-3 text-gray-400" />
                      <span>{milestone.estimated_hours}h</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tasks Summary */}
              {milestone.tasks && milestone.tasks.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-gray-500">Tasks</label>
                  <div className="space-y-1">
                    {milestone.tasks.slice(0, 3).map((task) => (
                      <div key={task.id} className="flex items-center justify-between text-sm">
                        <span className="truncate">{task.title}</span>
                        <div className="flex items-center gap-2">
                          <Progress value={task.progress_percentage} className="w-16 h-1" />
                          <span className="text-xs text-gray-500">{task.progress_percentage}%</span>
                        </div>
                      </div>
                    ))}
                    {milestone.tasks.length > 3 && (
                      <div className="text-xs text-gray-500">
                        +{milestone.tasks.length - 3} more tasks
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <Select
                    value={milestone.status}
                    onValueChange={handleStatusChange}
                  >
                    <SelectTrigger className="h-8 w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-1">
                  {/* Approval and Comment Buttons */}
                  {onApprove && milestone.status !== 'completed' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setApprovalAction('approve')
                          setShowApprovalModal(true)
                        }}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setApprovalAction('reject')
                          setShowApprovalModal(true)
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </>
                  )}
                  
                  {onComment && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCommentModal(true)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Comment
                    </Button>
                  )}
                  
                  {!showDeleteConfirm ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      Delete
                    </Button>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDeleteConfirm(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDelete}
                      >
                        Confirm
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {approvalAction === 'approve' ? 'Approve Milestone' : 'Reject Milestone'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {approvalAction === 'approve' 
                ? 'Are you sure you want to approve this milestone?'
                : 'Are you sure you want to reject this milestone?'
              }
            </p>
            <Textarea
              placeholder="Add feedback (optional)"
              value={approvalFeedback}
              onChange={(e) => setApprovalFeedback(e.target.value)}
              className="mb-4"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowApprovalModal(false)
                  setApprovalAction(null)
                  setApprovalFeedback('')
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => approvalAction && handleApproval(approvalAction)}
                className={approvalAction === 'approve' 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-red-600 hover:bg-red-700'
                }
              >
                {approvalAction === 'approve' ? 'Approve' : 'Reject'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Comment Modal */}
      {showCommentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Add Comment</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comment Type
              </label>
              <Select value={commentType} onValueChange={setCommentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="feedback">Feedback</SelectItem>
                  <SelectItem value="question">Question</SelectItem>
                  <SelectItem value="issue">Issue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Textarea
              placeholder="Write your comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="mb-4"
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCommentModal(false)
                  setNewComment('')
                  setCommentType('general')
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleComment}
                disabled={!newComment.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Add Comment
              </Button>
            </div>
          </div>
        </div>
      )}
    </TooltipProvider>
  )
}
