'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  CheckCircle, 
  Clock, 
  Play, 
  Pause, 
  XCircle,
  Calendar,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Eye,
  Download,
  FileText,
  Target,
  BarChart3,
  AlertTriangle,
  Star,
  Award,
  Timer,
  ChevronDown,
  ChevronRight,
  Send,
  Filter,
  Search,
  Bell,
  BellOff,
  Share,
  Bookmark,
  Flag
} from 'lucide-react'
import { DocumentManager } from './document-manager'
import { format, isAfter, isBefore, differenceInDays, differenceInHours } from 'date-fns'
import { Milestone, Task } from '@/types/progress'
import { getSupabaseClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

interface ClientMilestoneViewerProps {
  bookingId: string
  className?: string
}

interface Comment {
  id: string
  milestone_id: string
  content: string
  created_at: string
  author_name: string
  author_role: string
}

interface Approval {
  id: string
  milestone_id: string
  status: 'pending' | 'approved' | 'rejected'
  feedback?: string
  created_at: string
  updated_at: string
}

export function ClientMilestoneViewer({
  bookingId,
  className = ''
}: ClientMilestoneViewerProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [comments, setComments] = useState<Record<string, Comment[]>>({})
  const [approvals, setApprovals] = useState<Record<string, Approval[]>>({})
  const [taskComments, setTaskComments] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'progress' | 'documents'>('progress')
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null)
  const [showCommentDialog, setShowCommentDialog] = useState(false)
  const [showApprovalDialog, setShowApprovalDialog] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [approvalFeedback, setApprovalFeedback] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [notifications, setNotifications] = useState(true)

  const handleShare = async () => {
    try {
      const url = typeof window !== 'undefined'
        ? `${window.location.origin}/dashboard/bookings/${bookingId}`
        : `/dashboard/bookings/${bookingId}`

      if (navigator.share) {
        try {
          await navigator.share({ title: 'Project Progress', text: 'View project progress', url })
        } catch (err) {
          // Ignore if user cancels share
        }
      } else if (navigator.clipboard && 'writeText' in navigator.clipboard) {
        await navigator.clipboard.writeText(url)
        toast.success('Link copied to clipboard')
      } else {
        // Fallback: open in new tab
        window.open(url, '_blank', 'noopener,noreferrer')
      }
    } catch (error) {
      console.error('Share failed:', error)
      toast.error('Unable to share link')
    }
  }

  // Load data
  useEffect(() => {
    loadData()
  }, [bookingId])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load milestones from API
      const milestonesRes = await fetch(`/api/milestones?bookingId=${bookingId}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
      })

      if (!milestonesRes.ok) {
        throw new Error(`Failed to load milestones: ${milestonesRes.statusText}`)
      }

      const milestonesData = await milestonesRes.json()
      const normalized = (milestonesData.milestones || []).map((m: any) => ({
        ...m,
        tasks: (m.tasks || []).sort((a: any, b: any) => {
          const ao = a.order_index ?? 0
          const bo = b.order_index ?? 0
          if (ao !== bo) return ao - bo
          const ad = a.created_at ? new Date(a.created_at).getTime() : 0
          const bd = b.created_at ? new Date(b.created_at).getTime() : 0
          return ad - bd
        })
      }))

      setMilestones(normalized)

      // Load comments and approvals (placeholder for now)
      setComments({})
      setApprovals({})
      setTaskComments({})

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
      toast.error('Failed to load project data')
    } finally {
      setLoading(false)
    }
  }

  // Add comment
  const addComment = async (milestoneId: string) => {
    if (!newComment.trim() || isSubmitting) return

    try {
      setIsSubmitting(true)
      
      // TODO: Create API endpoint for adding comments
      console.log('Comment functionality disabled - no API endpoint available')
      toast.info('Comment functionality coming soon')
      setNewComment('')
      setShowCommentDialog(false)
      setSelectedMilestone(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Submit approval
  const submitApproval = async (milestoneId: string, status: 'approved' | 'rejected') => {
    if (isSubmitting) return
    
    try {
      setIsSubmitting(true)
      
      // TODO: Create API endpoint for approvals
      console.log('Approval functionality disabled - no API endpoint available')
      toast.info('Approval functionality coming soon')
      setApprovalFeedback('')
      setShowApprovalDialog(false)
      setSelectedMilestone(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Download milestone data
  const handleDownload = async (milestone: Milestone) => {
    try {
      // Create a comprehensive milestone report
      const reportData = {
        milestone: {
          id: milestone.id,
          booking_id: milestone.booking_id,
          title: milestone.title,
          description: milestone.description,
          status: milestone.status,
          due_date: milestone.due_date,
          progress: milestone.progress,
          created_at: milestone.created_at,
          updated_at: milestone.updated_at
        },
        tasks: milestone.tasks || [],
        comments: comments[milestone.id] || [],
        approvals: approvals[milestone.id] || [],
        generated_at: new Date().toISOString()
      }

      // Create and download JSON file
      const dataStr = JSON.stringify(reportData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `milestone-${milestone.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      toast.success('Milestone data downloaded successfully')
    } catch (error) {
      console.error('Download error:', error)
      toast.error('Failed to download milestone data')
    }
  }

  // Bookmark milestone
  const handleBookmark = async (milestone: Milestone) => {
    try {
      // Get existing bookmarks from localStorage
      const existingBookmarks = JSON.parse(localStorage.getItem('milestone-bookmarks') || '[]')
      
      // Check if already bookmarked
      const isBookmarked = existingBookmarks.some((bookmark: any) => bookmark.id === milestone.id)
      
      if (isBookmarked) {
        // Remove bookmark
        const updatedBookmarks = existingBookmarks.filter((bookmark: any) => bookmark.id !== milestone.id)
        localStorage.setItem('milestone-bookmarks', JSON.stringify(updatedBookmarks))
        toast.success('Milestone removed from bookmarks')
      } else {
        // Add bookmark
        const bookmark = {
          id: milestone.id,
          title: milestone.title,
          status: milestone.status,
          bookmarked_at: new Date().toISOString()
        }
        const updatedBookmarks = [...existingBookmarks, bookmark]
        localStorage.setItem('milestone-bookmarks', JSON.stringify(updatedBookmarks))
        toast.success('Milestone bookmarked successfully')
      }
    } catch (error) {
      console.error('Bookmark error:', error)
      toast.error('Failed to bookmark milestone')
    }
  }

  // Filter and sort
  const filteredMilestones = milestones.filter(milestone => {
    const matchesSearch = milestone.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         milestone.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || milestone.status === filterStatus
    return matchesSearch && matchesStatus
  })

  // Statistics
  const totalMilestones = milestones.length
  const completedMilestones = milestones.filter(m => m.status === 'completed').length
  const inProgressMilestones = milestones.filter(m => m.status === 'in_progress').length
  const pendingApproval = milestones.filter(m => m.status === 'completed' && !approvals[m.id]?.some(a => a.status !== 'pending')).length
  const overdueMilestones = milestones.filter(m => 
    m.due_date && isBefore(new Date(m.due_date), new Date()) && m.status !== 'completed'
  ).length

  const totalTasks = milestones.reduce((acc, m) => acc + (m.tasks?.length || 0), 0)
  const completedTasks = milestones.reduce((acc, m) => 
    acc + (m.tasks?.filter(t => t.status === 'completed').length || 0), 0
  )

  const overallProgress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-600">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error Loading Project</h3>
          <p>{error}</p>
          <Button onClick={loadData} className="mt-4">
            Try Again
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Project Progress</h1>
          <p className="text-gray-600 mt-1">Track your project milestones and provide feedback</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setNotifications(!notifications)}
          >
            {notifications ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            {notifications ? 'Notifications On' : 'Notifications Off'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share className="h-4 w-4 mr-1" />
            Share
          </Button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <Card>
        <CardContent className="p-0">
          <div className="flex">
            <button
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 ${activeTab === 'progress' ? 'border-blue-600 text-blue-700 bg-blue-50' : 'border-transparent hover:bg-gray-50'}`}
              onClick={() => setActiveTab('progress')}
            >
              Project Progress
            </button>
            <button
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 ${activeTab === 'documents' ? 'border-blue-600 text-blue-700 bg-blue-50' : 'border-transparent hover:bg-gray-50'}`}
              onClick={() => setActiveTab('documents')}
            >
              Document Management
            </button>
          </div>
        </CardContent>
      </Card>

      {activeTab === 'progress' && (
      <>
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Milestones</p>
                <p className="text-2xl font-bold text-gray-900">{totalMilestones}</p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{completedMilestones}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">{inProgressMilestones}</p>
              </div>
              <Play className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Approval</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingApproval}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Project Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Completion</span>
              <span className="text-sm font-medium">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-3" />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Completed: {completedMilestones}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>In Progress: {inProgressMilestones}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span>Pending Approval: {pendingApproval}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>Overdue: {overdueMilestones}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search milestones..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <label htmlFor="milestone-status" className="sr-only">Filter milestones by status</label>
            <select
              id="milestone-status"
              aria-label="Filter milestones by status"
              title="Filter milestones by status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="on_hold">On Hold</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Milestones List */}
      <div className="space-y-4">
        {filteredMilestones.map((milestone) => (
          <ClientMilestoneCard
            key={milestone.id}
            milestone={milestone}
            comments={comments[milestone.id] || []}
            approvals={approvals[milestone.id] || []}
            taskComments={taskComments}
            onComment={() => {
              setSelectedMilestone(milestone)
              setShowCommentDialog(true)
            }}
            onApprove={() => {
              setSelectedMilestone(milestone)
              setShowApprovalDialog(true)
            }}
            onDownload={() => handleDownload(milestone)}
            onBookmark={() => handleBookmark(milestone)}
          />
        ))}
      </div>

      </>
      )}

      {activeTab === 'documents' && (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Document Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DocumentManager
              bookingId={bookingId}
              userRole="client"
              onDocumentUploaded={(document) => {
                console.log('Document uploaded:', document)
                toast.success('Document uploaded successfully')
              }}
              onRequestCreated={(request) => {
                console.log('Document request created:', request)
                toast.success('Document request created successfully')
              }}
            />
          </CardContent>
        </Card>
      </>
      )}

      {/* Comment Dialog */}
      <Dialog open={showCommentDialog} onOpenChange={(open: boolean) => {
        if (!open) {
          setShowCommentDialog(false)
          setSelectedMilestone(null)
          setNewComment('')
        }
      }}>
        <DialogContent 
          onClose={() => {
            setShowCommentDialog(false)
            setSelectedMilestone(null)
            setNewComment('')
          }}
        >
          <DialogHeader>
            <DialogTitle>Add Comment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Comment</label>
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add your comment about this milestone..."
                rows={4}
                disabled={isSubmitting}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowCommentDialog(false)
                  setSelectedMilestone(null)
                  setNewComment('')
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => selectedMilestone && addComment(selectedMilestone.id)}
                disabled={!newComment.trim() || isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Send className="h-4 w-4 mr-1" />
                {isSubmitting ? 'Adding...' : 'Add Comment'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={(open: boolean) => {
        if (!open) {
          setShowApprovalDialog(false)
          setSelectedMilestone(null)
          setApprovalFeedback('')
        }
      }}>
        <DialogContent 
          onClose={() => {
            setShowApprovalDialog(false)
            setSelectedMilestone(null)
            setApprovalFeedback('')
          }}
        >
          <DialogHeader>
            <DialogTitle>Approve Milestone</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Feedback (Optional)</label>
              <Textarea
                value={approvalFeedback}
                onChange={(e) => setApprovalFeedback(e.target.value)}
                placeholder="Add any feedback about this milestone..."
                rows={3}
                disabled={isSubmitting}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowApprovalDialog(false)
                  setSelectedMilestone(null)
                  setApprovalFeedback('')
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                variant="outline"
                onClick={() => selectedMilestone && submitApproval(selectedMilestone.id, 'rejected')}
                className="text-red-600 border-red-600 hover:bg-red-50"
                disabled={isSubmitting}
              >
                <ThumbsDown className="h-4 w-4 mr-1" />
                {isSubmitting ? 'Rejecting...' : 'Reject'}
              </Button>
              <Button 
                onClick={() => selectedMilestone && submitApproval(selectedMilestone.id, 'approved')}
                className="bg-green-600 hover:bg-green-700"
                disabled={isSubmitting}
              >
                <ThumbsUp className="h-4 w-4 mr-1" />
                {isSubmitting ? 'Approving...' : 'Approve'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Client Milestone Card Component
interface ClientMilestoneCardProps {
  milestone: Milestone
  comments: Comment[]
  approvals: Approval[]
  taskComments?: Record<string, any[]>
  onComment: () => void
  onApprove: () => void
  onDownload: () => void
  onBookmark: () => void
}

function ClientMilestoneCard({
  milestone,
  comments,
  approvals,
  taskComments = {},
  onComment,
  onApprove,
  onDownload,
  onBookmark
}: ClientMilestoneCardProps) {
  const [expanded, setExpanded] = useState(false)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'in_progress': return <Play className="h-5 w-5 text-blue-600" />
      case 'pending': return <Clock className="h-5 w-5 text-gray-500" />
      case 'cancelled': return <XCircle className="h-5 w-5 text-red-600" />
      case 'on_hold': return <Pause className="h-5 w-5 text-yellow-600" />
      default: return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-gray-100 text-gray-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'on_hold': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const isOverdue = milestone.due_date && isBefore(new Date(milestone.due_date), new Date()) && milestone.status !== 'completed'
  const tasks = milestone.tasks || []
  const completedTasks = tasks.filter(t => t.status === 'completed').length
  const taskProgress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0
  const latestApproval = approvals[0]
  const canApprove = milestone.status === 'completed' && (!latestApproval || latestApproval.status === 'pending')

  return (
    <Card className={`${isOverdue ? 'border-red-200 bg-red-50' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getStatusIcon(milestone.status)}
              <h3 className="text-lg font-semibold">{milestone.title}</h3>
              <Badge className={getStatusColor(milestone.status)}>
                {milestone.status.replace('_', ' ')}
              </Badge>
              {isOverdue && (
                <Badge className="bg-red-100 text-red-800">
                  Overdue
                </Badge>
              )}
              {latestApproval && (
                <Badge className={
                  latestApproval.status === 'approved' ? 'bg-green-100 text-green-800' :
                  latestApproval.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }>
                  {latestApproval.status}
                </Badge>
              )}
            </div>
            {milestone.description && (
              <p className="text-gray-600 text-sm mb-2">{milestone.description}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              {milestone.due_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(milestone.due_date), 'MMM dd, yyyy')}
                </div>
              )}
              {milestone.estimated_hours && (
                <div className="flex items-center gap-1">
                  <Timer className="h-4 w-4" />
                  {milestone.estimated_hours}h
                </div>
              )}
              <div className="flex items-center gap-1">
                <Target className="h-4 w-4" />
                {completedTasks}/{tasks.length} tasks
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                {comments.length} comments
              </div>
            </div>
          </div>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => setExpanded(!expanded)}
            className="h-8 w-8 p-0"
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
        
        {/* Task Progress */}
        {tasks.length > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-sm mb-1">
              <span>Task Progress</span>
              <span>{taskProgress}%</span>
            </div>
            <Progress value={taskProgress} className="h-2" />
          </div>
        )}
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          <div className="space-y-4">
            {/* Tasks */}
            {tasks.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Tasks ({tasks.length})</h4>
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div key={task.id} className="p-3 border rounded-lg bg-gray-50 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          {task.status === 'completed' ? 
                            <CheckCircle className="h-4 w-4 text-green-600" /> : 
                            <Clock className="h-4 w-4 text-gray-500" />
                          }
                          <div className="flex-1">
                            <h5 className="font-medium text-sm">{task.title}</h5>
                            {task.description && (
                              <p className="text-xs text-gray-600 mt-1">{task.description}</p>
                            )}
                          </div>
                        </div>
                        <Badge className={
                          task.status === 'completed' ? 'bg-green-100 text-green-800' :
                          task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {task.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      {/* Task Comments */}
                      {taskComments[task.id]?.length ? (
                        <div className="bg-white border rounded p-2">
                          <div className="text-xs font-medium text-gray-600 mb-1">Comments</div>
                          <ul className="space-y-1 max-h-28 overflow-auto">
                            {taskComments[task.id].map((c: any) => (
                              <li key={c.id} className="text-xs text-gray-700 flex items-center gap-2">
                                <span className="text-gray-400">•</span>
                                <span className="truncate">{c.comment}</span>
                                <span className="ml-auto text-[10px] text-gray-400">{new Date(c.created_at).toLocaleDateString()}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comments */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">Comments ({comments.length})</h4>
                <Button size="sm" onClick={onComment} className="bg-blue-600 hover:bg-blue-700">
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Add Comment
                </Button>
              </div>
              
              {comments.length === 0 ? (
                <p className="text-gray-500 text-sm italic">No comments yet</p>
              ) : (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <div key={comment.id} className="p-3 border rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{comment.author_name}</span>
                          <Badge variant="outline" className="text-xs">
                            {comment.author_role}
                          </Badge>
                        </div>
                        <span className="text-xs text-gray-500">
                          {format(new Date(comment.created_at), 'MMM dd, yyyy HH:mm')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{comment.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Approvals */}
            {approvals.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Approval History</h4>
                <div className="space-y-2">
                  {approvals.map((approval) => (
                    <div key={approval.id} className="p-3 border rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">Client</span>
                          <Badge className={
                            approval.status === 'approved' ? 'bg-green-100 text-green-800' :
                            approval.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }>
                            {approval.status}
                          </Badge>
                        </div>
                        <span className="text-xs text-gray-500">
                          {format(new Date(approval.created_at), 'MMM dd, yyyy HH:mm')}
                        </span>
                      </div>
                      {approval.feedback && (
                        <p className="text-sm text-gray-700">{approval.feedback}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t">
              <Button size="sm" variant="outline" onClick={onComment}>
                <MessageSquare className="h-4 w-4 mr-1" />
                Comment
              </Button>
              {canApprove && (
                <Button size="sm" onClick={onApprove} className="bg-green-600 hover:bg-green-700">
                  <ThumbsUp className="h-4 w-4 mr-1" />
                  Approve
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={onDownload}>
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
              <Button size="sm" variant="outline" onClick={onBookmark}>
                <Bookmark className="h-4 w-4 mr-1" />
                Bookmark
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
