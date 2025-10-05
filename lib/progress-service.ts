/**
 * Progress Service
 * Centralized service for managing milestones and tasks progress
 */

import { getSupabaseClient } from './supabase'

export interface ProgressUpdate {
  booking_id?: string
  milestone_id?: string
  task_id?: string
  progress_percentage?: number
  status?: string
  actual_hours?: number
  notes?: string
}

export interface ProgressAnalytics {
  booking_id: string
  booking_title: string
  booking_progress: number
  booking_status: string
  total_milestones: number
  completed_milestones: number
  in_progress_milestones: number
  pending_milestones: number
  total_tasks: number
  completed_tasks: number
  in_progress_tasks: number
  pending_tasks: number
  overdue_tasks: number
  total_estimated_hours: number
  total_actual_hours: number
  avg_milestone_progress: number
  avg_task_progress: number
  created_at: string
  updated_at: string
}

export interface MilestoneProgress {
  id: string
  title: string
  description?: string
  status: string
  priority: string
  progress_percentage: number
  due_date?: string
  completed_at?: string
  weight: number
  estimated_hours?: number
  actual_hours?: number
  total_tasks: number
  completed_tasks: number
  tasks: TaskProgress[]
}

export interface TaskProgress {
  id: string
  title: string
  description?: string
  status: string
  progress_percentage: number
  due_date?: string
  assigned_to?: string
  estimated_hours?: number
  actual_hours?: number
  is_overdue: boolean
  created_at: string
  updated_at: string
}

export class ProgressService {
  private static instance: ProgressService
  private cache: Map<string, { data: any; timestamp: number }> = new Map()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  private constructor() {}

  public static getInstance(): ProgressService {
    if (!ProgressService.instance) {
      ProgressService.instance = new ProgressService()
    }
    return ProgressService.instance
  }

