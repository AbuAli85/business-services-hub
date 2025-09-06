import { useState, useCallback } from 'react'
import { Milestone, Task } from '@/lib/progress-tracking'
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
  onProgressUpdate?: (updates: {
    milestoneId: string
    milestoneProgress: number
    overallProgress: number
  }) => void
}

export function useProgressUpdates({ bookingId, onProgressUpdate }: UseProgressUpdatesProps) {
  const [isUpdating, setIsUpdating] = useState(false)

  const updateTaskProgress = useCallback(async (
    milestoneId: string,
    taskId: string,
    updates: Partial<Task>
  ) => {
    try {
      setIsUpdating(true)
      
      // Update task in database
      const { getSupabaseClient } = await import('@/lib/supabase')
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('tasks')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .eq('milestone_id', milestoneId)
      
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
      const updatedMilestone = calculateUpdatedMilestone(transformMilestoneData(milestoneData))
      const milestoneProgress = calculateMilestoneProgress(updatedMilestone)

      // Update milestone in database
      const { error: updateError } = await supabase
        .from('milestones')
        .update({
          progress_percentage: milestoneProgress,
          status: updatedMilestone.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', milestoneId)

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
      const overallProgress = calculateOverallProgress(transformedMilestones)

      // Update booking progress
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({
          project_progress: overallProgress.overallProgress,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)

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
    task: Omit<Task, 'id'>
  ) => {
    try {
      setIsUpdating(true)
      
      const { getSupabaseClient } = await import('@/lib/supabase')
      const supabase = await getSupabaseClient()
      
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...task,
          milestone_id: milestoneId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
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

      const updatedMilestone = calculateUpdatedMilestone(transformMilestoneData(milestoneData))
      const milestoneProgress = calculateMilestoneProgress(updatedMilestone)

      // Update milestone progress
      const { error: updateError } = await supabase
        .from('milestones')
        .update({
          progress_percentage: milestoneProgress,
          status: updatedMilestone.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', milestoneId)

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
    milestoneId: string,
    taskId: string
  ) => {
    try {
      setIsUpdating(true)
      
      const { getSupabaseClient } = await import('@/lib/supabase')
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('milestone_id', milestoneId)
      
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

      const updatedMilestone = calculateUpdatedMilestone(transformMilestoneData(milestoneData))
      const milestoneProgress = calculateMilestoneProgress(updatedMilestone)

      // Update milestone progress
      const { error: updateError } = await supabase
        .from('milestones')
        .update({
          progress_percentage: milestoneProgress,
          status: updatedMilestone.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', milestoneId)

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
