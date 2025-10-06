'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Play, 
  Pause, 
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Calendar,
  User,
  Target,
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Upload,
  Download,
  FileText,
  Image,
  Paperclip,
  ThumbsUp,
  ThumbsDown,
  Check,
  XCircle,
  Eye,
  Send,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { getSupabaseClient } from '@/lib/supabase'

interface Milestone {
  id: string
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  progress_percentage: number
  due_date?: string
  completed_at?: string
  created_at: string
  updated_at: string
  weight: number
  estimated_hours?: number
  actual_hours?: number
  total_tasks: number
  completed_tasks: number
  tasks: Task[]
  order_index?: number
}

interface Task {
  id: string
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  progress_percentage: number
  due_date?: string
  assigned_to?: string
  estimated_hours?: number
  actual_hours?: number
  is_overdue: boolean
  created_at: string
  updated_at: string
  comments?: Comment[]
  files?: TaskFile[]
  client_approval?: ClientApproval
}

interface Comment {
  id: string
  content: string
  created_by: string
  created_at: string
  updated_at: string
  comment_type: 'general' | 'feedback' | 'question' | 'issue'
  parent_id?: string
  created_by_user?: {
    id: string
    full_name: string
    avatar_url?: string
    role: string
  }
  replies?: Comment[]
}

interface TaskFile {
  id: string
  file_name: string
  original_name: string
  file_size: number
  file_type: string
  file_url: string
  uploaded_by: string
  created_at: string
  description?: string
  uploaded_by_user?: {
    id: string
    full_name: string
    avatar_url?: string
  }
}

interface ClientApproval {
  id: string
  action: 'approve' | 'reject' | 'request_revision'
  feedback?: string
  approved_by: string
  approved_at: string
  approved_by_user?: {
    id: string
    full_name: string
    avatar_url?: string
  }
}

interface BookingFile {
  id: string
  booking_id: string
  file_name: string
  original_name: string
  file_size: number
  file_type: string
  file_url: string
  category: 'documents' | 'images' | 'contracts' | 'deliverables' | 'other'
  description?: string
  uploaded_by: string
  created_at: string
  updated_at: string
  uploaded_by_user?: {
    id: string
    full_name: string
    avatar_url?: string
    role: string
  }
}

interface ImprovedMilestoneSystemProps {
  bookingId: string
  userRole: 'client' | 'provider' | 'admin'
  className?: string
}

