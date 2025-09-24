'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Upload, 
  FileText, 
  Download, 
  Eye, 
  Trash2, 
  MessageSquare, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Plus,
  Filter,
  Search,
  Calendar,
  User,
  Tag,
  RefreshCw
} from 'lucide-react'
import { documentManagementService } from '@/lib/document-management-service'
import { getSupabaseClient } from '@/lib/supabase'
import { 
  Document, 
  DocumentRequest, 
  DocumentCategory, 
  DocumentRequestForm,
  DocumentUploadForm,
  DocumentFilter,
  DocumentStats
} from '@/types/document-management'
import { toast } from 'sonner'

interface DocumentManagerProps {
  bookingId: string
  milestoneId?: string
  taskId?: string
  userRole: 'client' | 'provider' | 'admin'
  onDocumentUploaded?: (document: Document) => void
  onRequestCreated?: (request: DocumentRequest) => void
}

export function DocumentManager({
  bookingId,
  milestoneId,
  taskId,
  userRole,
  onDocumentUploaded,
  onRequestCreated
}: DocumentManagerProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [requests, setRequests] = useState<DocumentRequest[]>([])
  const [categories, setCategories] = useState<DocumentCategory[]>([])
  const [stats, setStats] = useState<DocumentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('documents')
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<DocumentFilter>({})
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'size' | 'type' | 'version' | 'uploaded_at' | 'uploaded_by'>('uploaded_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [statusFilter, setStatusFilter] = useState<'all' | 'uploaded' | 'approved' | 'rejected' | 'revision_requested'>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([])
  const [requestStatusFilter, setRequestStatusFilter] = useState<'all' | 'pending' | 'uploaded' | 'approved' | 'rejected' | 'overdue'>('all')
  const [requestPriorityFilter, setRequestPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'urgent'>('all')
  const [requestDateFrom, setRequestDateFrom] = useState<string>('')
  const [requestDateTo, setRequestDateTo] = useState<string>('')
  
  // Dialog states
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [showRequestDialog, setShowRequestDialog] = useState(false)
  const [showFilterDialog, setShowFilterDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState<string>('')
  const [showCommentDialog, setShowCommentDialog] = useState(false)
  const [commentTargetId, setCommentTargetId] = useState<string | null>(null)
  const [commentContent, setCommentContent] = useState<string>('')
  const [showCommentsDialog, setShowCommentsDialog] = useState(false)
  const [commentsDocId, setCommentsDocId] = useState<string | null>(null)
  const [commentsList, setCommentsList] = useState<any[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  
  // Form states
  const [uploadForm, setUploadForm] = useState<DocumentUploadForm>({
    file: null,
    description: '',
    request_id: undefined,
    milestone_id: milestoneId,
    task_id: taskId
  })
  
  const [requestForm, setRequestForm] = useState<DocumentRequestForm>({
    title: '',
    description: '',
    category_id: '',
    is_required: true,
    due_date: '',
    priority: 'normal',
    milestone_id: milestoneId,
    task_id: taskId
  })

  // expose request handlers to child card via window bridge (keeps file scoped)
  ;(globalThis as any).handleApproveRequest = (id: string) => handleApproveRequest(id)
  ;(globalThis as any).handleRejectRequest = (id: string) => handleRejectRequest(id)

  useEffect(() => {
    loadData()
  }, [bookingId, milestoneId, taskId])

  const loadData = async () => {
    try {
      setLoading(true)
      
      const [documentsData, requestsData, categoriesData, statsData] = await Promise.all([
        documentManagementService.getDocuments(bookingId, { ...filter, milestone_id: milestoneId, task_id: taskId }),
        documentManagementService.getRequests(bookingId, { ...filter, milestone_id: milestoneId, task_id: taskId }),
        documentManagementService.getCategories(),
        documentManagementService.getStats(bookingId)
      ])

      // Enrich documents with uploader display names
      let enrichedDocuments = documentsData
      try {
        const supabase = await getSupabaseClient()
        const ids = Array.from(new Set((documentsData || []).map(d => d.uploaded_by).filter(Boolean))) as string[]
        if (ids.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', ids)
          const idToProfile: Record<string, { id: string, full_name?: string, email?: string }> = {}
          for (const p of (profiles || [])) idToProfile[p.id] = p
          enrichedDocuments = (documentsData || []).map(d => ({
            ...d,
            uploaded_by_user: d.uploaded_by ? {
              id: d.uploaded_by,
              full_name: idToProfile[d.uploaded_by]?.full_name || idToProfile[d.uploaded_by]?.email || 'User',
              email: idToProfile[d.uploaded_by]?.email || ''
            } : undefined
          }))
        }
      } catch {
        enrichedDocuments = documentsData
      }

      // Enrich requests with display names for requested_by and requested_from
      let enrichedRequests = requestsData
      try {
        const supabase = await getSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()
        const ids = Array.from(new Set(
          (requestsData || []).flatMap(r => [r.requested_by, r.requested_from]).filter(Boolean)
        )) as string[]
        if (ids.length > 0) {
          // Try profiles first for full_name/email
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', ids)

          const idToProfile: Record<string, { id: string, full_name?: string, email?: string }> = {}
          if (!profilesError && profiles) {
            for (const p of profiles) idToProfile[p.id] = p
          }

          enrichedRequests = (requestsData || []).map(r => ({
            ...r,
            requested_by_user: r.requested_by ? {
              id: r.requested_by,
              full_name: r.requested_by === user?.id ? 'You' : (idToProfile[r.requested_by]?.full_name || idToProfile[r.requested_by]?.email || 'User'),
              email: idToProfile[r.requested_by]?.email || ''
            } : undefined,
            requested_from_user: r.requested_from ? {
              id: r.requested_from,
              full_name: r.requested_from === user?.id ? 'You' : (idToProfile[r.requested_from]?.full_name || idToProfile[r.requested_from]?.email || 'User'),
              email: idToProfile[r.requested_from]?.email || ''
            } : undefined
          }))
        }
      } catch (e) {
        // If lookup fails (RLS or missing table), keep original data; UI will show Unknown
        enrichedRequests = requestsData
      }

      setDocuments(enrichedDocuments)
      setRequests(enrichedRequests)
      setCategories(categoriesData)
      setStats(statsData)
    } catch (error) {
      console.error('Error loading document data:', error)
      toast.error('Failed to load document data')
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async () => {
    if (!uploadForm.file) {
      toast.error('Please select a file to upload')
      return
    }

    try {
      const document = await documentManagementService.uploadDocument(bookingId, uploadForm)
      if (document) {
        setDocuments(prev => [document, ...prev])
        onDocumentUploaded?.(document)
        toast.success('Document uploaded successfully')
        setShowUploadDialog(false)
        setUploadForm({ file: null, description: '', request_id: undefined, milestone_id: milestoneId, task_id: taskId })
      } else {
        toast.error('Failed to upload document')
      }
    } catch (error) {
      console.error('Upload error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload document'
      
      if (errorMessage.includes('storage bucket not found') || errorMessage.includes('Bucket not found')) {
        toast.error('Storage bucket not found. Please create a "documents" bucket in Supabase Storage.')
      } else if (errorMessage.includes('table does not exist')) {
        toast.error('Database tables not found. Please run the database migration first.')
      } else {
        toast.error(errorMessage)
      }
    }
  }

  const handleCreateRequest = async () => {
    if (!requestForm.title.trim()) {
      toast.error('Please enter a title for the request')
      return
    }

    try {
      // Resolve the other participant from the booking
      const supabase = await documentManagementService['getClient']?.() || (await import('@/lib/supabase')).getSupabaseClient()
      const client = typeof supabase === 'function' ? await supabase() : supabase
      const { data: { user } } = await client.auth.getUser()
      const { data: booking } = await client
        .from('bookings')
        .select('id, client_id, provider_id')
        .eq('id', bookingId)
        .single()

      const otherUserId = booking
        ? (user?.id === booking.client_id ? booking.provider_id : booking.client_id)
        : null

      const request = await documentManagementService.createRequest(bookingId, requestForm, otherUserId || '')
      if (request) {
        setRequests(prev => [request, ...prev])
        onRequestCreated?.(request)
        toast.success('Document request created successfully')
        setShowRequestDialog(false)
        setRequestForm({
          title: '',
          description: '',
          category_id: '',
          is_required: true,
          due_date: '',
          priority: 'normal',
          milestone_id: milestoneId,
          task_id: taskId
        })
      } else {
        toast.error('Failed to create document request')
      }
    } catch (error) {
      console.error('Request creation error:', error)
      toast.error('Failed to create document request')
    }
  }

  const handleApproveDocument = async (documentId: string) => {
    try {
      const success = await documentManagementService.updateDocumentStatus(documentId, 'approved')
      if (success) {
        setDocuments(prev => prev.map(doc => 
          doc.id === documentId ? { ...doc, status: 'approved' } : doc
        ))
        toast.success('Document approved')
      } else {
        toast.error('Failed to approve document')
      }
    } catch (error) {
      console.error('Approval error:', error)
      toast.error('Failed to approve document')
    }
  }

  const handleRejectDocument = async (documentId: string, reason: string) => {
    try {
      const success = await documentManagementService.updateDocumentStatus(documentId, 'rejected', reason)
      if (success) {
        setDocuments(prev => prev.map(doc => 
          doc.id === documentId ? { ...doc, status: 'rejected', rejection_reason: reason } : doc
        ))
        toast.success('Document rejected')
      } else {
        toast.error('Failed to reject document')
      }
    } catch (error) {
      console.error('Rejection error:', error)
      toast.error('Failed to reject document')
    }
  }

  // Force direct file download
  const handleDirectDownload = async (url: string, filename: string) => {
    try {
      const res = await fetch(url, { mode: 'cors' })
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename || 'download'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(blobUrl)
    } catch (e) {
      const a = document.createElement('a')
      a.href = url
      a.download = filename || 'download'
      document.body.appendChild(a)
      a.click()
      a.remove()
    }
  }

  const openRejectModal = (docId: string) => {
    setRejectTargetId(docId)
    setRejectReason('')
    setShowRejectDialog(true)
  }

  const submitReject = async () => {
    if (!rejectTargetId) return
    await handleRejectDocument(rejectTargetId, rejectReason || 'Not specified')
    setShowRejectDialog(false)
    setRejectTargetId(null)
    setRejectReason('')
  }

  const openCommentModal = (docId: string) => {
    setCommentTargetId(docId)
    setCommentContent('')
    setShowCommentDialog(true)
  }

  const submitComment = async () => {
    if (!commentTargetId || !commentContent.trim()) {
      toast.error('Please enter a comment')
      return
    }
    const created = await documentManagementService.addComment(commentTargetId, { content: commentContent.trim(), is_internal: false })
    if (created) {
      toast.success('Comment added')
      // Update local documents array to show latest comment count by refetching a minimal row
      try {
        const supabase = await getSupabaseClient()
        const { data: refreshed } = await supabase
          .from('documents')
          .select('id')
          .eq('id', commentTargetId)
          .single()
        // no-op, we just force a light refresh of the list by reloading page data
        await loadData()
      } catch {}
    } else {
      toast.error('Failed to add comment')
    }
    setShowCommentDialog(false)
    setCommentTargetId(null)
    setCommentContent('')
  }

  // Open comments viewer dialog
  const openCommentsViewer = async (docId: string) => {
    try {
      setCommentsLoading(true)
      setCommentsList([])
      setCommentsDocId(docId)
      setShowCommentsDialog(true)
      const supabase = await getSupabaseClient()
      const { data: rows, error } = await supabase
        .from('document_comments')
        .select('id, author_name, author_role, content, created_at')
        .eq('document_id', docId)
        .order('created_at', { ascending: true })
      if (error) {
        console.error('Load comments error:', error)
        setCommentsList([])
      } else {
        setCommentsList(rows || [])
      }
    } catch (e) {
      console.error('Open comments viewer error:', e)
      setCommentsList([])
    } finally {
      setCommentsLoading(false)
    }
  }

  // Provider/Admin delete action
  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return
    try {
      const ok = await documentManagementService.deleteDocument(documentId)
      if (ok) {
        setDocuments(prev => prev.filter(d => d.id !== documentId))
        toast.success('Document deleted')
      } else {
        toast.error('Failed to delete document')
      }
    } catch (e) {
      console.error('Delete error:', e)
      toast.error('Failed to delete document')
    }
  }

  // Request status handlers
  const handleApproveRequest = async (requestId: string) => {
    try {
      const ok = await documentManagementService.updateRequestStatus(requestId, 'approved')
      if (ok) {
        setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'approved' } as any : r))
        toast.success('Request approved')
      } else {
        toast.error('Failed to approve request')
      }
    } catch (e) {
      console.error(e)
      toast.error('Failed to approve request')
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    const reason = typeof window !== 'undefined' ? (window.prompt('Reason for rejection:') || 'Not sufficient') : 'Not sufficient'
    try {
      const ok = await documentManagementService.updateRequestStatus(requestId, 'rejected', reason)
      if (ok) {
        setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'rejected', rejection_reason: reason } as any : r))
        toast.success('Request rejected')
      } else {
        toast.error('Failed to reject request')
      }
    } catch (e) {
      console.error(e)
      toast.error('Failed to reject request')
    }
  }

  const filteredDocuments = documents
    .filter(doc => {
      const matchesText = doc.original_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
      const matchesStatus = statusFilter === 'all' ? true : doc.status === statusFilter
      const matchesType = typeFilter === 'all' ? true : (doc.file_type || '').toLowerCase().includes(typeFilter)
      const created = new Date(doc.created_at).getTime()
      const fromOk = dateFrom ? created >= new Date(dateFrom).getTime() : true
      const toOk = dateTo ? created <= new Date(dateTo).getTime() + 24*60*60*1000 - 1 : true
      return matchesText && matchesStatus && matchesType && fromOk && toOk
    })
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      switch (sortBy) {
        case 'name':
          return a.original_name.localeCompare(b.original_name) * dir
        case 'status':
          return a.status.localeCompare(b.status) * dir
        case 'size':
          return ((a.file_size || 0) - (b.file_size || 0)) * dir
        case 'type':
          return (a.file_type || '').localeCompare(b.file_type || '') * dir
        case 'version':
          return ((a.version || 0) - (b.version || 0)) * dir
        case 'uploaded_by':
          return ((a.uploaded_by_user?.full_name || '')).localeCompare(b.uploaded_by_user?.full_name || '') * dir
        default:
          return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir
      }
    })

  const filteredRequests = requests
    .filter(req => {
      const matchesText = req.title.toLowerCase().includes(searchTerm.toLowerCase()) || (req.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
      const matchesStatus = requestStatusFilter === 'all' ? true : req.status === requestStatusFilter
      const matchesPriority = requestPriorityFilter === 'all' ? true : req.priority === requestPriorityFilter
      const created = new Date(req.created_at).getTime()
      const fromOk = requestDateFrom ? created >= new Date(requestDateFrom).getTime() : true
      const toOk = requestDateTo ? created <= new Date(requestDateTo).getTime() + 24*60*60*1000 - 1 : true
      return matchesText && matchesStatus && matchesPriority && fromOk && toOk
    })

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Show setup message if no data and no errors (likely tables don't exist)
  if (!loading && documents.length === 0 && requests.length === 0 && categories.length === 0) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Document Management</h2>
            <p className="text-gray-600">Manage documents, requests, and approvals</p>
          </div>
        </div>

        {/* Setup Message */}
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Document Management Setup Required</h3>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              The document management system needs to be set up in your database. 
              Please run the database migration script to create the required tables.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mb-6 text-left max-w-2xl mx-auto">
              <h4 className="font-medium text-gray-900 mb-2">Setup Instructions:</h4>
              <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                <li>Go to your Supabase Dashboard</li>
                <li>Navigate to SQL Editor</li>
                <li>Copy and paste the contents of <code className="bg-gray-200 px-1 rounded">create-document-management-tables.sql</code></li>
                <li>Run the SQL script</li>
                <li>Refresh this page</li>
              </ol>
            </div>
            <Button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-700">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Document Management</h2>
          <p className="text-gray-600">Manage documents, requests, and approvals</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilterDialog(true)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filter
          </Button>
          {userRole === 'provider' && (
            <Button
              onClick={() => setShowRequestDialog(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Request Document
            </Button>
          )}
          <Button
            onClick={() => setShowUploadDialog(true)}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload Document
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Documents</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_documents}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Requests</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pending_requests}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Approved</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.approved_documents}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Overdue</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.overdue_requests}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search documents and requests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="uploaded">Uploaded</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="revision_requested">Revision requested</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v: any)=> setTypeFilter(v)}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="pdf">PDF</SelectItem>
            <SelectItem value="word">Word</SelectItem>
            <SelectItem value="image">Image</SelectItem>
            <SelectItem value="text">Text</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Input type="date" value={dateFrom} onChange={(e)=> setDateFrom(e.target.value)} className="w-[150px]" />
          <span className="text-sm text-gray-500">to</span>
          <Input type="date" value={dateTo} onChange={(e)=> setDateTo(e.target.value)} className="w-[150px]" />
        </div>
        {(dateFrom || dateTo || statusFilter!=='all' || typeFilter!=='all' || searchTerm) && (
          <Button variant="outline" onClick={()=>{ setSearchTerm(''); setStatusFilter('all'); setTypeFilter('all'); setDateFrom(''); setDateTo('') }}>Clear</Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
          <TabsTrigger value="requests">Requests ({requests.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-4">
          {filteredDocuments.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
                <p className="text-gray-600 mb-4">Upload your first document to get started</p>
                <Button onClick={() => setShowUploadDialog(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-auto rounded border">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="px-3 py-2 w-10"><input type="checkbox" checked={selectedIds.length>0 && selectedIds.length===filteredDocuments.length} onChange={(e)=> setSelectedIds(e.target.checked? filteredDocuments.map(d=>d.id): [])} /></th>
                    {[ 
                      { key:'name', label:'Name' },
                      { key:'status', label:'Status' },
                      { key:'size', label:'Size' },
                      { key:'type', label:'Type' },
                      ...(userRole === 'provider' || userRole === 'client' ? [] : [{ key:'version', label:'Version' }]),
                      ...(userRole === 'provider' || userRole === 'client' ? [] : [{ key:'uploaded_by', label:'Uploaded By' }]),
                      { key:'uploaded_at', label:'Created' },
                    ].map(col => (
                      <th key={col.key} className="px-3 py-2 text-left cursor-pointer" onClick={()=>{
                        const k = col.key as any; setSortBy(k); setSortDir(prev=> prev==='asc'?'desc':'asc')
                      }}>
                        {col.label}{' '}
                        {sortBy===col.key && (sortDir==='asc'?'▲':'▼')}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredDocuments.map(doc => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <input type="checkbox" checked={selectedIds.includes(doc.id)} onChange={(e)=> setSelectedIds(prev=> e.target.checked? [...prev, doc.id]: prev.filter(id=>id!==doc.id))} />
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-900 truncate max-w-[280px]" title={doc.original_name}>{doc.original_name}</div>
                        <div className="text-xs text-gray-500">{doc.file_path}</div>
                        {Array.isArray((doc as any).comments) && (doc as any).comments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {([...(doc as any).comments]
                              .sort((a: any,b: any)=> new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                              .slice(-2)
                            ).map((c: any) => (
                              <div key={c.id} className="rounded-md border bg-gray-50 px-2 py-1 max-w-[420px]">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-medium text-gray-700 truncate">
                                    {(c.author_name || 'User')}{c.author_role ? ` (${c.author_role})` : ''}
                                  </span>
                                  <span className="text-[10px] text-gray-500 ml-2">
                                    {new Date(c.created_at).toLocaleString()}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-800 whitespace-pre-wrap mt-0.5 line-clamp-2">
                                  {c.content}
                                </div>
                              </div>
                            ))}
                            {((doc as any).comments.length > 2) && (
                              <button
                                type="button"
                                className="text-xs text-blue-600 hover:underline"
                                onClick={() => openCommentsViewer(doc.id)}
                              >
                                View all {(doc as any).comments.length} comments
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <Badge className={doc.status==='approved'? 'bg-green-100 text-green-800': doc.status==='rejected'? 'bg-red-100 text-red-800': 'bg-blue-100 text-blue-800'}>
                          {doc.status.replace('_',' ')}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">{(doc.file_size/1024/1024).toFixed(2)} MB</td>
                      <td className="px-3 py-2">{doc.file_type}</td>
                      {!(userRole === 'provider' || userRole === 'client') && (
                        <td className="px-3 py-2">v{doc.version || 1}</td>
                      )}
                      {!(userRole === 'provider' || userRole === 'client') && (
                        <td className="px-3 py-2">{doc.uploaded_by_user?.full_name || 'Unknown'}</td>
                      )}
                      <td className="px-3 py-2">{new Date(doc.created_at).toLocaleDateString()}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex gap-2">
                          <Button size="sm" variant="outline" asChild>
                            <a href={doc.file_url} target="_blank" rel="noreferrer">View</a>
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDirectDownload(doc.file_url, doc.original_name)}>
                            Download
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openCommentsViewer(doc.id)}>View Comments</Button>
                          <Button size="sm" variant="outline" onClick={() => openCommentModal(doc.id)}>Comment</Button>
                          {(userRole==='provider' || userRole==='client') && doc.status==='uploaded' && (
                            <>
                              <Button size="sm" onClick={()=>handleApproveDocument(doc.id)} className="bg-green-600 hover:bg-green-700 text-white">Approve</Button>
                              <Button size="sm" onClick={()=>openRejectModal(doc.id)} className="bg-red-600 hover:bg-red-700 text-white">Reject</Button>
                            </>
                          )}
                          {(userRole==='provider' || userRole==='admin') && (
                            <Button size="sm" variant="outline" onClick={()=>handleDeleteDocument(doc.id)}>Delete</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {selectedIds.length>0 && (
                <div className="p-3 border-t flex items-center justify-between bg-gray-50">
                  <div className="text-sm text-gray-600">{selectedIds.length} selected</div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={async()=>{
                      for (const id of selectedIds) await documentManagementService.updateDocumentStatus(id,'approved');
                      setDocuments(prev=> prev.map(d=> selectedIds.includes(d.id)? { ...d, status:'approved'}: d));
                      setSelectedIds([])
                    }} className="bg-green-600 hover:bg-green-700">Approve selected</Button>
                    {/* Removed bulk delete for client safety */}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          {/* Request filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={requestStatusFilter} onValueChange={(v: any)=> setRequestStatusFilter(v)}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="uploaded">Uploaded</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            <Select value={requestPriorityFilter} onValueChange={(v: any)=> setRequestPriorityFilter(v)}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Input type="date" value={requestDateFrom} onChange={(e)=> setRequestDateFrom(e.target.value)} className="w-[150px]" />
              <span className="text-sm text-gray-500">to</span>
              <Input type="date" value={requestDateTo} onChange={(e)=> setRequestDateTo(e.target.value)} className="w-[150px]" />
            </div>
            {(requestStatusFilter!=='all' || requestPriorityFilter!=='all' || requestDateFrom || requestDateTo) && (
              <Button variant="outline" onClick={()=>{ setRequestStatusFilter('all'); setRequestPriorityFilter('all'); setRequestDateFrom(''); setRequestDateTo('') }}>Clear</Button>
            )}
          </div>
          {filteredRequests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No requests found</h3>
                <p className="text-gray-600 mb-4">Create your first document request</p>
                {userRole === 'provider' && (
                  <Button onClick={() => setShowRequestDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Request Document
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-auto rounded border">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="px-3 py-2 w-10"><input type="checkbox" checked={selectedRequestIds.length>0 && selectedRequestIds.length===filteredRequests.length} onChange={(e)=> setSelectedRequestIds(e.target.checked? filteredRequests.map(r=>r.id): [])} /></th>
                    <th className="px-3 py-2 text-left">Title</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Priority</th>
                    <th className="px-3 py-2 text-left">Category</th>
                    <th className="px-3 py-2 text-left">Requested By</th>
                    <th className="px-3 py-2 text-left">From</th>
                    <th className="px-3 py-2 text-left">Due</th>
                    <th className="px-3 py-2 text-left">Created</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredRequests.map((r)=> (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2"><input type="checkbox" checked={selectedRequestIds.includes(r.id)} onChange={(e)=> setSelectedRequestIds(prev=> e.target.checked? [...prev, r.id]: prev.filter(id=>id!==r.id))} /></td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-900 truncate max-w-[280px]" title={r.title}>{r.title}</div>
                        {r.description && <div className="text-xs text-gray-500 truncate max-w-[280px]">{r.description}</div>}
                      </td>
                      <td className="px-3 py-2"><Badge className={r.status==='approved'? 'bg-blue-100 text-blue-800': r.status==='rejected'? 'bg-red-100 text-red-800': 'bg-yellow-100 text-yellow-800'}>{r.status.replace('_',' ')}</Badge></td>
                      <td className="px-3 py-2"><Badge className={r.priority==='urgent'? 'bg-red-100 text-red-800': r.priority==='high'? 'bg-orange-100 text-orange-800': r.priority==='normal'? 'bg-yellow-100 text-yellow-800': 'bg-green-100 text-green-800'}>{r.priority}</Badge></td>
                      <td className="px-3 py-2">{r.category?.name || '-'}</td>
                      <td className="px-3 py-2">{r.requested_by_user?.full_name || 'Unknown'}</td>
                      <td className="px-3 py-2">{r.requested_from_user?.full_name || 'Unknown'}</td>
                      <td className="px-3 py-2">{r.due_date ? new Date(r.due_date).toLocaleDateString() : '-'}</td>
                      <td className="px-3 py-2">{new Date(r.created_at).toLocaleDateString()}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex gap-2">
                          {userRole==='client' && r.status==='pending' && (
                            <Button size="sm" onClick={()=>{ setUploadForm(prev=> ({...prev, request_id: r.id})); setShowUploadDialog(true) }}>Upload</Button>
                          )}
                          {userRole==='provider' && r.status==='pending' && (
                            <>
                              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={()=> handleApproveRequest(r.id)}>Approve</Button>
                              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={()=> handleRejectRequest(r.id)}>Reject</Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {selectedRequestIds.length>0 && (
                <div className="p-3 border-t flex items-center justify-between bg-gray-50">
                  <div className="text-sm text-gray-600">{selectedRequestIds.length} selected</div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={async()=>{
                      for (const id of selectedRequestIds) await documentManagementService.updateRequestStatus(id,'approved');
                      setRequests(prev=> prev.map(r=> selectedRequestIds.includes(r.id)? { ...r, status:'approved'} as any: r));
                      setSelectedRequestIds([])
                    }} className="bg-green-600 hover:bg-green-700">Approve selected</Button>
                    <Button size="sm" onClick={async()=>{
                      for (const id of selectedRequestIds) await documentManagementService.updateRequestStatus(id,'rejected','Bulk rejected');
                      setRequests(prev=> prev.map(r=> selectedRequestIds.includes(r.id)? { ...r, status:'rejected'} as any: r));
                      setSelectedRequestIds([])
                    }} variant="outline">Reject selected</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select File
              </label>
              <Input
                type="file"
                onChange={(e) => setUploadForm(prev => ({ 
                  ...prev, 
                  file: e.target.files?.[0] || null 
                }))}
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <Textarea
                value={uploadForm.description}
                onChange={(e) => setUploadForm(prev => ({ 
                  ...prev, 
                  description: e.target.value 
                }))}
                placeholder="Describe the document..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpload}>
                Upload
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Please provide a reason for rejection.</p>
            <Textarea rows={4} value={rejectReason} onChange={(e)=> setRejectReason(e.target.value)} placeholder="Reason or comment" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={()=> setShowRejectDialog(false)}>Cancel</Button>
              <Button className="bg-red-600 hover:bg-red-700" onClick={submitReject}>Reject</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Comment Dialog */}
      <Dialog open={showCommentDialog} onOpenChange={setShowCommentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Comment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea rows={4} value={commentContent} onChange={(e)=> setCommentContent(e.target.value)} placeholder="Write your comment..." />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={()=> setShowCommentDialog(false)}>Cancel</Button>
              <Button onClick={submitComment}>Add Comment</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Request Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title
              </label>
              <Input
                value={requestForm.title}
                onChange={(e) => setRequestForm(prev => ({ 
                  ...prev, 
                  title: e.target.value 
                }))}
                placeholder="Document title..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <Textarea
                value={requestForm.description}
                onChange={(e) => setRequestForm(prev => ({ 
                  ...prev, 
                  description: e.target.value 
                }))}
                placeholder="Describe what you need..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <Select
                  value={requestForm.category_id}
                  onValueChange={(value) => setRequestForm(prev => ({ 
                    ...prev, 
                    category_id: value 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <Select
                  value={requestForm.priority}
                  onValueChange={(value: any) => setRequestForm(prev => ({ 
                    ...prev, 
                    priority: value 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_required"
                checked={requestForm.is_required}
                onChange={(e) => setRequestForm(prev => ({ 
                  ...prev, 
                  is_required: e.target.checked 
                }))}
                className="rounded"
              />
              <label htmlFor="is_required" className="text-sm font-medium text-gray-700">
                Required document
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date
              </label>
              <Input
                type="date"
                value={requestForm.due_date}
                onChange={(e) => setRequestForm(prev => ({ 
                  ...prev, 
                  due_date: e.target.value 
                }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowRequestDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateRequest}>
                Create Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Comments Viewer Dialog */}
      <Dialog open={showCommentsDialog} onOpenChange={setShowCommentsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Document Comments</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-auto">
            {commentsLoading ? (
              <div className="text-sm text-gray-600">Loading comments…</div>
            ) : commentsList.length === 0 ? (
              <div className="text-sm text-gray-600">No comments yet</div>
            ) : (
              commentsList.map((c)=> (
                <div key={c.id} className="p-3 rounded border bg-gray-50">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-sm font-medium text-gray-900">{c.author_name || 'User'}</div>
                    <div className="text-xs text-gray-500">{new Date(c.created_at).toLocaleString()}</div>
                  </div>
                  <div className="text-xs text-gray-500 mb-1">{c.author_role || 'user'}</div>
                  <div className="text-sm text-gray-800 whitespace-pre-wrap">{c.content}</div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Document Card Component
function DocumentCard({ 
  document, 
  userRole, 
  onApprove, 
  onReject, 
  onDelete 
}: {
  document: Document
  userRole: string
  onApprove: () => void
  onReject: (reason: string) => void
  onDelete: () => void
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'revision_requested': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-blue-100 text-blue-800'
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-5 w-5 text-gray-400" />
              <h3 className="font-medium text-gray-900">{document.original_name}</h3>
              <Badge className={getStatusColor(document.status)}>
                {document.status.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mb-2">{document.description}</p>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>{formatFileSize(document.file_size)}</span>
              <span>{document.file_type}</span>
              <span>v{document.version}</span>
              <span>Uploaded by {document.uploaded_by_user?.full_name || 'Unknown'}</span>
              <span>{new Date(document.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" asChild>
              <a href={document.file_url} target="_blank" rel="noopener noreferrer">
                <Eye className="h-4 w-4" />
              </a>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href={document.file_url} download={document.original_name}>
                <Download className="h-4 w-4" />
              </a>
            </Button>
            {userRole === 'provider' && document.status === 'uploaded' && (
              <>
                <Button size="sm" onClick={onApprove} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="h-4 w-4" />
                </Button>
                <Button size="sm" onClick={() => onReject('Not suitable')} className="bg-red-600 hover:bg-red-700">
                  <XCircle className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button size="sm" variant="outline" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Document Request Card Component
function DocumentRequestCard({ 
  request, 
  userRole, 
  onUpload 
}: {
  request: DocumentRequest
  userRole: string
  onUpload: () => void
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploaded': return 'bg-green-100 text-green-800'
      case 'approved': return 'bg-blue-100 text-blue-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'overdue': return 'bg-red-100 text-red-800'
      default: return 'bg-yellow-100 text-yellow-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-green-100 text-green-800'
    }
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-medium text-gray-900">{request.title}</h3>
              <Badge className={getStatusColor(request.status)}>
                {request.status.replace('_', ' ')}
              </Badge>
              <Badge className={getPriorityColor(request.priority)}>
                {request.priority}
              </Badge>
              {request.is_required && (
                <Badge variant="outline" className="text-red-600 border-red-600">
                  Required
                </Badge>
              )}
              {request.category && (
                <Badge variant="outline" className="border-gray-300 text-gray-700">
                  {request.category.name}
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-2">{request.description}</p>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>Requested by <span className="font-medium text-gray-700">{request.requested_by_user?.full_name || 'Unknown'}</span></span>
              <span>From <span className="font-medium text-gray-700">{request.requested_from_user?.full_name || 'Unknown'}</span></span>
              {request.due_date && (
                <span>Due {new Date(request.due_date).toLocaleDateString()}</span>
              )}
              <span>Created {new Date(request.created_at).toLocaleDateString()}</span>
            </div>
            {request.documents && request.documents.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-1">Uploaded documents:</p>
                <div className="flex flex-wrap gap-1">
                  {request.documents.map((doc) => (
                    <Badge key={doc.id} variant="outline" className="text-xs">
                      {doc.original_name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {userRole === 'client' && request.status === 'pending' && (
              <Button size="sm" onClick={onUpload}>
                <Upload className="h-4 w-4 mr-1" />
                Upload
              </Button>
            )}
            {userRole === 'provider' && request.status === 'pending' && (
              <>
                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => (window as any).handleApproveRequest?.(request.id)}>
                  Approve
                </Button>
                <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={() => (window as any).handleRejectRequest?.(request.id)}>
                  Reject
                </Button>
              </>
            )}
            <Button size="sm" variant="outline">
              <MessageSquare className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
