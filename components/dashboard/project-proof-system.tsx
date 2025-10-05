'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Camera, 
  FileText, 
  Download, 
  Eye, 
  CheckCircle, 
  Clock, 
  Calendar, 
  User, 
  MessageSquare, 
  ThumbsUp, 
  ThumbsDown, 
  Shield, 
  Award, 
  Target, 
  BarChart3, 
  TrendingUp, 
  Activity, 
  Zap, 
  Star, 
  ExternalLink,
  Upload,
  Image,
  Video,
  File,
  Link,
  Plus,
  X,
  Edit,
  Trash2
} from 'lucide-react'
import { format, isAfter, isBefore, differenceInDays } from 'date-fns'
import { Milestone, Task, UserRole } from '@/types/progress'

interface ProjectProofSystemProps {
  milestones: Milestone[]
  userRole: UserRole
  onMilestoneUpdate?: (milestoneId: string, updates: Partial<Milestone>) => void
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void
  commentsByMilestone?: Record<string, any[]>
  approvalsByMilestone?: Record<string, any[]>
  timeEntries?: any[]
  className?: string
}

interface ProofItem {
  id: string
  type: 'screenshot' | 'document' | 'video' | 'link' | 'comment' | 'approval' | 'time_entry'
  title: string
  description: string
  url?: string
  thumbnail?: string
  milestoneId: string
  taskId?: string
  createdBy: string
  createdAt: Date
  fileSize?: number
  duration?: number
  status: 'pending' | 'approved' | 'rejected'
  tags: string[]
}

interface MilestoneProof {
  milestoneId: string
  milestoneTitle: string
  status: string
  progress: number
  proofItems: ProofItem[]
  completionEvidence: ProofItem[]
  approvalEvidence: ProofItem[]
  timeEvidence: ProofItem[]
  clientFeedback: ProofItem[]
}