  /**
   * Calculate and update progress for a booking, milestone, or task
   */
  async updateProgress(update: ProgressUpdate): Promise<{
    success: boolean
    data?: any
    error?: string
  }> {
    try {
      const supabase = await getSupabaseClient()
      
      // Validate input
      if (!update.booking_id && !update.milestone_id && !update.task_id) {
        throw new Error('At least one ID (booking_id, milestone_id, or task_id) is required')
      }

      // Update task if task_id provided
      if (update.task_id) {
        const { error: taskError } = await supabase.rpc('update_task', {
          task_id: update.task_id,
          status: update.status,
          progress_percentage: update.progress_percentage,
          actual_hours: update.actual_hours,
          notes: update.notes
        })

        if (taskError) {
          throw new Error(`Failed to update task: ${taskError.message}`)
        }
      }

      // Update milestone if milestone_id provided
      if (update.milestone_id) {
        const { error: milestoneError } = await supabase.rpc('update_milestone_progress', {
          milestone_uuid: update.milestone_id
        })

        if (milestoneError) {
          throw new Error(`Failed to update milestone: ${milestoneError.message}`)
        }
      }

      // Calculate booking progress if booking_id provided
      if (update.booking_id) {
        const { data: bookingProgress, error: bookingError } = await supabase.rpc('calculate_booking_progress', {
          booking_id: update.booking_id
        })

        if (bookingError) {
          throw new Error(`Failed to calculate booking progress: ${bookingError.message}`)
        }

        // Clear cache for this booking
        this.clearCache(update.booking_id)
        
        return {
          success: true,
          data: { booking_progress: bookingProgress }
        }
      }

      return { success: true }

    } catch (error) {
      console.error('Progress update error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get progress analytics for a booking
   */
  async getProgressAnalytics(bookingId: string): Promise<{
    success: boolean
    data?: ProgressAnalytics
    error?: string
  }> {
    try {
      // Check cache first
      const cached = this.getCachedData(`analytics_${bookingId}`)
      if (cached) {
        return { success: true, data: cached }
      }

      const supabase = await getSupabaseClient()
      
      // Try to get from materialized view first
      const { data: analytics, error: analyticsError } = await supabase
        .from('mv_booking_progress_analytics')
        .select('*')
        .eq('booking_id', bookingId)
        .single()

      if (analyticsError) {
        // Fallback to manual calculation
        return await this.calculateProgressAnalytics(bookingId)
      }

      // Cache the result
      this.setCachedData(`analytics_${bookingId}`, analytics)

      return { success: true, data: analytics }

    } catch (error) {
      console.error('Progress analytics error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Calculate progress analytics manually (fallback)
   */
  private async calculateProgressAnalytics(bookingId: string): Promise<{
    success: boolean
    data?: ProgressAnalytics
    error?: string
  }> {
    try {
      const supabase = await getSupabaseClient()
      
      // Get booking data
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('id, title, progress_percentage, status, created_at, updated_at')
        .eq('id', bookingId)
        .single()

      if (bookingError) {
        throw new Error(`Failed to get booking: ${bookingError.message}`)
      }

      // Get milestones with tasks
      const { data: milestones, error: milestonesError } = await supabase
        .from('milestones')
        .select(`
          id,
          progress_percentage,
          status,
          tasks (
            id,
            status,
            progress_percentage,
            estimated_hours,
            actual_hours,
            is_overdue
          )
        `)
        .eq('booking_id', bookingId)

      if (milestonesError) {
        throw new Error(`Failed to get milestones: ${milestonesError.message}`)
      }

      // Calculate analytics
      const totalMilestones = milestones?.length || 0
      const completedMilestones = milestones?.filter(m => m.status === 'completed').length || 0
      const inProgressMilestones = milestones?.filter(m => m.status === 'in_progress').length || 0
      const pendingMilestones = milestones?.filter(m => m.status === 'pending').length || 0

      const totalTasks = milestones?.reduce((sum, m) => sum + (m.tasks?.length || 0), 0) || 0
      const completedTasks = milestones?.reduce((sum, m) => 
        sum + (m.tasks?.filter(t => t.status === 'completed').length || 0), 0) || 0
      const inProgressTasks = milestones?.reduce((sum, m) => 
        sum + (m.tasks?.filter(t => t.status === 'in_progress').length || 0), 0) || 0
      const pendingTasks = milestones?.reduce((sum, m) => 
        sum + (m.tasks?.filter(t => t.status === 'pending').length || 0), 0) || 0
      const overdueTasks = milestones?.reduce((sum, m) => 
        sum + (m.tasks?.filter(t => t.is_overdue).length || 0), 0) || 0

      const totalEstimatedHours = milestones?.reduce((sum, m) => 
        sum + (m.tasks?.reduce((taskSum, t) => taskSum + (t.estimated_hours || 0), 0) || 0), 0) || 0
      const totalActualHours = milestones?.reduce((sum, m) => 
        sum + (m.tasks?.reduce((taskSum, t) => taskSum + (t.actual_hours || 0), 0) || 0), 0) || 0

      const avgMilestoneProgress = totalMilestones > 0 
        ? Math.round(milestones?.reduce((sum, m) => sum + (m.progress_percentage || 0), 0) / totalMilestones) 
        : 0

      const avgTaskProgress = totalTasks > 0
        ? Math.round(milestones?.reduce((sum, m) => 
            sum + (m.tasks?.reduce((taskSum, t) => taskSum + (t.progress_percentage || 0), 0) || 0), 0) / totalTasks)
        : 0

      const analytics: ProgressAnalytics = {
        booking_id: booking.id,
        booking_title: booking.title,
        booking_progress: booking.progress_percentage || 0,
        booking_status: booking.status,
        total_milestones: totalMilestones,
        completed_milestones: completedMilestones,
        in_progress_milestones: inProgressMilestones,
        pending_milestones: pendingMilestones,
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        in_progress_tasks: inProgressTasks,
        pending_tasks: pendingTasks,
        overdue_tasks: overdueTasks,
        total_estimated_hours: totalEstimatedHours,
        total_actual_hours: totalActualHours,
        avg_milestone_progress: avgMilestoneProgress,
        avg_task_progress: avgTaskProgress,
        created_at: booking.created_at,
        updated_at: booking.updated_at
      }

      // Cache the result
      this.setCachedData(`analytics_${bookingId}`, analytics)

      return { success: true, data: analytics }

    } catch (error) {
      console.error('Manual progress calculation error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get milestone progress data
   */
  async getMilestoneProgress(bookingId: string): Promise<{
    success: boolean
    data?: MilestoneProgress[]
    error?: string
  }> {
    try {
      // Check cache first
      const cached = this.getCachedData(`milestones_${bookingId}`)
      if (cached) {
        return { success: true, data: cached }
      }

      const supabase = await getSupabaseClient()
      
      const { data: milestones, error } = await supabase
        .from('milestones')
        .select(`
          id,
          title,
          description,
          status,
          priority,
          progress_percentage,
          due_date,
          completed_at,
          weight,
          estimated_hours,
          actual_hours,
          total_tasks,
          completed_tasks,
          tasks (
            id,
            title,
            description,
            status,
            progress_percentage,
            due_date,
            assigned_to,
            estimated_hours,
            actual_hours,
            is_overdue,
            created_at,
            updated_at
          )
        `)
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true })

      if (error) {
        throw new Error(`Failed to get milestones: ${error.message}`)
      }

      // Cache the result
      this.setCachedData(`milestones_${bookingId}`, milestones)

      return { success: true, data: milestones }

    } catch (error) {
      console.error('Milestone progress error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Refresh progress data (clear cache and recalculate)
   */
  async refreshProgress(bookingId: string): Promise<{
    success: boolean
    data?: any
    error?: string
  }> {
    try {
      // Clear cache
      this.clearCache(bookingId)

      // Recalculate booking progress
      const result = await this.updateProgress({ booking_id: bookingId })
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to refresh progress')
      }

      return result

    } catch (error) {
      console.error('Progress refresh error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Cache management methods
   */
  private getCachedData(key: string): any {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data
    }
    return null
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  private clearCache(bookingId: string): void {
    this.cache.delete(`analytics_${bookingId}`)
    this.cache.delete(`milestones_${bookingId}`)
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
}

// Export singleton instance
export const progressService = ProgressService.getInstance()
