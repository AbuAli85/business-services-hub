import { useState, useEffect, useCallback, useRef } from 'react'
import { backendProgressService, BackendProgressUpdate } from '@/lib/backend-progress-service'

export interface UseBackendProgressOptions {
  bookingId: string
  milestoneId?: string
  taskId?: string
  autoRefresh?: boolean
  refreshInterval?: number
}

export interface BackendProgressState {
  bookingProgress: any | null
  milestones: any[]
  tasks: any[]
  loading: boolean
  error: string | null
  lastUpdated: Date | null
}

export function useBackendProgress({
  bookingId,
  milestoneId,
  taskId,
  autoRefresh = true,
  refreshInterval = 30000 // 30 seconds
}: UseBackendProgressOptions) {
  const [state, setState] = useState<BackendProgressState>({
    bookingProgress: null,
    milestones: [],
    tasks: [],
    loading: true,
    error: null,
    lastUpdated: null
  })

  const subscriptionsRef = useRef<Array<{ unsubscribe: () => void }>>([])
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))

      // Load booking progress
      const bookingProgress = await backendProgressService.getBookingProgress(bookingId)
      
      // Load milestones
      const milestones = await backendProgressService.getMilestonesForBooking(bookingId)
      
      // Load tasks if milestoneId is provided
      let tasks: any[] = []
      if (milestoneId) {
        tasks = await backendProgressService.getTasksForMilestone(milestoneId)
      }

      setState(prev => ({
        ...prev,
        bookingProgress,
        milestones,
        tasks,
        loading: false,
        lastUpdated: new Date()
      }))
    } catch (error) {
      console.error('Error loading progress data:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load progress data'
      }))
    }
  }, [bookingId, milestoneId])

  // Update task progress
  const updateTaskProgress = useCallback(async (taskId: string, updates: {
    status?: string
    progress_percentage?: number
    title?: string
    due_date?: string
    [key: string]: any
  }) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))

      const result = await backendProgressService.updateTaskProgress(taskId, updates)
      
      // Update local state optimistically
      setState(prev => ({
        ...prev,
        tasks: prev.tasks.map(task => 
          task.id === taskId ? { ...task, ...result.task } : task
        ),
        milestones: prev.milestones.map(milestone => 
          milestone.id === result.task.milestone_id 
            ? { ...milestone, ...result.milestone_progress }
            : milestone
        ),
        loading: false,
        lastUpdated: new Date()
      }))

      return result
    } catch (error) {
      console.error('Error updating task progress:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to update task progress'
      }))
      throw error
    }
  }, [])

  // Validate transition
  const canTransition = useCallback(async (
    currentStatus: string, 
    newStatus: string, 
    entityType: 'task' | 'milestone' = 'task'
  ) => {
    try {
      return await backendProgressService.canTransition(currentStatus, newStatus, entityType)
    } catch (error) {
      console.error('Error validating transition:', error)
      return false
    }
  }, [])

  // Recalculate milestone progress
  const recalculateMilestoneProgress = useCallback(async (milestoneId: string) => {
    try {
      const result = await backendProgressService.recalculateMilestoneProgress(milestoneId)
      
      // Update local state
      setState(prev => ({
        ...prev,
        milestones: prev.milestones.map(milestone => 
          milestone.id === milestoneId 
            ? { ...milestone, ...result }
            : milestone
        ),
        lastUpdated: new Date()
      }))

      return result
    } catch (error) {
      console.error('Error recalculating milestone progress:', error)
      throw error
    }
  }, [])

  // Handle realtime updates
  const handleRealtimeUpdate = useCallback((update: BackendProgressUpdate) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(task => 
        task.id === update.task.id ? { ...task, ...update.task } : task
      ),
      milestones: prev.milestones.map(milestone => 
        milestone.id === update.task.milestone_id 
          ? { ...milestone, ...update.milestone_progress }
          : milestone
      ),
      lastUpdated: new Date()
    }))
  }, [])

  // Setup subscriptions
  useEffect(() => {
    if (!autoRefresh) return

    const setupSubscriptions = async () => {
      try {
        // Subscribe to booking updates
        const bookingSubscription = await backendProgressService.subscribeToBookingUpdates(
          bookingId,
          handleRealtimeUpdate
        )
        subscriptionsRef.current.push(bookingSubscription)

        // Subscribe to milestone updates if milestoneId is provided
        if (milestoneId) {
          const milestoneSubscription = await backendProgressService.subscribeToMilestoneUpdates(
            milestoneId,
            (milestone) => {
              setState(prev => ({
                ...prev,
                milestones: prev.milestones.map(m => 
                  m.id === milestoneId ? milestone : m
                ),
                lastUpdated: new Date()
              }))
            }
          )
          subscriptionsRef.current.push(milestoneSubscription)
        }

        // Subscribe to task updates if taskId is provided
        if (taskId) {
          const taskSubscription = await backendProgressService.subscribeToTaskUpdates(
            taskId,
            (task) => {
              setState(prev => ({
                ...prev,
                tasks: prev.tasks.map(t => 
                  t.id === taskId ? task : t
                ),
                lastUpdated: new Date()
              }))
            }
          )
          subscriptionsRef.current.push(taskSubscription)
        }
      } catch (error) {
        console.error('Error setting up subscriptions:', error)
      }
    }

    setupSubscriptions()

    return () => {
      subscriptionsRef.current.forEach(subscription => subscription.unsubscribe())
      subscriptionsRef.current = []
    }
  }, [bookingId, milestoneId, taskId, autoRefresh, handleRealtimeUpdate])

  // Setup auto-refresh
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return

    refreshIntervalRef.current = setInterval(() => {
      loadData()
    }, refreshInterval)

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
        refreshIntervalRef.current = null
      }
    }
  }, [autoRefresh, refreshInterval, loadData])

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [loadData])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      subscriptionsRef.current.forEach(subscription => subscription.unsubscribe())
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [])

  return {
    ...state,
    updateTaskProgress,
    canTransition,
    recalculateMilestoneProgress,
    refresh: loadData
  }
}

