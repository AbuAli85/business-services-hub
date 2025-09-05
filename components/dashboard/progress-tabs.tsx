'use client'

import { useState, useEffect } from 'react'
import './progress-styles.css'
import { List, Kanban, Calendar, BarChart3, Clock, AlertCircle } from 'lucide-react'
import { ProgressTrackingService, getStatusColor, getPriorityColor, formatDuration, isOverdue } from '@/lib/progress-tracking'
import { Milestone, Task, BookingProgress } from '@/types/progress'
import { MilestoneManagement } from './milestone-management'
import { ClientProgressView } from './client-progress-view'
import { TimeTrackingWidget, GlobalTimeTrackingStatus } from './time-tracking-widget'
import { ProgressFallback } from './progress-fallback'
import { SimpleProgressTracking } from './simple-progress-tracking'
import { EnhancedProgressTracking } from './enhanced-progress-tracking'
import { EnhancedProgressCharts } from './enhanced-progress-charts'
import { BulkOperations } from './bulk-operations'
import { MonthlyProgressTracking } from './monthly-progress-tracking'
import ServiceMilestoneManager from './service-milestone-manager'
import { UnifiedProgressOverview } from './unified-progress-overview'
import { MilestoneAccordionCards } from './milestone-accordion-cards'
import { SmartSuggestionsAlertBar } from './smart-suggestions-alert-bar'
import { TimelineStepper } from './timeline-stepper'
import { useProgressUpdates } from '@/hooks/use-progress-updates'

interface ProgressTabsProps {
  bookingId: string
  userRole: 'provider' | 'client'
}

type ViewType = 'overview' | 'monthly' | 'list' | 'kanban' | 'timeline' | 'analytics' | 'bulk'

