'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  BarChart3, 
  Calendar, 
  Clock, 
  Target, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Play,
  Pause,
  RefreshCw
} from 'lucide-react'
import { ProgressTrackingService, Milestone, Task, BookingProgress, TimeEntry } from '@/lib/progress-tracking'
import { MainProgressHeader } from './main-progress-header'
import { SmartSuggestionsSidebar } from './smart-suggestions-sidebar'
import { AnalyticsView } from './analytics-view'
import { BulkOperationsView } from './bulk-operations-view'
import { useProgressUpdates } from '@/hooks/use-progress-updates'
import toast from 'react-hot-toast'

interface ProgressTrackingSystemProps {
  bookingId: string
  userRole: 'provider' | 'client'
  className?: string
}

type ViewType = 'overview' | 'monthly' | 'timeline' | 'analytics' | 'bulk'

export function ProgressTrackingSystem({ 
  bookingId, 
  userRole, 
  className = "" 
}: ProgressTrackingSystemProps) {
  const [activeView, setActiveView] = useState<ViewType>('overview')
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [bookingProgress, setBookingProgress] = useState<BookingProgress | null>(null)
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

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

  // Load all data
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('Loading progress data for booking:', bookingId)

      // Load milestones first
      const milestonesData = await ProgressTrackingService.getMilestones(bookingId)
      console.log('Loaded milestones:', milestonesData)

      // Try to load booking progress, but don't fail if it doesn't exist
      let progressData = null
      try {
        progressData = await ProgressTrackingService.getBookingProgress(bookingId)
        console.log('Loaded booking progress:', progressData)
      } catch (progressError) {
        console.warn('Could not load booking progress, using fallback:', progressError)
        // Create a fallback progress object
        progressData = {
          booking_id: bookingId,
          booking_title: 'Project Progress',
          booking_status: 'in_progress',
          booking_progress: 0,
          completed_milestones: 0,
          total_milestones: milestonesData.length,
          completed_tasks: 0,
          total_tasks: milestonesData.reduce((sum, m) => sum + (m.tasks?.length || 0), 0),
          total_estimated_hours: 0,
          total_actual_hours: 0,
          overdue_tasks: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      }

      // Try to load time entries, but don't fail if it doesn't work
      let timeEntriesData: TimeEntry[] = []
      try {
        timeEntriesData = await ProgressTrackingService.getTimeEntriesByBookingId(bookingId)
        console.log('Loaded time entries:', timeEntriesData)
      } catch (timeError) {
        console.warn('Could not load time entries:', timeError)
        timeEntriesData = []
      }

      setMilestones(milestonesData)
      setBookingProgress(progressData)
      setTimeEntries(timeEntriesData)
    } catch (err) {
      console.error('Error loading progress data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load progress data')
      toast.error('Failed to load progress data')
    } finally {
      setLoading(false)
    }
  }, [bookingId])

  // Refresh data
  const refreshData = useCallback(async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
    toast.success('Data refreshed')
  }, [loadData])

  // Load data on mount and when bookingId changes
  useEffect(() => {
    loadData()
  }, [loadData])

  // Handle task operations
  const handleTaskUpdate = useCallback(async (taskId: string, updates: Partial<Task>) => {
    try {
      await ProgressTrackingService.updateTask(taskId, updates)
      await loadData() // Refresh data
      toast.success('Task updated successfully')
    } catch (err) {
      console.error('Error updating task:', err)
      toast.error('Failed to update task')
    }
  }, [loadData])

  const handleTaskCreate = useCallback(async (milestoneId: string, taskData: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'is_overdue' | 'actual_hours'>) => {
    try {
      const fullTaskData: Task = {
        ...taskData,
        milestone_id: milestoneId,
        actual_hours: 0,
        id: '', // Will be generated by the service
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_overdue: false
      }
      await ProgressTrackingService.createTask(fullTaskData)
      await loadData() // Refresh data
      toast.success('Task created successfully')
    } catch (err) {
      console.error('Error creating task:', err)
      toast.error('Failed to create task')
    }
  }, [loadData])

  const handleTaskDelete = useCallback(async (taskId: string) => {
    try {
      await ProgressTrackingService.deleteTask(taskId)
      await loadData() // Refresh data
      toast.success('Task deleted successfully')
    } catch (err) {
      console.error('Error deleting task:', err)
      toast.error('Failed to delete task')
    }
  }, [loadData])

  // Handle milestone operations
  const handleMilestoneUpdate = useCallback(async (milestoneId: string, updates: Partial<Milestone>) => {
    try {
      await ProgressTrackingService.updateMilestone(milestoneId, updates)
      await loadData() // Refresh data
      toast.success('Milestone updated successfully')
    } catch (err) {
      console.error('Error updating milestone:', err)
      toast.error('Failed to update milestone')
    }
  }, [loadData])

  // Handle time tracking
  const handleStartTimeTracking = useCallback(async (taskId: string, description?: string) => {
    try {
      const userId = 'current-user-id' // TODO: Get from auth context
      await ProgressTrackingService.startTimeTracking(taskId, userId, description)
      await loadData() // Refresh data
      toast.success('Time tracking started')
    } catch (err) {
      console.error('Error starting time tracking:', err)
      toast.error('Failed to start time tracking')
    }
  }, [loadData])

  const handleStopTimeTracking = useCallback(async (entryId: string) => {
    try {
      await ProgressTrackingService.stopTimeTracking(entryId)
      await loadData() // Refresh data
      toast.success('Time tracking stopped')
    } catch (err) {
      console.error('Error stopping time tracking:', err)
      toast.error('Failed to stop time tracking')
    }
  }, [loadData])

  // Calculate derived data
  const completedMilestones = milestones.filter(m => m.status === 'completed').length
  const totalMilestones = milestones.length
  const completedTasks = milestones.reduce((sum, m) => 
    sum + (m.tasks?.filter(t => t.status === 'completed').length || 0), 0
  )
  const totalTasks = milestones.reduce((sum, m) => sum + (m.tasks?.length || 0), 0)
  const totalEstimatedHours = milestones.reduce((sum, m) => sum + (m.estimated_hours || 0), 0)
  const totalActualHours = timeEntries.reduce((sum, entry) => 
    sum + (entry.duration_minutes || 0) / 60, 0
  )
  const overdueTasks = milestones.reduce((sum, m) => 
    sum + (m.tasks?.filter(t => t.is_overdue).length || 0), 0
  )

  // Loading state
  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span>Loading progress data...</span>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Progress</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={loadData} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Add error boundary for render
  try {
    return (
      <div className={`space-y-6 ${className}`}>
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Progress Tracking</h2>
          <p className="text-gray-600">Monitor and manage project progress</p>
        </div>
        <Button 
          onClick={refreshData} 
          disabled={refreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

        {/* Main Progress Header */}
        <MainProgressHeader
          bookingProgress={bookingProgress || {
            booking_progress: 0,
            booking_title: 'Project Progress',
            booking_status: 'in_progress'
          }}
          completedMilestones={completedMilestones || 0}
          totalMilestones={totalMilestones || 0}
          completedTasks={completedTasks || 0}
          totalTasks={totalTasks || 0}
          totalEstimatedHours={totalEstimatedHours || 0}
          totalActualHours={totalActualHours || 0}
          overdueTasks={overdueTasks || 0}
        />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3">
          <Tabs value={activeView} onValueChange={(value) => setActiveView(value as ViewType)}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview" className="flex items-center space-x-2">
                <Target className="h-4 w-4" />
                <span>Overview</span>
              </TabsTrigger>
              <TabsTrigger value="monthly" className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Monthly</span>
              </TabsTrigger>
              <TabsTrigger value="timeline" className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>Timeline</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4" />
                <span>Analytics</span>
              </TabsTrigger>
              {userRole === 'provider' && (
                <TabsTrigger value="bulk" className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4" />
                  <span>Bulk Ops</span>
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
            <MilestonesAccordion
              milestones={milestones || []}
              userRole={userRole}
              onTaskUpdate={handleTaskUpdate}
              onTaskCreate={handleTaskCreate}
              onTaskDelete={handleTaskDelete}
              onMilestoneUpdate={handleMilestoneUpdate}
              onStartTimeTracking={handleStartTimeTracking}
              onStopTimeTracking={handleStopTimeTracking}
              timeEntries={timeEntries || []}
            />
            </TabsContent>

            <TabsContent value="monthly" className="space-y-6">
              <MonthlyProgressTab
                milestones={milestones || []}
                userRole={userRole}
                onTaskUpdate={handleTaskUpdate}
                onTaskCreate={handleTaskCreate}
                onTaskDelete={handleTaskDelete}
                onMilestoneUpdate={handleMilestoneUpdate}
              />
            </TabsContent>

            <TabsContent value="timeline" className="space-y-6">
              <TimelineView
                milestones={milestones || []}
                userRole={userRole}
                onMilestoneClick={(milestoneId) => {
                  // Scroll to milestone in accordion
                  const element = document.getElementById(`milestone-${milestoneId}`)
                  element?.scrollIntoView({ behavior: 'smooth' })
                }}
              />
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <AnalyticsView
                milestones={milestones || []}
                timeEntries={timeEntries || []}
                totalEstimatedHours={totalEstimatedHours || 0}
                totalActualHours={totalActualHours || 0}
              />
            </TabsContent>

            {userRole === 'provider' && (
              <TabsContent value="bulk" className="space-y-6">
                <BulkOperationsView
                  milestones={milestones || []}
                  onTaskUpdate={handleTaskUpdate}
                  onTaskDelete={handleTaskDelete}
                  onMilestoneUpdate={handleMilestoneUpdate}
                />
              </TabsContent>
            )}
          </Tabs>
        </div>

        {/* Smart Suggestions Sidebar */}
        <div className="lg:col-span-1">
          <SmartSuggestionsSidebar
            milestones={milestones || []}
            bookingProgress={bookingProgress}
            timeEntries={timeEntries || []}
            userRole={userRole}
            onRefresh={refreshData}
          />
        </div>
      </div>
    </div>
  )
  } catch (renderError) {
    console.error('Error rendering ProgressTrackingSystem:', renderError)
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Render Error</h3>
              <p className="text-gray-600 mb-4">An error occurred while rendering the progress tracking system.</p>
              <Button onClick={loadData} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
}
