import { useState, useCallback } from 'react'
import { Milestone, Task, ProgressUpdate } from '@/types/progress'
import { 
  calculateMilestoneProgress, 
  calculateOverallProgress, 
  updateMilestoneProgress as calculateUpdatedMilestone,
  isTaskOverdue,
  isMilestoneOverdue
} from '@/lib/progress-calculations'

// Helper function to transform milestone data to match the expected interface
const transformMilestoneData = (milestoneData: any): Milestone => ({
  ...milestoneData,
  booking_id: milestoneData.booking_id || '',
  priority: milestoneData.priority || 'medium',
  created_at: milestoneData.created_at || new Date().toISOString(),
  updated_at: milestoneData.updated_at || new Date().toISOString(),
  is_overdue: milestoneData.is_overdue || false,
  estimated_hours: milestoneData.estimated_hours || 0,
  actual_hours: milestoneData.actual_hours || 0,
  tags: milestoneData.tags || [],
  notes: milestoneData.notes || '',
  assigned_to: milestoneData.assigned_to || undefined,
  created_by: milestoneData.created_by || undefined,
  completed_at: milestoneData.completed_at || undefined,
  overdue_since: milestoneData.overdue_since || undefined,
  tasks: milestoneData.tasks || []
})

interface UseProgressUpdatesProps {
  bookingId: string
  onProgressUpdate?: (updates: ProgressUpdate) => void
}

export function useProgressUpdates({ bookingId, onProgressUpdate }: UseProgressUpdatesProps) {
  const [isUpdating, setIsUpdating] = useState(false)

  const updateTaskProgress = useCallback(async (
    taskId: string,
    updates: Partial<Task>
  ) => {
    try {
      setIsUpdating(true)
      
      // Update task via RPC to avoid RLS/schema issues
      const { getSupabaseClient } = await import('@/lib/supabase')
      const supabase = await getSupabaseClient()

      // Look up milestone_id for this task to recalculate progress later
      const { data: taskRow, error: taskLookupError } = await supabase
        .from('tasks')
        .select('milestone_id')
        .eq('id', taskId)
        .single()
      if (taskLookupError || !taskRow) {
        throw new Error(taskLookupError?.message || 'Task not found')
      }
      const milestoneId: string = taskRow.milestone_id
      
      const { error } = await supabase.rpc('update_task', {
        task_id: taskId,
        title: (updates.title as any) ?? null,
        status: (updates.status as any) ?? null,
        due_date: (updates.due_date as any) ?? null
      })
      
      if (error) {
        throw new Error(error.message)
      }

      // Get updated milestone with all tasks
      const { data: milestoneData, error: milestoneError } = await supabase
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
        .eq('id', milestoneId)
        .single()

      if (milestoneError) {
        throw new Error(milestoneError.message)
      }

      // Calculate new milestone progress
      const updatedMilestone = calculateUpdatedMilestone(transformMilestoneData(milestoneData) as any)
      const milestoneProgress = calculateMilestoneProgress(updatedMilestone)

      // Update milestone progress via RPC (best-effort)
      const { error: updateError } = await supabase.rpc('update_milestone_progress', {
        milestone_uuid: milestoneId
      })

      if (updateError) {
        throw new Error(updateError.message)
      }

      // Get all milestones to calculate overall progress
      const { data: allMilestones, error: allMilestonesError } = await supabase
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

      if (allMilestonesError) {
        throw new Error(allMilestonesError.message)
      }

      const transformedMilestones = (allMilestones || []).map(transformMilestoneData)
      const overallProgress = calculateOverallProgress(transformedMilestones as any)

      // Update booking progress via RPC
      const { error: bookingError } = await supabase.rpc('calculate_booking_progress', {
        booking_id: bookingId
      })

      if (bookingError) {
        console.warn('Error updating booking progress:', bookingError)
      }

      // Notify parent component
      onProgressUpdate?.({
        milestoneId,
        milestoneProgress,
        overallProgress: overallProgress.overallProgress
      })

      return {
        success: true,
        milestoneProgress,
        overallProgress: overallProgress.overallProgress
      }
    } catch (error) {
      console.error('Error updating task progress:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    } finally {
      setIsUpdating(false)
    }
  }, [bookingId, onProgressUpdate])

  const updateMilestoneProgress = useCallback(async (
    milestoneId: string,
    updates: Partial<Milestone>
  ) => {
    try {
      setIsUpdating(true)
      
      const { getSupabaseClient } = await import('@/lib/supabase')
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('milestones')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', milestoneId)
      
      if (error) {
        throw new Error(error.message)
      }

      return { success: true }
    } catch (error) {
      console.error('Error updating milestone:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    } finally {
      setIsUpdating(false)
    }
  }, [])

  const addTask = useCallback(async (
    milestoneId: string,
    task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'is_overdue' | 'actual_hours'>
  ) => {
    try {
      setIsUpdating(true)
      
      const { getSupabaseClient } = await import('@/lib/supabase')
      const supabase = await getSupabaseClient()
      
      const { data, error } = await supabase.rpc('add_task', {
        milestone_id: milestoneId,
        title: task.title,
        due_date: (task.due_date as any) ?? null
      })
      
      if (error) {
        throw new Error(error.message)
      }

      // Recalculate milestone progress
      const { data: milestoneData, error: milestoneError } = await supabase
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
        .eq('id', milestoneId)
        .single()

      if (milestoneError) {
        throw new Error(milestoneError.message)
      }

      const updatedMilestone = calculateUpdatedMilestone(transformMilestoneData(milestoneData) as any)
      const milestoneProgress = calculateMilestoneProgress(updatedMilestone)

      // Update milestone progress
      const { error: updateError } = await supabase.rpc('update_milestone_progress', {
        milestone_uuid: milestoneId
      })

      if (updateError) {
        throw new Error(updateError.message)
      }

      return { success: true, task: data }
    } catch (error) {
      console.error('Error adding task:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    } finally {
      setIsUpdating(false)
    }
  }, [])

  const deleteTask = useCallback(async (
    taskId: string
  ) => {
    try {
      setIsUpdating(true)
      
      const { getSupabaseClient } = await import('@/lib/supabase')
      const supabase = await getSupabaseClient()

      // Look up milestone_id before deletion so we can recalc its progress
      const { data: taskRow, error: taskLookupError } = await supabase
        .from('tasks')
        .select('milestone_id')
        .eq('id', taskId)
        .single()
      if (taskLookupError || !taskRow) {
        throw new Error(taskLookupError?.message || 'Task not found')
      }
      const milestoneId: string = taskRow.milestone_id
      
      const { error } = await supabase.rpc('delete_task', {
        task_id: taskId
      })
      
      if (error) {
        throw new Error(error.message)
      }

      // Recalculate milestone progress
      const { data: milestoneData, error: milestoneError } = await supabase
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
        .eq('id', milestoneId)
        .single()

      if (milestoneError) {
        throw new Error(milestoneError.message)
      }

      const updatedMilestone = calculateUpdatedMilestone(transformMilestoneData(milestoneData) as any)
      const milestoneProgress = calculateMilestoneProgress(updatedMilestone)

      // Update milestone progress
      const { error: updateError } = await supabase.rpc('update_milestone_progress', {
        milestone_uuid: milestoneId
      })

      if (updateError) {
        throw new Error(updateError.message)
      }

      return { success: true }
    } catch (error) {
      console.error('Error deleting task:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    } finally {
      setIsUpdating(false)
    }
  }, [])

  return {
    isUpdating,
    updateTaskProgress,
    updateMilestoneProgress,
    addTask,
    deleteTask
  }
}