export function ProgressTabs({ bookingId, userRole }: ProgressTabsProps) {
  const [activeTab, setActiveTab] = useState<ViewType>('overview')
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [bookingProgress, setBookingProgress] = useState<BookingProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [schemaAvailable, setSchemaAvailable] = useState<boolean | null>(null)

  const { 
    isUpdating, 
    updateTaskProgress, 
    updateMilestoneProgress, 
    addTask, 
    deleteTask 
  } = useProgressUpdates({
    bookingId,
    onProgressUpdate: (updates) => {
      // Update local state when progress changes
      setMilestones(prev => prev.map(m => 
        m.id === updates.milestoneId 
          ? { ...m, progress_percentage: updates.milestoneProgress }
          : m
      ))
      setBookingProgress(prev => prev ? {
        ...prev,
        booking_progress: updates.overallProgress
      } : null)
    }
  })

  useEffect(() => {
    checkSchemaAvailability()
  }, [])

  const checkSchemaAvailability = async () => {
    try {
      // Check if milestones table exists by trying to query it
      const { getSupabaseClient } = await import('@/lib/supabase')
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('milestones')
        .select('id')
        .limit(1)
      
      if (error) {
        setSchemaAvailable(false)
      } else {
        setSchemaAvailable(true)
        loadData()
      }
    } catch (error) {
      setSchemaAvailable(false)
    }
  }

  useEffect(() => {
    if (schemaAvailable === true) {
      loadData()
    }
  }, [bookingId, schemaAvailable])

  const loadData = async () => {
    try {
      setLoading(true)
      // Load data directly from Supabase using milestones table
      const { getSupabaseClient } = await import('@/lib/supabase')
      const supabase = await getSupabaseClient()
      
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
        throw new Error(milestonesError.message)
      }
      
      // Load booking data for overall progress
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select('id, title, project_progress, status')
        .eq('id', bookingId)
        .single()
      
      if (bookingError) {
        console.warn('Error loading booking data:', bookingError)
      }
      
      setMilestones(milestonesData || [])
      
      // Calculate overall progress from milestones
      const totalProgress = bookingData?.project_progress || 0
      const completedMilestones = milestonesData?.filter(m => m.status === 'completed').length || 0
      const totalTasks = milestonesData?.reduce((sum, m) => sum + (m.tasks?.length || 0), 0) || 0
      const completedTasks = milestonesData?.reduce((sum, m) => 
        sum + (m.tasks?.filter(t => t.status === 'completed').length || 0), 0) || 0
      
      setBookingProgress({
        booking_id: bookingId,
        booking_title: bookingData?.title || 'Project Progress',
        booking_status: bookingData?.status || 'in_progress',
        booking_progress: totalProgress,
        completed_milestones: completedMilestones,
        total_milestones: milestonesData?.length || 0,
        completed_tasks: completedTasks,
        total_tasks: totalTasks,
        total_estimated_hours: 0,
        total_actual_hours: 0,
        overdue_tasks: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error loading progress data:', error)
      // If there's an error, we'll show the fallback component
    } finally {
      setLoading(false)
    }
  }

  // If schema is not available, show monthly progress tracking
  if (schemaAvailable === false) {
    return <MonthlyProgressTracking bookingId={bookingId} userRole={userRole} />
  }

  // If still checking schema availability
  if (schemaAvailable === null) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: 'Project Overview', icon: BarChart3 },
    { id: 'monthly', label: 'Monthly Progress', icon: Calendar },
    { id: 'list', label: 'List View', icon: List },
    { id: 'kanban', label: 'Kanban View', icon: Kanban },
    { id: 'timeline', label: 'Timeline View', icon: Calendar },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'bulk', label: 'Bulk Operations', icon: Clock }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // If there are no milestones and no booking progress, show monthly progress tracking
  if (milestones.length === 0 && !bookingProgress) {
    return <MonthlyProgressTracking bookingId={bookingId} userRole={userRole} />
  }

  const handleLogHours = () => {
    // Implement log hours functionality
    console.log('Log hours clicked')
  }

  const handleSendUpdate = () => {
    // Implement send update functionality
    console.log('Send update clicked')
  }

  const handleScheduleFollowUp = () => {
    // Implement schedule follow-up functionality
    console.log('Schedule follow-up clicked')
  }

  const handleSendPaymentReminder = () => {
    // Implement send payment reminder functionality
    console.log('Send payment reminder clicked')
  }

  const handleMilestoneUpdate = (milestoneId: string, updates: Partial<Milestone>) => {
    // Implement milestone update functionality
    console.log('Milestone update:', milestoneId, updates)
    loadData()
  }

  const handleTaskUpdate = async (milestoneId: string, taskId: string, updates: Partial<Task>) => {
    const result = await updateTaskProgress(milestoneId, taskId, updates)
    if (result.success) {
      // Progress will be updated automatically via the hook
      console.log('Task updated successfully')
    } else {
      console.error('Failed to update task:', result.error)
    }
  }

  const handleAddTask = async (milestoneId: string, task: Omit<Task, 'id'>) => {
    const result = await addTask(milestoneId, task)
    if (result.success) {
      // Reload data to get the new task
      loadData()
      console.log('Task added successfully')
    } else {
      console.error('Failed to add task:', result.error)
    }
  }

  const handleDeleteTask = async (milestoneId: string, taskId: string) => {
    const result = await deleteTask(milestoneId, taskId)
    if (result.success) {
      // Progress will be updated automatically via the hook
      console.log('Task deleted successfully')
    } else {
      console.error('Failed to delete task:', result.error)
    }
  }

  const handleAddComment = (milestoneId: string, comment: string) => {
    // Implement add comment functionality
    console.log('Add comment:', milestoneId, comment)
  }

  const handleRequestChanges = (milestoneId: string, reason: string) => {
    // Implement request changes functionality
    console.log('Request changes:', milestoneId, reason)
  }

  const handleDismissSuggestion = (suggestionId: string) => {
    // Implement dismiss suggestion functionality
    console.log('Dismiss suggestion:', suggestionId)
  }

  return (
    <div className="space-y-6">
      {/* Smart Suggestions Alert Bar */}
      <SmartSuggestionsAlertBar
        bookingId={bookingId}
        userRole={userRole}
        onSendUpdate={handleSendUpdate}
        onScheduleFollowUp={handleScheduleFollowUp}
        onSendPaymentReminder={handleSendPaymentReminder}
        onDismissSuggestion={handleDismissSuggestion}
      />

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ViewType)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <UnifiedProgressOverview
              bookingProgress={bookingProgress}
              milestones={milestones}
              userRole={userRole}
              onLogHours={handleLogHours}
              onSendUpdate={handleSendUpdate}
              onScheduleFollowUp={handleScheduleFollowUp}
              onSendPaymentReminder={handleSendPaymentReminder}
            />
            <MilestoneAccordionCards
              milestones={milestones}
              userRole={userRole}
              onMilestoneUpdate={handleMilestoneUpdate}
              onTaskUpdate={handleTaskUpdate}
              onAddTask={handleAddTask}
              onDeleteTask={handleDeleteTask}
              onAddComment={handleAddComment}
              onRequestChanges={handleRequestChanges}
            />
          </div>
        )}

        {activeTab === 'monthly' && (
          <MonthlyProgressTracking bookingId={bookingId} userRole={userRole} />
        )}

        {activeTab === 'list' && (
          <div className="space-y-6">
            <EnhancedProgressTracking bookingId={bookingId} userRole={userRole} />
          </div>
        )}

        {activeTab === 'kanban' && (
          <KanbanView milestones={milestones} userRole={userRole} onUpdate={loadData} />
        )}

        {activeTab === 'timeline' && (
          <TimelineStepper 
            milestones={milestones} 
            userRole={userRole} 
            onMilestoneClick={(milestoneId) => {
              // Handle milestone click - could open details modal or navigate
              console.log('Milestone clicked:', milestoneId)
            }}
          />
        )}

        {activeTab === 'analytics' && (
          <EnhancedProgressCharts
            bookingId={bookingId}
            milestones={milestones}
            bookingProgress={bookingProgress}
          />
        )}

        {activeTab === 'bulk' && (
          <BulkOperations
            milestones={milestones}
            onUpdate={loadData}
            userRole={userRole}
          />
        )}
      </div>

      {/* Global Time Tracking Status */}
      <GlobalTimeTrackingStatus />
    </div>
  )
}

