import { getSupabaseClient } from './supabase'

export interface ProgressUpdate {
  bookingId: string
  milestoneId: string
  taskId?: string
  type: 'task' | 'milestone' | 'booking'
  action: 'create' | 'update' | 'delete' | 'complete'
  data: any
  timestamp: string
}

export interface MilestoneProgress {
  id: string
  title: string
  status: 'pending' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled'
  progress_percentage: number
  completed_tasks: number
  total_tasks: number
  estimated_hours: number
  actual_hours: number
  due_date: string
  is_overdue: boolean
}

export interface BookingProgress {
  booking_id: string
  booking_title: string
  booking_progress: number
  completed_milestones: number
  total_milestones: number
  completed_tasks: number
  total_tasks: number
  booking_status: string
  total_estimated_hours: number
  total_actual_hours: number
  overdue_tasks: number
  created_at: string
  updated_at: string
}

export class RealtimeProgressService {
  private static instance: RealtimeProgressService
  private channels: Map<string, any> = new Map()
  private listeners: Map<string, Set<(update: ProgressUpdate) => void>> = new Map()

  static getInstance(): RealtimeProgressService {
    if (!RealtimeProgressService.instance) {
      RealtimeProgressService.instance = new RealtimeProgressService()
    }
    return RealtimeProgressService.instance
  }

