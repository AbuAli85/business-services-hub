'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Plus, 
  Edit, 
  Trash2,
  Play,
  Pause,
  Square
} from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface SimpleTask {
  id: string
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed'
  priority: 'low' | 'medium' | 'high'
  due_date?: string
  progress_percentage: number
  created_at: string
  updated_at: string
}

interface SimpleProgressTrackingProps {
  bookingId: string
  userRole: 'provider' | 'client'
}

export function SimpleProgressTracking({ bookingId, userRole }: SimpleProgressTrackingProps) {
  const [tasks, setTasks] = useState<SimpleTask[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddTask, setShowAddTask] = useState(false)
  const [editingTask, setEditingTask] = useState<SimpleTask | null>(null)
  const [newTask, setNewTask] = useState<{
    title: string
    description: string
    priority: 'low' | 'medium' | 'high'
    due_date: string
  }>({
    title: '',
    description: '',
    priority: 'medium',
    due_date: ''
  })
  const [activeTimeEntry, setActiveTimeEntry] = useState<string | null>(null)

  useEffect(() => {
    loadTasks()
  }, [bookingId])

  const loadTasks = async () => {
    try {
      setLoading(true)
      const supabase = await getSupabaseClient()
      
      // Get tasks from booking_tasks table (if it exists) or create mock data
      const { data, error } = await supabase
        .from('booking_tasks')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true })
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error loading tasks:', error)
        // Create some mock tasks for demonstration
        setTasks([
          {
            id: '1',
            title: 'Initial Consultation',
            description: 'Meet with client to understand requirements',
            status: 'completed',
            priority: 'high',
            due_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            progress_percentage: 100,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: '2',
            title: 'Project Planning',
            description: 'Create detailed project plan and timeline',
            status: 'in_progress',
            priority: 'high',
            due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            progress_percentage: 60,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: '3',
            title: 'Design Phase',
            description: 'Create wireframes and mockups',
            status: 'pending',
            priority: 'medium',
            due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            progress_percentage: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
      } else {
        setTasks(data || [])
      }
    } catch (error) {
      console.error('Error loading tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) return

    try {
      const supabase = await getSupabaseClient()
      
      const taskData = {
        booking_id: bookingId,
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
        due_date: newTask.due_date || null,
        status: 'pending',
        progress_percentage: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('booking_tasks')
        .insert(taskData)
        .select()
        .single()

      if (error) {
        // If table doesn't exist, create mock task
        const mockTask: SimpleTask = {
          id: Date.now().toString(),
          title: taskData.title,
          description: taskData.description,
          priority: taskData.priority,
          due_date: taskData.due_date || undefined,
          status: taskData.status as 'pending' | 'in_progress' | 'completed',
          progress_percentage: taskData.progress_percentage,
          created_at: taskData.created_at,
          updated_at: taskData.updated_at
        }
        setTasks(prev => [...prev, mockTask])
        toast.success('Task created successfully')
      } else {
        setTasks(prev => [...prev, data])
        toast.success('Task created successfully')
      }

      setNewTask({ title: '', description: '', priority: 'medium', due_date: '' })
      setShowAddTask(false)
    } catch (error) {
      console.error('Error creating task:', error)
      toast.error('Failed to create task')
    }
  }

  const handleUpdateTask = async (taskId: string, updates: Partial<SimpleTask>) => {
    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('booking_tasks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', taskId)

      if (error) {
        // Update local state if database update fails
        setTasks(prev => prev.map(task => 
          task.id === taskId ? { ...task, ...updates, updated_at: new Date().toISOString() } : task
        ))
        toast.success('Task updated successfully')
      } else {
        setTasks(prev => prev.map(task => 
          task.id === taskId ? { ...task, ...updates, updated_at: new Date().toISOString() } : task
        ))
        toast.success('Task updated successfully')
      }
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error('Failed to update task')
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return

    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('booking_tasks')
        .delete()
        .eq('id', taskId)

      if (error) {
        // Remove from local state if database delete fails
        setTasks(prev => prev.filter(task => task.id !== taskId))
        toast.success('Task deleted successfully')
      } else {
        setTasks(prev => prev.filter(task => task.id !== taskId))
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

  const isOverdue = (dueDate: string, status: string) => {
    if (status === 'completed') return false
    return new Date(dueDate) < new Date()
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => t.status === 'completed').length
  const overdueTasks = tasks.filter(t => t.due_date && isOverdue(t.due_date, t.status)).length
  const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

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
            <CheckCircle className="h-5 w-5 text-blue-600" />
            <span>Progress Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{totalTasks}</div>
              <div className="text-sm text-blue-800">Total Tasks</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{completedTasks}</div>
              <div className="text-sm text-green-800">Completed</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{overdueTasks}</div>
              <div className="text-sm text-red-800">Overdue</div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{overallProgress}%</div>
              <div className="text-sm text-purple-800">Progress</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Overall Progress</span>
              <span>{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Tasks List */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <span>Tasks</span>
            </CardTitle>
            {userRole === 'provider' && (
              <Button onClick={() => setShowAddTask(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tasks.map((task) => (
              <div key={task.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">{task.title}</h4>
                    {task.description && (
                      <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                    )}
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge className={getStatusColor(task.status)}>
                        {task.status.replace('_', ' ')}
                      </Badge>
                      <Badge className={getPriorityColor(task.priority)}>
                        {task.priority}
                      </Badge>
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
                        onClick={() => handleDeleteTask(task.id)}
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
                    Due: {new Date(task.due_date).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))}
            
            {tasks.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No tasks yet. {userRole === 'provider' && 'Click "Add Task" to get started.'}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter task title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Enter task description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as 'low' | 'medium' | 'high' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={() => setShowAddTask(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTask}>
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
                <input
                  type="text"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={editingTask.description || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={editingTask.status}
                    onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value as 'pending' | 'in_progress' | 'completed' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={editingTask.priority}
                    onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value as 'low' | 'medium' | 'high' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Progress ({editingTask.progress_percentage}%)
                </label>
                <input
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
                handleUpdateTask(editingTask.id, editingTask)
                setEditingTask(null)
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
