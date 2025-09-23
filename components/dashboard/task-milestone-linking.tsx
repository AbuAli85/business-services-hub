'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Link, 
  Unlink, 
  Plus, 
  Edit, 
  Trash2, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Play, 
  Pause,
  Target,
  Users,
  ArrowRight,
  ArrowDown,
  ArrowUp,
  GitBranch,
  GitCommit,
  Settings,
  BarChart3,
  FileText,
  Zap,
  RefreshCw,
  Search,
  Filter,
  SortAsc,
  SortDesc
} from 'lucide-react'
import { toast } from 'sonner'
import { 
  Milestone, 
  Task, 
  MilestoneDependency, 
  TaskDependency 
} from '@/types/milestone-system'

interface TaskMilestoneLinkingProps {
  bookingId: string
  milestones: Milestone[]
  tasks: Task[]
  onTaskCreated?: (task: Task) => void
  onTaskUpdated?: (task: Task) => void
  onTaskDeleted?: (taskId: string) => void
  onTaskLinked?: (taskId: string, milestoneId: string) => void
  onTaskUnlinked?: (taskId: string) => void
}

export function TaskMilestoneLinking({ 
  bookingId, 
  milestones, 
  tasks, 
  onTaskCreated,
  onTaskUpdated,
  onTaskDeleted,
  onTaskLinked,
  onTaskUnlinked
}: TaskMilestoneLinkingProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'linking' | 'dependencies'>('overview')
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [showLinkingForm, setShowLinkingForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showAllTasksByMilestone, setShowAllTasksByMilestone] = useState<Record<string, boolean>>({})

  // Task form state
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    start_date: '',
    due_date: '',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    estimated_hours: 0,
    assigned_to: '',
    risk_level: 'low' as 'low' | 'medium' | 'high' | 'critical',
    milestone_id: ''
  })

  // Linking form state
  const [linkingForm, setLinkingForm] = useState({
    task_id: '',
    milestone_id: '',
    link_type: 'direct' as 'direct' | 'dependency' | 'subtask'
  })

  useEffect(() => {
    loadData()
  }, [bookingId])

  const loadData = async () => {
    try {
      // Load tasks and milestones with relationships
      console.log('Loading task-milestone relationships...')
      // This would be implemented with actual Supabase calls
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    try {
      setIsSubmitting(true)
      
      const taskData = {
        ...taskForm,
        id: `task_${Date.now()}`,
        status: 'pending' as const,
        progress_percentage: 0,
        critical_path: false,
        created_by: 'current_user_id', // This would come from auth context
        actual_hours: 0,
        dependencies: [],
        dependents: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      console.log('Creating task:', taskData)
      toast.success('Task created successfully')
      onTaskCreated?.(taskData as Task)
      
      setShowTaskForm(false)
      setEditingTask(null)
      resetTaskForm()
    } catch (error) {
      console.error('Task creation error:', error)
      toast.error('Failed to create task')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLinkingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    try {
      setIsSubmitting(true)
      
      console.log('Linking task to milestone:', linkingForm)
      toast.success('Task linked to milestone successfully')
      onTaskLinked?.(linkingForm.task_id, linkingForm.milestone_id)
      
      setShowLinkingForm(false)
      resetLinkingForm()
    } catch (error) {
      console.error('Linking error:', error)
      toast.error('Failed to link task to milestone')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUnlinkTask = async (taskId: string) => {
    if (confirm('Are you sure you want to unlink this task from its milestone?')) {
      try {
        console.log('Unlinking task:', taskId)
        toast.success('Task unlinked successfully')
        onTaskUnlinked?.(taskId)
      } catch (error) {
        console.error('Unlinking error:', error)
        toast.error('Failed to unlink task')
      }
    }
  }

  const resetTaskForm = () => {
    setTaskForm({
      title: '',
      description: '',
      start_date: '',
      due_date: '',
      priority: 'normal',
      estimated_hours: 0,
      assigned_to: '',
      risk_level: 'low',
      milestone_id: ''
    })
  }

  const resetLinkingForm = () => {
    setLinkingForm({
      task_id: '',
      milestone_id: '',
      link_type: 'direct'
    })
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

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'critical': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Filter and sort tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter
    return matchesSearch && matchesStatus && matchesPriority
  }).sort((a, b) => {
    const aValue = a[sortBy as keyof Task]
    const bValue = b[sortBy as keyof Task]
    
    // Handle undefined values
    if (aValue === undefined && bValue === undefined) return 0
    if (aValue === undefined) return sortOrder === 'asc' ? 1 : -1
    if (bValue === undefined) return sortOrder === 'asc' ? -1 : 1
    
    if (sortOrder === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    }
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Task-Milestone Linking</h2>
          <p className="text-gray-600">Manage task relationships and milestone connections</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowLinkingForm(true)}
            variant="outline"
            size="sm"
          >
            <Link className="h-4 w-4 mr-2" />
            Link Task
          </Button>
          <Button
            onClick={() => setShowTaskForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="linking">Linking</TabsTrigger>
          <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                    <p className="text-2xl font-bold text-gray-900">{tasks.length}</p>
                  </div>
                  <Target className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Linked Tasks</p>
                    <p className="text-2xl font-bold text-green-600">
                      {tasks.filter(t => t.milestone_id).length}
                    </p>
                  </div>
                  <Link className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Unlinked Tasks</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {tasks.filter(t => !t.milestone_id).length}
                    </p>
                  </div>
                  <Unlink className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Completed</p>
                    <p className="text-2xl font-bold text-green-600">
                      {tasks.filter(t => t.status === 'completed').length}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Milestone-Task Relationships */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Milestone-Task Relationships</h3>
            {milestones.map((milestone) => (
              <Card key={milestone.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h4 className="text-lg font-semibold text-gray-900">{milestone.title}</h4>
                      <Badge className={getStatusColor(milestone.status)}>
                        {milestone.status.replace('_', ' ')}
                      </Badge>
                      {milestone.critical_path && (
                        <Badge className="bg-red-100 text-red-800">
                          Critical Path
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="h-4 w-4" />
                      {milestone.progress_percentage}% Complete
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Linked Tasks:</span>
                      <span className="font-medium">
                        {milestone.tasks?.length || 0} tasks
                      </span>
                    </div>
                    {milestone.tasks && milestone.tasks.length > 0 && (
                      <div className="space-y-2">
                        {(showAllTasksByMilestone?.[milestone.id] ? milestone.tasks : milestone.tasks.slice(0, 3)).map((task) => (
                          <div key={task.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div className="flex items-center gap-2">
                              <Badge className={`${getStatusColor(task.status)} text-xs`}>
                                {task.status.replace('_', ' ')}
                              </Badge>
                              <span className="text-sm text-gray-700">{task.title}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="h-3 w-3" />
                              {task.estimated_hours}h
                            </div>
                          </div>
                        ))}
                        {milestone.tasks.length > 3 && (
                          <button
                            type="button"
                            className="text-xs text-blue-600 hover:underline"
                            onClick={() => {
                              setShowAllTasksByMilestone((prev: Record<string, boolean> = {}) => ({
                                ...prev,
                                [milestone.id]: !prev?.[milestone.id]
                              }))
                            }}
                          >
                            {showAllTasksByMilestone?.[milestone.id]
                              ? 'Show less'
                              : `+${milestone.tasks.length - 3} more tasks`}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-6">
          {/* Filters and Search */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
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
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
            </Button>
          </div>

          {/* Tasks List */}
          <div className="space-y-4">
            {filteredTasks.map((task) => (
              <Card key={task.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                        <Badge className={getStatusColor(task.status)}>
                          {task.status.replace('_', ' ')}
                        </Badge>
                        <Badge className={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                        {task.critical_path && (
                          <Badge className="bg-red-100 text-red-800">
                            Critical Path
                          </Badge>
                        )}
                      </div>
                      <p className="text-gray-600 mb-3">{task.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDateOnly(task.start_date)} - {formatDateOnly(task.due_date)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {task.estimated_hours}h
                        </div>
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4" />
                          <span className={getRiskColor(task.risk_level)}>
                            {task.risk_level} risk
                          </span>
                        </div>
                        {task.assigned_to && (
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {task.assigned_to}
                          </div>
                        )}
                      </div>
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">Progress</span>
                          <span className="text-sm text-gray-500">{task.progress_percentage}%</span>
                        </div>
                        <Progress value={task.progress_percentage} className="h-2" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {task.milestone_id ? (
                        <Badge className="bg-green-100 text-green-800">
                          Linked
                        </Badge>
                      ) : (
                        <Badge className="bg-orange-100 text-orange-800">
                          Unlinked
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingTask(task)
                          setTaskForm({
                            title: task.title,
                            description: task.description,
                            start_date: task.start_date,
                            due_date: task.due_date,
                            priority: task.priority,
                            estimated_hours: task.estimated_hours,
                            assigned_to: task.assigned_to || '',
                            risk_level: task.risk_level,
                            milestone_id: task.milestone_id
                          })
                          setShowTaskForm(true)
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUnlinkTask(task.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Linking Tab */}
        <TabsContent value="linking" className="space-y-6">
          <div className="text-center py-8">
            <Link className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Task Linking</h3>
            <p className="text-gray-600">Link tasks to milestones and manage relationships</p>
          </div>
        </TabsContent>

        {/* Dependencies Tab */}
        <TabsContent value="dependencies" className="space-y-6">
          <div className="text-center py-8">
            <GitBranch className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Task Dependencies</h3>
            <p className="text-gray-600">Manage task-to-task dependencies and relationships</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Task Form Dialog */}
      <Dialog open={showTaskForm} onOpenChange={(open: boolean) => {
        if (!open) {
          setShowTaskForm(false)
          setEditingTask(null)
          setIsSubmitting(false)
          resetTaskForm()
        }
      }}>
        <DialogContent 
          className="max-w-2xl"
          onClose={() => {
            setShowTaskForm(false)
            setEditingTask(null)
            setIsSubmitting(false)
            resetTaskForm()
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {editingTask ? 'Edit Task' : 'Create New Task'}
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
                <label className="block text-sm font-medium mb-2">Start Date</label>
                <Input
                  type="date"
                  value={taskForm.start_date}
                  onChange={(e) => setTaskForm({...taskForm, start_date: e.target.value})}
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
                  value={taskForm.assigned_to}
                  onChange={(e) => setTaskForm({...taskForm, assigned_to: e.target.value})}
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Milestone</label>
                <Select
                  value={taskForm.milestone_id}
                  onValueChange={(value) => setTaskForm({...taskForm, milestone_id: value})}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select milestone" />
                  </SelectTrigger>
                  <SelectContent>
                    {milestones.map((milestone) => (
                      <SelectItem key={milestone.id} value={milestone.id}>
                        {milestone.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Risk Level</label>
                <Select
                  value={taskForm.risk_level}
                  onValueChange={(value) => setTaskForm({...taskForm, risk_level: value as any})}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue />
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
                  setShowTaskForm(false)
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
                {isSubmitting ? 'Saving...' : (editingTask ? 'Update' : 'Create') + ' Task'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Linking Form Dialog */}
      <Dialog open={showLinkingForm} onOpenChange={(open: boolean) => {
        if (!open) {
          setShowLinkingForm(false)
          setIsSubmitting(false)
          resetLinkingForm()
        }
      }}>
        <DialogContent 
          className="max-w-2xl"
          onClose={() => {
            setShowLinkingForm(false)
            setIsSubmitting(false)
            resetLinkingForm()
          }}
        >
          <DialogHeader>
            <DialogTitle>Link Task to Milestone</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLinkingSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Task *</label>
                <Select
                  value={linkingForm.task_id}
                  onValueChange={(value) => setLinkingForm({...linkingForm, task_id: value})}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select task" />
                  </SelectTrigger>
                  <SelectContent>
                    {tasks.filter(task => !task.milestone_id).map((task) => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Milestone *</label>
                <Select
                  value={linkingForm.milestone_id}
                  onValueChange={(value) => setLinkingForm({...linkingForm, milestone_id: value})}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select milestone" />
                  </SelectTrigger>
                  <SelectContent>
                    {milestones.map((milestone) => (
                      <SelectItem key={milestone.id} value={milestone.id}>
                        {milestone.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Link Type</label>
              <Select
                value={linkingForm.link_type}
                onValueChange={(value) => setLinkingForm({...linkingForm, link_type: value as any})}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">Direct Link</SelectItem>
                  <SelectItem value="dependency">Dependency Link</SelectItem>
                  <SelectItem value="subtask">Subtask Link</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowLinkingForm(false)
                  setIsSubmitting(false)
                  resetLinkingForm()
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
                {isSubmitting ? 'Linking...' : 'Link Task'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
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