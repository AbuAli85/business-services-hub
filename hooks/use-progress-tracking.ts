'use client'

import { useState, useCallback } from 'react'
import { Milestone, Task, Comment, TimeEntry, UserRole } from '@/types/progress'
import { ProgressDataService } from '@/lib/progress-data-service'
import { toast } from 'sonner'

interface UseProgressTrackingProps {
  bookingId: string
  onProgressUpdate?: (updates: { milestoneId: string; milestoneProgress: number; overallProgress: number }) => void
}

interface UseProgressTrackingReturn {
  isUpdating: boolean
  updateTaskProgress: (taskId: string, updates: Partial<Task>) => Promise<void>
  updateMilestoneProgress: (milestoneId: string, updates: Partial<Milestone>) => Promise<void>
  addTask: (milestoneId: string, task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'is_overdue' | 'actual_hours'>) => Promise<void>
  deleteTask: (taskId: string) => Promise<void>
  addMilestone: (milestone: Omit<Milestone, 'id' | 'created_at' | 'updated_at' | 'progress' | 'tasks'>) => Promise<void>
  updateMilestone: (milestoneId: string, updates: Partial<Milestone>) => Promise<void>
  deleteMilestone: (milestoneId: string) => Promise<void>
  addComment: (milestoneId: string, content: string) => Promise<void>
  requestMilestoneApproval: (milestoneId: string, comment?: string) => Promise<void>
  approveMilestone: (milestoneId: string, comment?: string) => Promise<void>
  rejectMilestone: (milestoneId: string, comment?: string) => Promise<void>
  logTime: (taskId: string, duration: number, description: string) => Promise<void>
  refreshData: () => Promise<any>
}

