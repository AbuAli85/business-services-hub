'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  User, 
  MessageSquare, 
  Calendar, 
  Eye, 
  Download, 
  ThumbsUp, 
  ThumbsDown, 
  RefreshCw, 
  Send, 
  FileText, 
  Camera, 
  Video, 
  Link, 
  Star, 
  Award, 
  Target, 
  BarChart3, 
  Activity, 
  Zap, 
  ExternalLink,
  Plus,
  Edit,
  Trash2,
  Filter,
  Search
} from 'lucide-react'
import { format, isAfter, isBefore, differenceInDays, differenceInHours } from 'date-fns'
import { Milestone, Task, UserRole } from '@/types/progress'

interface EnhancedApprovalWorkflowProps {
  milestones: Milestone[]
  userRole: UserRole
  onMilestoneUpdate?: (milestoneId: string, updates: Partial<Milestone>) => void
  onMilestoneApproval?: (milestoneId: string, action: 'approve' | 'reject', notes?: string) => void
  commentsByMilestone?: Record<string, any[]>
  approvalsByMilestone?: Record<string, any[]>
  className?: string
}

interface ApprovalRequest {
  id: string
  milestoneId: string
  milestoneTitle: string
  status: 'pending' | 'approved' | 'rejected' | 'revision_required'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  submittedBy: string
  submittedAt: Date
  dueDate?: Date
  description: string
  deliverables: string[]
  attachments: string[]
  clientNotes?: string
  providerNotes?: string
  revisionCount: number
  lastRevisionAt?: Date
  estimatedHours: number
  actualHours: number
  progress: number
}

interface ApprovalStats {
  totalRequests: number
  pendingRequests: number
  approvedRequests: number
  rejectedRequests: number
  averageApprovalTime: number
  revisionRate: number
  clientSatisfaction: number
}

