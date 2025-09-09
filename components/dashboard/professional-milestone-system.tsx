'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Link, 
  Unlink, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Play, 
  Pause,
  Settings,
  Workflow,
  Target,
  Users,
  FileText,
  BarChart3,
  ArrowRight,
  ArrowDown,
  ArrowUp,
  GitBranch,
  GitCommit,
  GripVertical,
  MessageSquare,
  MoreVertical,
  Flag
} from 'lucide-react'
import { DependencyManagement } from './dependency-management'
import { MilestoneSettings } from './milestone-settings'
import { WorkflowManagement } from './workflow-management'
import { TaskMilestoneLinking } from './task-milestone-linking'
import { DocumentManager } from './document-manager'
import { toast } from 'sonner'
import { getSupabaseClient } from '@/lib/supabase'
import { 
  Milestone, 
  Task, 
  MilestoneDependency, 
  TaskDependency, 
  ProjectPhase, 
  MilestoneTemplate, 
  MilestoneTemplateTask 
} from '@/types/milestone-system'

interface ProfessionalMilestoneSystemProps {
  bookingId: string
  className?: string
}

export function ProfessionalMilestoneSystem({ 
  bookingId, 
  className = '' 
}: ProfessionalMilestoneSystemProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [phases, setPhases] = useState<ProjectPhase[]>([])
  const [templates, setTemplates] = useState<MilestoneTemplate[]>([])
  const [comments, setComments] = useState<Record<string, any[]>>({})
  const [approvals, setApprovals] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  
  // Dialog states
  const [showMilestoneForm, setShowMilestoneForm] = useState(false)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [showDependencyForm, setShowDependencyForm] = useState(false)
  const [showPhaseForm, setShowPhaseForm] = useState(false)
  const [showTemplateForm, setShowTemplateForm] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  
  // Form states
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null)
  const [selectedPhase, setSelectedPhase] = useState<ProjectPhase | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Drag & Drop states
  const [draggedMilestone, setDraggedMilestone] = useState<string | null>(null)
  const [dragOverMilestone, setDragOverMilestone] = useState<string | null>(null)
  
  // Action/Comment states
  const [showActionModal, setShowActionModal] = useState(false)
  const [showCommentModal, setShowCommentModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [actionText, setActionText] = useState('')
  const [commentText, setCommentText] = useState('')
  const [actionType, setActionType] = useState<'comment' | 'flag' | 'assign' | 'priority'>('comment')
  const [taskComments, setTaskComments] = useState<Record<string, any[]>>({})

  // Milestone form
  const [milestoneForm, setMilestoneForm] = useState({
    title: '',
    description: '',
    start_date: '',
    due_date: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    estimated_hours: 0,
    risk_level: 'low' as 'low' | 'medium' | 'high' | 'critical',
    phase_id: '',
    template_id: ''
  })

  // Task form
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    start_date: '',
    due_date: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    estimated_hours: 0,
    assigned_to: '',
    risk_level: 'low' as 'low' | 'medium' | 'high' | 'critical',
    status: 'pending' as 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
  })

  // Phase form
  const [phaseForm, setPhaseForm] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    status: 'pending' as 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
  })

  // Dependency form
  const [dependencyForm, setDependencyForm] = useState({
    depends_on_id: '',
    dependency_type: 'finish_to_start' as 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish',
    lag_days: 0
  })

  useEffect(() => {
    loadData()
  }, [bookingId])

  const loadData = async () => {
    try {
      setLoading(true)
      
      const supabase = await getSupabaseClient()
      
      // Load milestones
      const { data: milestonesData, error: milestonesError } = await supabase
        .from('milestones')
        .select(`
          id, booking_id, title, description, status, priority, start_date, due_date,
          actual_start_date, actual_end_date, estimated_hours, actual_hours, 
          progress_percentage, critical_path, risk_level, phase_id, template_id,
          order_index, editable, weight, created_at, updated_at,
          tasks (
            id, title, description, status, priority, start_date, due_date,
            actual_start_date, actual_end_date, estimated_hours, actual_hours,
            progress_percentage, critical_path, risk_level, assigned_to, created_by,
            milestone_id, phase_id, created_at, updated_at
          )
        `)
        .eq('booking_id', bookingId)
        .order('order_index', { ascending: true })
      
      if (milestonesError) {
        console.error('Error loading milestones:', milestonesError)
        setMilestones([])
      } else {
        const milestones = milestonesData || []
        
        // Calculate and update progress for each milestone
        for (const milestone of milestones) {
          await calculateAndUpdateMilestoneProgress(milestone, supabase)
        }
        
        // Reload milestones with updated progress
        const { data: updatedMilestones } = await supabase
          .from('milestones')
          .select(`
            id, booking_id, title, description, status, priority, start_date, due_date,
            actual_start_date, actual_end_date, estimated_hours, actual_hours, 
            progress_percentage, critical_path, risk_level, phase_id, template_id,
            order_index, editable, weight, created_at, updated_at,
            tasks (
              id, title, description, status, priority, start_date, due_date,
              actual_start_date, actual_end_date, estimated_hours, actual_hours,
              progress_percentage, critical_path, risk_level, assigned_to, created_by,
              milestone_id, phase_id, created_at, updated_at
            )
          `)
          .eq('booking_id', bookingId)
          .order('order_index', { ascending: true })
        
        setMilestones(updatedMilestones || [])
      }
      
      // Load comments
      try {
        const { data: commentsData, error: commentsError } = await supabase
          .from('milestone_comments')
          .select('*')
          .eq('booking_id', bookingId)
          .order('created_at', { ascending: false })
        
        if (!commentsError) {
          const groupedComments = (commentsData || []).reduce((acc, comment) => {
            const milestoneId = comment.milestone_id
            if (!acc[milestoneId]) acc[milestoneId] = []
            acc[milestoneId].push(comment)
            return acc
          }, {} as Record<string, any[]>)
          setComments(groupedComments)
        } else {
          console.warn('Comments loading error:', commentsError)
          setComments({})
        }
      } catch (err) {
        console.warn('Comments not available:', err)
        setComments({})
      }

      // Load approvals
      try {
        const { data: approvalsData, error: approvalsError } = await supabase
          .from('milestone_approvals')
          .select('*')
          .eq('booking_id', bookingId)
          .order('created_at', { ascending: false })
        
        if (!approvalsError) {
          const groupedApprovals = (approvalsData || []).reduce((acc, approval) => {
            const milestoneId = approval.milestone_id
            if (!acc[milestoneId]) acc[milestoneId] = []
            acc[milestoneId].push(approval)
            return acc
          }, {} as Record<string, any[]>)
          setApprovals(groupedApprovals)
        } else {
          console.warn('Approvals loading error:', approvalsError)
          setApprovals({})
        }
      } catch (err) {
        console.warn('Approvals not available:', err)
        setApprovals({})
      }

      // Load task comments for all visible tasks
      try {
        const taskIds = (milestones || []).flatMap((m: any) => (m.tasks || []).map((t: any) => t.id))
        if (taskIds.length > 0) {
          const { data: commentsRows, error: tcErr } = await supabase
            .from('task_comments')
            .select('id, task_id, user_id, comment, created_at')
            .in('task_id', taskIds)
            .order('created_at', { ascending: false })
          if (!tcErr) {
            const grouped: Record<string, any[]> = {}
            for (const row of commentsRows || []) {
              if (!grouped[row.task_id]) grouped[row.task_id] = []
              grouped[row.task_id].push(row)
            }
            setTaskComments(grouped)
          } else {
            console.warn('Task comments load error:', tcErr)
            setTaskComments({})
          }
        } else {
          setTaskComments({})
        }
      } catch (e) {
        console.warn('Task comments not available:', e)
        setTaskComments({})
      }
      
      // Load phases (placeholder for now)
      setPhases([])
      
      // Load templates (placeholder for now)
      setTemplates([])
      
    } catch (err) {
      console.error('Error loading data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
      setMilestones([])
    } finally {
      setLoading(false)
    }
  }

  // Calculate and update milestone progress based on tasks
  const calculateAndUpdateMilestoneProgress = async (milestone: any, supabase: any) => {
    if (!milestone.tasks || milestone.tasks.length === 0) {
      return
    }

    const totalTasks = milestone.tasks.length
    const completedTasks = milestone.tasks.filter((task: any) => task.status === 'completed').length
    const inProgressTasks = milestone.tasks.filter((task: any) => task.status === 'in_progress').length
    
    // Calculate progress percentage
    const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    
    // Determine milestone status based on progress
    let newStatus = milestone.status
    if (progressPercentage === 100 && milestone.status !== 'completed') {
      newStatus = 'completed'
    } else if (progressPercentage > 0 && milestone.status === 'pending') {
      newStatus = 'in_progress'
    } else if (progressPercentage === 0 && milestone.status === 'completed') {
      newStatus = 'pending'
    }

    // Update milestone if progress or status changed
    if (progressPercentage !== milestone.progress_percentage || newStatus !== milestone.status) {
      await supabase
        .from('milestones')
        .update({
          progress_percentage: progressPercentage,
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', milestone.id)
    }
  }

  const resetMilestoneForm = () => {
    setMilestoneForm({
      title: '',
      description: '',
      start_date: '',
      due_date: '',
      priority: 'medium',
      estimated_hours: 0,
      risk_level: 'low',
      phase_id: '',
      template_id: ''
    })
  }

  const resetTaskForm = () => {
    setTaskForm({
      title: '',
      description: '',
      start_date: '',
      due_date: '',
      priority: 'medium',
      estimated_hours: 0,
      assigned_to: '',
      risk_level: 'low',
      status: 'pending'
    })
  }

  const resetPhaseForm = () => {
    setPhaseForm({
      name: '',
      description: '',
      start_date: '',
      end_date: '',
      status: 'pending'
    })
  }

  const resetDependencyForm = () => {
    setDependencyForm({
      depends_on_id: '',
      dependency_type: 'finish_to_start',
      lag_days: 0
    })
  }

  // Milestone actions
  const updateMilestoneStatus = async (milestoneId: string, status: string) => {
    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('milestones')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', milestoneId)
      
      if (error) throw error
      
      toast.success('Milestone status updated')
      await loadData()
    } catch (err) {
      console.error('Error updating milestone status:', err)
      toast.error('Failed to update milestone status')
    }
  }

  const deleteMilestone = async (milestoneId: string) => {
    if (!confirm('Are you sure you want to delete this milestone? This will also delete all associated tasks.')) {
      return
    }

    try {
      const supabase = await getSupabaseClient()
      
      // First delete all tasks associated with this milestone
      await supabase
        .from('tasks')
        .delete()
        .eq('milestone_id', milestoneId)
      
      // Then delete the milestone
      const { error } = await supabase
        .from('milestones')
        .delete()
        .eq('id', milestoneId)
      
      if (error) throw error
      
      toast.success('Milestone deleted successfully')
      await loadData()
    } catch (err) {
      console.error('Error deleting milestone:', err)
      toast.error('Failed to delete milestone')
    }
  }

  const editMilestone = (milestone: Milestone) => {
    setEditingMilestone(milestone)
    setMilestoneForm({
      title: milestone.title,
      description: milestone.description || '',
      start_date: milestone.start_date || '',
      due_date: milestone.due_date || '',
      priority: milestone.priority,
      estimated_hours: milestone.estimated_hours || 0,
      risk_level: milestone.risk_level,
      phase_id: milestone.phase_id || '',
      template_id: milestone.template_id || ''
    })
    setShowMilestoneForm(true)
  }

  // Task actions
  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)
      
      if (error) throw error
      
      toast.success('Task status updated')
      await loadData() // This will trigger progress recalculation
    } catch (err) {
      console.error('Error updating task status:', err)
      toast.error('Failed to update task status')
    }
  }

  const deleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) {
      return
    }

    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
      
      if (error) throw error
      
      toast.success('Task deleted successfully')
      await loadData() // This will trigger progress recalculation
    } catch (err) {
      console.error('Error deleting task:', err)
      toast.error('Failed to delete task')
    }
  }

  const editTask = (task: Task) => {
    setEditingTask(task)
    setTaskForm({
      title: task.title,
      description: task.description || '',
      start_date: task.start_date || '',
      due_date: task.due_date || '',
      priority: task.priority,
      estimated_hours: task.estimated_hours || 0,
      assigned_to: task.assigned_to || '',
      risk_level: task.risk_level,
      status: task.status
    })
    setShowTaskForm(true)
  }

  const handleMilestoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    try {
      setIsSubmitting(true)
      
      const supabase = await getSupabaseClient()
      
      if (editingMilestone) {
        // Update existing milestone
        const { error } = await supabase
          .from('milestones')
          .update({
            title: milestoneForm.title,
            description: milestoneForm.description || '',
            priority: milestoneForm.priority,
            start_date: milestoneForm.start_date || null,
            due_date: milestoneForm.due_date || null,
            estimated_hours: milestoneForm.estimated_hours || 0,
            risk_level: milestoneForm.risk_level,
            phase_id: milestoneForm.phase_id || null,
            template_id: milestoneForm.template_id || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingMilestone.id)
        
        if (error) throw error
        toast.success('Milestone updated successfully')
      } else {
        // Create new milestone
        const { data: existingMilestones } = await supabase
          .from('milestones')
          .select('order_index')
          .eq('booking_id', bookingId)
          .order('order_index', { ascending: false })
          .limit(1)
        
        const nextOrderIndex = existingMilestones && existingMilestones.length > 0 
          ? (existingMilestones[0].order_index || 0) + 1 
          : 0
        
        const { data: milestone, error: milestoneError } = await supabase
          .from('milestones')
          .insert({
            booking_id: bookingId,
            title: milestoneForm.title,
            description: milestoneForm.description || '',
            status: 'pending',
            priority: milestoneForm.priority,
            start_date: milestoneForm.start_date || new Date().toISOString().split('T')[0],
            due_date: milestoneForm.due_date,
            estimated_hours: milestoneForm.estimated_hours || 0,
            actual_hours: 0,
            progress_percentage: 0,
            critical_path: false,
            risk_level: milestoneForm.risk_level,
            phase_id: milestoneForm.phase_id || null,
            template_id: milestoneForm.template_id || null,
            order_index: nextOrderIndex,
            editable: true,
            weight: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()
        
        if (milestoneError) {
          console.error('Milestone creation error:', milestoneError)
          throw new Error(milestoneError.message || 'Failed to create milestone')
        }
        
        console.log('Milestone created successfully:', milestone)
        toast.success('Milestone created successfully')
      }
      
      // Reload milestones data
      await loadData()
      
      setShowMilestoneForm(false)
      setEditingMilestone(null)
      resetMilestoneForm()
    } catch (error) {
      console.error('Milestone submission error:', error)
      toast.error(`Failed to save milestone: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    try {
      setIsSubmitting(true)
      
      const supabase = await getSupabaseClient()
      
      if (editingTask) {
        // Update existing task
        const { error } = await supabase
          .from('tasks')
          .update({
            title: taskForm.title,
            description: taskForm.description || '',
            status: taskForm.status,
            priority: taskForm.priority,
            start_date: taskForm.start_date || null,
            due_date: taskForm.due_date || null,
            estimated_hours: taskForm.estimated_hours || 0,
            assigned_to: (typeof taskForm.assigned_to === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(taskForm.assigned_to)) ? taskForm.assigned_to : null,
            risk_level: taskForm.risk_level,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingTask.id)
        
        if (error) throw error
        toast.success('Task updated successfully')
      } else {
        // Create new task
        const { error } = await supabase
          .from('tasks')
          .insert({
            milestone_id: selectedMilestone?.id,
            title: taskForm.title,
            description: taskForm.description || '',
            status: 'pending',
            priority: taskForm.priority,
            start_date: taskForm.start_date || null,
            due_date: taskForm.due_date || null,
            estimated_hours: taskForm.estimated_hours || 0,
            actual_hours: 0,
            progress_percentage: 0,
            assigned_to: (typeof taskForm.assigned_to === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(taskForm.assigned_to)) ? taskForm.assigned_to : null,
            risk_level: taskForm.risk_level,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        
        if (error) throw error
        toast.success('Task created successfully')
      }
      
      // Reload data to show updated tasks
      await loadData()
      
      setShowTaskForm(false)
      setEditingTask(null)
      setSelectedMilestone(null)
      resetTaskForm()
    } catch (error) {
      console.error('Task submission error:', error)
      toast.error(`Failed to save task: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePhaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    try {
      setIsSubmitting(true)
      // Implement phase creation/update
      console.log('Creating/upiting phase:', phaseForm)
      toast.success('Phase saved successfully')
      setShowPhaseForm(false)
      setSelectedPhase(null)
      resetPhaseForm()
    } catch (error) {
      console.error('Phase submission error:', error)
      toast.error('Failed to save phase')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDependencySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    try {
      setIsSubmitting(true)
      // Implement dependency creation
      console.log('Creating dependency:', dependencyForm)
      toast.success('Dependency created successfully')
      setShowDependencyForm(false)
      resetDependencyForm()
    } catch (error) {
      console.error('Dependency submission error:', error)
      toast.error('Failed to create dependency')
    } finally {
      setIsSubmitting(false)
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, milestoneId: string) => {
    setDraggedMilestone(milestoneId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, milestoneId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverMilestone(milestoneId)
  }

  // Simpler reordering via buttons
  const moveMilestone = async (milestoneId: string, direction: 'up' | 'down') => {
    try {
      const index = milestones.findIndex(m => m.id === milestoneId)
      if (index === -1) return
      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= milestones.length) return

      const newMilestones = [...milestones]
      const [item] = newMilestones.splice(index, 1)
      newMilestones.splice(targetIndex, 0, item)

      // Persist order_index for all milestones
      const supabase = await getSupabaseClient()
      for (let i = 0; i < newMilestones.length; i++) {
        const m = newMilestones[i]
        await supabase.from('milestones').update({ order_index: i }).eq('id', m.id)
      }

      setMilestones(newMilestones)
      toast.success('Milestone reordered')
    } catch (error) {
      console.error('Reorder error:', error)
      toast.error('Failed to reorder')
    }
  }

  const handleDragLeave = () => {
    setDragOverMilestone(null)
  }

  const handleDrop = async (e: React.DragEvent, targetMilestoneId: string) => {
    e.preventDefault()
    
    if (!draggedMilestone || draggedMilestone === targetMilestoneId) {
      setDraggedMilestone(null)
      setDragOverMilestone(null)
      return
    }

    try {
      const supabase = await getSupabaseClient()
      
      // Get current order indices
      const draggedIndex = milestones.findIndex(m => m.id === draggedMilestone)
      const targetIndex = milestones.findIndex(m => m.id === targetMilestoneId)
      
      if (draggedIndex === -1 || targetIndex === -1) return

      // Create new order
      const newMilestones = [...milestones]
      const [draggedItem] = newMilestones.splice(draggedIndex, 1)
      newMilestones.splice(targetIndex, 0, draggedItem)

      // Update order indices in database
      const updates = newMilestones.map((milestone, index) => ({
        id: milestone.id,
        order_index: index
      }))

      for (const update of updates) {
        await supabase
          .from('milestones')
          .update({ order_index: update.order_index })
          .eq('id', update.id)
      }

      // Update local state
      setMilestones(newMilestones)
      toast.success('Milestone order updated successfully')
      
    } catch (error) {
      console.error('Error reordering milestones:', error)
      toast.error('Failed to reorder milestones')
    } finally {
      setDraggedMilestone(null)
      setDragOverMilestone(null)
    }
  }

  // Action/Comment handlers
  const handleTaskAction = (task: Task, action: 'comment' | 'flag' | 'assign' | 'priority') => {
    setSelectedTask(task)
    setActionType(action)
    setActionText('')
    setCommentText('')
    setShowActionModal(true)
  }

  const handleTaskComment = (task: Task) => {
    setSelectedTask(task)
    setCommentText('')
    setShowCommentModal(true)
  }

  const submitAction = async () => {
    if (!selectedTask || !actionText.trim()) return

    try {
      const supabase = await getSupabaseClient()
      
      const userId = (await supabase.auth.getUser()).data.user?.id
      const actionData = {
        task_id: selectedTask.id,
        action_type: actionType,
        content: actionText,
        created_by: userId,
        created_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('task_actions')
        .insert(actionData)

      if (error) throw error

      toast.success('Action added successfully')
      setShowActionModal(false)
      setActionText('')
      setSelectedTask(null)
      
    } catch (error) {
      console.error('Error adding action:', error)
      toast.error('Failed to add action')
    }
  }

  const submitComment = async () => {
    if (!selectedTask || !commentText.trim()) return

    try {
      const supabase = await getSupabaseClient()
      
      const userId = (await supabase.auth.getUser()).data.user?.id
      const commentData = {
        task_id: selectedTask.id,
        user_id: userId,
        comment: commentText,
        created_at: new Date().toISOString()
      }

      const { data: inserted, error } = await supabase
        .from('task_comments')
        .insert(commentData)
        .select('id, task_id, user_id, comment, created_at')
        .single()

      if (error) throw error

      // Optimistically show the new comment under the task
      setTaskComments(prev => {
        const list = prev[selectedTask.id] || []
        return { ...prev, [selectedTask.id]: [inserted || commentData, ...list] }
      })

      toast.success('Comment added successfully')
      setShowCommentModal(false)
      setCommentText('')
      setSelectedTask(null)
      
    } catch (error) {
      console.error('Error adding comment:', error)
      toast.error('Failed to add comment')
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'critical': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading professional milestone system...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading System</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={loadData} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Professional Milestone System</h1>
          <p className="text-gray-600">Advanced project management with dependencies and workflows</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowSettings(true)}
            variant="outline"
            size="sm"
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button
            onClick={() => setShowPhaseForm(true)}
            variant="outline"
            size="sm"
          >
            <Workflow className="h-4 w-4 mr-2" />
            New Phase
          </Button>
          <Button
            onClick={() => setShowMilestoneForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Milestone
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="phases">Phases</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Project Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Milestones</p>
                    <p className="text-2xl font-bold text-gray-900">{milestones.length}</p>
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
                    <p className="text-2xl font-bold text-green-600">
                      {milestones.filter(m => m.status === 'completed').length}
                    </p>
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
                    <p className="text-2xl font-bold text-blue-600">
                      {milestones.filter(m => m.status === 'in_progress').length}
                    </p>
                  </div>
                  <Play className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Critical Path</p>
                    <p className="text-2xl font-bold text-red-600">
                      {milestones.filter(m => m.critical_path).length}
                    </p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Milestones List */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Project Milestones</h3>
            {milestones.map((milestone) => (
              <MilestoneCard
                key={milestone.id}
                milestone={milestone}
                comments={comments[milestone.id] || []}
                approvals={approvals[milestone.id] || []}
                taskComments={taskComments}
                onEdit={() => editMilestone(milestone)}
                onDelete={() => deleteMilestone(milestone.id)}
                onStatusChange={(status) => updateMilestoneStatus(milestone.id, status)}
                onAddTask={() => {
                  setSelectedMilestone(milestone)
                  setShowTaskForm(true)
                }}
                onManageDependencies={() => {
                  setSelectedMilestone(milestone)
                  setShowDependencyForm(true)
                }}
                onTaskStatusChange={updateTaskStatus}
                onEditTask={editTask}
                onDeleteTask={deleteTask}
                onTaskAction={handleTaskAction}
                onTaskComment={handleTaskComment}
                onMoveUp={() => moveMilestone(milestone.id, 'up')}
                onMoveDown={() => moveMilestone(milestone.id, 'down')}
                onDragStart={(e) => handleDragStart(e, milestone.id)}
                onDragOver={(e) => handleDragOver(e, milestone.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, milestone.id)}
                isDragging={draggedMilestone === milestone.id}
                isDragOver={dragOverMilestone === milestone.id}
              />
            ))}
          </div>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-6">
          <TaskMilestoneLinking
            bookingId={bookingId}
            milestones={milestones}
            tasks={[]} // This would be loaded from actual data
            onTaskCreated={(task) => {
              console.log('Task created:', task)
              toast.success('Task created successfully')
            }}
            onTaskUpdated={(task) => {
              console.log('Task updated:', task)
              toast.success('Task updated successfully')
            }}
            onTaskDeleted={(taskId) => {
              console.log('Task deleted:', taskId)
              toast.success('Task deleted successfully')
            }}
            onTaskLinked={(taskId, milestoneId) => {
              console.log('Task linked:', taskId, milestoneId)
              toast.success('Task linked to milestone successfully')
            }}
            onTaskUnlinked={(taskId) => {
              console.log('Task unlinked:', taskId)
              toast.success('Task unlinked successfully')
            }}
          />
        </TabsContent>

        {/* Dependencies Tab */}
        <TabsContent value="dependencies" className="space-y-6">
          <DependencyManagement
            bookingId={bookingId}
            milestones={milestones}
            tasks={[]} // This would be loaded from actual data
            onDependencyCreated={(dependency) => {
              console.log('Dependency created:', dependency)
              toast.success('Dependency created successfully')
            }}
            onDependencyUpdated={(dependency) => {
              console.log('Dependency updated:', dependency)
              toast.success('Dependency updated successfully')
            }}
            onDependencyDeleted={(dependencyId) => {
              console.log('Dependency deleted:', dependencyId)
              toast.success('Dependency deleted successfully')
            }}
          />
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          <DocumentManager
            bookingId={bookingId}
            userRole="provider"
            onDocumentUploaded={(document) => {
              console.log('Document uploaded:', document)
              toast.success('Document uploaded successfully')
            }}
            onRequestCreated={(request) => {
              console.log('Document request created:', request)
              toast.success('Document request created successfully')
            }}
          />
        </TabsContent>

        {/* Phases Tab */}
        <TabsContent value="phases" className="space-y-6">
          <WorkflowManagement
            bookingId={bookingId}
            onWorkflowCreated={(workflow) => {
              console.log('Workflow created:', workflow)
              toast.success('Workflow created successfully')
            }}
            onWorkflowUpdated={(workflow) => {
              console.log('Workflow updated:', workflow)
              toast.success('Workflow updated successfully')
            }}
            onWorkflowDeleted={(workflowId) => {
              console.log('Workflow deleted:', workflowId)
              toast.success('Workflow deleted successfully')
            }}
          />
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <MilestoneSettings
            bookingId={bookingId}
            onSettingsUpdated={(settings) => {
              console.log('Settings updated:', settings)
              toast.success('Settings updated successfully')
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Milestone Form Dialog */}
      <Dialog open={showMilestoneForm} onOpenChange={(open: boolean) => {
        if (!open) {
          setShowMilestoneForm(false)
          setEditingMilestone(null)
          setIsSubmitting(false)
          resetMilestoneForm()
        }
      }}>
        <DialogContent 
          className="max-w-4xl"
          onClose={() => {
            setShowMilestoneForm(false)
            setEditingMilestone(null)
            setIsSubmitting(false)
            resetMilestoneForm()
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {editingMilestone ? 'Edit Milestone' : 'Create New Milestone'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleMilestoneSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title *</label>
                <Input
                  value={milestoneForm.title || ''}
                  onChange={(e) => setMilestoneForm({...milestoneForm, title: e.target.value})}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Priority</label>
                <Select
                  value={milestoneForm.priority}
                  onValueChange={(value) => setMilestoneForm({...milestoneForm, priority: value as any})}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
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
                <label className="block text-sm font-medium mb-2">Start Date *</label>
                <Input
                  type="date"
                  value={milestoneForm.start_date || ''}
                  onChange={(e) => setMilestoneForm({...milestoneForm, start_date: e.target.value})}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Due Date *</label>
                <Input
                  type="date"
                  value={milestoneForm.due_date || ''}
                  onChange={(e) => setMilestoneForm({...milestoneForm, due_date: e.target.value})}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Estimated Hours</label>
                <Input
                  type="number"
                  value={milestoneForm.estimated_hours}
                  onChange={(e) => setMilestoneForm({...milestoneForm, estimated_hours: parseInt(e.target.value) || 0})}
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Risk Level</label>
                <Select
                  value={milestoneForm.risk_level}
                  onValueChange={(value) => setMilestoneForm({...milestoneForm, risk_level: value as any})}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select risk level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <Textarea
                value={milestoneForm.description || ''}
                onChange={(e) => setMilestoneForm({...milestoneForm, description: e.target.value})}
                rows={3}
                disabled={isSubmitting}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowMilestoneForm(false)
                  setEditingMilestone(null)
                  setIsSubmitting(false)
                  resetMilestoneForm()
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : (editingMilestone ? 'Update' : 'Create') + ' Milestone'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Task Form Dialog */}
      <Dialog open={showTaskForm} onOpenChange={(open: boolean) => {
        if (!open) {
          setShowTaskForm(false)
          setSelectedMilestone(null)
          setEditingTask(null)
          setIsSubmitting(false)
          resetTaskForm()
        }
      }}>
        <DialogContent 
          className="max-w-2xl"
          onClose={() => {
            setShowTaskForm(false)
            setSelectedMilestone(null)
            setEditingTask(null)
            setIsSubmitting(false)
            resetTaskForm()
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {editingTask ? 'Edit Task' : 'Add New Task'}
              {selectedMilestone && ` to ${selectedMilestone.title}`}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTaskSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title *</label>
                <Input
                  value={taskForm.title || ''}
                  onChange={(e) => setTaskForm({...taskForm, title: e.target.value})}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Priority</label>
                <Select
                  value={taskForm.priority}
                  onValueChange={(value) => setTaskForm({...taskForm, priority: value as any})}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
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
                <label className="block text-sm font-medium mb-2">Status</label>
                <Select
                  value={taskForm.status}
                  onValueChange={(value) => setTaskForm({...taskForm, status: value as any})}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Start Date</label>
                <Input
                  type="date"
                  value={taskForm.start_date || ''}
                  onChange={(e) => setTaskForm({...taskForm, start_date: e.target.value})}
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Due Date</label>
                <Input
                  type="date"
                  value={taskForm.due_date || ''}
                  onChange={(e) => setTaskForm({...taskForm, due_date: e.target.value})}
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Estimated Hours</label>
                <Input
                  type="number"
                  value={taskForm.estimated_hours}
                  onChange={(e) => setTaskForm({...taskForm, estimated_hours: parseInt(e.target.value) || 0})}
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Assigned To</label>
                <Input
                  value={taskForm.assigned_to || ''}
                  onChange={(e) => setTaskForm({...taskForm, assigned_to: e.target.value})}
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <Textarea
                value={taskForm.description || ''}
                onChange={(e) => setTaskForm({...taskForm, description: e.target.value})}
                rows={3}
                disabled={isSubmitting}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowTaskForm(false)
                  setSelectedMilestone(null)
                  setEditingTask(null)
                  setIsSubmitting(false)
                  resetTaskForm()
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : (editingTask ? 'Update' : 'Add') + ' Task'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Action Modal */}
      <Dialog open={showActionModal} onOpenChange={setShowActionModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'comment' && 'Add Comment'}
              {actionType === 'flag' && 'Flag Task'}
              {actionType === 'assign' && 'Assign Task'}
              {actionType === 'priority' && 'Set Priority'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Task: {selectedTask?.title}
              </label>
              <Textarea
                value={actionText}
                onChange={(e) => setActionText(e.target.value)}
                placeholder={
                  actionType === 'comment' ? 'Add a comment...' :
                  actionType === 'flag' ? 'Reason for flagging...' :
                  actionType === 'assign' ? 'Assignment notes...' :
                  'Priority notes...'
                }
                rows={4}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowActionModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={submitAction}
              disabled={!actionText.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Submit
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Comment Modal */}
      <Dialog open={showCommentModal} onOpenChange={setShowCommentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Comment to Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Task: {selectedTask?.title}
              </label>
              <Textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                rows={4}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowCommentModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={submitComment}
              disabled={!commentText.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              Add Comment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Helper functions
function getStatusColor(status: string) {
  switch (status) {
    case 'completed': return 'bg-green-100 text-green-800'
    case 'in_progress': return 'bg-blue-100 text-blue-800'
    case 'pending': return 'bg-gray-100 text-gray-800'
    case 'cancelled': return 'bg-red-100 text-red-800'
    case 'on_hold': return 'bg-yellow-100 text-yellow-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'urgent': return 'bg-red-100 text-red-800'
    case 'high': return 'bg-orange-100 text-orange-800'
    case 'medium': return 'bg-yellow-100 text-yellow-800'
    case 'low': return 'bg-green-100 text-green-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

function getRiskColor(risk: string) {
  switch (risk) {
    case 'critical': return 'bg-red-100 text-red-800'
    case 'high': return 'bg-orange-100 text-orange-800'
    case 'medium': return 'bg-yellow-100 text-yellow-800'
    case 'low': return 'bg-green-100 text-green-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

function formatDateOnly(value?: string | null) {
  try {
    if (!value) return 'N/A'
    const d = new Date(value)
    if (isNaN(d.getTime())) return 'N/A'
    return d.toLocaleDateString()
  } catch {
    return 'N/A'
  }
}

// Milestone Card Component
function MilestoneCard({ 
  milestone, 
  comments = [],
  approvals = [],
  taskComments = {},
  onEdit, 
  onDelete,
  onStatusChange,
  onAddTask, 
  onManageDependencies,
  onTaskStatusChange,
  onEditTask,
  onDeleteTask,
  onTaskAction,
  onTaskComment,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  isDragging,
  isDragOver
}: {
  milestone: Milestone
  comments?: any[]
  approvals?: any[]
  taskComments?: Record<string, any[]>
  onEdit: () => void
  onDelete: () => void
  onStatusChange: (status: string) => void
  onAddTask: () => void
  onManageDependencies: () => void
  onTaskStatusChange: (taskId: string, status: string) => void
  onEditTask: (task: Task) => void
  onDeleteTask: (taskId: string) => void
  onTaskAction: (task: Task, action: 'comment' | 'flag' | 'assign' | 'priority') => void
  onTaskComment: (task: Task) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onDragStart: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
  isDragging: boolean
  isDragOver: boolean
}) {
  return (
    <Card 
      className={`hover:shadow-md transition-shadow cursor-move ${
        isDragging ? 'opacity-50 scale-95' : ''
      } ${isDragOver ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <GripVertical className="h-5 w-5 text-gray-400 cursor-grab" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{milestone.title}</h3>
                <Badge className={getStatusColor(milestone.status)}>
                  {milestone.status.replace('_', ' ')}
                </Badge>
                <Badge className={getPriorityColor(milestone.priority)}>
                  {milestone.priority}
                </Badge>
                {milestone.critical_path && (
                  <Badge className="bg-red-100 text-red-800">
                    Critical Path
                  </Badge>
                )}
              </div>
              <p className="text-gray-600 mb-3">{milestone.description}</p>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDateOnly(milestone.start_date)} - {formatDateOnly(milestone.due_date)}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {milestone.estimated_hours}h
                </div>
                <div className="flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  <span className={getRiskColor(milestone.risk_level)}>
                    {milestone.risk_level} risk
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={milestone.status} onValueChange={onStatusChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" onClick={onMoveUp} title="Move up">
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={onMoveDown} title="Move down">
                <ArrowDown className="h-4 w-4" />
              </Button>
            </div>
            <Button size="sm" variant="outline" onClick={onManageDependencies}>
              <Link className="h-4 w-4 mr-1" />
              Dependencies
            </Button>
            <Button size="sm" variant="outline" onClick={onAddTask}>
              <Plus className="h-4 w-4 mr-1" />
              Add Task
            </Button>
            <Button size="sm" variant="outline" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm text-gray-500">{milestone.progress_percentage}%</span>
          </div>
          <Progress value={milestone.progress_percentage} className="h-2" />
        </div>

        {/* Tasks */}
        {milestone.tasks && milestone.tasks.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Tasks ({milestone.tasks.length})</h4>
            {milestone.tasks.slice(0, 3).map((task) => (
              <div key={task.id} className="p-2 bg-gray-50 rounded space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Select 
                      value={task.status} 
                      onValueChange={(status) => onTaskStatusChange(task.id, status)}
                    >
                      <SelectTrigger className="w-24 h-6 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-gray-700">{task.title}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      {task.estimated_hours}h
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => onTaskComment(task)} title="Add Comment">
                      <MessageSquare className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onTaskAction(task, 'flag')} title="Flag Task">
                      <Flag className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onTaskAction(task, 'assign')} title="Assign Task">
                      <Users className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onTaskAction(task, 'priority')} title="Set Priority">
                      <AlertTriangle className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onEditTask(task)} title="Edit Task">
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onDeleteTask(task.id)} title="Delete Task">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
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
            {milestone.tasks && milestone.tasks.length > 3 && (
              <p className="text-xs text-gray-500">+{milestone.tasks.length - 3} more tasks</p>
            )}
          </div>
        )}

        {/* Dependencies */}
        {milestone.dependencies && milestone.dependencies.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Dependencies</h4>
            <div className="space-y-1">
              {milestone.dependencies.map((dep) => (
                <div key={dep.id} className="flex items-center gap-2 text-sm text-gray-600">
                  <ArrowRight className="h-3 w-3" />
                  <span>{dep.depends_on_milestone.title}</span>
                  <Badge variant="outline" className="text-xs">
                    {dep.dependency_type.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comments and Approvals Section */}
        <div className="mt-6 pt-4 border-t">
          {/* Comments */}
          <div className="mb-4">
            <h4 className="font-medium text-sm text-gray-700 mb-2">
              Comments ({comments.length})
            </h4>
            {comments.length === 0 ? (
              <p className="text-gray-500 text-sm italic">No comments yet</p>
            ) : (
              <div className="space-y-2">
                {comments.map((comment) => (
                  <div key={comment.id} className="p-3 border rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{comment.author_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {comment.author_role}
                        </Badge>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(comment.created_at).toLocaleDateString()}
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
              <h4 className="font-medium text-sm text-gray-700 mb-2">
                Approvals ({approvals.length})
              </h4>
              <div className="space-y-2">
                {approvals.map((approval) => (
                  <div key={approval.id} className="p-3 border rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{approval.approver_name}</span>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            approval.status === 'approved' ? 'bg-green-100 text-green-800' :
                            approval.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {approval.status}
                        </Badge>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(approval.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {approval.comment && (
                      <p className="text-sm text-gray-700 mt-1">{approval.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