  async subscribeToBooking(bookingId: string, callback: (update: ProgressUpdate) => void): Promise<string> {
    try {
      const supabase = await getSupabaseClient()
      const channelKey = `progress-${bookingId}`
      
      // Add listener
      if (!this.listeners.has(channelKey)) {
        this.listeners.set(channelKey, new Set())
      }
      this.listeners.get(channelKey)!.add(callback)

      // Create channel if it doesn't exist
      if (!this.channels.has(channelKey)) {
        // Create filter strings inside the function where bookingId is available
        const milestoneFilter = `booking_id=eq.${bookingId}`
        const bookingFilter = `id=eq.${bookingId}`
        const milestoneIds = await this.getMilestoneIds(bookingId)
        const taskFilter = `milestone_id=in.(${milestoneIds})`

        const channel = supabase
          .channel(channelKey, {
            config: {
              presence: {
                key: bookingId
              }
            }
          })
          .on('postgres_changes', 
            {
              event: '*',
              schema: 'public',
              table: 'tasks',
              filter: taskFilter
            },
            (payload) => this.handleTaskUpdate(bookingId, payload)
          )
          .on('postgres_changes',
            {
              event: '*',
              schema: 'public', 
              table: 'milestones',
              filter: milestoneFilter
            },
            (payload) => this.handleMilestoneUpdate(bookingId, payload)
          )
          .on('postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'bookings',
              filter: bookingFilter
            },
            (payload) => this.handleBookingUpdate(bookingId, payload)
          )
          .on('broadcast', { event: 'progress_update' }, (payload) => {
            this.handleBroadcastUpdate(bookingId, payload.payload)
          })
          .subscribe()

        this.channels.set(channelKey, channel)
      }

      return channelKey
    } catch (error) {
      console.error('Error subscribing to booking progress:', error)
      throw error
    }
  }

  async unsubscribeFromBooking(channelKey: string, callback?: (update: ProgressUpdate) => void): Promise<void> {
    try {
      if (callback && this.listeners.has(channelKey)) {
        this.listeners.get(channelKey)!.delete(callback)
        
        // If no more listeners, remove channel
        if (this.listeners.get(channelKey)!.size === 0) {
          const channel = this.channels.get(channelKey)
          if (channel) {
            const supabase = await getSupabaseClient()
            await supabase.removeChannel(channel)
            this.channels.delete(channelKey)
            this.listeners.delete(channelKey)
          }
        }
      } else if (!callback) {
        // Remove all listeners and channel
        const channel = this.channels.get(channelKey)
        if (channel) {
          const supabase = await getSupabaseClient()
          await supabase.removeChannel(channel)
          this.channels.delete(channelKey)
          this.listeners.delete(channelKey)
        }
      }
    } catch (error) {
      console.error('Error unsubscribing from booking progress:', error)
    }
  }

  async updateTaskProgress(
    bookingId: string,
    milestoneId: string,
    taskId: string,
    updates: {
      status?: 'pending' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled'
      progress_percentage?: number
      actual_hours?: number
      notes?: string
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate that taskId is a valid UUID and not a booking ID
      const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
      if (!isUuid(taskId)) {
        console.error('❌ Invalid UUID format for taskId in RealtimeProgressService:', taskId)
        return { success: false, error: 'Invalid task ID format' }
      }
      
      const supabase = await getSupabaseClient()
      
      // Update task
      const { error: taskError } = await supabase
        .from('tasks')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .eq('milestone_id', milestoneId)

      if (taskError) {
        throw new Error(taskError.message)
      }

      // Update milestone progress
      await this.updateMilestoneProgress(bookingId, milestoneId)

      // Update booking progress
      await this.updateBookingProgress(bookingId)

      // Broadcast update
      await this.broadcastUpdate(bookingId, {
        bookingId,
        milestoneId,
        taskId,
        type: 'task',
        action: 'update',
        data: updates
      })

      return { success: true }
    } catch (error) {
      console.error('Error updating task progress:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  async updateMilestoneProgress(bookingId: string, milestoneId: string): Promise<void> {
    try {
      const supabase = await getSupabaseClient()
      
      // Get all tasks for this milestone
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, status, progress_percentage, estimated_hours, actual_hours')
        .eq('milestone_id', milestoneId)

      if (!tasks) return

      const totalTasks = tasks.length
      const completedTasks = tasks.filter(t => t.status === 'completed').length
      const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      
      // Determine milestone status
      let status: 'pending' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled' = 'pending'
      if (completedTasks === totalTasks && totalTasks > 0) {
        status = 'completed'
      } else if (completedTasks > 0) {
        status = 'in_progress'
      }

      // Calculate actual hours
      const actualHours = tasks.reduce((sum, task) => sum + (task.actual_hours || 0), 0)

      // Update milestone
      const { error } = await supabase
        .from('milestones')
        .update({
          progress_percentage: progressPercentage,
          status,
          actual_hours: actualHours,
          updated_at: new Date().toISOString()
        })
        .eq('id', milestoneId)

      if (error) {
        throw new Error(error.message)
      }

      // Broadcast milestone update
      await this.broadcastUpdate(bookingId, {
        bookingId,
        milestoneId,
        type: 'milestone',
        action: 'update',
        data: {
          progress_percentage: progressPercentage,
          status,
          actual_hours: actualHours,
          completed_tasks: completedTasks,
          total_tasks: totalTasks
        }
      })
    } catch (error) {
      console.error('Error updating milestone progress:', error)
      throw error
    }
  }

  async updateBookingProgress(bookingId: string): Promise<void> {
    try {
      const supabase = await getSupabaseClient()
      
      // Get all milestones for this booking
      const { data: milestones } = await supabase
        .from('milestones')
        .select('id, progress_percentage, status, weight, estimated_hours, actual_hours')
        .eq('booking_id', bookingId)

      if (!milestones) return

      const totalMilestones = milestones.length
      const completedMilestones = milestones.filter(m => m.status === 'completed').length
      
      // Calculate weighted progress
      const totalWeight = milestones.reduce((sum, m) => sum + (m.weight || 1), 0)
      const weightedProgress = milestones.reduce((sum, m) => 
        sum + ((m.progress_percentage || 0) * (m.weight || 1)), 0
      )
      const overallProgress = totalWeight > 0 ? Math.round(weightedProgress / totalWeight) : 0

      // Calculate total hours
      const totalEstimatedHours = milestones.reduce((sum, m) => sum + (m.estimated_hours || 0), 0)
      const totalActualHours = milestones.reduce((sum, m) => sum + (m.actual_hours || 0), 0)

      // Get task counts
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, status, due_date')
        .in('milestone_id', milestones.map(m => m.id))

      const totalTasks = tasks?.length || 0
      const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0
      const overdueTasks = tasks?.filter(t => 
        t.status !== 'completed' && 
        t.due_date && 
        new Date(t.due_date) < new Date()
      ).length || 0

      // Determine booking status
      let bookingStatus = 'in_progress'
      if (completedMilestones === totalMilestones && totalMilestones > 0) {
        bookingStatus = 'completed'
      } else if (overallProgress === 0) {
        bookingStatus = 'pending'
      }

      // Update booking
      const { error } = await supabase
        .from('bookings')
        .update({
          project_progress: overallProgress,
          status: bookingStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)

      if (error) {
        throw new Error(error.message)
      }

      // Broadcast booking update
      await this.broadcastUpdate(bookingId, {
        bookingId,
        milestoneId: '',
        type: 'booking',
        action: 'update',
        data: {
          project_progress: overallProgress,
          status: bookingStatus,
          completed_milestones: completedMilestones,
          total_milestones: totalMilestones,
          completed_tasks: completedTasks,
          total_tasks: totalTasks,
          total_estimated_hours: totalEstimatedHours,
          total_actual_hours: totalActualHours,
          overdue_tasks: overdueTasks
        }
      })
    } catch (error) {
      console.error('Error updating booking progress:', error)
      throw error
    }
  }

  async logTimeEntry(
    bookingId: string,
    milestoneId: string,
    taskId: string,
    duration: number,
    description?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = await getSupabaseClient()
      
      // Create time entry
      const { error } = await supabase
        .from('time_entries')
        .insert({
          booking_id: bookingId,
          milestone_id: milestoneId,
          task_id: taskId,
          duration_hours: duration,
          description: description || 'Time logged',
          logged_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        })

      if (error) {
        throw new Error(error.message)
      }

      // Update task actual hours
      const { data: task } = await supabase
        .from('tasks')
        .select('actual_hours')
        .eq('id', taskId)
        .single()

      const newActualHours = (task?.actual_hours || 0) + duration

      await supabase
        .from('tasks')
        .update({ 
          actual_hours: newActualHours,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)

      // Update milestone and booking progress
      await this.updateMilestoneProgress(bookingId, milestoneId)
      await this.updateBookingProgress(bookingId)

      // Broadcast time entry
      await this.broadcastUpdate(bookingId, {
        bookingId,
        milestoneId,
        taskId,
        type: 'task',
        action: 'update',
        data: { actual_hours: newActualHours, time_logged: duration }
      })

      return { success: true }
    } catch (error) {
      console.error('Error logging time entry:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  private async getMilestoneIds(bookingId: string): Promise<string> {
    try {
      const supabase = await getSupabaseClient()
      const { data } = await supabase
        .from('milestones')
        .select('id')
        .eq('booking_id', bookingId)
      
      return data?.map(m => m.id).join(',') || ''
    } catch (error) {
      console.error('Error fetching milestone IDs:', error)
      return ''
    }
  }

  private handleTaskUpdate(bookingId: string, payload: any): void {
    const update: ProgressUpdate = {
      bookingId,
      milestoneId: payload.new?.milestone_id || payload.old?.milestone_id,
      taskId: payload.new?.id || payload.old?.id,
      type: 'task',
      action: payload.eventType.toLowerCase(),
      data: payload.new || payload.old,
      timestamp: new Date().toISOString()
    }

    this.notifyListeners(bookingId, update)
  }

  private handleMilestoneUpdate(bookingId: string, payload: any): void {
    const update: ProgressUpdate = {
      bookingId,
      milestoneId: payload.new?.id || payload.old?.id,
      type: 'milestone',
      action: payload.eventType.toLowerCase(),
      data: payload.new || payload.old,
      timestamp: new Date().toISOString()
    }

    this.notifyListeners(bookingId, update)
  }

  private handleBookingUpdate(bookingId: string, payload: any): void {
    const update: ProgressUpdate = {
      bookingId,
      milestoneId: '',
      type: 'booking',
      action: payload.eventType.toLowerCase(),
      data: payload.new || payload.old,
      timestamp: new Date().toISOString()
    }

    this.notifyListeners(bookingId, update)
  }

  private handleBroadcastUpdate(bookingId: string, payload: any): void {
    const update: ProgressUpdate = {
      bookingId: payload.bookingId,
      milestoneId: payload.milestoneId || '',
      taskId: payload.taskId,
      type: payload.type,
      action: payload.action,
      data: payload.data,
      timestamp: payload.timestamp
    }

    this.notifyListeners(bookingId, update)
  }

  private notifyListeners(bookingId: string, update: ProgressUpdate): void {
    const channelKey = `progress-${bookingId}`
    const listeners = this.listeners.get(channelKey)
    
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(update)
        } catch (error) {
          console.error('Error in progress update callback:', error)
        }
      })
    }
  }

  private async broadcastUpdate(bookingId: string, update: Omit<ProgressUpdate, 'timestamp'>): Promise<void> {
    try {
      const supabase = await getSupabaseClient()
      const channel = this.channels.get(`progress-${bookingId}`)
      
      if (channel) {
        await channel.send({
          type: 'broadcast',
          event: 'progress_update',
          payload: {
            ...update,
            timestamp: new Date().toISOString()
          }
        })
      }
    } catch (error) {
      console.error('Error broadcasting progress update:', error)
    }
  }
}

export const realtimeProgressService = RealtimeProgressService.getInstance()