export function EnhancedApprovalWorkflow({
  milestones,
  userRole,
  onMilestoneUpdate,
  onMilestoneApproval,
  commentsByMilestone = {},
  approvalsByMilestone = {},
  className = ""
}: EnhancedApprovalWorkflowProps) {
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>([])
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null)
  const [approvalStats, setApprovalStats] = useState<ApprovalStats>({
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
    averageApprovalTime: 0,
    revisionRate: 0,
    clientSatisfaction: 0
  })
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false)
  const [approvalNotes, setApprovalNotes] = useState('')
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | 'revision'>('approve')

  // Generate approval requests from milestones
  useEffect(() => {
    const generateApprovalRequests = () => {
      const requests: ApprovalRequest[] = milestones.map(milestone => {
        const approvals = approvalsByMilestone[milestone.id] || []
        const comments = commentsByMilestone[milestone.id] || []
        const latestApproval = approvals[approvals.length - 1]
        
        // Determine status based on milestone status and approvals
        let status: 'pending' | 'approved' | 'rejected' | 'revision_required' = 'pending'
        if (milestone.status === 'completed' && latestApproval?.status === 'approved') {
          status = 'approved'
        } else if (latestApproval?.status === 'rejected') {
          status = 'rejected'
        } else if (milestone.status === 'in_progress' && approvals.length > 0) {
          status = 'revision_required'
        }

        // Calculate priority based on due date and progress
        let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'
        if (milestone.due_date) {
          const daysUntilDue = differenceInDays(new Date(milestone.due_date), new Date())
          if (daysUntilDue < 0) priority = 'urgent'
          else if (daysUntilDue < 3) priority = 'high'
          else if (daysUntilDue < 7) priority = 'medium'
          else priority = 'low'
        }

        return {
          id: `approval-${milestone.id}`,
          milestoneId: milestone.id,
          milestoneTitle: milestone.title,
          status,
          priority,
          submittedBy: 'Team Member',
          submittedAt: new Date(milestone.created_at),
          dueDate: milestone.due_date ? new Date(milestone.due_date) : undefined,
          description: milestone.description || 'Milestone completion request',
          deliverables: [
            'Final deliverable',
            'Documentation',
            'Testing results',
            'Client handover materials'
          ],
          attachments: [
            'deliverable-screenshot.png',
            'technical-documentation.pdf',
            'test-results.xlsx'
          ],
          clientNotes: latestApproval?.notes,
          providerNotes: comments.find(c => c.type === 'provider_note')?.content,
          revisionCount: approvals.filter(a => a.status === 'rejected').length,
          lastRevisionAt: approvals.length > 0 ? new Date(approvals[approvals.length - 1].created_at) : undefined,
          estimatedHours: milestone.estimated_hours || 0,
          actualHours: milestone.actual_hours || 0,
          progress: milestone.progress || 0
        }
      })

      setApprovalRequests(requests)
    }

    generateApprovalRequests()
  }, [milestones, approvalsByMilestone, commentsByMilestone])

  // Calculate approval statistics
  useEffect(() => {
    const calculateStats = () => {
      const total = approvalRequests.length
      const pending = approvalRequests.filter(r => r.status === 'pending').length
      const approved = approvalRequests.filter(r => r.status === 'approved').length
      const rejected = approvalRequests.filter(r => r.status === 'rejected').length
      
      // Calculate average approval time (simplified)
      const completedRequests = approvalRequests.filter(r => r.status === 'approved' || r.status === 'rejected')
      const averageApprovalTime = completedRequests.length > 0 
        ? completedRequests.reduce((sum, r) => {
            const approvalTime = r.lastRevisionAt ? differenceInHours(r.lastRevisionAt, r.submittedAt) : 24
            return sum + approvalTime
          }, 0) / completedRequests.length
        : 0
      
      const revisionRate = total > 0 ? (approvalRequests.filter(r => r.revisionCount > 0).length / total) * 100 : 0
      const clientSatisfaction = approved > 0 ? Math.round((approved / (approved + rejected)) * 100) : 0

      setApprovalStats({
        totalRequests,
        pendingRequests: pending,
        approvedRequests: approved,
        rejectedRequests: rejected,
        averageApprovalTime: Math.round(averageApprovalTime),
        revisionRate: Math.round(revisionRate),
        clientSatisfaction
      })
    }

    calculateStats()
  }, [approvalRequests])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'rejected': return <XCircle className="h-5 w-5 text-red-600" />
      case 'pending': return <Clock className="h-5 w-5 text-yellow-600" />
      case 'revision_required': return <RefreshCw className="h-5 w-5 text-blue-600" />
      default: return <Clock className="h-5 w-5 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200'
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200'
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'revision_required': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredRequests = approvalRequests.filter(request => {
    const matchesStatus = filterStatus === 'all' || request.status === filterStatus
    const matchesSearch = request.milestoneTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         request.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const selectedRequestData = selectedRequest 
    ? approvalRequests.find(r => r.id === selectedRequest)
    : null

  const handleApprovalSubmit = async () => {
    if (!selectedRequestData || !onMilestoneApproval) return
    
    setIsSubmittingApproval(true)
    try {
      await onMilestoneApproval(
        selectedRequestData.milestoneId, 
        approvalAction === 'revision' ? 'reject' : approvalAction,
        approvalNotes
      )
      
      // Reset form
      setApprovalNotes('')
      setApprovalAction('approve')
      setSelectedRequest(null)
    } catch (error) {
      console.error('Error submitting approval:', error)
    } finally {
      setIsSubmittingApproval(false)
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            Enhanced Approval Workflow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{approvalStats.totalRequests}</div>
              <div className="text-sm text-gray-600">Total Requests</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{approvalStats.pendingRequests}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{approvalStats.approvedRequests}</div>
              <div className="text-sm text-gray-600">Approved</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{approvalStats.clientSatisfaction}%</div>
              <div className="text-sm text-gray-600">Satisfaction</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search approval requests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                title="Filter by status"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="revision_required">Revision Required</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Approval Requests List */}
      <div className="space-y-4">
        {filteredRequests.map((request) => (
          <Card 
            key={request.id}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedRequest === request.id ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => setSelectedRequest(
              selectedRequest === request.id ? null : request.id
            )}
          >
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon(request.status)}
                    <h3 className="text-lg font-semibold text-gray-900">{request.milestoneTitle}</h3>
                    <Badge className={getStatusColor(request.status)}>
                      {request.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <Badge className={getPriorityColor(request.priority)}>
                      {request.priority.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">{request.description}</p>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      <span>by {request.submittedBy}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{format(request.submittedAt, 'MMM dd, yyyy')}</span>
                    </div>
                    {request.dueDate && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>Due: {format(request.dueDate, 'MMM dd, yyyy')}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Target className="h-4 w-4" />
                      <span>{request.progress}% Complete</span>
                    </div>
                    {request.revisionCount > 0 && (
                      <div className="flex items-center gap-1">
                        <RefreshCw className="h-4 w-4" />
                        <span>{request.revisionCount} Revisions</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm text-gray-500 mb-1">Deliverables</div>
                  <div className="text-lg font-bold text-blue-600">{request.deliverables.length}</div>
                  <div className="text-xs text-gray-500">Attachments: {request.attachments.length}</div>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${request.progress}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Approval View */}
      {selectedRequestData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Approval Details - {selectedRequestData.milestoneTitle}
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedRequest(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Request Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Request Information</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Status:</span>
                      <Badge className={getStatusColor(selectedRequestData.status)}>
                        {selectedRequestData.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Priority:</span>
                      <Badge className={getPriorityColor(selectedRequestData.priority)}>
                        {selectedRequestData.priority.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Submitted By:</span>
                      <span className="text-sm text-gray-900">{selectedRequestData.submittedBy}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Submitted At:</span>
                      <span className="text-sm text-gray-900">
                        {format(selectedRequestData.submittedAt, 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Progress:</span>
                      <span className="text-sm text-gray-900">{selectedRequestData.progress}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Revisions:</span>
                      <span className="text-sm text-gray-900">{selectedRequestData.revisionCount}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Time Tracking</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Estimated Hours:</span>
                      <span className="text-sm text-gray-900">{selectedRequestData.estimatedHours}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Actual Hours:</span>
                      <span className="text-sm text-gray-900">{selectedRequestData.actualHours}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Efficiency:</span>
                      <span className="text-sm text-gray-900">
                        {selectedRequestData.estimatedHours > 0 
                          ? Math.round((selectedRequestData.actualHours / selectedRequestData.estimatedHours) * 100)
                          : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Deliverables */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Deliverables</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedRequestData.deliverables.map((deliverable, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-gray-900">{deliverable}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Attachments */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Attachments</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {selectedRequestData.attachments.map((attachment, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-gray-900 flex-1">{attachment}</span>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {(selectedRequestData.clientNotes || selectedRequestData.providerNotes) && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Notes</h4>
                  <div className="space-y-3">
                    {selectedRequestData.clientNotes && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-900">Client Notes</span>
                        </div>
                        <p className="text-sm text-blue-800">{selectedRequestData.clientNotes}</p>
                      </div>
                    )}
                    {selectedRequestData.providerNotes && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-4 w-4 text-gray-600" />
                          <span className="text-sm font-medium text-gray-900">Provider Notes</span>
                        </div>
                        <p className="text-sm text-gray-800">{selectedRequestData.providerNotes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Approval Actions (for clients) */}
              {userRole === 'client' && selectedRequestData.status === 'pending' && (
                <div className="border-t pt-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Approval Decision</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Decision
                      </label>
                      <div className="flex gap-3">
                        <Button
                          variant={approvalAction === 'approve' ? 'default' : 'outline'}
                          onClick={() => setApprovalAction('approve')}
                          className="flex items-center gap-2"
                        >
                          <ThumbsUp className="h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          variant={approvalAction === 'reject' ? 'default' : 'outline'}
                          onClick={() => setApprovalAction('reject')}
                          className="flex items-center gap-2"
                        >
                          <ThumbsDown className="h-4 w-4" />
                          Reject
                        </Button>
                        <Button
                          variant={approvalAction === 'revision' ? 'default' : 'outline'}
                          onClick={() => setApprovalAction('revision')}
                          className="flex items-center gap-2"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Request Revision
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notes (Optional)
                      </label>
                      <Textarea
                        value={approvalNotes}
                        onChange={(e) => setApprovalNotes(e.target.value)}
                        placeholder="Add any feedback or notes about this approval..."
                        className="min-h-[100px]"
                      />
                    </div>
                    
                    <div className="flex justify-end">
                      <Button
                        onClick={handleApprovalSubmit}
                        disabled={isSubmittingApproval}
                        className="flex items-center gap-2"
                      >
                        {isSubmittingApproval ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        Submit Decision
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