export function useProgressTracking({
  bookingId,
  onProgressUpdate
}: UseProgressTrackingProps): UseProgressTrackingReturn {
  
  const [isUpdating, setIsUpdating] = useState(false)

  // Update task progress
  const updateTaskProgress = useCallback(async (taskId: string, updates: Partial<Task>) => {
    try {
      setIsUpdating(true)
      
      // Validate that taskId is a valid UUID and not a booking ID
      const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
      if (!isUuid(taskId)) {
        console.error('❌ Invalid UUID format for taskId in useProgressTracking:', taskId)
        throw new Error('Invalid task ID format')
      }
      
      if (taskId === bookingId) {
        console.error('❌ Booking ID being used as task ID in useProgressTracking:', taskId, 'bookingId:', bookingId)
        throw new Error('Invalid task ID: booking ID cannot be used as task ID')
      }
      
      await ProgressDataService.updateTask(taskId, updates)
      
      // Calculate milestone progress if task status changed
      if (updates.status || updates.progress !== undefined) {
        const task = await ProgressDataService.getTask(taskId)
        if (task) {
          const milestone = await ProgressDataService.getMilestone(task.milestone_id)
          if (milestone) {
            const updatedMilestone = await ProgressDataService.calculateMilestoneProgress(milestone.id)
            const overallProgress = await ProgressDataService.calculateOverallProgress(bookingId)
            
            onProgressUpdate?.({
              milestoneId: milestone.id,
              milestoneProgress: updatedMilestone.progress,
              overallProgress
            })
          }
        }
      }
    } catch (error) {
      console.error('Error updating task progress:', error)
      throw error
    } finally {
      setIsUpdating(false)
    }
  }, [bookingId, onProgressUpdate])

  // Update milestone progress
  const updateMilestoneProgress = useCallback(async (milestoneId: string, updates: Partial<Milestone>) => {
    try {
      setIsUpdating(true)
      await ProgressDataService.updateMilestone(milestoneId, updates)
      
      // Calculate overall progress
      const overallProgress = await ProgressDataService.calculateOverallProgress(bookingId)
      
      onProgressUpdate?.({
        milestoneId,
        milestoneProgress: updates.progress || 0,
        overallProgress
      })
    } catch (error) {
      console.error('Error updating milestone progress:', error)
      throw error
    } finally {
      setIsUpdating(false)
    }
  }, [bookingId, onProgressUpdate])

  // Add task
  const addTask = useCallback(async (milestoneId: string, task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'is_overdue' | 'actual_hours'>) => {
    try {
      setIsUpdating(true)
      await ProgressDataService.createTask(milestoneId, task)
      
      // Recalculate milestone progress
      const updatedMilestone = await ProgressDataService.calculateMilestoneProgress(milestoneId)
      const overallProgress = await ProgressDataService.calculateOverallProgress(bookingId)
      
      onProgressUpdate?.({
        milestoneId,
        milestoneProgress: updatedMilestone.progress,
        overallProgress
      })
    } catch (error) {
      console.error('Error adding task:', error)
      throw error
    } finally {
      setIsUpdating(false)
    }
  }, [bookingId, onProgressUpdate])

  // Delete task
  const deleteTask = useCallback(async (taskId: string) => {
    try {
      setIsUpdating(true)
      const task = await ProgressDataService.getTask(taskId)
      if (task) {
        await ProgressDataService.deleteTask(taskId)
        
        // Recalculate milestone progress
        const updatedMilestone = await ProgressDataService.calculateMilestoneProgress(task.milestone_id)
        const overallProgress = await ProgressDataService.calculateOverallProgress(bookingId)
        
        onProgressUpdate?.({
          milestoneId: task.milestone_id,
          milestoneProgress: updatedMilestone.progress,
          overallProgress
        })
      }
    } catch (error) {
      console.error('Error deleting task:', error)
      throw error
    } finally {
      setIsUpdating(false)
    }
  }, [bookingId, onProgressUpdate])

  // Add milestone
  const addMilestone = useCallback(async (milestone: Omit<Milestone, 'id' | 'created_at' | 'updated_at' | 'progress' | 'tasks'>) => {
    try {
      setIsUpdating(true)
      await ProgressDataService.createMilestone(bookingId, milestone)
      
      // Recalculate overall progress
      const overallProgress = await ProgressDataService.calculateOverallProgress(bookingId)
      
      onProgressUpdate?.({
        milestoneId: '',
        milestoneProgress: 0,
        overallProgress
      })
    } catch (error) {
      console.error('Error adding milestone:', error)
      throw error
    } finally {
      setIsUpdating(false)
    }
  }, [bookingId, onProgressUpdate])

  // Update milestone
  const updateMilestone = useCallback(async (milestoneId: string, updates: Partial<Milestone>) => {
    try {
      setIsUpdating(true)
      await ProgressDataService.updateMilestone(milestoneId, updates)
      
      // Recalculate overall progress
      const overallProgress = await ProgressDataService.calculateOverallProgress(bookingId)
      
      onProgressUpdate?.({
        milestoneId,
        milestoneProgress: updates.progress || 0,
        overallProgress
      })
    } catch (error) {
      console.error('Error updating milestone:', error)
      throw error
    } finally {
      setIsUpdating(false)
    }
  }, [bookingId, onProgressUpdate])

  // Delete milestone
  const deleteMilestone = useCallback(async (milestoneId: string) => {
    try {
      setIsUpdating(true)
      await ProgressDataService.deleteMilestone(milestoneId)
      
      // Recalculate overall progress
      const overallProgress = await ProgressDataService.calculateOverallProgress(bookingId)
      
      onProgressUpdate?.({
        milestoneId: '',
        milestoneProgress: 0,
        overallProgress
      })
    } catch (error) {
      console.error('Error deleting milestone:', error)
      throw error
    } finally {
      setIsUpdating(false)
    }
  }, [bookingId, onProgressUpdate])

  // Add comment
  const addComment = useCallback(async (milestoneId: string, content: string) => {
    try {
      setIsUpdating(true)
      await ProgressDataService.addComment(bookingId, milestoneId, content)
    } catch (error) {
      console.error('Error adding comment:', error)
      throw error
    } finally {
      setIsUpdating(false)
    }
  }, [bookingId])

  // Request milestone approval
  const requestMilestoneApproval = useCallback(async (milestoneId: string, comment?: string) => {
    try {
      setIsUpdating(true)
      await ProgressDataService.requestMilestoneApproval(milestoneId, comment)
    } catch (error) {
      console.error('Error requesting milestone approval:', error)
      throw error
    } finally {
      setIsUpdating(false)
    }
  }, [])

  // Approve milestone
  const approveMilestone = useCallback(async (milestoneId: string, comment?: string) => {
    try {
      setIsUpdating(true)
      await ProgressDataService.approveMilestone(milestoneId, comment)
      
      // Update milestone status
      await ProgressDataService.updateMilestone(milestoneId, { status: 'completed' })
      
      // Recalculate overall progress
      const overallProgress = await ProgressDataService.calculateOverallProgress(bookingId)
      
      onProgressUpdate?.({
        milestoneId,
        milestoneProgress: 100,
        overallProgress
      })
    } catch (error) {
      console.error('Error approving milestone:', error)
      throw error
    } finally {
      setIsUpdating(false)
    }
  }, [bookingId, onProgressUpdate])

  // Reject milestone
  const rejectMilestone = useCallback(async (milestoneId: string, comment?: string) => {
    try {
      setIsUpdating(true)
      await ProgressDataService.rejectMilestone(milestoneId, comment)
    } catch (error) {
      console.error('Error rejecting milestone:', error)
      throw error
    } finally {
      setIsUpdating(false)
    }
  }, [])

  // Log time
  const logTime = useCallback(async (taskId: string, duration: number, description: string) => {
    try {
      setIsUpdating(true)
      await ProgressDataService.logTime(bookingId, taskId, duration, description)
      
      // Update task actual hours
      const task = await ProgressDataService.getTask(taskId)
      if (task) {
        const newActualHours = (task.actual_hours || 0) + duration
        await ProgressDataService.updateTask(taskId, { actual_hours: newActualHours })
      }
    } catch (error) {
      console.error('Error logging time:', error)
      throw error
    } finally {
      setIsUpdating(false)
    }
  }, [bookingId])

  // Refresh data
  const refreshData = useCallback(async () => {
    try {
      setIsUpdating(true)
      return await ProgressDataService.getProgressData(bookingId)
    } catch (error) {
      console.error('Error refreshing data:', error)
      throw error
    } finally {
      setIsUpdating(false)
    }
  }, [bookingId])

  return {
    isUpdating,
    updateTaskProgress,
    updateMilestoneProgress,
    addTask,
    deleteTask,
    addMilestone,
    updateMilestone,
    deleteMilestone,
    addComment,
    requestMilestoneApproval,
    approveMilestone,
    rejectMilestone,
    logTime,
    refreshData
  }
}
