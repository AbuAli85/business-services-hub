'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  AlertTriangle,
  Target,
  Calendar,
  User,
  Settings,
  Save,
  X
} from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import { toast } from 'react-hot-toast'

interface Service {
  id: string
  name: string
  description: string
}

interface Milestone {
  id: string
  title: string
  description: string
  progress_percentage: number
  status: string
  due_date?: string
  weight: number
  order_index: number
  editable: boolean
  tasks: Task[]
}

interface Task {
  id: string
  title: string
  status: string
  progress_percentage: number
  due_date?: string
  editable: boolean
}

interface ServiceMilestoneManagerProps {
  bookingId: string
  serviceTypeId?: string
  canEdit: boolean
  onMilestoneUpdate?: () => void
}

export default function ServiceMilestoneManager({ 
  bookingId, 
  serviceTypeId, 
  canEdit, 
  onMilestoneUpdate 
}: ServiceMilestoneManagerProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [service, setService] = useState<Service | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>('')
  const [isAddingMilestone, setIsAddingMilestone] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [newMilestone, setNewMilestone] = useState({
    title: '',
    description: '',
    due_date: '',
    weight: 1
  })

  useEffect(() => {
    if (bookingId) {
      // Reset all dialog states to false/closed
      console.log('ServiceMilestoneManager: Resetting dialog states for bookingId:', bookingId)
      setIsAddingTask(false)
      setIsAddingMilestone(false)
      setEditingMilestone(null)
      setEditingTask(null)
      setIsDialogOpen(false)
      setNewTaskTitle('')
      setSelectedMilestoneId('')
      setNewMilestone({
        title: '',
        description: '',
        due_date: '',
        weight: 1
      })
      loadServiceAndMilestones()
    }
  }, [bookingId])

  // Debug logging for modal states
  useEffect(() => {
    console.log('ServiceMilestoneManager: Modal states:', {
      isAddingMilestone,
      isAddingTask,
      editingMilestone: !!editingMilestone,
      editingTask: !!editingTask,
      milestonesLength: milestones.length,
      bookingId
    })
  }, [isAddingMilestone, isAddingTask, editingMilestone, editingTask, milestones.length, bookingId])

  const loadServiceAndMilestones = async () => {
    try {
      const supabase = await getSupabaseClient()
      
      // Check if service_types table exists first
      const { data: tableCheck, error: tableError } = await supabase
        .from('service_types')
        .select('id')
        .limit(1)
      
      if (tableError) {
        console.warn('Service types table not available yet:', tableError.message)
        setLoading(false)
        return
      }
      
      // Load service type information
      if (serviceTypeId) {
        const { data: serviceData, error: serviceError } = await supabase
          .from('service_types')
          .select('id, name, description')
          .eq('id', serviceTypeId)
          .single()
        
        if (serviceError) {
          console.warn('Error loading service:', serviceError)
        } else {
          setService(serviceData)
        }
      }

      // Load milestones with tasks
      const { data: milestonesData, error: milestonesError } = await supabase
        .from('milestones')
        .select(`
          id,
          title,
          description,
          progress_percentage,
          status,
          due_date,
          weight,
          order_index,
          editable,
          tasks (
            id,
            title,
            status,
            progress_percentage,
            due_date,
            editable
          )
        `)
        .eq('booking_id', bookingId)
        .order('order_index', { ascending: true })

      if (milestonesError) {
        console.error('Error loading milestones:', milestonesError)
        toast.error('Failed to load milestones')
        return
      }

      setMilestones(milestonesData || [])
    } catch (error) {
      console.error('Error loading service and milestones:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleTaskToggle = async (taskId: string, newStatus: string) => {
    try {
      const supabase = await getSupabaseClient()

      // Use the RPC function to update task status - this automatically updates progress
      const { error } = await supabase.rpc('update_task', {
        task_uuid_param: taskId,
        task_status: newStatus
      })

      if (error) {
        throw new Error(error.message)
      }

      await loadServiceAndMilestones()
      onMilestoneUpdate?.()
      toast.success('Task updated successfully')
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error('Failed to update task')
    }
  }

  const handleAddTask = async (milestoneId: string) => {
    if (!newTaskTitle.trim()) {
      toast.error('Please enter a task title')
      return
    }

    try {
      const supabase = await getSupabaseClient()

      const { data, error } = await supabase.rpc('add_task', {
        milestone_uuid_param: milestoneId,
        task_title: newTaskTitle.trim(),
        task_due_date: null
      })

      if (error) {
        throw new Error(error.message)
      }

      setNewTaskTitle('')
      setIsAddingTask(false)
      await loadServiceAndMilestones()
      onMilestoneUpdate?.()
      toast.success('Task added successfully')
    } catch (error) {
      console.error('Error adding task:', error)
      toast.error('Failed to add task')
    }
  }

  // Update task
  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const supabase = await getSupabaseClient()

      const { error } = await supabase.rpc('update_task', {
        task_uuid_param: taskId,
        task_title: updates.title,
        task_status: updates.status,
        task_due_date: updates.due_date
      })

      if (error) {
        throw new Error(error.message)
      }

      setEditingTask(null)
      await loadServiceAndMilestones()
      onMilestoneUpdate?.()
      toast.success('Task updated successfully')
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error('Failed to update task')
    }
  }

  // Delete task
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) {
      return
    }

    try {
      const supabase = await getSupabaseClient()

      const { error } = await supabase.rpc('delete_task', {
        task_uuid_param: taskId
      })

      if (error) {
        throw new Error(error.message)
      }

      await loadServiceAndMilestones()
      onMilestoneUpdate?.()
      toast.success('Task deleted successfully')
    } catch (error) {
      console.error('Error deleting task:', error)
      toast.error('Failed to delete task')
    }
  }

  // Add new milestone
  const handleAddMilestone = async () => {
    try {
      const supabase = await getSupabaseClient()

      const { data, error } = await supabase.rpc('add_milestone', {
        booking_uuid_param: bookingId,
        milestone_title: newMilestone.title.trim(),
        milestone_description: newMilestone.description.trim(),
        milestone_due_date: newMilestone.due_date || null,
        milestone_weight: newMilestone.weight
      })

      if (error) {
        throw new Error(error.message)
      }

      setNewMilestone({ title: '', description: '', due_date: '', weight: 1 })
      setIsAddingMilestone(false)
      await loadServiceAndMilestones()
      onMilestoneUpdate?.()
      toast.success('Milestone added successfully')
    } catch (error) {
      console.error('Error adding milestone:', error)
      toast.error('Failed to add milestone')
    }
  }

  // Update milestone
  const handleMilestoneEdit = async (milestoneId: string, updates: Partial<Milestone>) => {
    try {
      const supabase = await getSupabaseClient()

      const { error } = await supabase.rpc('update_milestone', {
        milestone_uuid_param: milestoneId,
        milestone_title: updates.title,
        milestone_description: updates.description,
        milestone_due_date: updates.due_date,
        milestone_status: updates.status
      })

      if (error) {
        throw new Error(error.message)
      }

      setEditingMilestone(null)
      await loadServiceAndMilestones()
      onMilestoneUpdate?.()
      toast.success('Milestone updated successfully')
    } catch (error) {
      console.error('Error updating milestone:', error)
      toast.error('Failed to update milestone')
    }
  }

  // Delete milestone
  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!confirm('Are you sure you want to delete this milestone? This will also delete all associated tasks.')) {
      return
    }

    try {
      const supabase = await getSupabaseClient()

      const { error } = await supabase.rpc('delete_milestone', {
        milestone_uuid_param: milestoneId
      })

      if (error) {
        throw new Error(error.message)
      }

      await loadServiceAndMilestones()
      onMilestoneUpdate?.()
      toast.success('Milestone deleted successfully')
    } catch (error) {
      console.error('Error deleting milestone:', error)
      toast.error('Failed to delete milestone')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show message if database tables aren't ready yet
  if (milestones.length === 0 && !service) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Setting Up Progress Tracking</h3>
          <p className="text-gray-500 mb-4">
            The flexible milestone system is being configured. This will be ready shortly.
          </p>
          <p className="text-sm text-gray-400">
            Milestones will be automatically generated based on the service type once setup is complete.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Service Information */}
      {service && (
        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{service.name}</h3>
                <p className="text-gray-600 text-sm">{service.description}</p>
              </div>
              <Badge variant="outline" className="text-blue-600 border-blue-300">
                Service Type
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Milestones */}
      <div className="space-y-4">
        {/* Add Milestone Button */}
        {canEdit && (
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Milestones</h3>
            <Button
              onClick={() => setIsAddingMilestone(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Milestone
            </Button>
          </div>
        )}
        
        {milestones.map((milestone, index) => (
          <Card key={milestone.id} className="border border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full ${
                    milestone.status === 'completed' ? 'bg-green-500' :
                    milestone.status === 'in_progress' ? 'bg-yellow-500' : 'bg-gray-300'
                  }`} />
                  <div>
                    <h4 className="font-medium text-gray-900">{milestone.title}</h4>
                    {milestone.description && (
                      <p className="text-sm text-gray-500">{milestone.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-sm">
                    {milestone.progress_percentage}%
                  </Badge>
                  {milestone.due_date && new Date(milestone.due_date) < new Date() && milestone.status !== 'completed' && (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                  {canEdit && milestone.editable && (
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingMilestone(milestone)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteMilestone(milestone.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {/* Tasks */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-medium text-gray-700">Tasks</h5>
                  {canEdit && milestones.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsAddingTask(true)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Task
                    </Button>
                  )}
                </div>
                
                <div className="space-y-1">
                  {milestone.tasks.map((task) => (
                    <div key={task.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                      <input
                        type="checkbox"
                        checked={task.status === 'completed'}
                        onChange={(e) => handleTaskToggle(
                          task.id,
                          e.target.checked ? 'completed' : 'pending'
                        )}
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        disabled={!canEdit || !task.editable}
                      />
                      <span className={`text-sm flex-1 ${
                        task.status === 'completed'
                          ? 'line-through text-gray-500'
                          : 'text-gray-700'
                      }`}>
                        {task.title}
                      </span>
                      <div className="flex items-center space-x-1">
                        {task.status === 'completed' && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        {canEdit && task.editable && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingTask(task)}
                              className="h-6 w-6 p-0"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTask(task.id)}
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {milestone.tasks.length === 0 && (
                    <p className="text-sm text-gray-500 italic">No tasks yet</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {milestones.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Milestones Yet</h3>
              <p className="text-gray-500">
                Milestones will be automatically generated based on the service type.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Milestone Dialog - Only render when needed */}
      {isAddingMilestone && (
        <Dialog open={isAddingMilestone} onOpenChange={setIsAddingMilestone}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Target className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold text-gray-900">Add New Milestone</DialogTitle>
                <DialogDescription className="text-sm text-gray-500 mt-1">
                  Create a new milestone to track project progress
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Milestone Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center">
                <Target className="h-4 w-4 mr-2 text-gray-500" />
                Milestone Title *
              </label>
              <Input
                placeholder="Enter milestone title (e.g., Phase 1: Planning)"
                value={newMilestone.title}
                onChange={(e) => setNewMilestone(prev => ({ ...prev, title: e.target.value }))}
                className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
              {!newMilestone.title && (
                <p className="text-xs text-red-500">Title is required</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center">
                <Settings className="h-4 w-4 mr-2 text-gray-500" />
                Description
              </label>
              <Textarea
                placeholder="Describe what this milestone involves (optional)"
                value={newMilestone.description}
                onChange={(e) => setNewMilestone(prev => ({ ...prev, description: e.target.value }))}
                className="min-h-[80px] border-gray-300 focus:border-blue-500 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Due Date and Weight */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                  Due Date
                </label>
                <Input
                  type="datetime-local"
                  value={newMilestone.due_date}
                  onChange={(e) => setNewMilestone(prev => ({ ...prev, due_date: e.target.value }))}
                  className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center">
                  <Target className="h-4 w-4 mr-2 text-gray-500" />
                  Weight
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={newMilestone.weight}
                    onChange={(e) => setNewMilestone(prev => ({ ...prev, weight: parseFloat(e.target.value) || 1 }))}
                    className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 pr-8"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <span className="text-gray-500 text-sm">x</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500">Higher weight = more important milestone</p>
              </div>
            </div>

            {/* Preview */}
            {newMilestone.title && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Preview</h4>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <Target className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900">{newMilestone.title}</h5>
                    {newMilestone.description && (
                      <p className="text-sm text-gray-600 mt-1">{newMilestone.description}</p>
                    )}
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      {newMilestone.due_date && (
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(newMilestone.due_date).toLocaleDateString()}
                        </span>
                      )}
                      <span className="flex items-center">
                        <Target className="h-3 w-3 mr-1" />
                        Weight: {newMilestone.weight}x
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button 
              variant="outline" 
              onClick={() => setIsAddingMilestone(false)}
              className="px-6"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddMilestone}
              disabled={!newMilestone.title.trim()}
              className="px-6 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Milestone
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      )}

      {/* Add Task Dialog - Only show if there are milestones and isAddingTask is true */}
      {milestones.length > 0 && isAddingTask && (
        <Dialog open={isAddingTask} onOpenChange={(open: boolean) => {
          console.log('Add Task Dialog onOpenChange:', open, 'milestones.length:', milestones.length, 'isAddingTask:', isAddingTask)
          setIsAddingTask(open)
        }}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-semibold text-gray-900">Add New Task</DialogTitle>
                  <DialogDescription className="text-sm text-gray-500 mt-1">
                    Add a new task to track progress
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Task Title */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 text-gray-500" />
                  Task Title *
                </label>
                <Input
                  placeholder="Enter task title (e.g., Review requirements)"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="h-11 border-gray-300 focus:border-green-500 focus:ring-green-500"
                />
                {!newTaskTitle && (
                  <p className="text-xs text-red-500">Task title is required</p>
                )}
              </div>

              {/* Milestone Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center">
                  <Target className="h-4 w-4 mr-2 text-gray-500" />
                  Add to Milestone
                </label>
                <Select value={selectedMilestoneId} onValueChange={setSelectedMilestoneId}>
                  <SelectTrigger className="h-11 border-gray-300 focus:border-green-500 focus:ring-green-500">
                    <SelectValue placeholder="Select a milestone" />
                  </SelectTrigger>
                  <SelectContent>
                    {milestones.map((milestone) => (
                      <SelectItem key={milestone.id} value={milestone.id}>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span>{milestone.title}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Preview */}
              {newTaskTitle && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Preview</h4>
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 border-2 border-gray-300 rounded flex items-center justify-center">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">{newTaskTitle}</h5>
                      <p className="text-sm text-gray-500 mt-1">
                        Will be added to: {milestones.find(m => m.id === selectedMilestoneId)?.title || 'Selected milestone'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button 
                variant="outline" 
                onClick={() => setIsAddingTask(false)}
                className="px-6"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => handleAddTask(selectedMilestoneId || milestones[0]?.id || '')}
                disabled={!newTaskTitle.trim()}
                className="px-6 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Milestone Dialog */}
      {editingMilestone && (
        <Dialog open={!!editingMilestone} onOpenChange={() => setEditingMilestone(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Edit className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold text-gray-900">Edit Milestone</DialogTitle>
                <DialogDescription className="text-sm text-gray-500 mt-1">
                  Update milestone details and settings
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          {editingMilestone && (
            <div className="space-y-6 py-4">
              {/* Milestone Title */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center">
                  <Target className="h-4 w-4 mr-2 text-gray-500" />
                  Milestone Title *
                </label>
                <Input
                  placeholder="Enter milestone title"
                  value={editingMilestone.title}
                  onChange={(e) => setEditingMilestone({
                    ...editingMilestone,
                    title: e.target.value
                  })}
                  className="h-11 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center">
                  <Settings className="h-4 w-4 mr-2 text-gray-500" />
                  Description
                </label>
                <Textarea
                  placeholder="Describe what this milestone involves"
                  value={editingMilestone.description || ''}
                  onChange={(e) => setEditingMilestone({
                    ...editingMilestone,
                    description: e.target.value
                  })}
                  className="min-h-[80px] border-gray-300 focus:border-orange-500 focus:ring-orange-500 resize-none"
                />
              </div>

              {/* Due Date and Weight */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                    Due Date
                  </label>
                  <Input
                    type="datetime-local"
                    value={editingMilestone.due_date || ''}
                    onChange={(e) => setEditingMilestone({
                      ...editingMilestone,
                      due_date: e.target.value
                    })}
                    className="h-11 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center">
                    <Target className="h-4 w-4 mr-2 text-gray-500" />
                    Weight
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0.1"
                      max="10"
                      step="0.1"
                      value={editingMilestone.weight}
                      onChange={(e) => setEditingMilestone({
                        ...editingMilestone,
                        weight: parseFloat(e.target.value) || 1
                      })}
                      className="h-11 border-gray-300 focus:border-orange-500 focus:ring-orange-500 pr-8"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <span className="text-gray-500 text-sm">x</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Progress */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Current Progress</h4>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <Target className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">{editingMilestone.progress_percentage}% Complete</span>
                      <span className="text-xs text-gray-500">{editingMilestone.tasks?.length || 0} tasks</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${editingMilestone.progress_percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button 
              variant="outline" 
              onClick={() => setEditingMilestone(null)}
              className="px-6"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => editingMilestone && handleMilestoneEdit(editingMilestone.id, editingMilestone)}
              className="px-6 bg-orange-600 hover:bg-orange-700"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      )}

      {/* Edit Task Dialog */}
      {editingTask && (
        <Dialog open={!!editingTask} onOpenChange={() => setEditingTask(null)}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Edit className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold text-gray-900">Edit Task</DialogTitle>
                <DialogDescription className="text-sm text-gray-500 mt-1">
                  Update task details and status
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          {editingTask && (
            <div className="space-y-6 py-4">
              {/* Task Title */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 text-gray-500" />
                  Task Title *
                </label>
                <Input
                  placeholder="Enter task title"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask(prev => prev ? {
                    ...prev,
                    title: e.target.value
                  } : null)}
                  className="h-11 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                />
              </div>

              {/* Status and Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-gray-500" />
                    Status
                  </label>
                  <Select
                    value={editingTask.status}
                    onValueChange={(value) => setEditingTask(prev => prev ? {
                      ...prev,
                      status: value
                    } : null)}
                  >
                    <SelectTrigger className="h-11 border-gray-300 focus:border-purple-500 focus:ring-purple-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                          <span>Pending</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="in_progress">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span>In Progress</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="completed">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>Completed</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                    Due Date
                  </label>
                  <Input
                    type="datetime-local"
                    value={editingTask.due_date || ''}
                    onChange={(e) => setEditingTask(prev => prev ? {
                      ...prev,
                      due_date: e.target.value
                    } : null)}
                    className="h-11 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Current Status Preview */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Current Status</h4>
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded flex items-center justify-center ${
                    editingTask.status === 'completed' ? 'bg-green-100' :
                    editingTask.status === 'in_progress' ? 'bg-blue-100' : 'bg-yellow-100'
                  }`}>
                    {editingTask.status === 'completed' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : editingTask.status === 'in_progress' ? (
                      <Clock className="h-4 w-4 text-blue-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900 capitalize">{editingTask.status.replace('_', ' ')}</h5>
                    {editingTask.due_date && (
                      <p className="text-sm text-gray-500 mt-1">
                        Due: {new Date(editingTask.due_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button 
              variant="outline" 
              onClick={() => setEditingTask(null)}
              className="px-6"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => editingTask && handleUpdateTask(editingTask.id, editingTask)}
              className="px-6 bg-purple-600 hover:bg-purple-700"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      )}
    </div>
  )
}
