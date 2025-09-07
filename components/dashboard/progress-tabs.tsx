'use client'

import { useState, useEffect } from 'react'
import './progress-styles.css'
import { List, Kanban, Calendar, BarChart3, Clock, AlertCircle } from 'lucide-react'
import { Milestone, Task, BookingProgress } from '@/types/progress'
import { MilestoneManagement } from './milestone-management'
// Removed legacy client-progress-view
import { TimeTrackingWidget } from './time-tracking-widget'
import { ProgressFallback } from './progress-fallback'
// Removed legacy progress tracking imports
import { EnhancedProgressCharts } from './enhanced-progress-charts'
import { BulkOperations } from './bulk-operations'
// Removed legacy monthly-progress-tracking
// Removed legacy service-milestone-manager
import { MainProgressHeader } from './main-progress-header'
// Removed legacy refactored accordion
import { SimpleMilestones } from './simple-milestones'
import { SimplifiedMonthlyProgress } from './simplified-monthly-progress'
import { ProgressSummaryFooter } from './progress-summary-footer'
import { TimelineStepper } from './timeline-stepper'
import { SmartSuggestionsSidebar } from './smart-suggestions-sidebar'
import { AnalyticsView } from './analytics-view'
import { BulkOperationsView } from './bulk-operations-view'
import { useProgressUpdates } from '@/hooks/use-progress-updates'

interface ProgressTabsProps {
  bookingId: string
  userRole: 'provider' | 'client'
}

type ViewType = 'overview' | 'monthly' | 'timeline' | 'analytics' | 'bulk'

