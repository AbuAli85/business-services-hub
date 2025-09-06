'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  MessageSquare, 
  Send, 
  User, 
  Clock,
  Eye,
  EyeOff
} from 'lucide-react'
import { Milestone, TaskComment } from '@/lib/progress-tracking'
import { safeFormatDistanceToNow } from '@/lib/date-utils'
import { ProgressTrackingService } from '@/lib/progress-tracking'
import toast from 'react-hot-toast'

interface CommentsSectionProps {
  milestone: Milestone
  userRole: 'provider' | 'client'
}

export function CommentsSection({
  milestone,
  userRole
}: CommentsSectionProps) {
  const [comments, setComments] = useState<TaskComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [showInternalComments, setShowInternalComments] = useState(userRole === 'provider')

  // Load comments for all tasks in this milestone
  useEffect(() => {
    const loadComments = async () => {
      if (!milestone.tasks || milestone.tasks.length === 0) return

      try {
        setLoading(true)
        const allComments: TaskComment[] = []
        
        for (const task of milestone.tasks) {
          const taskComments = await ProgressTrackingService.getTaskComments(task.id)
          allComments.push(...taskComments)
        }
        
        // Sort by creation date
        allComments.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        setComments(allComments)
      } catch (error) {
        console.error('Error loading comments:', error)
        toast.error('Failed to load comments')
      } finally {
        setLoading(false)
      }
    }

    loadComments()
  }, [milestone.tasks])

  // Handle add comment
  const handleAddComment = async () => {
    if (!newComment.trim()) {
      toast.error('Comment cannot be empty')
      return
    }

    // For now, add to the first task in the milestone
    // In a real implementation, you might want to select which task to comment on
    const firstTask = milestone.tasks?.[0]
    if (!firstTask) {
      toast.error('No tasks available to comment on')
      return
    }

    try {
      const userId = 'current-user-id' // TODO: Get from auth context
      const isInternal = userRole === 'provider' // Providers can make internal comments
      
      const newCommentData = await ProgressTrackingService.addTaskComment(
        firstTask.id,
        userId,
        newComment.trim(),
        isInternal
      )

      setComments(prev => [...prev, newCommentData])
      setNewComment('')
      toast.success('Comment added successfully')
    } catch (error) {
      console.error('Error adding comment:', error)
      toast.error('Failed to add comment')
    }
  }

  // Filter comments based on visibility
  const visibleComments = comments.filter(comment => 
    showInternalComments || !comment.is_internal
  )

  // Group comments by task
  const commentsByTask = visibleComments.reduce((acc, comment) => {
    const taskId = comment.task_id
    if (!acc[taskId]) {
      acc[taskId] = []
    }
    acc[taskId].push(comment)
    return acc
  }, {} as Record<string, TaskComment[]>)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Comments & Updates</span>
          </CardTitle>
          {userRole === 'provider' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInternalComments(!showInternalComments)}
              className="flex items-center space-x-1"
            >
              {showInternalComments ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              <span>{showInternalComments ? 'Hide' : 'Show'} Internal</span>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Comment Form */}
        <div className="space-y-3">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={`Add a ${userRole === 'provider' ? 'comment or internal note' : 'comment'}...`}
            className="min-h-[80px]"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {userRole === 'provider' 
                ? 'Comments are visible to clients. Use internal notes for private communication.'
                : 'Your comments will be visible to the service provider.'
              }
            </p>
            <Button
              onClick={handleAddComment}
              disabled={!newComment.trim() || loading}
              size="sm"
              className="flex items-center space-x-1"
            >
              <Send className="h-4 w-4" />
              <span>Post</span>
            </Button>
          </div>
        </div>

        {/* Comments List */}
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">Loading comments...</p>
          </div>
        ) : visibleComments.length === 0 ? (
          <div className="text-center py-6">
            <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">No comments yet</p>
            <p className="text-sm text-gray-400">Be the first to add a comment</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(commentsByTask).map(([taskId, taskComments]) => {
              const task = milestone.tasks?.find(t => t.id === taskId)
              return (
                <div key={taskId} className="border rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <h4 className="font-medium text-gray-900">
                      {task?.title || 'Unknown Task'}
                    </h4>
                    <Badge variant="outline" className="text-xs">
                      {taskComments.length} comment{taskComments.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    {taskComments.map((comment) => (
                      <div
                        key={comment.id}
                        className={`p-3 rounded-lg ${
                          comment.is_internal 
                            ? 'bg-yellow-50 border border-yellow-200' 
                            : 'bg-gray-50 border border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {comment.is_internal ? 'Internal Note' : 'Comment'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {safeFormatDistanceToNow(comment.created_at, { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                          {comment.is_internal && (
                            <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800">
                              Internal
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
                          {comment.comment}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
