'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  Clock, 
  Play, 
  Pause, 
  XCircle,
  Calendar,
  User,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Eye,
  Settings,
  Save,
  X,
  AlertTriangle,
  Target,
  BarChart3,
  FileText,
  Users,
  Zap,
  Shield,
  Star,
  Activity,
  Timer,
  Award,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Download,
  Upload,
  Send,
  Filter,
  Search,
  MoreVertical,
  Lock,
  Unlock
} from 'lucide-react'
import { format, isAfter, isBefore, differenceInDays, differenceInHours } from 'date-fns'
import { Milestone, Task, UserRole } from '@/types/progress'
import { getSupabaseClient } from '@/lib/supabase'
import { toast } from 'sonner'

interface ProfessionalMilestoneManagerProps {
  bookingId: string
  userRole: UserRole
  className?: string
}

interface MilestoneFormData {
  title: string
  description: string
  due_date: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  estimated_hours: number
  weight: number
  order_index: number
}

interface TaskFormData {
  title: string
  description: string
  due_date: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  estimated_hours: number
  assigned_to?: string
}

export function ProfessionalMilestoneManager({
  bookingId,
  userRole,
  className = ''
}: ProfessionalMilestoneManagerProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null)
  const [showMilestoneForm, setShowMilestoneForm] = useState(false)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('due_date')

  // Form states
  const [milestoneForm, setMilestoneForm] = useState<MilestoneFormData>({
    title: '',
    description: '',
    due_date: '',
    priority: 'medium',
    estimated_hours: 0,
    weight: 1,
    order_index: 0
  })

  const [taskForm, setTaskForm] = useState<TaskFormData>({
    title: '',
    description: '',
    due_date: '',
    priority: 'medium',
    estimated_hours: 0,
    assigned_to: ''
  })

  const isProvider = userRole === 'provider'
  const isClient = userRole === 'client'

  // Load milestones and tasks
  useEffect(() => {
    loadMilestones()
  }, [bookingId])

  const loadMilestones = async () => {
    try {
      setLoading(true)
      const supabase = await getSupabaseClient()
      
      const { data, error } = await supabase
        .from('milestones')
        .select(`
          *,
          tasks (*)
        `)
        .eq('booking_id', bookingId)
        .order('order_index', { ascending: true })

      if (error) throw error
      setMilestones(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load milestones')
      toast.error('Failed to load milestones')
    } finally {
      setLoading(false)
    }
  }

  // Milestone CRUD operations
  const createMilestone = async (data: MilestoneFormData) => {
    if (isSubmitting) return
    
    try {
      setIsSubmitting(true)
      
      // For now, just simulate the milestone creation since we're focusing on UI
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      
      toast.success('Milestone created successfully (simulated)')
      setShowMilestoneForm(false)
      setEditingMilestone(null)
      resetMilestoneForm()
      
      // In a real implementation, you would call loadMilestones() here
      // loadMilestones()
    } catch (err) {
      toast.error('Failed to create milestone')
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateMilestone = async (id: string, data: Partial<MilestoneFormData>) => {
    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('milestones')
        .update(data)
        .eq('id', id)

      if (error) throw error
      
      toast.success('Milestone updated successfully')
      loadMilestones()
      setEditingMilestone(null)
    } catch (err) {
      toast.error('Failed to update milestone')
    }
  }

  const deleteMilestone = async (id: string) => {
    if (!confirm('Are you sure you want to delete this milestone?')) return

    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('milestones')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      toast.success('Milestone deleted successfully')
      loadMilestones()
    } catch (err) {
      toast.error('Failed to delete milestone')
    }
  }

  // Task CRUD operations
  const createTask = async (milestoneId: string, data: TaskFormData) => {
    if (isSubmitting) return
    
    try {
      setIsSubmitting(true)
      
      // For now, just simulate the task creation since we're focusing on UI
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      
      toast.success('Task created successfully (simulated)')
      setShowTaskForm(false)
      setSelectedMilestone(null)
      setEditingTask(null)
      resetTaskForm()
      
      // In a real implementation, you would call loadMilestones() here
      // loadMilestones()
    } catch (err) {
      toast.error('Failed to create task')
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateTask = async (id: string, data: Partial<TaskFormData>) => {
    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('tasks')
        .update(data)
        .eq('id', id)

      if (error) throw error
      
      toast.success('Task updated successfully')
      loadMilestones()
      setEditingTask(null)
    } catch (err) {
      toast.error('Failed to update task')
    }
  }

  const deleteTask = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return

    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      toast.success('Task deleted successfully')
      loadMilestones()
    } catch (err) {
      toast.error('Failed to delete task')
    }
  }

  // Status updates
  const updateMilestoneStatus = async (id: string, status: string) => {
    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('milestones')
        .update({ status })
        .eq('id', id)

      if (error) throw error
      
      toast.success('Milestone status updated')
      loadMilestones()
    } catch (err) {
      toast.error('Failed to update milestone status')
    }
  }

  const updateTaskStatus = async (id: string, status: string) => {
    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', id)

      if (error) throw error
      
      toast.success('Task status updated')
      loadMilestones()
    } catch (err) {
      toast.error('Failed to update task status')
    }
  }

  // Form handlers
  const resetMilestoneForm = () => {
    setMilestoneForm({
      title: '',
      description: '',
      due_date: '',
      priority: 'medium',
      estimated_hours: 0,
      weight: 1,
      order_index: milestones.length
    })
  }

  const resetTaskForm = () => {
    setTaskForm({
      title: '',
      description: '',
      due_date: '',
      priority: 'medium',
      estimated_hours: 0,
      assigned_to: ''
    })
  }

  const handleMilestoneSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingMilestone) {
      updateMilestone(editingMilestone.id, milestoneForm)
    } else {
      createMilestone(milestoneForm)
    }
  }

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('Task form submitted:', { 
      isSubmitting, 
      editingTask: editingTask?.id, 
      selectedMilestone: selectedMilestone?.id,
      taskForm 
    })
    
    if (isSubmitting) return
    
    try {
      if (editingTask) {
        console.log('Updating task:', editingTask.id)
        await updateTask(editingTask.id, taskForm)
      } else if (selectedMilestone) {
        console.log('Creating task for milestone:', selectedMilestone.id)
        await createTask(selectedMilestone.id, taskForm)
      } else {
        console.error('No milestone selected for task creation')
        toast.error('Please select a milestone first')
        return
      }
    } catch (error) {
      console.error('Task submission error:', error)
      toast.error('Failed to save task')
    }
  }

  // Filter and sort
  const filteredMilestones = milestones.filter(milestone => {
    const matchesSearch = milestone.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         milestone.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || milestone.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const sortedMilestones = [...filteredMilestones].sort((a, b) => {
    switch (sortBy) {
      case 'due_date':
        return new Date(a.due_date || '').getTime() - new Date(b.due_date || '').getTime()
      case 'priority':
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
        return (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - 
               (priorityOrder[a.priority as keyof typeof priorityOrder] || 0)
      case 'status':
        return a.status.localeCompare(b.status)
      default:
        return 0
    }
  })

  // Statistics
  const totalMilestones = milestones.length
  const completedMilestones = milestones.filter(m => m.status === 'completed').length
  const inProgressMilestones = milestones.filter(m => m.status === 'in_progress').length
  const pendingMilestones = milestones.filter(m => m.status === 'pending').length
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
          <h3 className="text-lg font-semibold mb-2">Error Loading Milestones</h3>
          <p>{error}</p>
          <Button onClick={loadMilestones} className="mt-4">
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
          <h1 className="text-3xl font-bold text-gray-900">Project Milestones</h1>
          <p className="text-gray-600 mt-1">
            {isProvider ? 'Manage project milestones and tasks' : 'Track project progress and milestones'}
          </p>
        </div>
        
        {isProvider && (
          <div className="flex gap-2">
            <Button onClick={() => setShowMilestoneForm(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              New Milestone
            </Button>
          </div>
        )}
      </div>

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
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{overdueMilestones}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Overall Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Project Completion</span>
              <span className="text-sm font-medium">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
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
                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                <span>Pending: {pendingMilestones}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>Overdue: {overdueMilestones}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search milestones..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="due_date">Due Date</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="title">Title</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Milestones List */}
      <div className="space-y-4">
        {sortedMilestones.map((milestone) => (
          <MilestoneCard
            key={milestone.id}
            milestone={milestone}
            userRole={userRole}
            onEdit={() => {
              setEditingMilestone(milestone)
              setMilestoneForm({
                title: milestone.title,
                description: milestone.description || '',
                due_date: milestone.due_date || '',
                priority: milestone.priority || 'medium',
                estimated_hours: milestone.estimated_hours || 0,
                weight: milestone.weight || 1,
                order_index: milestone.order_index || 0
              })
              setShowMilestoneForm(true)
            }}
            onDelete={() => deleteMilestone(milestone.id)}
            onStatusChange={(status) => updateMilestoneStatus(milestone.id, status)}
            onAddTask={() => {
              setSelectedMilestone(milestone)
              setShowTaskForm(true)
            }}
            onEditTask={(task) => {
              setEditingTask(task)
              setTaskForm({
                title: task.title,
                description: task.description || '',
                due_date: task.due_date || '',
                priority: task.priority || 'medium',
                estimated_hours: task.estimated_hours || 0,
                assigned_to: task.assigned_to || ''
              })
              setShowTaskForm(true)
            }}
            onDeleteTask={(taskId) => deleteTask(taskId)}
            onTaskStatusChange={(taskId, status) => updateTaskStatus(taskId, status)}
          />
        ))}
      </div>

      {/* Milestone Form Dialog */}
      <Dialog open={showMilestoneForm} onOpenChange={(open: boolean) => {
        if (!open) {
          setShowMilestoneForm(false)
          setEditingMilestone(null)
          resetMilestoneForm()
        }
      }}>
        <DialogContent 
          className="max-w-2xl"
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
          <form onSubmit={handleMilestoneSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title *</label>
                <Input
                  value={milestoneForm.title}
                  onChange={(e) => setMilestoneForm({...milestoneForm, title: e.target.value})}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Due Date *</label>
                <Input
                  type="date"
                  value={milestoneForm.due_date}
                  onChange={(e) => setMilestoneForm({...milestoneForm, due_date: e.target.value})}
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
                <label className="block text-sm font-medium mb-2">Estimated Hours</label>
                <Input
                  type="number"
                  value={milestoneForm.estimated_hours}
                  onChange={(e) => setMilestoneForm({...milestoneForm, estimated_hours: parseInt(e.target.value) || 0})}
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <Textarea
                value={milestoneForm.description}
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
                {isSubmitting ? 'Creating...' : (editingMilestone ? 'Update' : 'Create') + ' Milestone'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Task Form Dialog */}
      <Dialog open={showTaskForm} onOpenChange={(open: boolean) => {
        if (!open) {
          // Close dialog and reset all state
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
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({...taskForm, title: e.target.value})}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Due Date</label>
                <Input
                  type="date"
                  value={taskForm.due_date}
                  onChange={(e) => setTaskForm({...taskForm, due_date: e.target.value})}
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
                <label className="block text-sm font-medium mb-2">Estimated Hours</label>
                <Input
                  type="number"
                  value={taskForm.estimated_hours}
                  onChange={(e) => setTaskForm({...taskForm, estimated_hours: parseInt(e.target.value) || 0})}
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <Textarea
                value={taskForm.description}
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
                  // Close dialog and reset all state
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
                {isSubmitting ? 'Adding...' : (editingTask ? 'Update' : 'Add') + ' Task'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Milestone Card Component
interface MilestoneCardProps {
  milestone: Milestone
  userRole: UserRole
  onEdit: () => void
  onDelete: () => void
  onStatusChange: (status: string) => void
  onAddTask: () => void
  onEditTask: (task: Task) => void
  onDeleteTask: (taskId: string) => void
  onTaskStatusChange: (taskId: string, status: string) => void
}

function MilestoneCard({
  milestone,
  userRole,
  onEdit,
  onDelete,
  onStatusChange,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onTaskStatusChange
}: MilestoneCardProps) {
  const [expanded, setExpanded] = useState(false)
  const isProvider = userRole === 'provider'
  const isClient = userRole === 'client'

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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const isOverdue = milestone.due_date && isBefore(new Date(milestone.due_date), new Date()) && milestone.status !== 'completed'
  const tasks = milestone.tasks || []
  const completedTasks = tasks.filter(t => t.status === 'completed').length
  const taskProgress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0

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
              <Badge className={getPriorityColor(milestone.priority || 'medium')}>
                {milestone.priority || 'medium'}
              </Badge>
              {isOverdue && (
                <Badge className="bg-red-100 text-red-800">
                  Overdue
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
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isProvider && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onEdit}
                  className="h-8 w-8 p-0"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onDelete}
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setExpanded(!expanded)}
              className="h-8 w-8 p-0"
            >
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
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
            {/* Status Controls */}
            {isProvider && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Status:</span>
                <Select value={milestone.status} onValueChange={onStatusChange}>
                  <SelectTrigger className="w-40">
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
              </div>
            )}

            {/* Tasks */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">Tasks ({tasks.length})</h4>
                {isProvider && (
                  <Button size="sm" onClick={onAddTask} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Task
                  </Button>
                )}
              </div>
              
              {tasks.length === 0 ? (
                <p className="text-gray-500 text-sm italic">No tasks yet</p>
              ) : (
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      userRole={userRole}
                      onEdit={() => onEditTask(task)}
                      onDelete={() => onDeleteTask(task.id)}
                      onStatusChange={(status) => onTaskStatusChange(task.id, status)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Client Actions */}
            {isClient && (
              <div className="flex gap-2 pt-4 border-t">
                <Button size="sm" variant="outline">
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Comment
                </Button>
                <Button size="sm" variant="outline">
                  <ThumbsUp className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button size="sm" variant="outline">
                  <Eye className="h-4 w-4 mr-1" />
                  View Details
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

// Task Item Component
interface TaskItemProps {
  task: Task
  userRole: UserRole
  onEdit: () => void
  onDelete: () => void
  onStatusChange: (status: string) => void
}

function TaskItem({ task, userRole, onEdit, onDelete, onStatusChange }: TaskItemProps) {
  const isProvider = userRole === 'provider'
  const isClient = userRole === 'client'

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'in_progress': return <Play className="h-4 w-4 text-blue-600" />
      case 'pending': return <Clock className="h-4 w-4 text-gray-500" />
      case 'cancelled': return <XCircle className="h-4 w-4 text-red-600" />
      case 'on_hold': return <Pause className="h-4 w-4 text-yellow-600" />
      default: return <Clock className="h-4 w-4 text-gray-500" />
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

  const isOverdue = task.due_date && isBefore(new Date(task.due_date), new Date()) && task.status !== 'completed'

  return (
    <div className={`flex items-center justify-between p-3 border rounded-lg ${isOverdue ? 'border-red-200 bg-red-50' : 'bg-gray-50'}`}>
      <div className="flex items-center gap-3 flex-1">
        {getStatusIcon(task.status)}
        <div className="flex-1">
          <h5 className="font-medium text-sm">{task.title}</h5>
          {task.description && (
            <p className="text-xs text-gray-600 mt-1">{task.description}</p>
          )}
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
            {task.due_date && (
              <span>{format(new Date(task.due_date), 'MMM dd')}</span>
            )}
            {task.estimated_hours && (
              <span>{task.estimated_hours}h</span>
            )}
            {isOverdue && (
              <span className="text-red-600 font-medium">Overdue</span>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Badge className={getStatusColor(task.status)}>
          {task.status.replace('_', ' ')}
        </Badge>
        
        {isProvider && (
          <>
            <Select value={task.status} onValueChange={onStatusChange}>
              <SelectTrigger className="w-32 h-8">
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
            <Button
              size="sm"
              variant="outline"
              onClick={onEdit}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onDelete}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
        
        {isClient && (
          <div className="flex gap-1">
            <Button size="sm" variant="outline" className="h-8 w-8 p-0">
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" className="h-8 w-8 p-0">
              <ThumbsUp className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
