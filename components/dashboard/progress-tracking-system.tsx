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
import { Milestone, Task, BookingProgress, TimeEntry, Comment, MilestoneApproval } from '@/types/progress'
import { ProgressDataService } from '@/lib/progress-data-service'
import { MainProgressHeader } from './main-progress-header'
import ProgressErrorBoundary from './ProgressErrorBoundary'
import { MilestoneSkeleton, TaskSkeleton, CommentSkeleton, ActionRequestSkeleton } from './skeletons'
import { SmartSuggestionsSidebar } from './smart-suggestions-sidebar'
import { SimpleMilestones } from './simple-milestones'
// Removed TimelineManagement import - using placeholder instead
import { useProgressUpdates } from '@/hooks/use-progress-updates'
import { toast } from 'sonner'
import { QuickMilestoneCreator } from './quick-milestone-creator'
import { FallbackMilestoneCreator } from './fallback-milestone-creator'

interface ProgressTrackingSystemProps {
  bookingId: string
  userRole: 'provider' | 'client'
  className?: string
}

export function ProgressTrackingSystem({ 
  bookingId, 
  userRole, 
  className = "" 
}: ProgressTrackingSystemProps) {
  
  // State management
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [commentsByMilestone, setCommentsByMilestone] = useState<Record<string, Comment[]>>({})
  const [actionRequests, setActionRequests] = useState<any[]>([])
  const [approvalsByMilestone, setApprovalsByMilestone] = useState<Record<string, MilestoneApproval[]>>({})
  const [overallProgress, setOverallProgress] = useState(0)
  const [totalTasks, setTotalTasks] = useState(0)
  const [completedTasks, setCompletedTasks] = useState(0)
  const [totalEstimatedHours, setTotalEstimatedHours] = useState(0)
  const [totalActualHours, setTotalActualHours] = useState(0)
  const [overdueTasks, setOverdueTasks] = useState(0)
  const [bookingProgress, setBookingProgress] = useState<BookingProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [showMilestoneCreator, setShowMilestoneCreator] = useState(false)
  const [useFallbackMode, setUseFallbackMode] = useState(false)

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
          ? { ...m, progress: updates.milestoneProgress }
          : m
      ))
      setBookingProgress(prev => prev ? {
        ...prev,
        booking_progress: updates.overallProgress
      } : null)
    }
  })

  // Real-time subscription setup
  useEffect(() => {
    if (!bookingId) return;

    let cleanup: (() => void) | undefined;

    const setupSubscription = async () => {
      cleanup = await ProgressDataService.subscribeToProgressUpdates(
        bookingId,
        async () => {
          // Reload data when changes are detected
          const data = await ProgressDataService.getProgressData(bookingId);
          setMilestones(data.milestones);
          setTimeEntries(data.timeEntries);
          setOverallProgress(data.overallProgress);
          setTotalTasks(data.totalTasks);
          setCompletedTasks(data.completedTasks);
          setTotalEstimatedHours(data.totalEstimatedHours);
          setTotalActualHours(data.totalActualHours);
        }
      );
    };

    setupSubscription();

    return () => {
      if (cleanup) cleanup();
    };
  }, [bookingId]);

  // Load all data from database
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Load progress data from database
      const progressData = await ProgressDataService.getProgressData(bookingId)
      setMilestones(progressData.milestones)
      setTimeEntries(progressData.timeEntries)
      setOverallProgress(progressData.overallProgress)
      setTotalTasks(progressData.totalTasks)
      setCompletedTasks(progressData.completedTasks)
      setTotalEstimatedHours(progressData.totalEstimatedHours)
      setTotalActualHours(progressData.totalActualHours)

      // Load comments (booking-wide) and index by milestone
      const allCommentsByMilestone = await ProgressDataService.getAllCommentsForBooking(bookingId)
      setCommentsByMilestone(allCommentsByMilestone)

      // Load action requests
      const requests = await ProgressDataService.getActionRequests(bookingId)
      setActionRequests(requests)

      // Load approvals for all milestones
      const approvalsGrouped: Record<string, MilestoneApproval[]> = {}
      for (const m of progressData.milestones) {
        try {
          const approvals = await ProgressDataService.getApprovals(m.id)
          approvalsGrouped[m.id] = approvals
        } catch {}
      }
      setApprovalsByMilestone(approvalsGrouped)

    } catch (err) {
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

  // Load data on mount
  useEffect(() => {
    if (bookingId) {
      loadData()
    }
  }, [bookingId, loadData])

  // Subscribe to approvals realtime
  useEffect(() => {
    if (!bookingId) return
    let cleanup: (() => void) | undefined
    const setup = async () => {
      cleanup = await ProgressDataService.subscribeToApprovals(bookingId, async () => {
        await loadData()
      })
    }
    setup()
    return () => { if (cleanup) cleanup() }
  }, [bookingId, loadData])

  // Subscribe to comments realtime
  useEffect(() => {
    if (!bookingId) return
    let cleanup: (() => void) | undefined
    const setup = async () => {
      cleanup = await ProgressDataService.subscribeToComments(bookingId, async () => {
        await loadData()
      })
    }
    setup()
    return () => { if (cleanup) cleanup() }
  }, [bookingId, loadData])

  // Task management handlers
  const handleTaskUpdate = useCallback(async (taskId: string, updates: Partial<Task>) => {
    try {
      await updateTaskProgress(taskId, updates)
      toast.success('Task updated successfully')
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error('Failed to update task')
    }
  }, [updateTaskProgress])

  const handleTaskCreate = useCallback(async (milestoneId: string, task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'is_overdue' | 'actual_hours'>) => {
    try {
      await addTask(milestoneId, task)
      toast.success('Task created successfully')
    } catch (error) {
      console.error('Error creating task:', error)
      toast.error('Failed to create task')
    }
  }, [addTask])

  const handleTaskDelete = useCallback(async (taskId: string) => {
    try {
      await deleteTask(taskId)
      toast.success('Task deleted successfully')
    } catch (error) {
      console.error('Error deleting task:', error)
      toast.error('Failed to delete task')
    }
  }, [deleteTask])

  // Milestone management handlers
  const handleMilestoneUpdate = useCallback(async (milestoneId: string, updates: Partial<Milestone>) => {
    try {
      await updateMilestoneProgress(milestoneId, updates)
      toast.success('Milestone updated successfully')
    } catch (error) {
      console.error('Error updating milestone:', error)
      toast.error('Failed to update milestone')
    }
  }, [updateMilestoneProgress])

  // Comment management handlers
  const handleCommentAdd = useCallback(async (milestoneId: string, content: string) => {
    try {
      // optimistic update
      setCommentsByMilestone(prev => {
        const next = { ...prev }
        const list = next[milestoneId] ? [...next[milestoneId]] : []
        list.push({
          id: `temp-${Date.now()}`,
          milestone_id: milestoneId,
          content,
          booking_id: bookingId,
          user_id: 'me',
          author_name: 'You',
          author_role: userRole,
          created_at: new Date().toISOString()
        } as Comment)
        next[milestoneId] = list
        return next
      })

      await ProgressDataService.addComment(bookingId, milestoneId, content)
      toast.success('Comment added successfully')
      await loadData()
    } catch (error) {
      console.error('Error adding comment:', error)
      toast.error('Failed to add comment')
    }
  }, [loadData])

  const handleActionRequest = useCallback(async (milestoneId: string, request: any) => {
    try {
      // This would be implemented based on your action request system
      console.log('Action request:', { milestoneId, request })
      toast.success('Action request submitted')
    } catch (error) {
      console.error('Error submitting action request:', error)
      toast.error('Failed to submit action request')
    }
  }, [])

  // Time logging handlers
  const handleTimeLog = useCallback(async (taskId: string, duration: number, description: string) => {
    try {
      await ProgressDataService.logTime(bookingId, taskId, duration, description)
      toast.success('Time logged successfully')
      await loadData()
    } catch (error) {
      console.error('Error logging time:', error)
      toast.error('Failed to log time')
    }
  }, [loadData])

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <MilestoneSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <TaskSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <CommentSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <ActionRequestSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Data</h3>
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

  // If no milestones exist, show empty state
  if (milestones.length === 0) {
    return (
      <ProgressErrorBoundary>
        <div className={`space-y-6 ${className}`}>
          <div className="flex flex-col items-center justify-center p-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <div className="text-center max-w-md">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Progress Data Yet</h3>
              <p className="text-gray-600 mb-6">
                This booking doesn't have any milestones or progress tracking set up yet. 
                {userRole === 'provider' ? ' You can start by creating milestones and tasks.' : ' The provider will set up progress tracking soon.'}
              </p>
              {userRole === 'provider' && (
                <div className="space-y-3">
                  <Button 
                    onClick={() => setShowMilestoneCreator(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Target className="h-4 w-4 mr-2" />
                    Create First Milestone
                  </Button>
                  <p className="text-xs text-gray-500">
                    Milestones help break down the project into manageable phases
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </ProgressErrorBoundary>
    )
  }

  return (
    <ProgressErrorBoundary>
    <div className={`space-y-6 ${className}`}>
      {/* Header with progress overview */}
      <MainProgressHeader
        bookingProgress={{
          booking_progress: overallProgress,
          booking_title: 'Project Progress',
          booking_status: 'in_progress'
        }}
        completedMilestones={milestones.filter(m => m.status === 'completed').length}
        totalMilestones={milestones.length}
        completedTasks={completedTasks}
        totalTasks={totalTasks}
        totalEstimatedHours={totalEstimatedHours}
        totalActualHours={totalActualHours}
        overdueTasks={overdueTasks}
      />
      
      {/* Grouped by month */}
      <div className="space-y-6">
        {(() => {
          const groups: Record<string, Milestone[]> = {}
          for (const m of milestones) {
            const k = String((m as any).month_number ?? '0')
            if (!groups[k]) groups[k] = []
            groups[k].push(m)
          }
          const keys = Object.keys(groups).sort((a,b)=>Number(a)-Number(b))
          return keys.map(k => (
            <div key={k} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">{`Month ${k}`}</h3>
              </div>
              <SimpleMilestones
                milestones={groups[k] as any}
                userRole={userRole}
                onTaskUpdate={handleTaskUpdate}
                onTaskAdd={handleTaskCreate}
                onTaskDelete={handleTaskDelete}
                onMilestoneUpdate={handleMilestoneUpdate}
                onCommentAdd={handleCommentAdd}
                onProjectTypeChange={() => {}}
                commentsByMilestone={commentsByMilestone}
                approvalsByMilestone={approvalsByMilestone}
              />
            </div>
          ))
        })()}
      </div>

      {/* Main content tabs (kept for analytics) */}
      <Tabs defaultValue="milestones" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="milestones" className="flex items-center space-x-2">
            <Target className="h-4 w-4" />
            <span>Milestones</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Analytics</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="milestones" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main milestones view */}
            <div className="lg:col-span-3">
              <SimpleMilestones
                milestones={milestones as any}
                userRole={userRole}
                onTaskUpdate={handleTaskUpdate}
                onTaskAdd={handleTaskCreate}
                onTaskDelete={handleTaskDelete}
                onMilestoneUpdate={handleMilestoneUpdate}
                onCommentAdd={handleCommentAdd}
                onProjectTypeChange={() => {}}
                commentsByMilestone={commentsByMilestone}
              />
            </div>

            {/* Sidebar with suggestions */}
            <div className="lg:col-span-1">
              <SmartSuggestionsSidebar
                milestones={milestones as any}
                userRole={userRole}
                bookingProgress={bookingProgress}
                timeEntries={timeEntries as any}
                onRefresh={loadData}
              />
            </div>
          </div>
        </TabsContent>


        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Progress Analytics</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{overallProgress}%</div>
                  <div className="text-sm text-blue-600">Overall Progress</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{completedTasks}</div>
                  <div className="text-sm text-green-600">Completed Tasks</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{totalActualHours}h</div>
                  <div className="text-sm text-orange-600">Actual Hours</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{milestones.length}</div>
                  <div className="text-sm text-purple-600">Total Milestones</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Milestone Creator Modal */}
      {showMilestoneCreator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            {useFallbackMode ? (
              <FallbackMilestoneCreator
                bookingId={bookingId}
                onMilestoneCreated={() => {
                  setShowMilestoneCreator(false)
                  loadData()
                }}
                onCancel={() => setShowMilestoneCreator(false)}
              />
            ) : (
              <QuickMilestoneCreator
                bookingId={bookingId}
                onMilestoneCreated={() => {
                  setShowMilestoneCreator(false)
                  loadData()
                }}
                onCancel={() => setShowMilestoneCreator(false)}
              />
            )}
          </div>
        </div>
      )}
    </div>
    </ProgressErrorBoundary>
  )
}