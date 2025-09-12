// Document Management System Types
// Comprehensive types for document upload, requests, and tracking

export interface DocumentCategory {
  id: string
  name: string
  description?: string
  is_required: boolean
  created_at: string
  updated_at: string
}

export interface DocumentRequest {
  id: string
  booking_id: string
  milestone_id?: string
  task_id?: string
  requested_by: string
  requested_from: string
  title: string
  description?: string
  category_id?: string
  is_required: boolean
  due_date?: string
  status: 'pending' | 'uploaded' | 'approved' | 'rejected' | 'overdue'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  created_at: string
  updated_at: string
  // Joined data
  category?: DocumentCategory
  requested_by_user?: {
    id: string
    full_name: string
    email: string
  }
  requested_from_user?: {
    id: string
    full_name: string
    email: string
  }
  documents?: Document[]
}

export interface Document {
  id: string
  booking_id: string
  milestone_id?: string
  task_id?: string
  request_id?: string
  uploaded_by: string
  file_name: string
  original_name: string
  file_size: number
  file_type: string
  file_path: string
  file_url: string
  description?: string
  version: number
  is_latest: boolean
  status: 'uploaded' | 'approved' | 'rejected' | 'revision_requested'
  approved_by?: string
  approved_at?: string
  rejection_reason?: string
  created_at: string
  updated_at: string
  // Joined data
  uploaded_by_user?: {
    id: string
    full_name: string
    email: string
  }
  approved_by_user?: {
    id: string
    full_name: string
    email: string
  }
  comments?: DocumentComment[]
}

export interface DocumentComment {
  id: string
  document_id: string
  booking_id: string
  author_id: string
  author_name: string
  author_role: string
  content: string
  is_internal: boolean
  created_at: string
  updated_at: string
}

export interface DocumentTemplate {
  id: string
  name: string
  description?: string
  category_id?: string
  template_content?: string
  is_active: boolean
  created_by?: string
  created_at: string
  updated_at: string
  // Joined data
  category?: DocumentCategory
}

// Form interfaces
export interface DocumentRequestForm {
  title: string
  description: string
  category_id: string
  is_required: boolean
  due_date: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  milestone_id?: string
  task_id?: string
}

export interface DocumentUploadForm {
  file: File | null
  description: string
  request_id?: string
  milestone_id?: string
  task_id?: string
}

export interface DocumentCommentForm {
  content: string
  is_internal: boolean
}

// Status and priority helpers
export type DocumentRequestStatus = 'pending' | 'uploaded' | 'approved' | 'rejected' | 'overdue'
export type DocumentStatus = 'uploaded' | 'approved' | 'rejected' | 'revision_requested'
export type DocumentPriority = 'low' | 'medium' | 'high' | 'urgent'

// Utility types
export interface DocumentStats {
  total_documents: number
  pending_requests: number
  uploaded_documents: number
  approved_documents: number
  rejected_documents: number
  overdue_requests: number
}

export interface DocumentFilter {
  status?: DocumentRequestStatus | DocumentStatus
  priority?: DocumentPriority
  category_id?: string
  milestone_id?: string
  task_id?: string
  uploaded_by?: string
  date_from?: string
  date_to?: string
}

// API response types
export interface DocumentUploadResponse {
  success: boolean
  document?: Document
  error?: string
}

export interface DocumentRequestResponse {
  success: boolean
  request?: DocumentRequest
  error?: string
}

// Component props
export interface DocumentManagerProps {
  bookingId: string
  milestoneId?: string
  taskId?: string
  userRole: 'client' | 'provider' | 'admin'
  onDocumentUploaded?: (document: Document) => void
  onRequestCreated?: (request: DocumentRequest) => void
}

export interface DocumentRequestCardProps {
  request: DocumentRequest
  onApprove?: (requestId: string) => void
  onReject?: (requestId: string, reason: string) => void
  onUpload?: (requestId: string) => void
  onView?: (requestId: string) => void
}

export interface DocumentCardProps {
  document: Document
  onApprove?: (documentId: string) => void
  onReject?: (documentId: string, reason: string) => void
  onDownload?: (documentId: string) => void
  onDelete?: (documentId: string) => void
  onComment?: (documentId: string) => void
  onView?: (documentId: string) => void
}
