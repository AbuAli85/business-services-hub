import { getSupabaseClient } from './supabase-client'

export interface BackendProgressUpdate {
  task: any
  milestone_progress: any
  booking_id: string
}

export interface RealtimeSubscription {
  unsubscribe: () => void
}

export class BackendProgressService {
  private subscriptions: Map<string, RealtimeSubscription> = new Map()

  private async getSupabase() {
    return await getSupabaseClient()
  }

  /**
   * Update task progress using the backend API with validation
   */
  async updateTaskProgress(taskId: string, updates: {
    status?: string
    progress_percentage?: number
    title?: string
    due_date?: string
    [key: string]: any
  }): Promise<{ task: any; milestone_progress: any }> {
    try {
      const response = await fetch(`/api/tasks?id=${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update task')
      }

      const data = await response.json()
      return {
        task: data.task,
        milestone_progress: data.milestone_progress
      }
    } catch (error) {
      console.error('Error updating task progress:', error)
      throw error
    }
  }

  /**
   * Get booking progress from the backend view
   */
  async getBookingProgress(bookingId: string): Promise<any> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('v_booking_progress')
        .select('*')
        .eq('booking_id', bookingId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching booking progress:', error)
      throw error
    }
  }

  /**
   * Get milestone progress from the backend view
   */
  async getMilestoneProgress(milestoneId: string): Promise<any> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('v_milestone_progress')
        .select('*')
        .eq('id', milestoneId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching milestone progress:', error)
      throw error
    }
  }

  /**
   * Get all milestones for a booking with backend-calculated progress
   */
  async getMilestonesForBooking(bookingId: string): Promise<any[]> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('v_milestone_progress')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching milestones:', error)
      throw error
    }
  }

  /**
   * Get tasks with backend-calculated status and overdue information
   */
  async getTasksForMilestone(milestoneId: string): Promise<any[]> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('v_tasks_status')
        .select('*')
        .eq('milestone_id', milestoneId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching tasks:', error)
      throw error
    }
  }

  /**
   * Subscribe to realtime updates for a booking
   */
  async subscribeToBookingUpdates(
    bookingId: string, 
    onUpdate: (update: BackendProgressUpdate) => void
  ): Promise<RealtimeSubscription> {
    const supabase = await this.getSupabase()
    const channel = supabase.channel(`booking:${bookingId}`)
    
    channel.on('broadcast', { event: 'task_updated' }, (payload: any) => {
      onUpdate(payload.payload)
    })

    channel.subscribe()

    const subscription = {
      unsubscribe: () => {
        channel.unsubscribe()
        this.subscriptions.delete(bookingId)
      }
    }

    this.subscriptions.set(bookingId, subscription)
    return subscription
  }

  /**
   * Subscribe to realtime updates for milestone progress
   */
  async subscribeToMilestoneUpdates(
    milestoneId: string,
    onUpdate: (milestone: any) => void
  ): Promise<RealtimeSubscription> {
    const supabase = await this.getSupabase()
    const channel = supabase.channel(`milestone:${milestoneId}`)
    
    channel.on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'milestones',
      filter: `id=eq.${milestoneId}`
    }, async () => {
      try {
        const milestone = await this.getMilestoneProgress(milestoneId)
        onUpdate(milestone)
      } catch (error) {
        console.error('Error fetching updated milestone:', error)
      }
    })

    channel.subscribe()

    const subscription = {
      unsubscribe: () => {
        channel.unsubscribe()
        this.subscriptions.delete(milestoneId)
      }
    }

    this.subscriptions.set(milestoneId, subscription)
    return subscription
  }

  /**
   * Subscribe to realtime updates for task status
   */
  async subscribeToTaskUpdates(
    taskId: string,
    onUpdate: (task: any) => void
  ): Promise<RealtimeSubscription> {
    const supabase = await this.getSupabase()
    const channel = supabase.channel(`task:${taskId}`)
    
    channel.on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'tasks',
      filter: `id=eq.${taskId}`
    }, async () => {
      try {
        const { data, error } = await supabase
          .from('v_tasks_status')
          .select('*')
          .eq('id', taskId)
          .single()

        if (!error && data) {
          onUpdate(data)
        }
      } catch (error) {
        console.error('Error fetching updated task:', error)
      }
    })

    channel.subscribe()

    const subscription = {
      unsubscribe: () => {
        channel.unsubscribe()
        this.subscriptions.delete(taskId)
      }
    }

    this.subscriptions.set(taskId, subscription)
    return subscription
  }

  /**
   * Clean up all subscriptions
   */
  cleanup(): void {
    this.subscriptions.forEach(subscription => subscription.unsubscribe())
    this.subscriptions.clear()
  }

  /**
   * Validate if a status transition is allowed
   */
  async canTransition(
    currentStatus: string, 
    newStatus: string, 
    entityType: 'task' | 'milestone' = 'task'
  ): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .rpc('can_transition', {
          current_status: currentStatus,
          new_status: newStatus,
          entity_type: entityType
        })

      if (error) throw error
      return data || false
    } catch (error) {
      console.error('Error validating transition:', error)
      return false
    }
  }

  /**
   * Recalculate milestone progress
   */
  async recalculateMilestoneProgress(milestoneId: string): Promise<any> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .rpc('recalc_milestone_progress', {
          p_milestone_id: milestoneId
        })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error recalculating milestone progress:', error)
      throw error
    }
  }
}

// Export singleton instance
export const backendProgressService = new BackendProgressService()