// Kanban View Component
function KanbanView({ 
  milestones, 
  userRole, 
  onUpdate 
}: { 
  milestones: Milestone[]
  userRole: 'provider' | 'client'
  onUpdate: () => void
}) {
  const statusColumns = [
    { id: 'pending', title: 'Pending', color: 'bg-yellow-50 border-yellow-200' },
    { id: 'in_progress', title: 'In Progress', color: 'bg-blue-50 border-blue-200' },
    { id: 'completed', title: 'Completed', color: 'bg-green-50 border-green-200' },
    { id: 'on_hold', title: 'On Hold', color: 'bg-gray-50 border-gray-200' },
    { id: 'cancelled', title: 'Cancelled', color: 'bg-red-50 border-red-200' }
  ]

  const getTasksByStatus = (status: string) => {
    const tasks: (Task & { milestone_title?: string })[] = []
    milestones.forEach(milestone => {
      milestone.tasks?.forEach(task => {
        if (task.status === status) {
          tasks.push({ ...task, milestone_title: milestone.title })
        }
      })
    })
    return tasks
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Kanban Board</h3>
        <div className="text-sm text-gray-600">
          {milestones.length} milestones • {milestones.reduce((sum, m) => sum + (m.tasks?.length || 0), 0)} tasks
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {statusColumns.map((column) => {
          const tasks = getTasksByStatus(column.id)
          return (
            <div key={column.id} className={`${column.color} border rounded-lg p-4`}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">{column.title}</h4>
                <span className="text-sm text-gray-600 bg-white px-2 py-1 rounded-full">
                  {tasks.length}
                </span>
              </div>
              
              <div className="space-y-3">
                {tasks.map((task) => (
                  <KanbanTaskCard
                    key={task.id}
                    task={task}
                    userRole={userRole}
                    onUpdate={onUpdate}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Kanban Task Card
function KanbanTaskCard({ 
  task, 
  userRole, 
  onUpdate 
}: { 
  task: Task & { milestone_title?: string }
  userRole: 'provider' | 'client'
  onUpdate: () => void
}) {
  const isOverdueTask = task.due_date && isOverdue(task.due_date, task.status)

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <h5 className="text-sm font-medium text-gray-900 line-clamp-2">{task.title}</h5>
        {isOverdueTask && (
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 ml-2" />
        )}
      </div>
      
      {task.milestone_title && (
        <div className="text-xs text-gray-500 mb-2">{task.milestone_title}</div>
      )}
      
      <div className="flex items-center gap-2 mb-2">
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
          normal
        </span>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>Progress</span>
          <span>{task.progress_percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div 
            className={`bg-blue-600 h-1.5 rounded-full progress-bar ${
              task.progress_percentage >= 100 ? 'progress-bar-100' :
              task.progress_percentage >= 95 ? 'progress-bar-95' :
              task.progress_percentage >= 90 ? 'progress-bar-90' :
              task.progress_percentage >= 85 ? 'progress-bar-85' :
              task.progress_percentage >= 80 ? 'progress-bar-80' :
              task.progress_percentage >= 75 ? 'progress-bar-75' :
              task.progress_percentage >= 70 ? 'progress-bar-70' :
              task.progress_percentage >= 65 ? 'progress-bar-65' :
              task.progress_percentage >= 60 ? 'progress-bar-60' :
              task.progress_percentage >= 55 ? 'progress-bar-55' :
              task.progress_percentage >= 50 ? 'progress-bar-50' :
              task.progress_percentage >= 45 ? 'progress-bar-45' :
              task.progress_percentage >= 40 ? 'progress-bar-40' :
              task.progress_percentage >= 35 ? 'progress-bar-35' :
              task.progress_percentage >= 30 ? 'progress-bar-30' :
              task.progress_percentage >= 25 ? 'progress-bar-25' :
              task.progress_percentage >= 20 ? 'progress-bar-20' :
              task.progress_percentage >= 15 ? 'progress-bar-15' :
              task.progress_percentage >= 10 ? 'progress-bar-10' :
              task.progress_percentage >= 5 ? 'progress-bar-5' : 'progress-bar-0'
            }`}
          ></div>
        </div>
      </div>
      
      {/* Time tracking not available in current structure */}
    </div>
  )
}

// Timeline View Component
function TimelineView({ 
  milestones, 
  userRole, 
  onUpdate 
}: { 
  milestones: Milestone[]
  userRole: 'provider' | 'client'
  onUpdate: () => void
}) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week')

  // Get all tasks with their milestones
  const allTasks = milestones.flatMap(milestone => 
    (milestone.tasks || []).map(task => ({
      ...task,
      milestone_title: milestone.title,
      milestone_due_date: milestone.due_date
    }))
  )

  // Sort tasks by due date
  const sortedTasks = allTasks.sort((a, b) => {
    if (!a.due_date && !b.due_date) return 0
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Timeline View</h3>
        <div className="flex items-center gap-2">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as 'week' | 'month')}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="View mode"
          >
            <option value="week">Week View</option>
            <option value="month">Month View</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="space-y-4">
          {milestones.map((milestone) => (
            <div key={milestone.id} className="border-l-4 border-blue-500 pl-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">{milestone.title}</h4>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(milestone.status)}`}>
                    {milestone.status.replace('_', ' ')}
                  </span>
                  {milestone.due_date && (
                    <span className="text-xs text-gray-600">
                      Due: {new Date(milestone.due_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                <div 
                  className={`bg-blue-600 h-2 rounded-full progress-bar ${
                    milestone.progress_percentage >= 100 ? 'progress-bar-100' :
                    milestone.progress_percentage >= 95 ? 'progress-bar-95' :
                    milestone.progress_percentage >= 90 ? 'progress-bar-90' :
                    milestone.progress_percentage >= 85 ? 'progress-bar-85' :
                    milestone.progress_percentage >= 80 ? 'progress-bar-80' :
                    milestone.progress_percentage >= 75 ? 'progress-bar-75' :
                    milestone.progress_percentage >= 70 ? 'progress-bar-70' :
                    milestone.progress_percentage >= 65 ? 'progress-bar-65' :
                    milestone.progress_percentage >= 60 ? 'progress-bar-60' :
                    milestone.progress_percentage >= 55 ? 'progress-bar-55' :
                    milestone.progress_percentage >= 50 ? 'progress-bar-50' :
                    milestone.progress_percentage >= 45 ? 'progress-bar-45' :
                    milestone.progress_percentage >= 40 ? 'progress-bar-40' :
                    milestone.progress_percentage >= 35 ? 'progress-bar-35' :
                    milestone.progress_percentage >= 30 ? 'progress-bar-30' :
                    milestone.progress_percentage >= 25 ? 'progress-bar-25' :
                    milestone.progress_percentage >= 20 ? 'progress-bar-20' :
                    milestone.progress_percentage >= 15 ? 'progress-bar-15' :
                    milestone.progress_percentage >= 10 ? 'progress-bar-10' :
                    milestone.progress_percentage >= 5 ? 'progress-bar-5' : 'progress-bar-0'
                  }`}
                ></div>
              </div>
              
              <div className="space-y-2">
                {milestone.tasks?.map((task) => (
                  <TimelineTaskItem
                    key={task.id}
                    task={task}
                    userRole={userRole}
                    onUpdate={onUpdate}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Timeline Task Item
function TimelineTaskItem({ 
  task, 
  userRole, 
  onUpdate 
}: { 
  task: Task
  userRole: 'provider' | 'client'
  onUpdate: () => void
}) {
  const isOverdueTask = task.due_date && isOverdue(task.due_date, task.status)

  return (
    <div className="flex items-center gap-3 p-2 bg-gray-50 rounded border">
      <div className="flex items-center gap-2">
        {task.status === 'completed' ? (
          <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
        ) : (
          <div className="w-4 h-4 border-2 border-gray-300 rounded-full"></div>
        )}
        <span className="text-sm font-medium text-gray-900">{task.title}</span>
      </div>
      
      <div className="flex items-center gap-2 ml-auto">
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
          normal
        </span>
        {isOverdueTask && (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
            Overdue
          </span>
        )}
        {task.due_date && (
          <span className="text-xs text-gray-600">
            {new Date(task.due_date).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  )
}