export function ProjectProofSystem({
  milestones,
  userRole,
  onMilestoneUpdate,
  onTaskUpdate,
  commentsByMilestone = {},
  approvalsByMilestone = {},
  timeEntries = [],
  className = ""
}: ProjectProofSystemProps) {
  const [milestoneProofs, setMilestoneProofs] = useState<MilestoneProof[]>([])
  const [selectedMilestone, setSelectedMilestone] = useState<string | null>(null)
  const [proofView, setProofView] = useState<'overview' | 'detailed' | 'timeline'>('overview')
  const [isAddingProof, setIsAddingProof] = useState(false)

  // Generate proof data from milestones
  useEffect(() => {
    const generateProofData = () => {
      const proofs: MilestoneProof[] = milestones.map(milestone => {
        const comments = commentsByMilestone[milestone.id] || []
        const approvals = approvalsByMilestone[milestone.id] || []
        const milestoneTimeEntries = timeEntries.filter(entry => 
          entry.milestone_id === milestone.id
        )

        // Generate proof items from various sources
        const proofItems: ProofItem[] = [
          // Comments as proof of communication
          ...comments.map((comment, index) => ({
            id: `comment-${milestone.id}-${index}`,
            type: 'comment' as const,
            title: 'Client Communication',
            description: comment.content,
            milestoneId: milestone.id,
            createdBy: comment.created_by || 'Client',
            createdAt: new Date(comment.created_at),
            status: 'approved' as const,
            tags: ['communication', 'feedback']
          })),
          
          // Approvals as proof of client sign-off
          ...approvals.map((approval, index) => ({
            id: `approval-${milestone.id}-${index}`,
            type: 'approval' as const,
            title: `Client ${approval.status === 'approved' ? 'Approval' : 'Rejection'}`,
            description: approval.notes || `${approval.status} for ${milestone.title}`,
            milestoneId: milestone.id,
            createdBy: approval.approved_by || 'Client',
            createdAt: new Date(approval.created_at),
            status: approval.status as 'approved' | 'rejected',
            tags: ['approval', 'sign-off', approval.status]
          })),
          
          // Time entries as proof of work
          ...milestoneTimeEntries.map((entry, index) => ({
            id: `time-${milestone.id}-${index}`,
            type: 'time_entry' as const,
            title: 'Work Time Logged',
            description: `${entry.duration || 0} hours of work completed`,
            milestoneId: milestone.id,
            createdBy: entry.user_id || 'Team Member',
            createdAt: new Date(entry.created_at),
            status: 'approved' as const,
            tags: ['time-tracking', 'work-log'],
            duration: entry.duration
          })),
          
          // Note: Additional proof items like screenshots and documents should be uploaded via the system
          // This system tracks existing evidence like comments, approvals, and time entries
        ]

        // Categorize proof items
        const completionEvidence = proofItems.filter(item => 
          item.tags.includes('deliverable') || item.tags.includes('final')
        )
        const approvalEvidence = proofItems.filter(item => 
          item.type === 'approval'
        )
        const timeEvidence = proofItems.filter(item => 
          item.type === 'time_entry'
        )
        const clientFeedback = proofItems.filter(item => 
          item.type === 'comment' || item.type === 'approval'
        )

        return {
          milestoneId: milestone.id,
          milestoneTitle: milestone.title,
          status: milestone.status,
          progress: milestone.progress_percentage || 0,
          proofItems,
          completionEvidence,
          approvalEvidence,
          timeEvidence,
          clientFeedback
        }
      })

      setMilestoneProofs(proofs)
    }

    generateProofData()
  }, [milestones, commentsByMilestone, approvalsByMilestone, timeEntries])

  const getProofIcon = (type: string) => {
    switch (type) {
      case 'screenshot': return <Camera className="h-4 w-4" />
      case 'document': return <FileText className="h-4 w-4" />
      case 'video': return <Video className="h-4 w-4" />
      case 'link': return <Link className="h-4 w-4" />
      case 'comment': return <MessageSquare className="h-4 w-4" />
      case 'approval': return <Shield className="h-4 w-4" />
      case 'time_entry': return <Clock className="h-4 w-4" />
      default: return <File className="h-4 w-4" />
    }
  }

  const getProofColor = (type: string) => {
    switch (type) {
      case 'screenshot': return 'text-blue-600 bg-blue-50'
      case 'document': return 'text-green-600 bg-green-50'
      case 'video': return 'text-purple-600 bg-purple-50'
      case 'link': return 'text-orange-600 bg-orange-50'
      case 'comment': return 'text-gray-600 bg-gray-50'
      case 'approval': return 'text-green-600 bg-green-50'
      case 'time_entry': return 'text-indigo-600 bg-indigo-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const selectedProof = selectedMilestone 
    ? milestoneProofs.find(p => p.milestoneId === selectedMilestone)
    : null

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-blue-600" />
              Project Proof & Evidence System
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant={proofView === 'overview' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setProofView('overview')}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Overview
              </Button>
              <Button
                variant={proofView === 'detailed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setProofView('detailed')}
              >
                <Eye className="h-4 w-4 mr-2" />
                Detailed
              </Button>
              <Button
                variant={proofView === 'timeline' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setProofView('timeline')}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Timeline
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Comprehensive evidence system showing project progress, client approvals, and deliverable proof.
          </p>
        </CardContent>
      </Card>

      {/* Milestone Proof Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {milestoneProofs.map((proof) => (
          <Card 
            key={proof.milestoneId}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedMilestone === proof.milestoneId ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => setSelectedMilestone(
              selectedMilestone === proof.milestoneId ? null : proof.milestoneId
            )}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{proof.milestoneTitle}</CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={getStatusColor(proof.status)}>
                      {proof.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <span className="text-sm text-gray-500">{proof.progress}% Complete</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">{proof.proofItems.length}</div>
                  <div className="text-xs text-gray-500">Proof Items</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${proof.progress}%` }}
                  />
                </div>
                
                {/* Proof Categories */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    <span>{proof.completionEvidence.length} Deliverables</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Shield className="h-3 w-3 text-blue-600" />
                    <span>{proof.approvalEvidence.length} Approvals</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-purple-600" />
                    <span>{proof.timeEvidence.length} Time Entries</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3 text-gray-600" />
                    <span>{proof.clientFeedback.length} Feedback</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Proof View */}
      {selectedProof && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                {selectedProof.milestoneTitle} - Proof Details
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddingProof(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Proof
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Proof Items by Category */}
              {selectedProof.completionEvidence.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Award className="h-5 w-5 text-green-600" />
                    Completion Evidence ({selectedProof.completionEvidence.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedProof.completionEvidence.map((item) => (
                      <Card key={item.id} className="overflow-hidden">
                        <div className="aspect-video bg-gray-100 flex items-center justify-center">
                          {item.thumbnail ? (
                            <img 
                              src={item.thumbnail} 
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-center text-gray-500">
                              {getProofIcon(item.type)}
                              <p className="text-xs mt-1">{item.type}</p>
                            </div>
                          )}
                        </div>
                        <CardContent className="p-3">
                          <h5 className="font-medium text-sm mb-1">{item.title}</h5>
                          <p className="text-xs text-gray-600 mb-2">{item.description}</p>
                          <div className="flex items-center justify-between">
                            <Badge className={getStatusColor(item.status)}>
                              {item.status}
                            </Badge>
                            {item.fileSize && (
                              <span className="text-xs text-gray-500">
                                {formatFileSize(item.fileSize)}
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Client Approvals */}
              {selectedProof.approvalEvidence.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <ThumbsUp className="h-5 w-5 text-blue-600" />
                    Client Approvals ({selectedProof.approvalEvidence.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedProof.approvalEvidence.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          {item.status === 'approved' ? (
                            <ThumbsUp className="h-5 w-5 text-green-600" />
                          ) : (
                            <ThumbsDown className="h-5 w-5 text-red-600" />
                          )}
                          <div>
                            <p className="font-medium text-sm">{item.title}</p>
                            <p className="text-xs text-gray-600">{item.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={getStatusColor(item.status)}>
                            {item.status}
                          </Badge>
                          <p className="text-xs text-gray-500 mt-1">
                            {format(item.createdAt, 'MMM dd, yyyy')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Time Evidence */}
              {selectedProof.timeEvidence.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-purple-600" />
                    Time Tracking Evidence ({selectedProof.timeEvidence.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedProof.timeEvidence.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Clock className="h-5 w-5 text-purple-600" />
                          <div>
                            <p className="font-medium text-sm">{item.title}</p>
                            <p className="text-xs text-gray-600">{item.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium text-purple-600">
                            {item.duration?.toFixed(1)}h
                          </span>
                          <p className="text-xs text-gray-500">
                            {format(item.createdAt, 'MMM dd, yyyy')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Client Feedback */}
              {selectedProof.clientFeedback.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-gray-600" />
                    Client Feedback ({selectedProof.clientFeedback.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedProof.clientFeedback.map((item) => (
                      <div key={item.id} className="p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <p className="font-medium text-sm">{item.title}</p>
                          <span className="text-xs text-gray-500">
                            {format(item.createdAt, 'MMM dd, yyyy')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{item.description}</p>
                        <p className="text-xs text-gray-500 mt-1">by {item.createdBy}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Proof Summary Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {milestoneProofs.reduce((sum, p) => sum + p.proofItems.length, 0)}
              </div>
              <div className="text-sm text-gray-600">Total Proof Items</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {milestoneProofs.reduce((sum, p) => sum + p.completionEvidence.length, 0)}
              </div>
              <div className="text-sm text-gray-600">Deliverables</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {milestoneProofs.reduce((sum, p) => sum + p.approvalEvidence.length, 0)}
              </div>
              <div className="text-sm text-gray-600">Client Approvals</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {milestoneProofs.reduce((sum, p) => sum + p.timeEvidence.length, 0)}
              </div>
              <div className="text-sm text-gray-600">Time Entries</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
