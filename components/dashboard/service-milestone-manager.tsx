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
      // Reset dialog states
      setIsAddingTask(false)
      setEditingMilestone(null)
      loadServiceAndMilestones()
    }
  }, [bookingId])

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

      const { error: taskError } = await supabase
        .from('tasks')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)

      if (taskError) {
        throw new Error(taskError.message)
      }

      // Update milestone progress
      const task = milestones
        .flatMap(m => m.tasks)
        .find(t => t.id === taskId)
      
      if (task) {
        const milestone = milestones.find(m => m.tasks.some(t => t.id === taskId))
        if (milestone) {
          try {
            await supabase.rpc('update_milestone_progress', {
              milestone_uuid: milestone.id
            })
          } catch (rpcError) {
            console.warn('RPC function update_milestone_progress not available:', rpcError)
          }

          try {
            await supabase.rpc('calculate_booking_progress', {
              booking_id: bookingId
            })
          } catch (rpcError) {
            console.warn('RPC function calculate_booking_progress not available:', rpcError)
          }
        }
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
        milestone_id: milestoneId,
        title: newTaskTitle.trim(),
        due_date: null
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
        task_id: taskId,
        title: updates.title,
        status: updates.status,
        due_date: updates.due_date
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
        task_id: taskId
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
        booking_id: bookingId,
        title: newMilestone.title.trim(),
        description: newMilestone.description.trim(),
        due_date: newMilestone.due_date || null,
        weight: newMilestone.weight
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
        milestone_id: milestoneId,
        title: updates.title,
        description: updates.description,
        due_date: updates.due_date,
        status: updates.status
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
        milestone_id: milestoneId
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

      {/* Add Milestone Dialog */}
      <Dialog open={isAddingMilestone} onOpenChange={setIsAddingMilestone}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Milestone</DialogTitle>
            <DialogDescription>
              Create a new milestone to track progress
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Milestone title"
              value={newMilestone.title}
              onChange={(e) => setNewMilestone(prev => ({ ...prev, title: e.target.value }))}
            />
            <Textarea
              placeholder="Description (optional)"
              value={newMilestone.description}
              onChange={(e) => setNewMilestone(prev => ({ ...prev, description: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Due Date</label>
                <Input
                  type="datetime-local"
                  value={newMilestone.due_date}
                  onChange={(e) => setNewMilestone(prev => ({ ...prev, due_date: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Weight</label>
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={newMilestone.weight}
                  onChange={(e) => setNewMilestone(prev => ({ ...prev, weight: parseFloat(e.target.value) || 1 }))}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsAddingMilestone(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddMilestone}>
                Add Milestone
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Task Dialog - Only show if there are milestones */}
      {milestones.length > 0 && (
        <Dialog open={isAddingTask} onOpenChange={setIsAddingTask}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Task</DialogTitle>
              <DialogDescription>
                Add a new task to track progress
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Task title"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
              />
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsAddingTask(false)}>
                  Cancel
                </Button>
                <Button onClick={() => handleAddTask(milestones[0]?.id || '')}>
                  Add Task
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Milestone Dialog */}
      <Dialog open={!!editingMilestone} onOpenChange={() => setEditingMilestone(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Milestone</DialogTitle>
            <DialogDescription>
              Update milestone details
            </DialogDescription>
          </DialogHeader>
          {editingMilestone && (
            <div className="space-y-4">
              <Input
                placeholder="Milestone title"
                value={editingMilestone.title}
                onChange={(e) => setEditingMilestone({
                  ...editingMilestone,
                  title: e.target.value
                })}
              />
              <Textarea
                placeholder="Description"
                value={editingMilestone.description || ''}
                onChange={(e) => setEditingMilestone({
                  ...editingMilestone,
                  description: e.target.value
                })}
              />
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setEditingMilestone(null)}>
                  Cancel
                </Button>
                <Button onClick={() => handleMilestoneEdit(editingMilestone.id, editingMilestone)}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={!!editingTask} onOpenChange={() => setEditingTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Update task details
            </DialogDescription>
          </DialogHeader>
          {editingTask && (
            <div className="space-y-4">
              <Input
                placeholder="Task title"
                value={editingTask.title}
                onChange={(e) => setEditingTask(prev => prev ? {
                  ...prev,
                  title: e.target.value
                } : null)}
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <Select
                    value={editingTask.status}
                    onValueChange={(value) => setEditingTask(prev => prev ? {
                      ...prev,
                      status: value
                    } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Due Date</label>
                  <Input
                    type="datetime-local"
                    value={editingTask.due_date || ''}
                    onChange={(e) => setEditingTask(prev => prev ? {
                      ...prev,
                      due_date: e.target.value
                    } : null)}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setEditingTask(null)}>
                  Cancel
                </Button>
                <Button onClick={() => handleUpdateTask(editingTask.id, editingTask)}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