export function ProgressTabs({ bookingId, userRole }: ProgressTabsProps) {
  const [activeTab, setActiveTab] = useState<ViewType>('overview')
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [bookingProgress, setBookingProgress] = useState<BookingProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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
            editable,
            estimated_hours,
            actual_hours,
            priority
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
      
      // Transform milestones data to match the expected interface
      const transformedMilestones = (milestonesData || []).map(milestone => ({
        ...milestone,
        booking_id: bookingId,
        priority: 'medium' as 'medium',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_overdue: milestone.due_date ? new Date(milestone.due_date) < new Date() : false,
        estimated_hours: 0,
        actual_hours: 0,
        tags: [],
        notes: '',
        assigned_to: undefined,
        created_by: undefined,
        completed_at: undefined,
        overdue_since: undefined,
        order_index: milestone.order_index || 0,
        editable: milestone.editable !== undefined ? milestone.editable : true,
        tasks: (milestone.tasks || []).map(task => ({
          id: task.id,
          title: task.title,
          status: task.status,
          progress_percentage: task.progress_percentage,
          due_date: task.due_date,
          estimated_hours: task.estimated_hours || 0,
          actual_hours: task.actual_hours || 0,
          priority: task.priority || 'medium',
          milestone_id: milestone.id,
          description: '',
          tags: [],
          steps: [],
          completed_at: undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: undefined,
          assigned_to: undefined,
          is_overdue: task.due_date ? new Date(task.due_date) < new Date() : false,
          overdue_since: undefined,
          approval_status: 'pending' as 'pending',
          approved_by: undefined,
          approved_at: undefined,
          approval_notes: undefined,
          comments: [],
          time_entries: []
        }))
      }))
      
      setMilestones(transformedMilestones)
      
      // Calculate overall progress from milestones
      const totalProgress = bookingData?.project_progress || 0
      const completedMilestones = milestonesData?.filter(m => m.status === 'completed').length || 0
      const totalTasks = milestonesData?.reduce((sum, m) => sum + (m.tasks?.length || 0), 0) || 0
      const completedTasks = milestonesData?.reduce((sum, m) => 
        sum + (m.tasks?.filter(t => t.status === 'completed').length || 0), 0) || 0
      
      // Calculate hours
      const totalEstimatedHours = milestonesData?.reduce((sum, m) => 
        sum + (m.tasks?.reduce((taskSum, t) => taskSum + (t.estimated_hours || 0), 0) || 0), 0) || 0
      const totalActualHours = milestonesData?.reduce((sum, m) => 
        sum + (m.tasks?.reduce((taskSum, t) => taskSum + (t.actual_hours || 0), 0) || 0), 0) || 0
      
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
      setError(error instanceof Error ? error.message : 'Failed to load progress data')
    } finally {
      setLoading(false)
    }
  }

  // If schema is not available, show monthly progress tracking
  // If schema unavailable, show fallback
  if (schemaAvailable === false) {
    return (
      <div className="p-6 text-sm text-gray-600">Schema unavailable.</div>
    )
  }

  // If still checking schema availability
  if (schemaAvailable === null) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking database schema...</p>
        </div>
      </div>
    )
  }

  // If there's an error loading data
  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Data</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null)
              loadData()
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // If loading
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading progress data...</p>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: 'Project Overview', icon: BarChart3 },
    { id: 'monthly', label: 'Monthly Progress', icon: Calendar },
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
    return (
      <div className="p-6 text-sm text-gray-600">No milestones yet.</div>
    )
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
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Main Content */}
      <div className="flex-1 space-y-6">
        {/* Main Progress Header */}
        <MainProgressHeader
          bookingProgress={bookingProgress}
          completedMilestones={milestones.filter(m => m.status === 'completed').length}
          totalMilestones={milestones.length}
          completedTasks={milestones.reduce((sum, m) => 
            sum + (m.tasks?.filter(t => t.status === 'completed').length || 0), 0
          )}
          totalTasks={milestones.reduce((sum, m) => sum + (m.tasks?.length || 0), 0)}
          totalEstimatedHours={milestones.reduce((sum, m) => 
            sum + (m.tasks?.reduce((taskSum, t) => taskSum + (t.estimated_hours || 0), 0) || 0), 0
          )}
          totalActualHours={milestones.reduce((sum, m) => 
            sum + (m.tasks?.reduce((taskSum, t) => taskSum + (t.actual_hours || 0), 0) || 0), 0
          )}
          overdueTasks={milestones.reduce((sum, m) => 
            sum + (m.tasks?.filter(t => {
              if (!t.due_date || t.status === 'completed' || t.status === 'cancelled') return false
              return new Date(t.due_date) < new Date()
            }).length || 0), 0
          )}
        />

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex flex-wrap space-x-2 sm:space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as ViewType)}
                  className={`flex items-center gap-1 sm:gap-2 py-2 px-1 sm:px-2 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
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
            <SimpleMilestones
              milestones={milestones}
              userRole={userRole}
              onMilestoneUpdate={handleMilestoneUpdate}
              onTaskUpdate={(taskId, updates) => {
                // Find milestone
                const m = milestones.find(mm => mm.tasks?.some(t => t.id === taskId))
                if (m) handleTaskUpdate(m.id, taskId, updates)
              }}
              onTaskAdd={(milestoneId, task) => handleAddTask(milestoneId, task)}
              onTaskDelete={(milestoneId, taskId) => handleDeleteTask(milestoneId, taskId)}
              onCommentAdd={(milestoneId, content) => handleAddComment(milestoneId, content)}
              onProjectTypeChange={() => {}}
            />
          )}

          {activeTab === 'monthly' && (
            <SimplifiedMonthlyProgress 
              milestones={milestones} 
              userRole={userRole} 
            />
          )}

          {activeTab === 'timeline' && (
            <TimelineStepper 
              milestones={milestones} 
              userRole={userRole} 
              onMilestoneClick={(milestoneId) => {
                // Handle milestone click - could open details modal or navigate
                console.log('Milestone clicked:', milestoneId)
              }}
              onScrollToMilestone={(milestoneId) => {
                // Scroll to the milestone in the accordion
                const element = document.getElementById(`milestone-${milestoneId}`)
                if (element) {
                  element.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                  })
                  // Add a highlight effect
                  element.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-50')
                  setTimeout(() => {
                    element.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-50')
                  }, 2000)
                }
              }}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsView
              milestones={milestones}
              timeEntries={[]}
              totalEstimatedHours={milestones.reduce((sum, m) => 
                sum + (m.tasks?.reduce((taskSum, t) => taskSum + (t.estimated_hours || 0), 0) || 0), 0
              )}
              totalActualHours={milestones.reduce((sum, m) => 
                sum + (m.tasks?.reduce((taskSum, t) => taskSum + (t.actual_hours || 0), 0) || 0), 0
              )}
            />
          )}

          {activeTab === 'bulk' && (
            <BulkOperationsView
              milestones={milestones}
              onTaskUpdate={async (taskId, updates) => {
                // Find the milestone that contains this task
                const milestone = milestones.find(m => m.tasks?.some(t => t.id === taskId))
                if (milestone) {
                  await handleTaskUpdate(milestone.id, taskId, updates)
                }
              }}
              onTaskDelete={async (taskId) => {
                // Find the milestone that contains this task
                const milestone = milestones.find(m => m.tasks?.some(t => t.id === taskId))
                if (milestone) {
                  await handleDeleteTask(milestone.id, taskId)
                }
              }}
              onMilestoneUpdate={async (milestoneId, updates) => {
                await handleMilestoneUpdate(milestoneId, updates)
              }}
            />
          )}
        </div>

        {/* Summary Footer */}
        <ProgressSummaryFooter 
          bookingProgress={bookingProgress}
          milestones={milestones}
        />

        {/* Global Time Tracking Status */}
      </div>

      {/* Smart Suggestions Sidebar */}
      <SmartSuggestionsSidebar
        milestones={milestones}
        bookingProgress={bookingProgress}
        timeEntries={[]}
        userRole={userRole}
        onRefresh={loadData}
      />
    </div>
  )
}

