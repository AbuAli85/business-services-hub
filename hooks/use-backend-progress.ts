import { useState, useEffect, useCallback, useRef } from 'react'
import { getSupabaseClient } from '@/lib/supabase-client'

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

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Load initial data using unified v_booking_status system
  const loadData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))

      const supabase = getSupabaseClient()

      // Load booking data from v_booking_status
      const { data: bookingData, error: bookingError } = await supabase
        .from('v_booking_status')
        .select('*')
        .eq('id', bookingId)
        .single()

      if (bookingError) throw bookingError

      // Load milestones
      const { data: milestones, error: milestonesError } = await supabase
        .from('milestones')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true })

      if (milestonesError) throw milestonesError

      // Load tasks if milestoneId is provided
      let tasks: any[] = []
      if (milestoneId) {
        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select('*')
          .eq('milestone_id', milestoneId)
          .order('created_at', { ascending: true })

        if (tasksError) throw tasksError
        tasks = tasksData || []
      }

      setState(prev => ({
        ...prev,
        bookingProgress: bookingData,
        milestones: milestones || [],
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
  const updateTaskProgress = useCallback(async (taskId: string, updates: any) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))

      const supabase = getSupabaseClient()
      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)

      if (error) throw error

      // Reload data to get updated progress
      await loadData()
    } catch (error) {
      console.error('Error updating task progress:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to update task progress'
      }))
    }
  }, [loadData])

  // Validate status transition
  const canTransition = useCallback(async (
    currentStatus: string,
    newStatus: string,
    entityType: 'task' | 'milestone'
  ) => {
    // Simple validation - can be enhanced with more complex rules
    const validTransitions: Record<string, string[]> = {
      'pending': ['in_progress', 'cancelled'],
      'in_progress': ['completed', 'cancelled'],
      'completed': ['in_progress'], // Allow reopening
      'cancelled': ['pending'] // Allow restarting
    }

    return validTransitions[currentStatus]?.includes(newStatus) || false
  }, [])

  // Recalculate milestone progress
  const recalculateMilestoneProgress = useCallback(async (milestoneId: string) => {
    try {
      const supabase = getSupabaseClient()
      
      // Get all tasks for this milestone
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('milestone_id', milestoneId)

      if (tasksError) throw tasksError

      // Calculate progress
      const completedTasks = tasks?.filter(task => task.status === 'completed').length || 0
      const totalTasks = tasks?.length || 0
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

      // Update milestone progress
      const { error: updateError } = await supabase
        .from('milestones')
        .update({ progress_percentage: progress })
        .eq('id', milestoneId)

      if (updateError) throw updateError

      // Reload data
      await loadData()
    } catch (error) {
      console.error('Error recalculating milestone progress:', error)
    }
  }, [loadData])

  // Setup auto-refresh
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(() => {
        loadData()
      }, refreshInterval)
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [autoRefresh, refreshInterval, loadData])

  // Load data on mount and when dependencies change
  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    ...state,
    updateTaskProgress,
    canTransition,
    recalculateMilestoneProgress,
    refresh: loadData
  }
}