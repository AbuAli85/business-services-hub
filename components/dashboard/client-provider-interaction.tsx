'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  MessageSquare,
  Send,
  ThumbsUp,
  ThumbsDown,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar,
  Timer,
  Target,
  AlertTriangle,
  MessageCircle,
  Reply,
  Edit,
  Trash2,
  Flag,
  Star,
  Heart,
  Smile,
  Frown,
  Meh,
  Zap,
  Lightbulb,
  MapPin,
  Tag,
  Hash,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Save,
  X,
  Plus,
  Minus,
  ExternalLink,
  Lock,
  Unlock,
  Shield,
  ShieldCheck
} from 'lucide-react'
import { Milestone, Comment, UserRole } from '@/types/progress'
import { formatDistanceToNow } from 'date-fns'
import { safeFormatDate, safeFormatDistanceToNow } from '@/lib/date-utils'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

interface ClientProviderInteractionProps {
  bookingId: string
  milestones: Milestone[]
  comments: Comment[]
  userRole: UserRole
  onCommentAdd: (milestoneId: string, content: string) => Promise<void>
  onMilestoneApproval: (milestoneId: string, approved: boolean, comment?: string) => Promise<void>
}

export function ClientProviderInteraction({
  bookingId,
  milestones,
  comments,
  userRole,
  onCommentAdd,
  onMilestoneApproval
}: ClientProviderInteractionProps) {
  
  const [newComment, setNewComment] = useState('')
  const [selectedMilestone, setSelectedMilestone] = useState<string | null>(null)
  const [showCommentForm, setShowCommentForm] = useState(false)
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [replyToComment, setReplyToComment] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<'all' | 'comments' | 'approvals' | 'updates'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [approvalComment, setApprovalComment] = useState('')
  const [pendingApproval, setPendingApproval] = useState<string | null>(null)

  // Group comments by milestone
  const commentsByMilestone = comments.reduce((acc, comment) => {
    const milestoneId = comment.milestone_id || 'general'
    if (!acc[milestoneId]) {
      acc[milestoneId] = []
    }
    acc[milestoneId].push(comment)
    return acc
  }, {} as Record<string, Comment[]>)

  // Filter comments based on type and search
  const filteredComments = comments.filter(comment => {
    // Comment.type is not part of the schema; we filter only by search for now
    if (searchQuery && !comment.content.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  // Handle comment submission
  const handleCommentSubmit = async () => {
    if (!newComment.trim()) return

    try {
      if (selectedMilestone) {
        await onCommentAdd(selectedMilestone, newComment.trim())
      } else {
        // General comment
        await onCommentAdd('', newComment.trim())
      }
      
      setNewComment('')
      setSelectedMilestone(null)
      setShowCommentForm(false)
      toast.success('Comment added successfully')
    } catch (error) {
      console.error('Error adding comment:', error)
      toast.error('Failed to add comment')
    }
  }

  // Handle milestone approval
  const handleMilestoneApproval = async (milestoneId: string, approved: boolean) => {
    try {
      await onMilestoneApproval(milestoneId, approved, approvalComment.trim() || undefined)
      setShowApprovalModal(false)
      setApprovalComment('')
      setPendingApproval(null)
      toast.success(`Milestone ${approved ? 'approved' : 'rejected'} successfully`)
    } catch (error) {
      console.error('Error handling milestone approval:', error)
      toast.error('Failed to process approval')
    }
  }

  // Get milestone title
  const getMilestoneTitle = (milestoneId: string) => {
    const milestone = milestones.find(m => m.id === milestoneId)
    return milestone ? milestone.title : 'General'
  }

  // Get comment type icon
  const getCommentTypeIcon = () => <MessageCircle className="h-4 w-4" />

  // Get comment type color
  const getCommentTypeColor = () => 'bg-blue-100 text-blue-800'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Communication & Approvals</h3>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCommentForm(true)}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Add Comment
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label htmlFor="filter-select" className="text-sm font-medium text-gray-700">Filter:</label>
              <select
                id="filter-select"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="text-sm border border-gray-300 rounded px-3 py-1"
              >
                <option value="all">All</option>
                <option value="comments">Comments</option>
                <option value="approvals">Approvals</option>
                <option value="updates">Updates</option>
              </select>
            </div>
            <div className="flex-1">
              <Input
                placeholder="Search comments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-md"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comments List */}
      <div className="space-y-4">
        <AnimatePresence>
          {filteredComments.map((comment) => (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {comment.author_name ? comment.author_name.charAt(0).toUpperCase() : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">
                            {comment.author_name || 'Unknown User'}
                          </span>
                          <Badge className={getCommentTypeColor()}>
                            {getCommentTypeIcon()}
                            <span className="ml-1 capitalize">comment</span>
                          </Badge>
                          {comment.milestone_id && (
                            <Badge variant="outline" className="text-xs">
                              {getMilestoneTitle(comment.milestone_id)}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </span>
                          {userRole === 'provider' && (
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingComment(comment.id)}
                                className="h-6 w-6 p-0"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setReplyToComment(comment.id)}
                                className="h-6 w-6 p-0"
                              >
                                <Reply className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-gray-700 mb-3">{comment.content}</p>
                      
                      {/* Comment Actions */}
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setReplyToComment(comment.id)}
                          className="text-xs"
                        >
                          <Reply className="h-3 w-3 mr-1" />
                          Reply
                        </Button>
                        
                        {userRole === 'client' && (
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setPendingApproval(comment.milestone_id || '')
                                setShowApprovalModal(true)
                              }}
                              className="text-xs text-green-600 border-green-200 hover:bg-green-50"
                            >
                              <ThumbsUp className="h-3 w-3 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setPendingApproval(comment.milestone_id || '')
                                setShowApprovalModal(true)
                              }}
                              className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                            >
                              <ThumbsDown className="h-3 w-3 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add Comment Form */}
      <AnimatePresence>
        {showCommentForm && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Add Comment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label htmlFor="milestone-select" className="text-sm font-medium text-gray-700">Milestone (Optional)</label>
                  <select
                    id="milestone-select"
                    aria-label="Select milestone for comment"
                    value={selectedMilestone || ''}
                    onChange={(e) => setSelectedMilestone(e.target.value || null)}
                    className="w-full mt-1 text-sm border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="">General Comment</option>
                    {milestones.map(milestone => (
                      <option key={milestone.id} value={milestone.id}>
                        {milestone.title}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Comment</label>
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Enter your comment..."
                    className="mt-1 min-h-[100px]"
                  />
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowCommentForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCommentSubmit}
                    disabled={!newComment.trim()}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Comment
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Approval Modal */}
      <AnimatePresence>
        {showApprovalModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg p-6 w-full max-w-md mx-4"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Milestone Approval
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Comment (Optional)</label>
                  <Textarea
                    value={approvalComment}
                    onChange={(e) => setApprovalComment(e.target.value)}
                    placeholder="Add a comment about your decision..."
                    className="mt-1 min-h-[80px]"
                  />
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowApprovalModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleMilestoneApproval(pendingApproval!, false)}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <ThumbsDown className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    onClick={() => handleMilestoneApproval(pendingApproval!, true)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {filteredComments.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Comments Yet</h3>
            <p className="text-gray-600 mb-4">
              Start the conversation by adding a comment or update.
            </p>
            <Button onClick={() => setShowCommentForm(true)}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Add First Comment
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