export function ImprovedMilestoneSystem({ 
  bookingId, 
  userRole, 
  className = '' 
}: ImprovedMilestoneSystemProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [progressLoading, setProgressLoading] = useState<Set<string>>(new Set())
  
  // Dialog states
  const [showMilestoneDialog, setShowMilestoneDialog] = useState(false)
  const [showTaskDialog, setShowTaskDialog] = useState(false)
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null)
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set())
  
  // Professional features state
  const [showCommentsDialog, setShowCommentsDialog] = useState(false)
  const [showFilesDialog, setShowFilesDialog] = useState(false)
  const [selectedTaskForComments, setSelectedTaskForComments] = useState<Task | null>(null)
  const [selectedTaskForFiles, setSelectedTaskForFiles] = useState<Task | null>(null)
  const [newComment, setNewComment] = useState('')
  const [commentType, setCommentType] = useState<'general' | 'feedback' | 'question' | 'issue'>('general')
  const [uploadingFile, setUploadingFile] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileDescription, setFileDescription] = useState('')
  const [fileCategory, setFileCategory] = useState<'documents' | 'images' | 'contracts' | 'deliverables' | 'other'>('documents')
  const [bookingFiles, setBookingFiles] = useState<BookingFile[]>([])
  const [loadingBookingFiles, setLoadingBookingFiles] = useState(false)
  
  // Form states
  const [milestoneForm, setMilestoneForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    due_date: '',
    estimated_hours: 0,
    weight: 1
  })
  
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    due_date: '',
    estimated_hours: 0,
    status: 'pending' as 'pending' | 'in_progress' | 'completed' | 'cancelled'
  })

  // Load milestones with optimized query
  const loadMilestones = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const supabase = await getSupabaseClient()
      
      const { data, error: fetchError } = await supabase
        .from('milestones')
        .select(`
          id,
          title,
          description,
          status,
          priority,
          progress_percentage,
          due_date,
          completed_at,
          created_at,
          updated_at,
          weight,
          estimated_hours,
          actual_hours,
          total_tasks,
          completed_tasks,
          tasks (
            id,
            title,
            description,
            status,
            progress_percentage,
            due_date,
            assigned_to,
            estimated_hours,
            actual_hours,
            is_overdue,
            created_at,
            updated_at
          )
        `)
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true })

      if (fetchError) {
        throw fetchError
      }

      // Fetch comments and files for all tasks
      const milestonesWithDetails = await Promise.all((data || []).map(async (milestone) => {
        const tasksWithDetails = await Promise.all((milestone.tasks || []).map(async (task) => {
          // Fetch comments for this task
          const { data: comments } = await supabase
            .from('task_comments')
            .select(`
              *,
              created_by_user:created_by (
                id,
                full_name,
                avatar_url,
                role
              )
            `)
            .eq('task_id', task.id)
            .order('created_at', { ascending: true })

          // Fetch files for this task
          const { data: files } = await supabase
            .from('task_files')
            .select(`
              *,
              uploaded_by_user:uploaded_by (
                id,
                full_name,
                avatar_url,
                role
              )
            `)
            .eq('task_id', task.id)
            .order('created_at', { ascending: false })

          // Fetch client approval for this task
          const { data: approvals } = await supabase
            .from('task_approvals')
            .select('*')
            .eq('task_id', task.id)
            .order('created_at', { ascending: false })
            .limit(1)

          return {
            ...task,
            comments: comments || [],
            files: files || [],
            client_approval: approvals?.[0] || null
          }
        }))

        return {
          ...milestone,
          tasks: tasksWithDetails
        }
      }))

      // Log loaded data for debugging
      console.log('📊 Milestones loaded with comments & files:', milestonesWithDetails?.map(m => ({
        id: m.id,
        title: m.title,
        total_tasks: m.total_tasks,
        tasks_array_length: m.tasks?.length || 0,
        has_tasks: !!m.tasks && m.tasks.length > 0,
        tasks_with_comments: m.tasks?.filter(t => t.comments && t.comments.length > 0).length || 0,
        tasks_with_files: m.tasks?.filter(t => t.files && t.files.length > 0).length || 0
      })))

      setMilestones(milestonesWithDetails || [])
    } catch (err) {
      console.error('Error loading milestones:', err)
      setError(err instanceof Error ? err.message : 'Failed to load milestones')
    } finally {
      setLoading(false)
    }
  }, [bookingId])

  // Calculate and update milestone progress directly
  const updateProgress = useCallback(async (milestoneId: string, taskId?: string) => {
    try {
      setProgressLoading(prev => new Set(prev).add(milestoneId))
      
      const supabase = await getSupabaseClient()
      
      // Get all tasks for this milestone
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id, status, progress_percentage')
        .eq('milestone_id', milestoneId)
      
      if (tasksError) throw tasksError
      
      const totalTasks = tasks?.length || 0
      const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0
      const inProgressTasks = tasks?.filter(t => t.status === 'in_progress').length || 0
      
      // Calculate progress percentage
      let progressPercentage = 0
      if (totalTasks > 0) {
        progressPercentage = Math.round((completedTasks / totalTasks) * 100)
      }
      
      // Determine milestone status automatically based on progress
      let newStatus = undefined
      const { data: currentMilestone } = await supabase
        .from('milestones')
        .select('status')
        .eq('id', milestoneId)
        .single()
      
      const currentStatus = currentMilestone?.status
      
      // Auto-update status based on progress
      if (progressPercentage === 100 && currentStatus !== 'completed' && currentStatus !== 'on_hold' && currentStatus !== 'cancelled') {
        newStatus = 'completed'
      } else if (progressPercentage > 0 && progressPercentage < 100 && currentStatus === 'pending') {
        newStatus = 'in_progress'
      } else if (progressPercentage === 0 && currentStatus === 'in_progress' && inProgressTasks === 0) {
        newStatus = 'pending'
      }
      
      // Update milestone with new progress and status
      const updateData: any = {
        progress_percentage: progressPercentage,
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        updated_at: new Date().toISOString()
      }
      
      if (newStatus) {
        updateData.status = newStatus
        if (newStatus === 'completed') {
          updateData.completed_at = new Date().toISOString()
        } else {
          updateData.completed_at = null
        }
      }
      
      const { error: updateError } = await supabase
        .from('milestones')
        .update(updateData)
        .eq('id', milestoneId)
      
      if (updateError) throw updateError
      
      // Refresh milestones to get updated data
      await loadMilestones()
      
      // Also update booking progress
      try {
        const response = await fetch('/api/progress/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ booking_id: bookingId })
        })
        if (!response.ok) {
          console.warn('Failed to update booking progress')
        }
      } catch (err) {
        console.warn('Error updating booking progress:', err)
      }
      
    } catch (err) {
      console.error('Error updating progress:', err)
      toast.error('Failed to update progress')
    } finally {
      setProgressLoading(prev => {
        const newSet = new Set(prev)
        newSet.delete(milestoneId)
        return newSet
      })
    }
  }, [bookingId, loadMilestones])

  // Update task status
  const updateTaskStatus = useCallback(async (taskId: string, status: string) => {
    try {
      const supabase = await getSupabaseClient()
      
      // Update task progress based on status
      const taskProgress = status === 'completed' ? 100 : status === 'in_progress' ? 50 : 0
      
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status,
          progress_percentage: taskProgress,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)

      if (error) {
        throw error
      }

      // Find the milestone this task belongs to
      const taskMilestone = milestones.find(m => 
        m.tasks.some(t => t.id === taskId)
      )

      if (taskMilestone) {
        await updateProgress(taskMilestone.id, taskId)
      }
      
      toast.success('Task status updated')
    } catch (err) {
      console.error('Error updating task status:', err)
      toast.error('Failed to update task status')
    }
  }, [milestones, updateProgress])

  // Update milestone status
  const updateMilestoneStatus = useCallback(async (milestoneId: string, status: string) => {
    try {
      const supabase = await getSupabaseClient()
      
      // Prepare update data
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      }
      
      // Handle completed_at timestamp
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString()
        updateData.progress_percentage = 100
      } else {
        updateData.completed_at = null
      }
      
      const { error } = await supabase
        .from('milestones')
        .update(updateData)
        .eq('id', milestoneId)

      if (error) {
        throw error
      }

      // Reload milestones to reflect changes
      await loadMilestones()
      toast.success('Milestone status updated')
    } catch (err) {
      console.error('Error updating milestone status:', err)
      toast.error('Failed to update milestone status')
    }
  }, [loadMilestones])
  
  // Create milestone
  const createMilestone = useCallback(async () => {
    try {
      if (!milestoneForm.title.trim()) {
        toast.error('Milestone title is required')
        return
      }
      
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        toast.error('You must be logged in')
        return
      }
      
      const { data, error } = await supabase
        .from('milestones')
        .insert({
          booking_id: bookingId,
          title: milestoneForm.title.trim(),
          description: milestoneForm.description.trim() || null,
          priority: milestoneForm.priority,
          due_date: milestoneForm.due_date || null,
          estimated_hours: milestoneForm.estimated_hours,
          weight: milestoneForm.weight,
          status: 'pending',
          progress_percentage: 0,
          total_tasks: 0,
          completed_tasks: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (error) {
        throw error
      }
      
      toast.success('Milestone created successfully')
      setShowMilestoneDialog(false)
      setMilestoneForm({
        title: '',
        description: '',
        priority: 'medium',
        due_date: '',
        estimated_hours: 0,
        weight: 1
      })
      await loadMilestones()
    } catch (err) {
      console.error('Error creating milestone:', err)
      toast.error('Failed to create milestone')
    }
  }, [bookingId, milestoneForm, loadMilestones])
  
  // Update milestone
  const updateMilestone = useCallback(async () => {
    try {
      if (!editingMilestone || !milestoneForm.title.trim()) {
        toast.error('Milestone title is required')
        return
      }
      
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('milestones')
        .update({
          title: milestoneForm.title.trim(),
          description: milestoneForm.description.trim() || null,
          priority: milestoneForm.priority,
          due_date: milestoneForm.due_date || null,
          estimated_hours: milestoneForm.estimated_hours,
          weight: milestoneForm.weight,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingMilestone.id)
      
      if (error) {
        throw error
      }
      
      toast.success('Milestone updated successfully')
      setShowMilestoneDialog(false)
      setEditingMilestone(null)
      setMilestoneForm({
        title: '',
        description: '',
        priority: 'medium',
        due_date: '',
        estimated_hours: 0,
        weight: 1
      })
      await loadMilestones()
    } catch (err) {
      console.error('Error updating milestone:', err)
      toast.error('Failed to update milestone')
    }
  }, [editingMilestone, milestoneForm, loadMilestones])
  
  // Delete milestone
  const deleteMilestone = useCallback(async (milestoneId: string) => {
    try {
      if (!confirm('Are you sure you want to delete this milestone? This will also delete all associated tasks.')) {
        return
      }
      
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('milestones')
        .delete()
        .eq('id', milestoneId)
      
      if (error) {
        throw error
      }
      
      toast.success('Milestone deleted successfully')
      await loadMilestones()
    } catch (err) {
      console.error('Error deleting milestone:', err)
      toast.error('Failed to delete milestone')
    }
  }, [loadMilestones])
  
  // Create task
  const createTask = useCallback(async () => {
    try {
      if (!taskForm.title.trim() || !selectedMilestoneId) {
        toast.error('Task title and milestone are required')
        return
      }
      
      const supabase = await getSupabaseClient()
      
      // Set progress based on initial status
      const initialProgress = taskForm.status === 'completed' ? 100 : 
                             taskForm.status === 'in_progress' ? 50 : 0
      
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          milestone_id: selectedMilestoneId,
          title: taskForm.title.trim(),
          description: taskForm.description.trim() || null,
          status: taskForm.status,
          due_date: taskForm.due_date || null,
          estimated_hours: taskForm.estimated_hours,
          progress_percentage: initialProgress,
          is_overdue: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (error) {
        throw error
      }
      
      toast.success('Task created successfully')
      setShowTaskDialog(false)
      setTaskForm({
        title: '',
        description: '',
        due_date: '',
        estimated_hours: 0,
        status: 'pending'
      })
      
      // Update progress for the milestone
      await updateProgress(selectedMilestoneId)
    } catch (err) {
      console.error('Error creating task:', err)
      toast.error('Failed to create task')
    }
  }, [selectedMilestoneId, taskForm, updateProgress])
  
  // Update task
  const updateTask = useCallback(async () => {
    try {
      if (!editingTask || !taskForm.title.trim()) {
        toast.error('Task title is required')
        return
      }
      
      const supabase = await getSupabaseClient()
      
      // Update progress based on status
      const taskProgress = taskForm.status === 'completed' ? 100 : 
                          taskForm.status === 'in_progress' ? 50 : 0
      
      const { error } = await supabase
        .from('tasks')
        .update({
          title: taskForm.title.trim(),
          description: taskForm.description.trim() || null,
          status: taskForm.status,
          due_date: taskForm.due_date || null,
          estimated_hours: taskForm.estimated_hours,
          progress_percentage: taskProgress,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingTask.id)
      
      if (error) {
        throw error
      }
      
      toast.success('Task updated successfully')
      setShowTaskDialog(false)
      setEditingTask(null)
      setTaskForm({
        title: '',
        description: '',
        due_date: '',
        estimated_hours: 0,
        status: 'pending'
      })
      
      // Find the milestone this task belongs to
      const taskMilestone = milestones.find(m => 
        m.tasks.some(t => t.id === editingTask.id)
      )
      
      if (taskMilestone) {
        await updateProgress(taskMilestone.id)
      }
      
      // Reload to show updated data
      await loadMilestones()
    } catch (err) {
      console.error('Error updating task:', err)
      toast.error('Failed to update task')
    }
  }, [editingTask, taskForm, milestones, updateProgress, loadMilestones])

  // Quick task update function for inline actions
  const quickUpdateTask = useCallback(async (taskData: any, milestoneId: string) => {
    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('tasks')
        .update({
          status: taskData.status,
          progress_percentage: taskData.progress_percentage,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskData.id)
      
      if (error) {
        throw error
      }
      
      toast.success('Task updated successfully')
      await loadMilestones()
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error('Failed to update task')
    }
  }, [loadMilestones])
  
  // Delete task
  const deleteTask = useCallback(async (taskId: string, milestoneId: string) => {
    try {
      if (!confirm('Are you sure you want to delete this task?')) {
        return
      }
      
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
      
      if (error) {
        throw error
      }
      
      toast.success('Task deleted successfully')
      await updateProgress(milestoneId)
      await loadMilestones()
    } catch (err) {
      console.error('Error deleting task:', err)
      toast.error('Failed to delete task')
    }
  }, [updateProgress, loadMilestones])
  
  // Open edit milestone dialog
  const openEditMilestone = useCallback((milestone: Milestone) => {
    setEditingMilestone(milestone)
    setMilestoneForm({
      title: milestone.title,
      description: milestone.description || '',
      priority: milestone.priority,
      due_date: milestone.due_date ? new Date(milestone.due_date).toISOString().split('T')[0] : '',
      estimated_hours: milestone.estimated_hours || 0,
      weight: milestone.weight
    })
    setShowMilestoneDialog(true)
  }, [])
  
  // Open edit task dialog
  const openEditTask = useCallback((task: Task, milestoneId: string) => {
    setEditingTask(task)
    setSelectedMilestoneId(milestoneId)
    setTaskForm({
      title: task.title,
      description: task.description || '',
      due_date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '',
      estimated_hours: task.estimated_hours || 0,
      status: task.status
    })
    setShowTaskDialog(true)
  }, [])
  
  // Toggle milestone expansion
  const toggleMilestoneExpansion = useCallback((milestoneId: string) => {
    console.log('🔄 Toggling milestone expansion:', milestoneId)
    setExpandedMilestones(prev => {
      const newSet = new Set(prev)
      if (newSet.has(milestoneId)) {
        newSet.delete(milestoneId)
        console.log('✅ Collapsed milestone:', milestoneId)
      } else {
        newSet.add(milestoneId)
        console.log('✅ Expanded milestone:', milestoneId)
      }
      return newSet
    })
  }, [])

  // Calculate overall progress
  const overallProgress = useMemo(() => {
    if (milestones.length === 0) return 0
    
    const totalWeight = milestones.reduce((sum, m) => sum + (m.weight || 1), 0)
    const weightedProgress = milestones.reduce((sum, m) => 
      sum + ((m.progress_percentage || 0) * (m.weight || 1)), 0)
    
    return totalWeight > 0 ? Math.round(weightedProgress / totalWeight) : 0
  }, [milestones])

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'in_progress':
        return <Play className="h-4 w-4 text-blue-600" />
      case 'on_hold':
        return <Pause className="h-4 w-4 text-yellow-600" />
      case 'cancelled':
        return <RotateCcw className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Check if milestone is overdue
  const isOverdue = (milestone: Milestone) => {
    if (!milestone.due_date || milestone.status === 'completed') return false
    return new Date(milestone.due_date) < new Date()
  }
  
  // Get progress bar color based on percentage
  const getProgressColor = (percentage: number) => {
    if (percentage === 100) return 'bg-green-600'
    if (percentage >= 67) return 'bg-blue-600'
    if (percentage >= 34) return 'bg-yellow-500'
    if (percentage > 0) return 'bg-orange-500'
    return 'bg-gray-300'
  }

  // ===== PROFESSIONAL FEATURES =====
  
  // Add comment to task
  const addComment = useCallback(async (taskId: string, content: string, type: string) => {
    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('task_comments')
        .insert({
          task_id: taskId,
          content: content.trim(),
          comment_type: type,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
      
      if (error) throw error
      
      toast.success('Comment added successfully')
      setNewComment('')
      await loadMilestones() // Reload to get updated comments
    } catch (error) {
      console.error('Error adding comment:', error)
      toast.error('Failed to add comment')
    }
  }, [loadMilestones])

  // Upload file to task
  const uploadFile = useCallback(async (taskId: string, file: File, description: string) => {
    try {
      if (!file) return
      
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB')
        return
      }

      setUploadingFile(true)

      // Generate unique file name
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `task-files/${bookingId}/${taskId}/${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('task-files')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('task-files')
        .getPublicUrl(filePath)

      // Save file record
      const { error: dbError } = await supabase
        .from('task_files')
        .insert({
          task_id: taskId,
          file_name: fileName,
          original_name: file.name,
          file_size: file.size,
          file_type: file.type,
          file_url: publicUrl,
          uploaded_by: user.id,
          description: description.trim() || null
        })

      if (dbError) throw dbError

      toast.success('File uploaded successfully')
      setSelectedFile(null)
      setFileDescription('')
      await loadMilestones() // Reload to get updated files
    } catch (error) {
      console.error('Error uploading file:', error)
      toast.error('Failed to upload file')
    } finally {
      setUploadingFile(false)
    }
  }, [bookingId, loadMilestones])

  // Client approval actions
  const handleClientApproval = useCallback(async (taskId: string, action: 'approve' | 'reject' | 'request_revision', feedback?: string) => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('task_approvals')
        .insert({
          task_id: taskId,
          action: action,
          feedback: feedback?.trim() || null,
          approved_by: user.id
        })

      if (error) throw error

      // Update task status based on approval
      let newStatus = 'pending'
      if (action === 'approve') newStatus = 'completed'
      else if (action === 'reject') newStatus = 'pending'
      else if (action === 'request_revision') newStatus = 'in_progress'

      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          status: newStatus,
          progress_percentage: action === 'approve' ? 100 : action === 'request_revision' ? 50 : 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)

      if (updateError) throw updateError

      toast.success(`Task ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'revision requested'} successfully`)
      await loadMilestones()
    } catch (error) {
      console.error('Error handling approval:', error)
      toast.error('Failed to process approval')
    }
  }, [loadMilestones])

  // Open comments dialog
  const openCommentsDialog = useCallback((task: Task) => {
    setSelectedTaskForComments(task)
    setShowCommentsDialog(true)
  }, [])

  // Open files dialog
  const openFilesDialog = useCallback((task: Task) => {
    setSelectedTaskForFiles(task)
    setShowFilesDialog(true)
  }, [])

  // Load booking files
  const loadBookingFiles = useCallback(async () => {
    try {
      setLoadingBookingFiles(true)
      const supabase = await getSupabaseClient()
      
      const { data, error } = await supabase
        .from('booking_files')
        .select(`
          *,
          uploaded_by_user:profiles!uploaded_by(id, full_name, avatar_url, role)
        `)
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false })
      
      if (error) {
        // If table doesn't exist, show empty state
        if (error.code === 'PGRST200' || error.message.includes('booking_files')) {
          console.log('Booking files table not yet created, showing empty state')
          setBookingFiles([])
          return
        }
        throw error
      }
      
      setBookingFiles(data || [])
    } catch (error) {
      console.error('Error loading booking files:', error)
      toast.error('Failed to load files')
      setBookingFiles([]) // Set empty array on error
    } finally {
      setLoadingBookingFiles(false)
    }
  }, [bookingId])

  // Upload booking file
  const uploadBookingFile = useCallback(async (file: File, category: string, description: string) => {
    try {
      if (!file) return
      
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Check file size (50MB limit for booking files)
      if (file.size > 50 * 1024 * 1024) {
        toast.error('File size must be less than 50MB')
        return
      }

      setUploadingFile(true)

      // Generate unique file name
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `booking-files/${bookingId}/${category}/${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('booking-files')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('booking-files')
        .getPublicUrl(filePath)

      // Save file record
      const { error: dbError } = await supabase
        .from('booking_files')
        .insert({
          booking_id: bookingId,
          file_name: fileName,
          original_name: file.name,
          file_size: file.size,
          file_type: file.type,
          file_url: publicUrl,
          category: category,
          description: description.trim() || null,
          uploaded_by: user.id
        })

      if (dbError) {
        // If table doesn't exist, show helpful message
        if (dbError.code === 'PGRST200' || dbError.message.includes('booking_files')) {
          toast.error('File storage system not yet configured. Please contact your administrator.')
          return
        }
        throw dbError
      }

      toast.success('File uploaded successfully')
      setSelectedFile(null)
      setFileDescription('')
      await loadBookingFiles()
    } catch (error) {
      console.error('Error uploading file:', error)
      toast.error('Failed to upload file')
    } finally {
      setUploadingFile(false)
    }
  }, [bookingId, loadBookingFiles])

  // Delete booking file
  const deleteBookingFile = useCallback(async (fileId: string, fileName: string) => {
    try {
      if (!confirm('Are you sure you want to delete this file?')) return
      
      const supabase = await getSupabaseClient()
      
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('booking-files')
        .remove([`booking-files/${bookingId}/${fileName}`])
      
      if (storageError) console.warn('Storage delete error:', storageError)
      
      // Delete from database
      const { error: dbError } = await supabase
        .from('booking_files')
        .delete()
        .eq('id', fileId)
      
      if (dbError) {
        // If table doesn't exist, just show success (storage was deleted)
        if (dbError.code === 'PGRST200' || dbError.message.includes('booking_files')) {
          toast.success('File deleted successfully')
          await loadBookingFiles()
          return
        }
        throw dbError
      }
      
      toast.success('File deleted successfully')
      await loadBookingFiles()
    } catch (error) {
      console.error('Error deleting file:', error)
      toast.error('Failed to delete file')
    }
  }, [bookingId, loadBookingFiles])


  // Load milestones on mount
  useEffect(() => {
    loadMilestones()
  }, [loadMilestones])
  
  // Auto-expand completed milestones to show successful tasks
  useEffect(() => {
    if (milestones.length > 0) {
      const completedMilestoneIds = milestones
        .filter(m => m.status === 'completed' && (m.tasks?.length || 0) > 0)
        .map(m => m.id)
      
      if (completedMilestoneIds.length > 0) {
        setExpandedMilestones(new Set(completedMilestoneIds))
      }
    }
  }, [milestones])

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Error Loading Milestones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={loadMilestones} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overall Progress Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Project Progress Overview
              </CardTitle>
              <CardDescription>
                Overall progress across all milestones
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* Booking Files Button */}
              <Button
                onClick={() => window.open(`/dashboard/bookings/${bookingId}/files`, '_blank')}
                variant="outline"
                className="border-purple-200 text-purple-700 hover:bg-purple-50"
              >
                <Paperclip className="h-4 w-4 mr-2" />
                Project Files
                {bookingFiles.length > 0 && (
                  <Badge className="ml-2 bg-purple-100 text-purple-800">
                    {bookingFiles.length}
                  </Badge>
                )}
              </Button>

              {userRole !== 'client' && (
                <Button 
                  onClick={() => {
                    setEditingMilestone(null)
                    setMilestoneForm({
                      title: '',
                      description: '',
                      priority: 'medium',
                      due_date: '',
                      estimated_hours: 0,
                      weight: 1
                    })
                    setShowMilestoneDialog(true)
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Milestone
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm font-semibold text-gray-900">{overallProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className={`h-3 rounded-full transition-all duration-500 ${getProgressColor(overallProgress)}`}
                // eslint-disable-next-line react/forbid-dom-props
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold text-green-600">
                  {milestones.filter(m => m.status === 'completed').length}
                </div>
                <div className="text-gray-600">Completed</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-blue-600">
                  {milestones.filter(m => m.status === 'in_progress').length}
                </div>
                <div className="text-gray-600">In Progress</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-600">
                  {milestones.filter(m => m.status === 'pending').length}
                </div>
                <div className="text-gray-600">Pending</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Milestones List */}
      <div className="space-y-4">
        {milestones.map((milestone) => (
          <Card key={milestone.id} className={`${isOverdue(milestone) ? 'border-red-200 bg-red-50' : ''}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div 
                    className="flex items-center gap-2 mb-1 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => (milestone.tasks?.length || 0) > 0 && toggleMilestoneExpansion(milestone.id)}
                  >
                    {(milestone.tasks?.length || 0) > 0 && (
                      <div className="flex-shrink-0">
                        {expandedMilestones.has(milestone.id) ? (
                          <ChevronDown className="h-5 w-5 text-blue-600" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    )}
                    <CardTitle className="flex items-center gap-2">
                      {getStatusIcon(milestone.status)}
                      {milestone.title}
                      {isOverdue(milestone) && (
                        <Badge variant="destructive" className="ml-2">
                          Overdue
                        </Badge>
                      )}
                      {(milestone.tasks?.length || 0) > 0 && !expandedMilestones.has(milestone.id) && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          {milestone.tasks.length} task{milestone.tasks.length !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </CardTitle>
                  </div>
                  {milestone.description && (
                    <CardDescription className="mt-1 ml-8">
                      {milestone.description}
                    </CardDescription>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getPriorityColor(milestone.priority)}>
                    {milestone.priority}
                  </Badge>
                  <Badge variant="outline">
                    Weight: {milestone.weight}
                  </Badge>
                  {userRole !== 'client' && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditMilestone(milestone)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMilestone(milestone.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Progress</span>
                    <span className={`text-sm font-bold ${
                      milestone.progress_percentage === 100 ? 'text-green-600' :
                      milestone.progress_percentage >= 67 ? 'text-blue-600' :
                      milestone.progress_percentage >= 34 ? 'text-yellow-600' :
                      milestone.progress_percentage > 0 ? 'text-orange-600' :
                      'text-gray-600'
                    }`}>
                      {milestone.progress_percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div 
                      className={`h-3 rounded-full transition-all duration-500 ${getProgressColor(milestone.progress_percentage)}`}
                      // eslint-disable-next-line react/forbid-dom-props
                      style={{ width: `${milestone.progress_percentage}%` }}
                    >
                      {milestone.progress_percentage === 100 && (
                        <div className="h-full flex items-center justify-end pr-2">
                          <CheckCircle className="h-2.5 w-2.5 text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Milestone Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-gray-50 p-3 rounded-lg">
                  <div className="text-center">
                    <div className="font-bold text-lg text-blue-600">{milestone.total_tasks}</div>
                    <div className="text-xs text-gray-600 uppercase">Total Tasks</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-lg text-green-600">{milestone.completed_tasks}</div>
                    <div className="text-xs text-gray-600 uppercase">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-lg text-purple-600">{milestone.estimated_hours || 0}h</div>
                    <div className="text-xs text-gray-600 uppercase">Estimated</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-lg text-orange-600">{milestone.actual_hours || 0}h</div>
                    <div className="text-xs text-gray-600 uppercase">Actual</div>
                  </div>
                </div>

                {/* Due Date */}
                {milestone.due_date && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    Due: {new Date(milestone.due_date).toLocaleDateString()}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateProgress(milestone.id)}
                    disabled={progressLoading.has(milestone.id)}
                  >
                    {progressLoading.has(milestone.id) ? 'Updating...' : 'Refresh Progress'}
                  </Button>
                  
                  {userRole !== 'client' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedMilestoneId(milestone.id)
                          setEditingTask(null)
                          setTaskForm({
                            title: '',
                            description: '',
                            due_date: '',
                            estimated_hours: 0,
                            status: 'pending'
                          })
                          setShowTaskDialog(true)
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Task
                      </Button>
                      <Select
                        value={milestone.status}
                        onValueChange={(value) => updateMilestoneStatus(milestone.id, value)}
                      >
                        <SelectTrigger className="w-[150px]">
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
                    </>
                  )}
                </div>

                {/* Tasks List */}
                {expandedMilestones.has(milestone.id) && (milestone.tasks?.length || 0) > 0 && (
                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Tasks ({milestone.completed_tasks}/{milestone.total_tasks})
                      </h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleMilestoneExpansion(milestone.id)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <ChevronDown className="h-4 w-4 mr-1" />
                        Collapse
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {milestone.tasks.map((task) => {
                        const taskProgress = task.status === 'completed' ? 100 : 
                                           task.status === 'in_progress' ? 50 : 
                                           task.progress_percentage || 0
                        
                        return (
                          <div key={task.id} className="bg-white rounded-lg border-2 border-gray-200 hover:border-blue-300 transition-all">
                            <div className="p-4">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-start gap-3 flex-1">
                                  <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${
                                    task.status === 'completed' ? 'bg-green-500' :
                                    task.status === 'in_progress' ? 'bg-blue-500 animate-pulse' :
                                    'bg-gray-400'
                                  }`} />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-sm font-semibold text-gray-900">{task.title}</span>
                                      {task.is_overdue && (
                                        <Badge variant="destructive" className="text-xs">
                                          Overdue
                                        </Badge>
                                      )}
                                      <Badge className={`text-xs ${
                                        task.status === 'completed' ? 'bg-green-100 text-green-800 border-green-200' :
                                        task.status === 'in_progress' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                        'bg-gray-100 text-gray-800 border-gray-200'
                                      }`}>
                                        {task.status.replace('_', ' ')}
                                      </Badge>
                                    </div>
                                    {task.description && (
                                      <p className="text-xs text-gray-600 mb-2">{task.description}</p>
                                    )}
                                    
                                    {/* Task Progress Bar */}
                                    <div className="mb-2">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-medium text-gray-700">Progress</span>
                                        <span className={`text-xs font-bold ${
                                          taskProgress === 100 ? 'text-green-600' :
                                          taskProgress >= 67 ? 'text-blue-600' :
                                          taskProgress >= 34 ? 'text-yellow-600' :
                                          taskProgress > 0 ? 'text-orange-600' :
                                          'text-gray-600'
                                        }`}>
                                          {taskProgress}%
                                        </span>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                        <div 
                                          className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(taskProgress)}`}
                                          // eslint-disable-next-line react/forbid-dom-props
                                          style={{ width: `${taskProgress}%` }}
                                        >
                                          {taskProgress === 100 && (
                                            <div className="h-full flex items-center justify-end pr-1">
                                              <CheckCircle className="h-1.5 w-1.5 text-white" />
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                      {task.due_date && (
                                        <span className="flex items-center gap-1">
                                          <Calendar className="h-3 w-3" />
                                          {new Date(task.due_date).toLocaleDateString()}
                                        </span>
                                      )}
                                      {(task.estimated_hours ?? 0) > 0 && (
                                        <span className="flex items-center gap-1">
                                          <Clock className="h-3 w-3" />
                                          {task.estimated_hours}h est.
                                        </span>
                                      )}
                                      {(task.actual_hours ?? 0) > 0 && (
                                        <span className="text-purple-600 font-medium">
                                          {task.actual_hours}h actual
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-1 ml-2">
                                  {userRole !== 'client' && (
                                    <>
                                      {/* Quick Mark Complete Button */}
                                      {task.status !== 'completed' && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => quickUpdateTask({
                                            ...task,
                                            status: 'completed',
                                            progress_percentage: 100
                                          }, milestone.id)}
                                          className="h-8 w-8 p-0 hover:bg-green-50"
                                          title="Mark as complete"
                                        >
                                          <CheckCircle className="h-4 w-4 text-green-600" />
                                        </Button>
                                      )}
                                      
                                      {/* Quick Progress Update Buttons */}
                                      {task.status !== 'completed' && task.progress_percentage < 100 && (
                                        <div className="flex items-center gap-1">
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => quickUpdateTask({
                                              ...task,
                                              progress_percentage: Math.min(100, task.progress_percentage + 25)
                                            }, milestone.id)}
                                            className="h-7 w-7 p-0 hover:bg-blue-50 text-xs font-bold"
                                            title="Add 25%"
                                          >
                                            +25%
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => quickUpdateTask({
                                              ...task,
                                              progress_percentage: Math.min(100, task.progress_percentage + 50)
                                            }, milestone.id)}
                                            className="h-7 w-7 p-0 hover:bg-blue-50 text-xs font-bold"
                                            title="Add 50%"
                                          >
                                            +50%
                                          </Button>
                                        </div>
                                      )}

                                      {/* Quick Status Change Dropdown */}
                                      <Select
                                        value={task.status}
                                        onValueChange={(newStatus) => {
                                          const progressMap = {
                                            'pending': 0,
                                            'in_progress': 50,
                                            'completed': 100
                                          }
                                          quickUpdateTask({
                                            ...task,
                                            status: newStatus as any,
                                            progress_percentage: progressMap[newStatus as keyof typeof progressMap] || task.progress_percentage
                                          }, milestone.id)
                                        }}
                                      >
                                        <SelectTrigger className="h-8 w-24 text-xs">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="pending">Pending</SelectItem>
                                          <SelectItem value="in_progress">In Progress</SelectItem>
                                          <SelectItem value="completed">Completed</SelectItem>
                                        </SelectContent>
                                      </Select>

                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => openEditTask(task, milestone.id)}
                                        className="h-8 w-8 p-0 hover:bg-blue-50"
                                        title="Edit task"
                                      >
                                        <Edit className="h-4 w-4 text-blue-600" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => deleteTask(task.id, milestone.id)}
                                        className="h-8 w-8 p-0 hover:bg-red-50"
                                        title="Delete task"
                                      >
                                        <Trash2 className="h-4 w-4 text-red-600" />
                                      </Button>
                                    </>
                                  )}

                                  {/* Professional Action Buttons */}
                                  <div className="flex items-center gap-1 border-l border-gray-200 pl-2 ml-2">
                                    {/* Comments Button */}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => openCommentsDialog(task)}
                                      className="relative h-8 w-8 p-0 hover:bg-blue-50"
                                      title={`Comments (${task.comments?.length || 0})`}
                                    >
                                      <MessageSquare className="h-4 w-4 text-blue-600" />
                                      {task.comments && task.comments.length > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                                          {task.comments.length}
                                        </span>
                                      )}
                                    </Button>

                                    {/* Files Button */}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => openFilesDialog(task)}
                                      className="relative h-8 w-8 p-0 hover:bg-purple-50"
                                      title={`Files (${task.files?.length || 0})`}
                                    >
                                      <Paperclip className="h-4 w-4 text-purple-600" />
                                      {task.files && task.files.length > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                                          {task.files.length}
                                        </span>
                                      )}
                                    </Button>

                                    {/* Client Approval Actions */}
                                    {userRole === 'client' && task.status === 'completed' && !task.client_approval && (
                                      <div className="flex items-center gap-1">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleClientApproval(task.id, 'approve')}
                                          className="h-8 w-8 p-0 hover:bg-green-50"
                                          title="Approve task"
                                        >
                                          <ThumbsUp className="h-4 w-4 text-green-600" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleClientApproval(task.id, 'request_revision')}
                                          className="h-8 w-8 p-0 hover:bg-yellow-50"
                                          title="Request revision"
                                        >
                                          <RotateCcw className="h-4 w-4 text-yellow-600" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleClientApproval(task.id, 'reject')}
                                          className="h-8 w-8 p-0 hover:bg-red-50"
                                          title="Reject task"
                                        >
                                          <ThumbsDown className="h-4 w-4 text-red-600" />
                                        </Button>
                                      </div>
                                    )}

                                    {/* Show Approval Status */}
                                    {task.client_approval && (
                                      <div className="flex items-center gap-1">
                                        {task.client_approval.action === 'approve' && (
                                          <Badge className="bg-green-100 text-green-800 border-green-200">
                                            <Check className="h-3 w-3 mr-1" />
                                            Approved
                                          </Badge>
                                        )}
                                        {task.client_approval.action === 'reject' && (
                                          <Badge className="bg-red-100 text-red-800 border-red-200">
                                            <XCircle className="h-3 w-3 mr-1" />
                                            Rejected
                                          </Badge>
                                        )}
                                        {task.client_approval.action === 'request_revision' && (
                                          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                                            <RotateCcw className="h-3 w-3 mr-1" />
                                            Revision
                                          </Badge>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                
                {!expandedMilestones.has(milestone.id) && (milestone.tasks?.length || 0) > 0 && (
                  <div 
                    className="text-sm text-blue-600 text-center p-3 bg-blue-50 hover:bg-blue-100 rounded cursor-pointer border border-blue-200 hover:border-blue-300 transition-all"
                    onClick={() => toggleMilestoneExpansion(milestone.id)}
                  >
                    <ChevronRight className="h-4 w-4 inline-block mr-2" />
                    Click to expand and view {milestone.tasks.length} task{milestone.tasks.length !== 1 ? 's' : ''}
                  </div>
                )}
                
                {/* Debug: Show if no tasks loaded but total_tasks says there are some */}
                {milestone.total_tasks > 0 && (!milestone.tasks || milestone.tasks.length === 0) && (
                  <div className="text-sm text-amber-600 text-center p-2 bg-amber-50 rounded">
                    ⚠️ {milestone.total_tasks} tasks exist but not loaded. Try refreshing the page.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {milestones.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Milestones Yet</h3>
            <p className="text-gray-600 mb-4">
              Milestones will appear here once they are created for this project.
            </p>
            {userRole !== 'client' && (
              <Button 
                onClick={() => {
                  setEditingMilestone(null)
                  setMilestoneForm({
                    title: '',
                    description: '',
                    priority: 'medium',
                    due_date: '',
                    estimated_hours: 0,
                    weight: 1
                  })
                  setShowMilestoneDialog(true)
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First Milestone
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Milestone Dialog */}
      <Dialog open={showMilestoneDialog} onOpenChange={setShowMilestoneDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingMilestone ? 'Edit Milestone' : 'Create New Milestone'}
            </DialogTitle>
            <DialogDescription>
              {editingMilestone ? 'Update the milestone details below.' : 'Add a new milestone to track project progress.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Title *</label>
              <Input
                value={milestoneForm.title}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
                placeholder="Enter milestone title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <Textarea
                value={milestoneForm.description}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                placeholder="Enter milestone description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Priority</label>
                <Select
                  value={milestoneForm.priority}
                  onValueChange={(value: any) => setMilestoneForm({ ...milestoneForm, priority: value })}
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
              <div>
                <label className="block text-sm font-medium mb-2">Due Date</label>
                <Input
                  type="date"
                  value={milestoneForm.due_date}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, due_date: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Estimated Hours</label>
                <Input
                  type="number"
                  value={milestoneForm.estimated_hours}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, estimated_hours: parseInt(e.target.value) || 0 })}
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Weight</label>
                <Input
                  type="number"
                  value={milestoneForm.weight}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, weight: parseFloat(e.target.value) || 1 })}
                  min="0.1"
                  step="0.1"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowMilestoneDialog(false)
                  setEditingMilestone(null)
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={editingMilestone ? updateMilestone : createMilestone}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {editingMilestone ? 'Update Milestone' : 'Create Milestone'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTask ? 'Edit Task' : 'Create New Task'}
            </DialogTitle>
            <DialogDescription>
              {editingTask ? 'Update the task details below.' : 'Add a new task to the milestone.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Title *</label>
              <Input
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                placeholder="Enter task title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <Textarea
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                placeholder="Enter task description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <Select
                  value={taskForm.status}
                  onValueChange={(value: any) => setTaskForm({ ...taskForm, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Due Date</label>
                <Input
                  type="date"
                  value={taskForm.due_date}
                  onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Estimated Hours</label>
              <Input
                type="number"
                value={taskForm.estimated_hours}
                onChange={(e) => setTaskForm({ ...taskForm, estimated_hours: parseInt(e.target.value) || 0 })}
                min="0"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowTaskDialog(false)
                  setEditingTask(null)
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={editingTask ? updateTask : createTask}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {editingTask ? 'Update Task' : 'Create Task'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Professional Comments Dialog */}
      <Dialog open={showCommentsDialog} onOpenChange={setShowCommentsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Comments - {selectedTaskForComments?.title}
            </DialogTitle>
            <DialogDescription>
              Add comments, feedback, questions, or report issues for this task.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Existing Comments */}
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {selectedTaskForComments?.comments?.map((comment) => (
                <div key={comment.id} className="border rounded-lg p-3 bg-gray-50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">
                          {comment.created_by_user?.full_name || 'Unknown User'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(comment.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {comment.comment_type}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-700">{comment.content}</p>
                </div>
              ))}
              
              {(!selectedTaskForComments?.comments || selectedTaskForComments.comments.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No comments yet. Be the first to add one!</p>
                </div>
              )}
            </div>

            {/* Add New Comment */}
            <div className="border-t pt-4">
              <div className="space-y-3">
                <Select value={commentType} onValueChange={(value: any) => setCommentType(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="feedback">Feedback</SelectItem>
                    <SelectItem value="question">Question</SelectItem>
                    <SelectItem value="issue">Issue</SelectItem>
                  </SelectContent>
                </Select>
                
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={3}
                />
                
                <div className="flex justify-end">
                  <Button
                    onClick={() => selectedTaskForComments && addComment(selectedTaskForComments.id, newComment, commentType)}
                    disabled={!newComment.trim()}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Add Comment
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Professional Files Dialog */}
      <Dialog open={showFilesDialog} onOpenChange={setShowFilesDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Paperclip className="h-5 w-5" />
              Files - {selectedTaskForFiles?.title}
            </DialogTitle>
            <DialogDescription>
              Upload and manage files for this task. Supported: Documents, Images, PDFs, etc.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Upload New File */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <div className="space-y-3">
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="file-upload"
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.zip,.rar"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose File
                </label>
                
                {selectedFile && (
                  <div className="mt-3">
                    <p className="text-sm text-gray-600">Selected: {selectedFile.name}</p>
                    <p className="text-xs text-gray-500">Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    
                    <Input
                      value={fileDescription}
                      onChange={(e) => setFileDescription(e.target.value)}
                      placeholder="File description (optional)"
                      className="mt-2"
                    />
                    
                    <Button
                      onClick={() => selectedTaskForFiles && selectedFile && uploadFile(selectedTaskForFiles.id, selectedFile, fileDescription)}
                      disabled={uploadingFile}
                      className="mt-2 bg-green-600 hover:bg-green-700"
                    >
                      {uploadingFile ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Upload File
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Existing Files */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Uploaded Files</h4>
              
              {selectedTaskForFiles?.files?.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3">
                    {file.file_type.startsWith('image/') ? (
                      // eslint-disable-next-line jsx-a11y/alt-text
                      <Image className="h-8 w-8 text-blue-600" />
                    ) : (
                      <FileText className="h-8 w-8 text-gray-600" />
                    )}
                    <div>
                      <div className="font-medium text-sm">{file.original_name}</div>
                      <div className="text-xs text-gray-500">
                        {(file.file_size / 1024 / 1024).toFixed(2)} MB • 
                        Uploaded by {file.uploaded_by_user?.full_name} • 
                        {new Date(file.created_at).toLocaleDateString()}
                      </div>
                      {file.description && (
                        <div className="text-xs text-gray-600 mt-1">{file.description}</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(file.file_url, '_blank')}
                      className="h-8 w-8 p-0"
                      title="View file"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const link = document.createElement('a')
                        link.href = file.file_url
                        link.download = file.original_name
                        link.click()
                      }}
                      className="h-8 w-8 p-0"
                      title="Download file"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {(!selectedTaskForFiles?.files || selectedTaskForFiles.files.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  <Paperclip className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No files uploaded yet.</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}
