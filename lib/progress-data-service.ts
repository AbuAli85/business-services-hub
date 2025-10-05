'use client'

import { createClient } from '@supabase/supabase-js'
import { Milestone, Task, Comment, TimeEntry, BookingProgress } from '@/types/progress'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export class ProgressDataService {
  // Get all progress data for a booking
  static async getProgressData(bookingId: string) {
    try {
      // Use API endpoint to avoid direct database permission issues
      const response = await fetch(`/api/progress?booking_id=${bookingId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch progress data')
      }

      return result.data
    } catch (error) {
      console.error('Error getting progress data:', error)
      
      // Fallback: return empty data structure to prevent crashes
      console.log('🔄 Returning fallback empty data structure')
      return {
        milestones: [],
        timeEntries: [],
        comments: [],
        bookingProgress: null,
        overallProgress: 0,
        totalTasks: 0,
        completedTasks: 0,
        totalEstimatedHours: 0,
        totalActualHours: 0,
        overdueTasks: 0
      }
    }
  }

  // Get milestone by ID
  static async getMilestone(milestoneId: string) {
    try {
      const { data, error } = await supabase
        .from('milestones')
        .select(`
          *,
          tasks (*)
        `)
        .eq('id', milestoneId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error getting milestone:', error)
      throw error
    }
  }

  // Get task by ID
  static async getTask(taskId: string) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error getting task:', error)
      throw error
    }
  }

  // Create milestone
  static async createMilestone(bookingId: string, milestone: Omit<Milestone, 'id' | 'created_at' | 'updated_at' | 'progress' | 'tasks'>) {
    try {
      // Transform end_date to due_date for database compatibility
      const { end_date, ...restMilestone } = milestone as any
      const dbMilestone = {
        ...restMilestone,
        ...(end_date && { due_date: end_date }),
        booking_id: bookingId,
        progress: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('milestones')
        .insert(dbMilestone)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating milestone:', error)
      throw error
    }
  }

  // Update milestone
  static async updateMilestone(milestoneId: string, updates: Partial<Milestone>) {
    try {
      // Transform end_date to due_date for database compatibility
      const { end_date, ...restUpdates } = updates as any
      const dbUpdates = {
        ...restUpdates,
        ...(end_date && { due_date: end_date }),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('milestones')
        .update(dbUpdates)
        .eq('id', milestoneId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating milestone:', error)
      throw error
    }
  }

  // Delete milestone
  static async deleteMilestone(milestoneId: string) {
    try {
      const { error } = await supabase
        .from('milestones')
        .delete()
        .eq('id', milestoneId)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting milestone:', error)
      throw error
    }
  }

  // Create task
  static async createTask(milestoneId: string, task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'is_overdue' | 'actual_hours'>) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...task,
          milestone_id: milestoneId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_overdue: false,
          actual_hours: 0
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating task:', error)
      throw error
    }
  }

      // Update task
  static async updateTask(taskId: string, updates: Partial<Task>) {
    try {
      // Validate that taskId is a valid UUID and not a booking ID
      const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
      if (!isUuid(taskId)) {
        console.error('❌ Invalid UUID format for taskId in ProgressDataService:', taskId)
        throw new Error('Invalid task ID format')
      }
      
      const { data, error } = await supabase
        .from('tasks')
        .update({ 
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating task:', error)
      throw error
    }
  }

  // Delete task
  static async deleteTask(taskId: string) {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting task:', error)
      throw error
    }
  }

  // Add comment
  static async addComment(bookingId: string, milestoneId: string, content: string) {
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          booking_id: bookingId,
          milestone_id: milestoneId,
          content,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error adding comment:', error)
      throw error
    }
  }

  // Log time
  static async logTime(bookingId: string, taskId: string, duration: number, description: string) {
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          booking_id: bookingId,
          task_id: taskId,
          duration_hours: duration,
          description,
          logged_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error logging time:', error)
      throw error
    }
  }

  // Request milestone approval (client triggers approval flow via API)
  static async requestMilestoneApproval(milestoneId: string, comment?: string) {
    try {
      const response = await fetch('/api/milestones/request-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ milestone_id: milestoneId, comment })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result?.error || 'Failed to request milestone approval')
      return result
    } catch (error) {
      console.error('Error requesting milestone approval:', error)
      throw error
    }
  }

  // Approve milestone via API
  static async approveMilestone(milestoneId: string, comment?: string) {
    try {
      const response = await fetch('/api/milestones/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ milestone_id: milestoneId, action: 'approve', feedback: comment })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result?.error || 'Failed to approve milestone')
      return result
    } catch (error) {
      console.error('Error approving milestone:', error)
      throw error
    }
  }

  // Reject milestone via API
  static async rejectMilestone(milestoneId: string, comment?: string) {
    try {
      const response = await fetch('/api/milestones/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ milestone_id: milestoneId, action: 'reject', feedback: comment })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result?.error || 'Failed to reject milestone')
      return result
    } catch (error) {
      console.error('Error rejecting milestone:', error)
      throw error
    }
  }

  // Calculate milestone progress
  static async calculateMilestoneProgress(milestoneId: string) {
    try {
      const milestone = await this.getMilestone(milestoneId)
      if (!milestone || !milestone.tasks || milestone.tasks.length === 0) {
        return { ...milestone, progress: 0 }
      }

      const completedTasks = milestone.tasks.filter((task: any) => task.status === 'completed').length
      const progress = Math.round((completedTasks / milestone.tasks.length) * 100)

      // Update milestone progress
      await this.updateMilestone(milestoneId, { progress_percentage: progress })

      return { ...milestone, progress_percentage: progress }
    } catch (error) {
      console.error('Error calculating milestone progress:', error)
      throw error
    }
  }

  // Calculate overall progress
  static async calculateOverallProgress(bookingId: string) {
    try {
      const { data: milestones, error } = await supabase
        .from('milestones')
        .select(`
          *,
          tasks (*)
        `)
        .eq('booking_id', bookingId)

      if (error) throw error

      if (!milestones || milestones.length === 0) {
        return 0
      }

      const totalTasks = milestones.reduce((sum, m) => sum + (m.tasks?.length || 0), 0)
      const completedTasks = milestones.reduce((sum, m) => 
        sum + (m.tasks?.filter((t: any) => t.status === 'completed').length || 0), 0)

      const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

      // Update booking progress
      await supabase
        .from('booking_progress')
        .upsert({
          booking_id: bookingId,
          booking_progress: overallProgress,
          completed_tasks: completedTasks,
          total_tasks: totalTasks,
          updated_at: new Date().toISOString()
        })

      return overallProgress
    } catch (error) {
      console.error('Error calculating overall progress:', error)
      throw error
    }
  }

  // Get all comments for booking
  static async getAllCommentsForBooking(bookingId: string) {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Group comments by milestone
      const commentsByMilestone = data.reduce((acc, comment) => {
        const milestoneId = comment.milestone_id || 'general'
        if (!acc[milestoneId]) {
          acc[milestoneId] = []
        }
        acc[milestoneId].push(comment)
        return acc
      }, {} as Record<string, Comment[]>)

      return commentsByMilestone
    } catch (error) {
      console.error('Error getting comments for booking:', error)
      throw error
    }
  }

  // Get action requests
  static async getActionRequests(bookingId: string) {
    try {
      const { data, error } = await supabase
        .from('action_requests')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting action requests:', error)
      return []
    }
  }

  // Get approvals for milestone
  static async getApprovals(milestoneId: string) {
    try {
    const { data, error } = await supabase
      .from('milestone_approvals')
      .select('*')
      .eq('milestone_id', milestoneId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting approvals:', error)
      return []
    }
  }

  // Generate monthly milestones for a booking
  static async generateMonthlyMilestonesForBooking(bookingId: string) {
    try {
      // Get the booking to determine duration and service type
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('*, services(*)')
        .eq('id', bookingId)
        .single()

      if (bookingError) throw bookingError
      if (!booking) throw new Error('Booking not found')

      const startDate = new Date(booking.start_date)
      const endDate = new Date(booking.end_date)
      const durationMonths = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30))

      // Create monthly milestones
      const milestones = []
      for (let i = 0; i < durationMonths; i++) {
        const milestoneStartDate = new Date(startDate)
        milestoneStartDate.setMonth(milestoneStartDate.getMonth() + i)
        
        const milestoneEndDate = new Date(milestoneStartDate)
        milestoneEndDate.setMonth(milestoneEndDate.getMonth() + 1)
        milestoneEndDate.setDate(milestoneEndDate.getDate() - 1)

        const milestone = {
          booking_id: bookingId,
          title: `Month ${i + 1} Progress`,
          description: `Monthly progress milestone for ${booking.services?.title || 'service'}`,
          due_date: milestoneEndDate.toISOString(),
          status: i === 0 ? 'in_progress' : 'pending',
          priority: 'normal',
          progress_percentage: 0,
          weight: 1.0,
          order_index: i,
          estimated_hours: 0,
          actual_hours: 0,
          editable: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        milestones.push(milestone)
      }

      // Insert milestones
      if (milestones.length > 0) {
        const { error: insertError } = await supabase
          .from('milestones')
          .insert(milestones)

        if (insertError) throw insertError
      }

      return milestones
    } catch (error) {
      console.error('Error generating monthly milestones:', error)
      throw error
    }
  }

  // Subscribe to real-time progress updates
  static async subscribeToProgressUpdates(bookingId: string, callback: () => void) {
    try {
      // Create filter string inside the function where bookingId is available
      const milestoneFilter = `booking_id=eq.${bookingId}`

      const subscription = supabase
        .channel(`progress-updates-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'milestones',
          filter: milestoneFilter
        },
          callback
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks'
        },
          callback
        )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'time_entries',
          filter: milestoneFilter
        },
          callback
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'comments',
            filter: milestoneFilter
          },
          callback
        )
        .subscribe()

    return () => {
        supabase.removeChannel(subscription)
      }
    } catch (error) {
      console.error('Error subscribing to progress updates:', error)
      throw error
    }
  }

  // Subscribe to milestone approvals
  static async subscribeToApprovals(bookingId: string, callback: () => void) {
    try {
      const subscription = supabase
        .channel(`approvals-updates-${bookingId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'milestone_approvals'
          },
          callback
        )
        .subscribe()

      return () => {
        supabase.removeChannel(subscription)
      }
    } catch (error) {
      console.error('Error subscribing to approvals updates:', error)
      throw error
    }
  }

  // Subscribe to comments updates
  static async subscribeToComments(bookingId: string, callback: () => void) {
    try {
      // Create filter string inside the function where bookingId is available
      const commentsFilter = `booking_id=eq.${bookingId}`

      const subscription = supabase
        .channel(`comments-updates-${bookingId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'comments',
            filter: commentsFilter
          },
          callback
        )
        .subscribe()

    return () => {
        supabase.removeChannel(subscription)
      }
    } catch (error) {
      console.error('Error subscribing to comments updates:', error)
      throw error
    }
  }

  // Create milestone approval
  static async createApproval(milestoneId: string, status: 'approved' | 'rejected', comment?: string) {
    try {
      const { data, error } = await supabase
        .from('milestone_approvals')
        .insert({
          milestone_id: milestoneId,
          status,
          comment,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating approval:', error)
      throw error
    }
  }

  // Update task details
  static async updateTaskDetails(taskId: string, updates: Partial<Task>) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating task details:', error)
      throw error
    }
  }

  // Approve/reject task via API
  static async approveTask(taskId: string, action: 'approve' | 'reject', notes?: string) {
    try {
      const response = await fetch('/api/tasks/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ task_id: taskId, action, notes })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result?.error || 'Failed to update task approval')
      return result
    } catch (error) {
      console.error('Error updating task approval:', error)
      throw error
    }
  }
}