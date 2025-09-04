'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, MessageCircle, Clock, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { ProgressTrackingService, Milestone, Task, getStatusColor, getPriorityColor, formatDuration, isOverdue } from '@/lib/progress-tracking'
import { getSupabaseClient } from '@/lib/supabase'

interface ClientProgressViewProps {
  bookingId: string
}

export function ClientProgressView({ bookingId }: ClientProgressViewProps) {
  const [user, setUser] = useState<any>(null)
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [showComments, setShowComments] = useState<{ [taskId: string]: boolean }>({})
  const [showInternalComments, setShowInternalComments] = useState(false)

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadMilestones()
    }
  }, [bookingId, user])

  const loadUser = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    } catch (error) {
      console.error('Error loading user:', error)
    }
  }

  const loadMilestones = async () => {
    try {
      setLoading(true)
      const data = await ProgressTrackingService.getMilestones(bookingId)
      setMilestones(data)
    } catch (error) {
      console.error('Error loading milestones:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApproveTask = async (taskId: string) => {
    if (!user) return

    try {
      await ProgressTrackingService.approveTask(taskId, user.id, 'Approved by client')
      loadMilestones() // Reload to show updated status
    } catch (error) {
      console.error('Error approving task:', error)
    }
  }

  const handleRejectTask = async (taskId: string, notes?: string) => {
    if (!user) return

    try {
      await ProgressTrackingService.rejectTask(taskId, user.id, notes)
      loadMilestones() // Reload to show updated status
    } catch (error) {
      console.error('Error rejecting task:', error)
    }
  }

  const handleAddComment = async (taskId: string, comment: string) => {
    if (!user) return

    try {
      await ProgressTrackingService.addTaskComment(taskId, user.id, comment, false) // false = shared comment
      loadMilestones() // Reload to show new comment
    } catch (error) {
      console.error('Error adding comment:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Project Progress</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInternalComments(!showInternalComments)}
            className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            {showInternalComments ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showInternalComments ? 'Hide Internal' : 'Show Internal'}
          </button>
        </div>
      </div>

      {/* Milestones List */}
      <div className="space-y-4">
        {milestones.map((milestone) => (
          <ClientMilestoneCard
            key={milestone.id}
            milestone={milestone}
            showComments={showComments}
            setShowComments={setShowComments}
            showInternalComments={showInternalComments}
            onApproveTask={handleApproveTask}
            onRejectTask={handleRejectTask}
            onAddComment={handleAddComment}
          />
        ))}
      </div>

      {milestones.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <Clock className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No milestones yet</h3>
          <p className="text-gray-600">The provider hasn't created any milestones for this project yet.</p>
        </div>
      )}
    </div>
  )
}

// Client Milestone Card Component
function ClientMilestoneCard({ 
  milestone, 
  showComments, 
  setShowComments, 
  showInternalComments,
  onApproveTask, 
  onRejectTask, 
  onAddComment 
}: {
  milestone: Milestone
  showComments: { [taskId: string]: boolean }
  setShowComments: (comments: { [taskId: string]: boolean }) => void
  showInternalComments: boolean
  onApproveTask: (taskId: string) => void
  onRejectTask: (taskId: string, notes?: string) => void
  onAddComment: (taskId: string, comment: string) => void
}) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [rejectNotes, setRejectNotes] = useState<{ [taskId: string]: string }>({})

  const isOverdueMilestone = milestone.due_date && isOverdue(milestone.due_date, milestone.status)

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Milestone Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-400 hover:text-gray-600"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{milestone.title}</h3>
              {milestone.description && (
                <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(milestone.status)}`}>
              {milestone.status.replace('_', ' ')}
            </span>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(milestone.priority)}`}>
              {milestone.priority}
            </span>
            {isOverdueMilestone && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                Overdue
              </span>
            )}
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
            <span>Progress</span>
            <span>{milestone.progress_percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${milestone.progress_percentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Tasks */}
      {isExpanded && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900">
              Tasks ({milestone.tasks?.length || 0})
            </h4>
          </div>

          <div className="space-y-3">
            {milestone.tasks?.map((task) => (
              <ClientTaskCard
                key={task.id}
                task={task}
                showComments={showComments[task.id] || false}
                setShowComments={(show) => setShowComments({ ...showComments, [task.id]: show })}
                showInternalComments={showInternalComments}
                onApproveTask={onApproveTask}
                onRejectTask={onRejectTask}
                onAddComment={onAddComment}
                rejectNotes={rejectNotes[task.id] || ''}
                setRejectNotes={(notes) => setRejectNotes({ ...rejectNotes, [task.id]: notes })}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Client Task Card Component
function ClientTaskCard({ 
  task, 
  showComments, 
  setShowComments, 
  showInternalComments,
  onApproveTask, 
  onRejectTask, 
  onAddComment,
  rejectNotes,
  setRejectNotes
}: {
  task: Task
  showComments: boolean
  setShowComments: (show: boolean) => void
  showInternalComments: boolean
  onApproveTask: (taskId: string) => void
  onRejectTask: (taskId: string, notes?: string) => void
  onAddComment: (taskId: string, comment: string) => void
  rejectNotes: string
  setRejectNotes: (notes: string) => void
}) {
  const [newComment, setNewComment] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)

  const isOverdueTask = task.due_date && isOverdue(task.due_date, task.status)
  const canApprove = task.status === 'completed' && task.approval_status === 'pending'
  const sharedComments = task.comments?.filter(comment => !comment.is_internal) || []
  const internalComments = task.comments?.filter(comment => comment.is_internal) || []

  const handleAddComment = () => {
    if (newComment.trim()) {
      onAddComment(task.id, newComment.trim())
      setNewComment('')
    }
  }

  const handleReject = () => {
    onRejectTask(task.id, rejectNotes.trim() || undefined)
    setRejectNotes('')
    setShowRejectForm(false)
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            {task.status === 'completed' ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <div className="h-4 w-4 border-2 border-gray-300 rounded-full"></div>
            )}
            <span className="text-sm font-medium text-gray-900">{task.title}</span>
          </div>
          {task.tags.map((tag) => (
            <span key={tag} className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
              {tag}
            </span>
          ))}
        </div>
        
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
            {task.status.replace('_', ' ')}
          </span>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
            {task.priority}
          </span>
          {isOverdueTask && (
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
              Overdue
            </span>
          )}
          {task.actual_hours > 0 && (
            <span className="text-xs text-gray-600">
              {formatDuration(task.actual_hours * 60)}
            </span>
          )}
          
          <button
            onClick={() => setShowComments(!showComments)}
            className="p-1 text-gray-400 hover:text-gray-600"
            title="Comments"
          >
            <MessageCircle className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Task Description */}
      {task.description && (
        <div className="mt-2 text-sm text-gray-600">
          {task.description}
        </div>
      )}

      {/* Task Progress */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
          <span>Progress</span>
          <span>{task.progress_percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div 
            className="bg-green-600 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${task.progress_percentage}%` }}
          ></div>
        </div>
      </div>

      {/* Approval Actions */}
      {canApprove && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">Ready for approval:</span>
            <button
              onClick={() => onApproveTask(task.id)}
              className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
            >
              <CheckCircle className="h-3 w-3" />
              Approve
            </button>
            <button
              onClick={() => setShowRejectForm(!showRejectForm)}
              className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
            >
              <XCircle className="h-3 w-3" />
              Reject
            </button>
          </div>
          
          {showRejectForm && (
            <div className="mt-2">
              <textarea
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder="Reason for rejection..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={2}
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => setShowRejectForm(false)}
                  className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Reject
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Approval Status */}
      {task.approval_status !== 'pending' && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">Approval Status:</span>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              task.approval_status === 'approved' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {task.approval_status}
            </span>
            {task.approval_notes && (
              <span className="text-xs text-gray-600">
                - {task.approval_notes}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Comments Section */}
      {showComments && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="space-y-2">
            {/* Shared Comments */}
            {sharedComments.map((comment) => (
              <div key={comment.id} className="text-xs text-gray-600 bg-white p-2 rounded border">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-blue-600">[Shared]</span>
                  <span className="text-gray-500">
                    {new Date(comment.created_at).toLocaleString()}
                  </span>
                </div>
                <div>{comment.comment}</div>
              </div>
            ))}
            
            {/* Internal Comments (if enabled) */}
            {showInternalComments && internalComments.map((comment) => (
              <div key={comment.id} className="text-xs text-gray-600 bg-gray-100 p-2 rounded border">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-orange-600">[Internal]</span>
                  <span className="text-gray-500">
                    {new Date(comment.created_at).toLocaleString()}
                  </span>
                </div>
                <div>{comment.comment}</div>
              </div>
            ))}
          </div>
          
          {/* Add Comment */}
          <div className="mt-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddComment()
                  }
                }}
              />
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
