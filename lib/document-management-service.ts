// Document Management Service
// Handles all document-related operations including uploads, requests, and tracking

import { getSupabaseClient } from './supabase'
import { 
  Document, 
  DocumentRequest, 
  DocumentCategory, 
  DocumentComment,
  DocumentTemplate,
  DocumentRequestForm,
  DocumentUploadForm,
  DocumentCommentForm,
  DocumentFilter,
  DocumentStats
} from '@/types/document-management'

export class DocumentManagementService {
  private supabase: any

  constructor() {
    this.supabase = null
  }

  private async getClient() {
    if (!this.supabase) {
      this.supabase = await getSupabaseClient()
    }
    return this.supabase
  }

  // Document Categories
  async getCategories(): Promise<DocumentCategory[]> {
    try {
      const supabase = await this.getClient()
      
      // First check if the table exists
      const { data: tableCheck, error: tableError } = await supabase
        .from('document_categories')
        .select('id')
        .limit(1)
      
      if (tableError && tableError.code === 'PGRST116') {
        console.warn('Document categories table does not exist yet. Please run the database migration.')
        return []
      }
      
      const { data, error } = await supabase
        .from('document_categories')
        .select('*')
        .order('name')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching document categories:', error)
      return []
    }
  }

  // Document Requests
  async getRequests(bookingId: string, filters?: DocumentFilter): Promise<DocumentRequest[]> {
    try {
      const supabase = await this.getClient()
      
      // First check if the table exists
      const { data: tableCheck, error: tableError } = await supabase
        .from('document_requests')
        .select('id')
        .limit(1)
      
      if (tableError && tableError.code === 'PGRST116') {
        console.warn('Document requests table does not exist yet. Please run the database migration.')
        return []
      }
      
      let query = supabase
        .from('document_requests')
        .select(`
          *,
          category:document_categories(*),
          documents(*)
        `)
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false })

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.priority) {
        query = query.eq('priority', filters.priority)
      }
      if (filters?.category_id) {
        query = query.eq('category_id', filters.category_id)
      }
      if (filters?.milestone_id) {
        query = query.eq('milestone_id', filters.milestone_id)
      }
      if (filters?.task_id) {
        query = query.eq('task_id', filters.task_id)
      }

      const { data, error } = await query
      if (error) {
        // If it's a foreign key relationship error, try without the joins
        if (error.code === 'PGRST200') {
          console.warn('Foreign key relationships not found. Fetching requests without user details.')
          const { data: simpleData, error: simpleError } = await supabase
            .from('document_requests')
            .select('*')
            .eq('booking_id', bookingId)
            .order('created_at', { ascending: false })
          
          if (simpleError) throw simpleError
          return simpleData || []
        }
        throw error
      }
      return data || []
    } catch (error) {
      console.error('Error fetching document requests:', error)
      return []
    }
  }

  async createRequest(bookingId: string, form: DocumentRequestForm, requestedFrom: string): Promise<DocumentRequest | null> {
    try {
      const supabase = await this.getClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const requestData = {
        booking_id: bookingId,
        milestone_id: form.milestone_id || null,
        task_id: form.task_id || null,
        requested_by: user.id,
        requested_from: (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestedFrom) ? requestedFrom : user.id),
        title: form.title,
        description: form.description,
        category_id: form.category_id || null,
        is_required: form.is_required,
        due_date: form.due_date || null,
        priority: form.priority
      }

      // Insert without returning row to avoid SELECT policy requirement
      const { error: insertError } = await supabase
        .from('document_requests')
        .insert(requestData, { returning: 'minimal' })

      if (insertError) throw insertError

      // Fetch the created request via a read that should pass dr_read
      const { data: created, error: fetchError } = await supabase
        .from('document_requests')
        .select('*')
        .eq('booking_id', bookingId)
        .eq('requested_by', user.id)
        .eq('title', form.title)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (fetchError) throw fetchError
      return created
    } catch (error) {
      console.error('Error creating document request:', error)
      return null
    }
  }

  async updateRequestStatus(requestId: string, status: string, reason?: string): Promise<boolean> {
    try {
      const supabase = await this.getClient()
      const updateData: any = { status }
      if (reason) updateData.rejection_reason = reason

      const { error } = await supabase
        .from('document_requests')
        .update(updateData)
        .eq('id', requestId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error updating request status:', error)
      return false
    }
  }

  // Documents
  async getDocuments(bookingId: string, filters?: DocumentFilter): Promise<Document[]> {
    try {
      const supabase = await this.getClient()
      
      // First check if the table exists
      const { data: tableCheck, error: tableError } = await supabase
        .from('documents')
        .select('id')
        .limit(1)
      
      if (tableError && tableError.code === 'PGRST116') {
        console.warn('Documents table does not exist yet. Please run the database migration.')
        return []
      }
      
      let query = supabase
        .from('documents')
        .select(`
          *,
          comments:document_comments(*)
        `)
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false })

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.milestone_id) {
        query = query.eq('milestone_id', filters.milestone_id)
      }
      if (filters?.task_id) {
        query = query.eq('task_id', filters.task_id)
      }
      if (filters?.uploaded_by) {
        query = query.eq('uploaded_by', filters.uploaded_by)
      }

      const { data, error } = await query
      if (error) {
        // If it's a foreign key relationship error, try without the joins
        if (error.code === 'PGRST200') {
          console.warn('Foreign key relationships not found. Fetching documents without user details.')
          const { data: simpleData, error: simpleError } = await supabase
            .from('documents')
            .select('*')
            .eq('booking_id', bookingId)
            .order('created_at', { ascending: false })
          
          if (simpleError) throw simpleError
          return simpleData || []
        }
        throw error
      }
      return data || []
    } catch (error) {
      console.error('Error fetching documents:', error)
      return []
    }
  }

  async uploadDocument(bookingId: string, form: DocumentUploadForm): Promise<Document | null> {
    try {
      const supabase = await this.getClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      if (!form.file) throw new Error('No file provided')

      // First check if the documents table exists
      const { data: tableCheck, error: tableError } = await supabase
        .from('documents')
        .select('id')
        .limit(1)
      
      if (tableError && tableError.code === 'PGRST116') {
        throw new Error('Documents table does not exist. Please run the database migration first.')
      }

      // Skip listing buckets (requires elevated perms on some projects). Rely on upload error for detection.

      // Generate unique file name
      const fileExt = form.file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `documents/${bookingId}/${fileName}`

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, form.file)

      if (uploadError) {
        if (uploadError.message?.includes('Bucket not found')) {
          throw new Error('Documents storage bucket not found. Please create a "documents" bucket in Supabase Storage.')
        }
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      // Save document record
      const documentData = {
        booking_id: bookingId,
        milestone_id: form.milestone_id || null,
        task_id: form.task_id || null,
        request_id: form.request_id || null,
        uploaded_by: user.id,
        file_name: fileName,
        original_name: form.file.name,
        file_size: form.file.size,
        file_type: form.file.type,
        file_path: filePath,
        file_url: publicUrl,
        description: form.description
      }

      const { data, error } = await supabase
        .from('documents')
        .insert(documentData)
        .select(`
          *,
          uploaded_by_user:profiles!documents_uploaded_by_fkey(id, full_name, email)
        `)
        .single()

      if (error) throw error

      // Update request status if this was uploaded for a request
      if (form.request_id) {
        await this.updateRequestStatus(form.request_id, 'uploaded')
      }

      return data
    } catch (error) {
      console.error('Error uploading document:', error)
      return null
    }
  }

  async updateDocumentStatus(documentId: string, status: string, reason?: string): Promise<boolean> {
    try {
      const supabase = await this.getClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const updateData: any = { status }
      if (reason) updateData.rejection_reason = reason
      if (status === 'approved') {
        updateData.approved_by = user.id
        updateData.approved_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('documents')
        .update(updateData)
        .eq('id', documentId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error updating document status:', error)
      return false
    }
  }

  async deleteDocument(documentId: string): Promise<boolean> {
    try {
      const supabase = await this.getClient()
      
      // Get document info first
      const { data: document, error: fetchError } = await supabase
        .from('documents')
        .select('file_path')
        .eq('id', documentId)
        .single()

      if (fetchError) throw fetchError

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([document.file_path])

      if (storageError) console.warn('Error deleting from storage:', storageError)

      // Delete from database
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting document:', error)
      return false
    }
  }

  // Document Comments
  async getComments(documentId: string): Promise<DocumentComment[]> {
    try {
      const supabase = await this.getClient()
      const { data, error } = await supabase
        .from('document_comments')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching document comments:', error)
      return []
    }
  }

  async addComment(documentId: string, form: DocumentCommentForm): Promise<DocumentComment | null> {
    try {
      const supabase = await this.getClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single()

      const commentData = {
        document_id: documentId,
        booking_id: '', // Will be set by trigger
        author_id: user.id,
        author_name: profile?.full_name || user.email || 'Unknown',
        author_role: profile?.role || 'user',
        content: form.content,
        is_internal: form.is_internal
      }

      const { data, error } = await supabase
        .from('document_comments')
        .insert(commentData)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error adding document comment:', error)
      return null
    }
  }

  // Statistics
  async getStats(bookingId: string): Promise<DocumentStats> {
    try {
      const supabase = await this.getClient()
      
      // Get document counts
      const { data: documents } = await supabase
        .from('documents')
        .select('status')
        .eq('booking_id', bookingId)

      // Get request counts
      const { data: requests } = await supabase
        .from('document_requests')
        .select('status')
        .eq('booking_id', bookingId)

      const stats: DocumentStats = {
        total_documents: documents?.length || 0,
        pending_requests: requests?.filter((r: any) => r.status === 'pending').length || 0,
        uploaded_documents: documents?.filter((d: any) => d.status === 'uploaded').length || 0,
        approved_documents: documents?.filter((d: any) => d.status === 'approved').length || 0,
        rejected_documents: documents?.filter((d: any) => d.status === 'rejected').length || 0,
        overdue_requests: requests?.filter((r: any) => r.status === 'overdue').length || 0
      }

      return stats
    } catch (error) {
      console.error('Error fetching document stats:', error)
      return {
        total_documents: 0,
        pending_requests: 0,
        uploaded_documents: 0,
        approved_documents: 0,
        rejected_documents: 0,
        overdue_requests: 0
      }
    }
  }

  // Templates
  async getTemplates(): Promise<DocumentTemplate[]> {
    try {
      const supabase = await this.getClient()
      const { data, error } = await supabase
        .from('document_templates')
        .select(`
          *,
          category:document_categories(*)
        `)
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching document templates:', error)
      return []
    }
  }
}

// Export singleton instance
export const documentManagementService = new DocumentManagementService()
