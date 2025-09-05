'use client'

import { useState, useEffect } from 'react'
import { List, Kanban, Calendar, BarChart3, Clock, AlertCircle } from 'lucide-react'
import { ProgressTrackingService, BookingProgress, getStatusColor, getPriorityColor, formatDuration, isOverdue } from '@/lib/progress-tracking'

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
  created_at?: string
  updated_at?: string
}

interface Task {
  id: string
  title: string
  status: string
  progress_percentage: number
  due_date?: string
  editable: boolean
}
import { MilestoneManagement } from './milestone-management'
import { ClientProgressView } from './client-progress-view'
import { TimeTrackingWidget, GlobalTimeTrackingStatus } from './time-tracking-widget'
import { ProgressFallback } from './progress-fallback'
import { SimpleProgressTracking } from './simple-progress-tracking'
import { EnhancedProgressTracking } from './enhanced-progress-tracking'
import { EnhancedProgressCharts } from './enhanced-progress-charts'
import { BulkOperations } from './bulk-operations'
import { MonthlyProgressTracking } from './monthly-progress-tracking'

interface ProgressTabsProps {
  bookingId: string
  userRole: 'provider' | 'client'
}

type ViewType = 'monthly' | 'list' | 'kanban' | 'timeline' | 'analytics' | 'bulk'

export function ProgressTabs({ bookingId, userRole }: ProgressTabsProps) {
  const [activeTab, setActiveTab] = useState<ViewType>('monthly')
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [bookingProgress, setBookingProgress] = useState<BookingProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [schemaAvailable, setSchemaAvailable] = useState<boolean | null>(null)

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

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      {bookingProgress && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Project Overview</h2>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{bookingProgress.total_actual_hours.toFixed(1)}h logged</span>
              </div>
              <div className="flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                <span>{bookingProgress.overdue_tasks} overdue</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{bookingProgress.booking_progress}%</div>
              <div className="text-sm text-gray-600">Overall Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{bookingProgress.completed_milestones}</div>
              <div className="text-sm text-gray-600">of {bookingProgress.total_milestones} Milestones</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{bookingProgress.completed_tasks}</div>
              <div className="text-sm text-gray-600">of {bookingProgress.total_tasks} Tasks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{bookingProgress.total_estimated_hours.toFixed(1)}h</div>
              <div className="text-sm text-gray-600">Estimated Hours</div>
            </div>
          </div>
        </div>
      )}

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
          <TimelineView milestones={milestones} userRole={userRole} onUpdate={loadData} />
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
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
          {task.priority}
        </span>
        {task.tags.map((tag) => (
          <span key={tag} className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
            {tag}
          </span>
        ))}
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>Progress</span>
          <span>{task.progress_percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div 
            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${task.progress_percentage}%` }}
          ></div>
        </div>
      </div>
      
      {task.actual_hours > 0 && (
        <div className="mt-2 text-xs text-gray-600">
          {formatDuration(task.actual_hours * 60)} logged
        </div>
      )}
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
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${milestone.progress_percentage}%` }}
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
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
          {task.priority}
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
