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
  ChevronRight
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

      // Log loaded data for debugging
      console.log('📊 Milestones loaded:', data?.map(m => ({
        id: m.id,
        title: m.title,
        total_tasks: m.total_tasks,
        tasks_array_length: m.tasks?.length || 0,
        has_tasks: !!m.tasks && m.tasks.length > 0
      })))

      setMilestones(data || [])
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
    } catch (err) {
      console.error('Error updating task:', err)
      toast.error('Failed to update task')
    }
  }, [editingTask, taskForm, milestones, updateProgress])
  
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

  // Load milestones on mount
  useEffect(() => {
    loadMilestones()
  }, [loadMilestones])

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
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-gray-600">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
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
                  <div className="flex items-center gap-2 mb-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleMilestoneExpansion(milestone.id)}
                      className="h-6 w-6 p-0"
                    >
                      {expandedMilestones.has(milestone.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                    <CardTitle className="flex items-center gap-2">
                      {getStatusIcon(milestone.status)}
                      {milestone.title}
                      {isOverdue(milestone) && (
                        <Badge variant="destructive" className="ml-2">
                          Overdue
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
                    <span className="text-sm text-gray-600">
                      {milestone.progress_percentage}%
                    </span>
                  </div>
                  <Progress value={milestone.progress_percentage} className="h-2" />
                </div>

                {/* Milestone Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="font-semibold">{milestone.total_tasks}</div>
                    <div className="text-gray-600">Total Tasks</div>
                  </div>
                  <div>
                    <div className="font-semibold text-green-600">{milestone.completed_tasks}</div>
                    <div className="text-gray-600">Completed</div>
                  </div>
                  <div>
                    <div className="font-semibold">{milestone.estimated_hours || 0}h</div>
                    <div className="text-gray-600">Estimated</div>
                  </div>
                  <div>
                    <div className="font-semibold">{milestone.actual_hours || 0}h</div>
                    <div className="text-gray-600">Actual</div>
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
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Tasks ({milestone.completed_tasks}/{milestone.total_tasks})
                    </h4>
                    <div className="space-y-2">
                      {milestone.tasks.map((task) => (
                        <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center gap-3 flex-1">
                            <div className={`w-2 h-2 rounded-full ${
                              task.status === 'completed' ? 'bg-green-500' :
                              task.status === 'in_progress' ? 'bg-blue-500' :
                              'bg-gray-400'
                            }`} />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{task.title}</span>
                                {task.is_overdue && (
                                  <Badge variant="destructive" className="text-xs">
                                    Overdue
                                  </Badge>
                                )}
                              </div>
                              {task.description && (
                                <p className="text-xs text-gray-600 mt-1">{task.description}</p>
                              )}
                              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                {task.due_date && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(task.due_date).toLocaleDateString()}
                                  </span>
                                )}
                                {(task.estimated_hours ?? 0) > 0 && (
                                  <span>{task.estimated_hours}h estimated</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={`${
                              task.status === 'completed' ? 'bg-green-100 text-green-800' :
                              task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {task.status.replace('_', ' ')}
                            </Badge>
                            <span className="text-xs text-gray-600 min-w-[40px] text-right">
                              {task.progress_percentage}%
                            </span>
                            {userRole !== 'client' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openEditTask(task, milestone.id)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteTask(task.id, milestone.id)}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {!expandedMilestones.has(milestone.id) && (milestone.tasks?.length || 0) > 0 && (
                  <div className="text-sm text-gray-600 text-center">
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
    </div>
  )
}
