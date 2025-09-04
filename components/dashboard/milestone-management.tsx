'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Clock, CheckCircle, AlertCircle, Play, Pause, Square } from 'lucide-react'
import { EnhancedMilestoneModal } from './enhanced-milestone-modal'
import { ProgressTrackingService, Milestone, Task, TimeEntry, getStatusColor, getPriorityColor, formatDuration, isOverdue } from '@/lib/progress-tracking'
import { getSupabaseClient } from '@/lib/supabase'

interface MilestoneManagementProps {
  bookingId: string
  userRole: 'provider' | 'client'
}

export function MilestoneManagement({ bookingId, userRole }: MilestoneManagementProps) {
  const [user, setUser] = useState<any>(null)
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTimeEntry, setActiveTimeEntry] = useState<TimeEntry | null>(null)
  const [showCreateMilestone, setShowCreateMilestone] = useState(false)
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null)
  const [showCreateTask, setShowCreateTask] = useState<string | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadMilestones()
      loadActiveTimeEntry()
    }
  }, [bookingId, user])

  const loadUser = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    } catch (error) {
      console.error('Error loading user:', error)
    }
  }

  const loadMilestones = async () => {
    try {
      setLoading(true)
      const data = await ProgressTrackingService.getMilestones(bookingId)
      setMilestones(data)
    } catch (error) {
      console.error('Error loading milestones:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadActiveTimeEntry = async () => {
    if (!user) return
    
    try {
      const entry = await ProgressTrackingService.getActiveTimeEntry(user.id)
      setActiveTimeEntry(entry)
    } catch (error) {
      console.error('Error loading active time entry:', error)
    }
  }

  const handleCreateMilestone = async (milestoneData: Partial<Milestone>) => {
    try {
      const newMilestone = await ProgressTrackingService.createMilestone({
        booking_id: bookingId,
        title: milestoneData.title || '',
        description: milestoneData.description,
        due_date: milestoneData.due_date,
        priority: milestoneData.priority || 'medium',
        weight: milestoneData.weight || 1.0,
        status: 'pending',
        progress_percentage: 0,
        created_by: user?.id
      })
      
      setMilestones(prev => [...prev, newMilestone])
      setShowCreateMilestone(false)
    } catch (error) {
      console.error('Error creating milestone:', error)
    }
  }

  const handleUpdateMilestone = async (id: string, updates: Partial<Milestone>) => {
    try {
      const updatedMilestone = await ProgressTrackingService.updateMilestone(id, updates)
      setMilestones(prev => prev.map(m => m.id === id ? updatedMilestone : m))
      setEditingMilestone(null)
    } catch (error) {
      console.error('Error updating milestone:', error)
    }
  }

  const handleDeleteMilestone = async (id: string) => {
    if (!confirm('Are you sure you want to delete this milestone? This will also delete all associated tasks.')) return
    
    try {
      await ProgressTrackingService.deleteMilestone(id)
      setMilestones(prev => prev.filter(m => m.id !== id))
    } catch (error) {
      console.error('Error deleting milestone:', error)
    }
  }

  const handleCreateTask = async (milestoneId: string, taskData: Partial<Task>) => {
    try {
      const newTask = await ProgressTrackingService.createTask({
        milestone_id: milestoneId,
        title: taskData.title || '',
        description: taskData.description,
        due_date: taskData.due_date,
        priority: taskData.priority || 'medium',
        estimated_hours: taskData.estimated_hours,
        tags: taskData.tags || [],
        steps: taskData.steps || [],
        status: 'pending',
        progress_percentage: 0,
        approval_status: 'pending',
        created_by: user?.id
      })
      
      setMilestones(prev => prev.map(m => 
        m.id === milestoneId 
          ? { ...m, tasks: [...(m.tasks || []), newTask] }
          : m
      ))
      setShowCreateTask(null)
    } catch (error) {
      console.error('Error creating task:', error)
    }
  }

  const handleUpdateTask = async (milestoneId: string, taskId: string, updates: Partial<Task>) => {
    try {
      const updatedTask = await ProgressTrackingService.updateTask(taskId, updates)
      setMilestones(prev => prev.map(m => 
        m.id === milestoneId 
          ? { 
              ...m, 
              tasks: m.tasks?.map(t => t.id === taskId ? updatedTask : t) || []
            }
          : m
      ))
      setEditingTask(null)
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  const handleDeleteTask = async (milestoneId: string, taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return
    
    try {
      await ProgressTrackingService.deleteTask(taskId)
      setMilestones(prev => prev.map(m => 
        m.id === milestoneId 
          ? { ...m, tasks: m.tasks?.filter(t => t.id !== taskId) || [] }
          : m
      ))
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  const handleStartTimeTracking = async (taskId: string) => {
    if (!user) return
    
    try {
      const entry = await ProgressTrackingService.startTimeTracking(taskId, user.id)
      setActiveTimeEntry(entry)
    } catch (error) {
      console.error('Error starting time tracking:', error)
    }
  }

  const handleStopTimeTracking = async () => {
    if (!activeTimeEntry) return
    
    try {
      await ProgressTrackingService.stopTimeTracking(activeTimeEntry.id)
      setActiveTimeEntry(null)
      loadMilestones() // Reload to update actual hours
    } catch (error) {
      console.error('Error stopping time tracking:', error)
    }
  }

  const handleAddComment = async (taskId: string, comment: string, isInternal: boolean = false) => {
    if (!user) return
    
    try {
      await ProgressTrackingService.addTaskComment(taskId, user.id, comment, isInternal)
      loadMilestones() // Reload to show new comment
    } catch (error) {
      console.error('Error adding comment:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Project Milestones</h2>
        {userRole === 'provider' && (
          <button
            onClick={() => setShowCreateMilestone(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Milestone
          </button>
        )}
      </div>

      {/* Active Time Tracking */}
      {activeTimeEntry && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-blue-900">
                Time tracking active
              </span>
            </div>
            <button
              onClick={handleStopTimeTracking}
              className="flex items-center gap-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
            >
              <Square className="h-3 w-3" />
              Stop
            </button>
          </div>
        </div>
      )}

      {/* Milestones List */}
      <div className="space-y-4">
        {milestones.map((milestone) => (
          <MilestoneCard
            key={milestone.id}
            milestone={milestone}
            userRole={userRole}
            activeTimeEntry={activeTimeEntry}
            onUpdate={handleUpdateMilestone}
            onDelete={handleDeleteMilestone}
            onCreateTask={handleCreateTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            onStartTimeTracking={handleStartTimeTracking}
            onStopTimeTracking={handleStopTimeTracking}
            onAddComment={handleAddComment}
            showCreateTask={showCreateTask === milestone.id}
            setShowCreateTask={setShowCreateTask}
            editingTask={editingTask}
            setEditingTask={setEditingTask}
          />
        ))}
      </div>

      {/* Create Milestone Modal */}
      {/* Enhanced Milestone Modal */}
      <EnhancedMilestoneModal
        isOpen={showCreateMilestone || !!editingMilestone}
        onClose={() => {
          setShowCreateMilestone(false)
          setEditingMilestone(null)
        }}
        onSuccess={() => {
          loadMilestones()
          setShowCreateMilestone(false)
          setEditingMilestone(null)
        }}
        bookingId={bookingId}
        editingMilestone={editingMilestone}
        userRole={userRole}
      />
    </div>
  )
}

// Milestone Card Component
function MilestoneCard({ 
  milestone, 
  userRole, 
  activeTimeEntry,
  onUpdate, 
  onDelete, 
  onCreateTask, 
  onUpdateTask, 
  onDeleteTask,
  onStartTimeTracking,
  onStopTimeTracking,
  onAddComment,
  showCreateTask,
  setShowCreateTask,
  editingTask,
  setEditingTask
}: {
  milestone: Milestone
  userRole: 'provider' | 'client'
  activeTimeEntry: TimeEntry | null
  onUpdate: (id: string, updates: Partial<Milestone>) => void
  onDelete: (id: string) => void
  onCreateTask: (milestoneId: string, taskData: Partial<Task>) => void
  onUpdateTask: (milestoneId: string, taskId: string, updates: Partial<Task>) => void
  onDeleteTask: (milestoneId: string, taskId: string) => void
  onStartTimeTracking: (taskId: string) => void
  onStopTimeTracking: () => void
  onAddComment: (taskId: string, comment: string, isInternal: boolean) => void
  showCreateTask: boolean
  setShowCreateTask: (milestoneId: string | null) => void
  editingTask: Task | null
  setEditingTask: (task: Task | null) => void
}) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [showComments, setShowComments] = useState<{ [taskId: string]: boolean }>({})

  const isOverdueMilestone = milestone.due_date && isOverdue(milestone.due_date, milestone.status)

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Milestone Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-400 hover:text-gray-600"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{milestone.title}</h3>
              {milestone.description && (
                <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(milestone.status)}`}>
              {milestone.status.replace('_', ' ')}
            </span>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(milestone.priority)}`}>
              {milestone.priority}
            </span>
            {isOverdueMilestone && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                Overdue
              </span>
            )}
            {userRole === 'provider' && (
              <div className="flex items-center gap-1">
                            <button
              onClick={() => onUpdate(milestone.id, {})}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Edit milestone"
              aria-label="Edit milestone"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(milestone.id)}
              className="p-1 text-gray-400 hover:text-red-600"
              title="Delete milestone"
              aria-label="Delete milestone"
            >
              <Trash2 className="h-4 w-4" />
            </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
            <span>Progress</span>
            <span>{milestone.progress_percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${milestone.progress_percentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Tasks */}
      {isExpanded && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900">Tasks ({milestone.tasks?.length || 0})</h4>
            {userRole === 'provider' && (
              <button
                onClick={() => setShowCreateTask(milestone.id)}
                className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                <Plus className="h-3 w-3" />
                Add Task
              </button>
            )}
          </div>

          <div className="space-y-2">
            {milestone.tasks?.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                userRole={userRole}
                activeTimeEntry={activeTimeEntry}
                onUpdate={(updates) => onUpdateTask(milestone.id, task.id, updates)}
                onDelete={() => onDeleteTask(milestone.id, task.id)}
                onStartTimeTracking={() => onStartTimeTracking(task.id)}
                onStopTimeTracking={onStopTimeTracking}
                onAddComment={(comment, isInternal) => onAddComment(task.id, comment, isInternal)}
                showComments={showComments[task.id] || false}
                setShowComments={(show) => setShowComments(prev => ({ ...prev, [task.id]: show }))}
                isEditing={editingTask?.id === task.id}
                setEditing={setEditingTask}
              />
            ))}
          </div>

          {/* Create Task Form */}
          {showCreateTask && (
            <CreateTaskForm
              milestoneId={milestone.id}
              onSubmit={(taskData) => {
                onCreateTask(milestone.id, taskData)
                setShowCreateTask(null)
              }}
              onCancel={() => setShowCreateTask(null)}
            />
          )}
        </div>
      )}
    </div>
  )
}

// Task Card Component
function TaskCard({ 
  task, 
  userRole, 
  activeTimeEntry,
  onUpdate, 
  onDelete, 
  onStartTimeTracking,
  onStopTimeTracking,
  onAddComment,
  showComments,
  setShowComments,
  isEditing,
  setEditing
}: {
  task: Task
  userRole: 'provider' | 'client'
  activeTimeEntry: TimeEntry | null
  onUpdate: (updates: Partial<Task>) => void
  onDelete: () => void
  onStartTimeTracking: () => void
  onStopTimeTracking: () => void
  onAddComment: (comment: string, isInternal: boolean) => void
  showComments: boolean
  setShowComments: (show: boolean) => void
  isEditing: boolean
  setEditing: (task: Task | null) => void
}) {
  const isOverdueTask = task.due_date && isOverdue(task.due_date, task.status)
  const isTimeTracking = activeTimeEntry?.task_id === task.id

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={task.status === 'completed'}
            onChange={(e) => onUpdate({ 
              status: e.target.checked ? 'completed' : 'pending',
              completed_at: e.target.checked ? new Date().toISOString() : undefined
            })}
            className="h-4 w-4 text-blue-600 rounded border-gray-300"
            aria-label={`Mark task "${task.title}" as ${task.status === 'completed' ? 'incomplete' : 'completed'}`}
          />
          <span className="text-sm font-medium text-gray-900">{task.title}</span>
          {task.tags.map((tag) => (
            <span key={tag} className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
              {tag}
            </span>
          ))}
        </div>
        
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
            {task.status.replace('_', ' ')}
          </span>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
            {task.priority}
          </span>
          {isOverdueTask && (
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
              Overdue
            </span>
          )}
          {task.actual_hours > 0 && (
            <span className="text-xs text-gray-600">
              {formatDuration(task.actual_hours * 60)}
            </span>
          )}
          
          {userRole === 'provider' && (
            <div className="flex items-center gap-1">
              {!isTimeTracking ? (
                <button
                  onClick={onStartTimeTracking}
                  className="p-1 text-gray-400 hover:text-green-600"
                  title="Start time tracking"
                >
                  <Play className="h-3 w-3" />
                </button>
              ) : (
                <button
                  onClick={onStopTimeTracking}
                  className="p-1 text-gray-400 hover:text-red-600"
                  title="Stop time tracking"
                >
                  <Pause className="h-3 w-3" />
                </button>
              )}
              <button
                onClick={() => setShowComments(!showComments)}
                className="p-1 text-gray-400 hover:text-gray-600"
                title="Comments"
              >
                <AlertCircle className="h-3 w-3" />
              </button>
              <button
                onClick={() => setEditing(task)}
                className="p-1 text-gray-400 hover:text-gray-600"
                title="Edit task"
              >
                <Edit2 className="h-3 w-3" />
              </button>
              <button
                onClick={onDelete}
                className="p-1 text-gray-400 hover:text-red-600"
                title="Delete task"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Task Progress */}
      <div className="mt-2">
        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
          <span>Progress</span>
          <span>{task.progress_percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div 
            className="bg-green-600 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${task.progress_percentage}%` }}
          ></div>
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="space-y-2">
            {task.comments?.map((comment) => (
              <div key={comment.id} className="text-xs text-gray-600">
                <span className="font-medium">{comment.is_internal ? '[Internal]' : '[Shared]'}</span>
                <span className="ml-2">{comment.comment}</span>
              </div>
            ))}
          </div>
          
          {userRole === 'provider' && (
            <div className="mt-2">
                          <input
              type="text"
              placeholder="Add comment..."
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
              aria-label="Add comment"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  onAddComment(e.currentTarget.value.trim(), false)
                  e.currentTarget.value = ''
                }
              }}
            />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Create Milestone Modal
function CreateMilestoneModal({ onClose, onSubmit }: { onClose: () => void, onSubmit: (data: Partial<Milestone>) => void }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: '',
    priority: 'medium' as const,
    weight: 1.0
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Create Milestone</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input
              type="datetime-local"
              value={formData.due_date}
              onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Priority level"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Weight</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={formData.weight}
                onChange={(e) => setFormData(prev => ({ ...prev, weight: parseFloat(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Edit Milestone Modal
function EditMilestoneModal({ milestone, onClose, onSubmit }: { milestone: Milestone, onClose: () => void, onSubmit: (data: Partial<Milestone>) => void }) {
  const [formData, setFormData] = useState({
    title: milestone.title,
    description: milestone.description || '',
    due_date: milestone.due_date ? new Date(milestone.due_date).toISOString().slice(0, 16) : '',
    priority: milestone.priority,
    weight: milestone.weight
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Edit Milestone</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input
              type="datetime-local"
              value={formData.due_date}
              onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Priority level"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Weight</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={formData.weight}
                onChange={(e) => setFormData(prev => ({ ...prev, weight: parseFloat(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Update
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Create Task Form
function CreateTaskForm({ milestoneId, onSubmit, onCancel }: { milestoneId: string, onSubmit: (data: Partial<Task>) => void, onCancel: () => void }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: '',
    priority: 'medium' as const,
    estimated_hours: '',
    tags: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : undefined,
      tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : []
    })
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <h4 className="text-sm font-medium text-gray-900 mb-3">Create Task</h4>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <input
            type="text"
            placeholder="Task title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Task title"
            required
          />
        </div>
        <div>
          <textarea
            placeholder="Description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
            aria-label="Task description"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="datetime-local"
            placeholder="Due date"
            value={formData.due_date}
            onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Due date"
          />
          <select
            value={formData.priority}
            onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Priority level"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            step="0.5"
            placeholder="Estimated hours"
            value={formData.estimated_hours}
            onChange={(e) => setFormData(prev => ({ ...prev, estimated_hours: e.target.value }))}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Estimated hours"
          />
          <input
            type="text"
            placeholder="Tags (comma separated)"
            value={formData.tags}
            onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Tags"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Create
          </button>
        </div>
      </form>
    </div>
  )
}
