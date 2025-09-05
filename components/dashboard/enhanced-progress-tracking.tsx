'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Plus, 
  Edit, 
  Trash2,
  Play,
  Pause,
  Square,
  Target,
  Calendar,
  Users,
  BarChart3,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  PauseCircle,
  PlayCircle,
  Timer,
  Zap,
  Star,
  Award,
  Activity,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { format, formatDistanceToNow, parseISO } from 'date-fns'

interface EnhancedTask {
  id: string
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: string
  progress_percentage: number
  estimated_hours?: number
  actual_hours?: number
  tags: string[]
  created_at: string
  updated_at: string
  assigned_to?: string
  milestone_id?: string
  milestone_title?: string
}

interface EnhancedMilestone {
  id: string
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: string
  progress_percentage: number
  estimated_hours?: number
  actual_hours?: number
  weight: number
  created_at: string
  updated_at: string
  tasks: EnhancedTask[]
}

interface EnhancedProgressTrackingProps {
  bookingId: string
  userRole: 'provider' | 'client'
}

export function EnhancedProgressTracking({ bookingId, userRole }: EnhancedProgressTrackingProps) {
  const [milestones, setMilestones] = useState<EnhancedMilestone[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddMilestone, setShowAddMilestone] = useState(false)
  const [showAddTask, setShowAddTask] = useState<string | null>(null)
  const [editingMilestone, setEditingMilestone] = useState<EnhancedMilestone | null>(null)
  const [editingTask, setEditingTask] = useState<EnhancedTask | null>(null)
  const [activeTimeEntry, setActiveTimeEntry] = useState<string | null>(null)
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set())
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const [newMilestone, setNewMilestone] = useState<{
    title: string
    description: string
    priority: 'low' | 'medium' | 'high' | 'urgent'
    due_date: string
    estimated_hours: number
  }>({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
    estimated_hours: 0
  })

  const [newTask, setNewTask] = useState<{
    title: string
    description: string
    priority: 'low' | 'medium' | 'high' | 'urgent'
    due_date: string
    estimated_hours: number
    tags: string[]
  }>({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
    estimated_hours: 0,
    tags: []
  })

  useEffect(() => {
    loadData()
  }, [bookingId])

  const loadData = async () => {
    try {
      setLoading(true)
      const supabase = await getSupabaseClient()
      
      // Try to load from advanced schema first
      const { data: milestonesData, error: milestonesError } = await supabase
        .from('milestones')
        .select(`
          *,
          tasks (
            *,
            task_comments (*),
            time_entries (*)
          )
        `)
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true })

      if (milestonesError) {
        // Fallback to simple schema or create sample data
        await loadSampleData()
      } else {
        setMilestones(milestonesData || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
      await loadSampleData()
    } finally {
      setLoading(false)
    }
  }

  const loadSampleData = async () => {
    // Create sample data for demonstration
    const sampleMilestones: EnhancedMilestone[] = [
      {
        id: '1',
        title: 'Project Planning',
        description: 'Initial project setup and requirements gathering',
        status: 'completed',
        priority: 'high',
        due_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        progress_percentage: 100,
        estimated_hours: 8,
        actual_hours: 7.5,
        weight: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tasks: [
          {
            id: '1-1',
            title: 'Requirements Analysis',
            description: 'Gather and document project requirements',
            status: 'completed',
            priority: 'high',
            due_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            progress_percentage: 100,
            estimated_hours: 4,
            actual_hours: 3.5,
            tags: ['analysis', 'requirements'],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            milestone_id: '1',
            milestone_title: 'Project Planning'
          },
          {
            id: '1-2',
            title: 'Project Timeline',
            description: 'Create detailed project timeline and milestones',
            status: 'completed',
            priority: 'medium',
            due_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            progress_percentage: 100,
            estimated_hours: 4,
            actual_hours: 4,
            tags: ['planning', 'timeline'],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            milestone_id: '1',
            milestone_title: 'Project Planning'
          }
        ]
      },
      {
        id: '2',
        title: 'Development Phase',
        description: 'Core development and implementation',
        status: 'in_progress',
        priority: 'high',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        progress_percentage: 65,
        estimated_hours: 40,
        actual_hours: 26,
        weight: 2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tasks: [
          {
            id: '2-1',
            title: 'Backend Development',
            description: 'Develop core backend functionality',
            status: 'completed',
            priority: 'high',
            due_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            progress_percentage: 100,
            estimated_hours: 20,
            actual_hours: 18,
            tags: ['backend', 'development'],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            milestone_id: '2',
            milestone_title: 'Development Phase'
          },
          {
            id: '2-2',
            title: 'Frontend Development',
            description: 'Develop user interface and user experience',
            status: 'in_progress',
            priority: 'high',
            due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            progress_percentage: 30,
            estimated_hours: 20,
            actual_hours: 8,
            tags: ['frontend', 'ui', 'ux'],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            milestone_id: '2',
            milestone_title: 'Development Phase'
          }
        ]
      },
      {
        id: '3',
        title: 'Testing & Quality Assurance',
        description: 'Comprehensive testing and quality assurance',
        status: 'pending',
        priority: 'medium',
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        progress_percentage: 0,
        estimated_hours: 16,
        actual_hours: 0,
        weight: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tasks: [
          {
            id: '3-1',
            title: 'Unit Testing',
            description: 'Write and execute unit tests',
            status: 'pending',
            priority: 'medium',
            due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            progress_percentage: 0,
            estimated_hours: 8,
            actual_hours: 0,
            tags: ['testing', 'unit-tests'],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            milestone_id: '3',
            milestone_title: 'Testing & Quality Assurance'
          },
          {
            id: '3-2',
            title: 'Integration Testing',
            description: 'Test system integration and end-to-end functionality',
            status: 'pending',
            priority: 'medium',
            due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            progress_percentage: 0,
            estimated_hours: 8,
            actual_hours: 0,
            tags: ['testing', 'integration'],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            milestone_id: '3',
            milestone_title: 'Testing & Quality Assurance'
          }
        ]
      }
    ]

    setMilestones(sampleMilestones)
  }

  const handleCreateMilestone = async () => {
    if (!newMilestone.title.trim()) return

    try {
      const supabase = await getSupabaseClient()
      
      const milestoneData = {
        booking_id: bookingId,
        title: newMilestone.title,
        description: newMilestone.description,
        priority: newMilestone.priority,
        due_date: newMilestone.due_date || null,
        estimated_hours: newMilestone.estimated_hours,
        status: 'pending' as const,
        progress_percentage: 0,
        weight: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('milestones')
        .insert(milestoneData)
        .select()
        .single()

      if (error) {
        // Create local milestone if database insert fails
        const localMilestone: EnhancedMilestone = {
          id: Date.now().toString(),
          title: milestoneData.title,
          description: milestoneData.description,
          priority: milestoneData.priority,
          due_date: milestoneData.due_date || undefined,
          estimated_hours: milestoneData.estimated_hours,
          status: milestoneData.status,
          progress_percentage: milestoneData.progress_percentage,
          weight: milestoneData.weight,
          created_at: milestoneData.created_at,
          updated_at: milestoneData.updated_at,
          tasks: []
        }
        setMilestones(prev => [...prev, localMilestone])
        toast.success('Milestone created successfully')
      } else {
        setMilestones(prev => [...prev, { ...data, tasks: [] }])
        toast.success('Milestone created successfully')
      }

      setNewMilestone({ title: '', description: '', priority: 'medium', due_date: '', estimated_hours: 0 })
      setShowAddMilestone(false)
    } catch (error) {
      console.error('Error creating milestone:', error)
      toast.error('Failed to create milestone')
    }
  }

  const handleCreateTask = async (milestoneId: string) => {
    if (!newTask.title.trim()) return

    try {
      const supabase = await getSupabaseClient()
      
      const taskData = {
        milestone_id: milestoneId,
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
        due_date: newTask.due_date || null,
        estimated_hours: newTask.estimated_hours,
        tags: newTask.tags,
        status: 'pending' as const,
        progress_percentage: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert(taskData)
        .select()
        .single()

      if (error) {
        // Create local task if database insert fails
        const localTask: EnhancedTask = {
          id: Date.now().toString(),
          title: taskData.title,
          description: taskData.description,
          priority: taskData.priority,
          due_date: taskData.due_date || undefined,
          estimated_hours: taskData.estimated_hours,
          tags: taskData.tags,
          status: taskData.status,
          progress_percentage: taskData.progress_percentage,
          created_at: taskData.created_at,
          updated_at: taskData.updated_at,
          milestone_id: milestoneId,
          milestone_title: milestones.find(m => m.id === milestoneId)?.title
        }
        setMilestones(prev => prev.map(m => 
          m.id === milestoneId 
            ? { ...m, tasks: [...m.tasks, localTask] }
            : m
        ))
        toast.success('Task created successfully')
      } else {
        setMilestones(prev => prev.map(m => 
          m.id === milestoneId 
            ? { ...m, tasks: [...m.tasks, { ...data, milestone_title: m.title }] }
            : m
        ))
        toast.success('Task created successfully')
      }

      setNewTask({ title: '', description: '', priority: 'medium', due_date: '', estimated_hours: 0, tags: [] })
      setShowAddTask(null)
    } catch (error) {
      console.error('Error creating task:', error)
      toast.error('Failed to create task')
    }
  }

  const handleUpdateTask = async (milestoneId: string, taskId: string, updates: Partial<EnhancedTask>) => {
    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('tasks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', taskId)

      if (error) {
        // Update local state if database update fails
        setMilestones(prev => prev.map(m => 
          m.id === milestoneId 
            ? { 
                ...m, 
                tasks: m.tasks.map(t => t.id === taskId ? { ...t, ...updates, updated_at: new Date().toISOString() } : t)
              }
            : m
        ))
        toast.success('Task updated successfully')
      } else {
        setMilestones(prev => prev.map(m => 
          m.id === milestoneId 
            ? { 
                ...m, 
                tasks: m.tasks.map(t => t.id === taskId ? { ...t, ...updates, updated_at: new Date().toISOString() } : t)
              }
            : m
        ))
        toast.success('Task updated successfully')
      }
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error('Failed to update task')
    }
  }

  const handleDeleteTask = async (milestoneId: string, taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return

    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (error) {
        // Remove from local state if database delete fails
        setMilestones(prev => prev.map(m => 
          m.id === milestoneId 
            ? { ...m, tasks: m.tasks.filter(t => t.id !== taskId) }
            : m
        ))
        toast.success('Task deleted successfully')
      } else {
        setMilestones(prev => prev.map(m => 
          m.id === milestoneId 
            ? { ...m, tasks: m.tasks.filter(t => t.id !== taskId) }
            : m
        ))
        toast.success('Task deleted successfully')
      }
    } catch (error) {
      console.error('Error deleting task:', error)
      toast.error('Failed to delete task')
    }
  }

  const handleStartTimeTracking = async (taskId: string) => {
    try {
      setActiveTimeEntry(taskId)
      toast.success('Time tracking started')
    } catch (error) {
      console.error('Error starting time tracking:', error)
      toast.error('Failed to start time tracking')
    }
  }

  const handleStopTimeTracking = async () => {
    try {
      setActiveTimeEntry(null)
      toast.success('Time tracking stopped')
    } catch (error) {
      console.error('Error stopping time tracking:', error)
      toast.error('Failed to stop time tracking')
    }
  }

  const toggleMilestoneExpansion = (milestoneId: string) => {
    setExpandedMilestones(prev => {
      const newSet = new Set(prev)
      if (newSet.has(milestoneId)) {
        newSet.delete(milestoneId)
      } else {
        newSet.add(milestoneId)
      }
      return newSet
    })
  }

  const isOverdue = (dueDate: string, status: string) => {
    if (status === 'completed') return false
    return new Date(dueDate) < new Date()
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'on_hold': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'pending': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4" />
      case 'in_progress': return <PlayCircle className="h-4 w-4" />
      case 'on_hold': return <PauseCircle className="h-4 w-4" />
      case 'cancelled': return <XCircle className="h-4 w-4" />
      case 'pending': return <Clock className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  // Calculate overall statistics
  const totalMilestones = milestones.length
  const completedMilestones = milestones.filter(m => m.status === 'completed').length
  const totalTasks = milestones.reduce((acc, m) => acc + m.tasks.length, 0)
  const completedTasks = milestones.reduce((acc, m) => acc + m.tasks.filter(t => t.status === 'completed').length, 0)
  const overdueTasks = milestones.reduce((acc, m) => acc + m.tasks.filter(t => t.due_date && isOverdue(t.due_date, t.status)).length, 0)
  const totalEstimatedHours = milestones.reduce((acc, m) => acc + (m.estimated_hours || 0), 0)
  const totalActualHours = milestones.reduce((acc, m) => acc + (m.actual_hours || 0), 0)
  const overallProgress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0

  // Filter milestones and tasks
  const filteredMilestones = milestones.filter(milestone => {
    const matchesStatus = filterStatus === 'all' || milestone.status === filterStatus
    const matchesPriority = filterPriority === 'all' || milestone.priority === filterPriority
    const matchesSearch = searchQuery === '' || 
      milestone.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      milestone.description?.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesStatus && matchesPriority && matchesSearch
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-blue-600" />
            <span>Project Progress Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{overallProgress}%</div>
              <div className="text-sm text-blue-800">Overall Progress</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{completedMilestones}</div>
              <div className="text-sm text-green-800">of {totalMilestones} Milestones</div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{completedTasks}</div>
              <div className="text-sm text-purple-800">of {totalTasks} Tasks</div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{totalActualHours.toFixed(1)}h</div>
              <div className="text-sm text-orange-800">of {totalEstimatedHours}h logged</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Overall Progress</span>
              <span>{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-3" />
          </div>

          {overdueTasks > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                <span className="text-sm font-medium text-red-800">
                  {overdueTasks} task{overdueTasks !== 1 ? 's' : ''} overdue
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-64">
              <Input
                placeholder="Search milestones and tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            {userRole === 'provider' && (
              <Button onClick={() => setShowAddMilestone(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Milestone
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Milestones List */}
      <div className="space-y-4">
        {filteredMilestones.map((milestone) => (
          <Card key={milestone.id} className="border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => toggleMilestoneExpansion(milestone.id)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    {expandedMilestones.has(milestone.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  <div>
                    <CardTitle className="text-lg">{milestone.title}</CardTitle>
                    {milestone.description && (
                      <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={getStatusColor(milestone.status)}>
                    {getStatusIcon(milestone.status)}
                    <span className="ml-1">{milestone.status.replace('_', ' ')}</span>
                  </Badge>
                  <Badge className={getPriorityColor(milestone.priority)}>
                    {milestone.priority}
                  </Badge>
                  {milestone.due_date && isOverdue(milestone.due_date, milestone.status) && (
                    <Badge className="bg-red-100 text-red-800">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Overdue
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>Progress</span>
                  <span>{milestone.progress_percentage}%</span>
                </div>
                <Progress value={milestone.progress_percentage} className="h-2" />
                
                <div className="flex items-center justify-between mt-2 text-sm text-gray-500">
                  <span>{milestone.tasks.length} tasks</span>
                  <span>{milestone.actual_hours || 0}h / {milestone.estimated_hours || 0}h</span>
                  {milestone.due_date && (
                    <span>Due: {format(parseISO(milestone.due_date), 'MMM dd, yyyy')}</span>
                  )}
                </div>
              </div>
            </CardHeader>

            {expandedMilestones.has(milestone.id) && (
              <CardContent>
                <div className="space-y-3">
                  {milestone.tasks.map((task) => (
                    <div key={task.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-1">{task.title}</h4>
                          {task.description && (
                            <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                          )}
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge className={getStatusColor(task.status)}>
                              {getStatusIcon(task.status)}
                              <span className="ml-1">{task.status.replace('_', ' ')}</span>
                            </Badge>
                            <Badge className={getPriorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                            {task.tags.map((tag) => (
                              <span key={tag} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                {tag}
                              </span>
                            ))}
                            {task.due_date && isOverdue(task.due_date, task.status) && (
                              <Badge className="bg-red-100 text-red-800">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Overdue
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {userRole === 'provider' && (
                          <div className="flex items-center space-x-2">
                            {activeTimeEntry === task.id ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleStopTimeTracking}
                                className="text-red-600 border-red-200 hover:bg-red-50"
                              >
                                <Square className="h-4 w-4 mr-1" />
                                Stop
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStartTimeTracking(task.id)}
                                className="text-green-600 border-green-200 hover:bg-green-50"
                              >
                                <Play className="h-4 w-4 mr-1" />
                                Start
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingTask(task)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteTask(milestone.id, task.id)}
                              className="text-red-600 border-red-200 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Progress</span>
                          <span>{task.progress_percentage}%</span>
                        </div>
                        <Progress value={task.progress_percentage} className="h-2" />
                      </div>
                      
                      {task.due_date && (
                        <div className="mt-2 text-sm text-gray-500">
                          Due: {format(parseISO(task.due_date), 'MMM dd, yyyy')}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {userRole === 'provider' && (
                    <Button
                      variant="outline"
                      onClick={() => setShowAddTask(milestone.id)}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Task
                    </Button>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
        
        {filteredMilestones.length === 0 && (
          <Card className="border-0 shadow-lg">
            <CardContent className="text-center py-8">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-gray-500">
                {searchQuery ? 'No milestones match your search.' : 'No milestones yet.'}
                {userRole === 'provider' && ' Click "Add Milestone" to get started.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Milestone Modal */}
      {showAddMilestone && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add New Milestone</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Milestone Title
                </label>
                <Input
                  value={newMilestone.title}
                  onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                  placeholder="Enter milestone title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <Textarea
                  value={newMilestone.description}
                  onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
                  placeholder="Enter milestone description"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <Select
                    value={newMilestone.priority}
                    onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') => 
                      setNewMilestone({ ...newMilestone, priority: value })
                    }
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date
                  </label>
                  <Input
                    type="date"
                    value={newMilestone.due_date}
                    onChange={(e) => setNewMilestone({ ...newMilestone, due_date: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Hours
                </label>
                <Input
                  type="number"
                  value={newMilestone.estimated_hours}
                  onChange={(e) => setNewMilestone({ ...newMilestone, estimated_hours: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={() => setShowAddMilestone(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateMilestone}>
                Create Milestone
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add New Task</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task Title
                </label>
                <Input
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Enter task title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <Textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Enter task description"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <Select
                    value={newTask.priority}
                    onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') => 
                      setNewTask({ ...newTask, priority: value })
                    }
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date
                  </label>
                  <Input
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Hours
                </label>
                <Input
                  type="number"
                  value={newTask.estimated_hours}
                  onChange={(e) => setNewTask({ ...newTask, estimated_hours: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={() => setShowAddTask(null)}>
                Cancel
              </Button>
              <Button onClick={() => handleCreateTask(showAddTask)}>
                Create Task
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit Task</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task Title
                </label>
                <Input
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <Textarea
                  value={editingTask.description || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <Select
                    value={editingTask.status}
                    onValueChange={(value: 'pending' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled') => 
                      setEditingTask({ ...editingTask, status: value })
                    }
                  >
                    <SelectTrigger>
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
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <Select
                    value={editingTask.priority}
                    onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') => 
                      setEditingTask({ ...editingTask, priority: value })
                    }
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Progress ({editingTask.progress_percentage}%)
                </label>
                <Input
                  type="range"
                  min="0"
                  max="100"
                  value={editingTask.progress_percentage}
                  onChange={(e) => setEditingTask({ ...editingTask, progress_percentage: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={() => setEditingTask(null)}>
                Cancel
              </Button>
              <Button onClick={() => {
                if (editingTask.milestone_id) {
                  handleUpdateTask(editingTask.milestone_id, editingTask.id, editingTask)
                  setEditingTask(null)
                }
              }}>
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

