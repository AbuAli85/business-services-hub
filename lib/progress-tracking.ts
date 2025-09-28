import { getSupabaseClient } from './supabase'

// Types for progress tracking
export interface Milestone {
  id: string
  booking_id: string
  title: string
  description?: string
  due_date?: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  progress_percentage: number
  weight: number
  order_index: number
  editable: boolean
  completed_at?: string
  created_at: string
  updated_at: string
  created_by?: string
  is_overdue: boolean
  overdue_since?: string
  estimated_hours?: number
  actual_hours?: number
  tags?: string[]
  notes?: string
  assigned_to?: string
  tasks?: Task[]
}

export interface Task {
  id: string
  milestone_id: string
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  due_date?: string
  progress_percentage: number
  estimated_hours?: number
  actual_hours: number
  tags: string[]
  steps: TaskStep[]
  completed_at?: string
  created_at: string
  updated_at: string
  created_by?: string
  assigned_to?: string
  is_overdue: boolean
  overdue_since?: string
  approval_status: 'pending' | 'approved' | 'rejected'
  approved_by?: string
  approved_at?: string
  approval_notes?: string
  comments?: TaskComment[]
  time_entries?: TimeEntry[]
}

export interface TaskStep {
  title: string
  completed: boolean
  due_date?: string
}

export interface TaskComment {
  id: string
  task_id: string
  user_id: string
  comment: string
  is_internal: boolean
  created_at: string
  updated_at: string
}

export interface TimeEntry {
  id: string
  task_id: string
  user_id: string
  description?: string
  start_time: string
  end_time?: string
  duration_minutes?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BookingProgress {
  booking_id: string
  booking_title: string
  booking_status: string
  booking_progress: number
  total_milestones: number
  completed_milestones: number
  total_tasks: number
  completed_tasks: number
  overdue_tasks: number
  total_estimated_hours: number
  total_actual_hours: number
  created_at: string
  updated_at: string
}

// Progress calculation functions
export function calculateTaskProgress(task: Task): number {
  if (task.steps.length === 0) {
    return task.progress_percentage
  }
  
  const completedSteps = task.steps.filter(step => step.completed).length
  return Math.round((completedSteps / task.steps.length) * 100)
}

export function calculateMilestoneProgress(milestone: Milestone): number {
  if (!milestone.tasks || milestone.tasks.length === 0) {
    return milestone.progress_percentage
  }
  
  const totalProgress = milestone.tasks.reduce((sum, task) => sum + task.progress_percentage, 0)
  return Math.round(totalProgress / milestone.tasks.length)
}

export function calculateBookingProgress(milestones: Milestone[]): number {
  if (milestones.length === 0) {
    return 0
  }
  
  const totalWeightedProgress = milestones.reduce((sum, milestone) => {
    return sum + (milestone.progress_percentage * milestone.weight)
  }, 0)
  
  const totalWeight = milestones.reduce((sum, milestone) => sum + milestone.weight, 0)
  
  if (totalWeight === 0) {
    return 0
  }
  
  return Math.round(totalWeightedProgress / totalWeight)
}

// Database operations
export class ProgressTrackingService {
  // Cache to track if time_entries table is accessible
  private static timeEntriesAccessible: boolean | null = null
  // Cache to track if specific user can access time_entries
  private static userTimeEntriesAccess: Map<string, boolean> = new Map()
  
  // Check if time_entries table is accessible (with caching)
  private static async isTimeEntriesAccessible(): Promise<boolean> {
    if (this.timeEntriesAccessible !== null) {
      return this.timeEntriesAccessible
    }
    
    try {
      const supabase = await getSupabaseClient()
      
      // Test basic table access with minimal query
      const { error: basicError } = await supabase
        .from('time_entries')
        .select('id')
        .limit(1)
      
      if (basicError) {
        console.warn('time_entries table basic access failed:', basicError.message)
        this.timeEntriesAccessible = false
        return false
      }
      
      // If basic access works, mark as accessible
      this.timeEntriesAccessible = true
      return true
    } catch (error) {
      console.warn('time_entries table access test failed:', error)
      this.timeEntriesAccessible = false
      return false
    }
  }
  
  // Check if specific user can access time_entries (with caching)
  private static async canUserAccessTimeEntries(userId: string): Promise<boolean> {
    if (this.userTimeEntriesAccess.has(userId)) {
      return this.userTimeEntriesAccess.get(userId)!
    }
    
    try {
      // First check if time_entries table is generally accessible
      const isAccessible = await this.isTimeEntriesAccessible()
      if (!isAccessible) {
        this.userTimeEntriesAccess.set(userId, false)
        return false
      }
      
      const supabase = await getSupabaseClient()
      
      // Test if user can query time_entries with their own user_id
      const { error: userError } = await supabase
        .from('time_entries')
        .select('id')
        .eq('user_id', userId)
        .limit(1)
      
      if (userError) {
        console.warn(`User ${userId} cannot access time_entries:`, userError.message)
        this.userTimeEntriesAccess.set(userId, false)
        return false
      }
      
      // User can access time_entries
      this.userTimeEntriesAccess.set(userId, true)
      return true
    } catch (error) {
      console.warn(`Error checking user ${userId} time_entries access:`, error)
      this.userTimeEntriesAccess.set(userId, false)
      return false
    }
  }
  
  // Milestone operations
  static async getMilestones(bookingId: string): Promise<Milestone[]> {
    const supabase = await getSupabaseClient()
    const { data, error } = await supabase
      .from('milestones')
      .select(`
        *,
        tasks (
          *,
          task_comments (*)
        )
      `)
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true })
    
    if (error) throw error
    return data || []
  }

  static async createMilestone(milestone: Omit<Milestone, 'id' | 'created_at' | 'updated_at' | 'is_overdue'>): Promise<Milestone> {
    const supabase = await getSupabaseClient()
    const { data, error } = await supabase
      .from('milestones')
      .insert(milestone)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  static async updateMilestone(id: string, updates: Partial<Milestone>): Promise<Milestone> {
    const supabase = await getSupabaseClient()
    const { data, error } = await supabase
      .from('milestones')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  static async deleteMilestone(id: string): Promise<void> {
    const supabase = await getSupabaseClient()
    const { error } = await supabase
      .from('milestones')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }

  // Task operations
  static async getTasks(milestoneId: string): Promise<Task[]> {
    const supabase = await getSupabaseClient()
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        task_comments (*)
      `)
      .eq('milestone_id', milestoneId)
      .order('created_at', { ascending: true })
    
    if (error) throw error
    return data || []
  }

  static async createTask(task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'is_overdue' | 'actual_hours'>): Promise<Task> {
    const supabase = await getSupabaseClient()
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        ...task,
        actual_hours: 0
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  static async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    // Validate that id is a valid UUID and not a booking ID
    const isUuid = (taskId: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(taskId)
    if (!isUuid(id)) {
      console.error('❌ Invalid UUID format for taskId in ProgressTracking:', id)
      throw new Error('Invalid task ID format')
    }
    
    const supabase = await getSupabaseClient()
    const { data, error } = await supabase
      .from('tasks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  static async deleteTask(id: string): Promise<void> {
    const supabase = await getSupabaseClient()
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }

  // Time tracking operations
  static async startTimeTracking(taskId: string, userId: string, description?: string): Promise<TimeEntry> {
    // Stop any active time entries for this user
    await this.stopAllActiveTimeEntries(userId)
    
    try {
      // Check if time_entries table is accessible
      const isAccessible = await this.isTimeEntriesAccessible()
      
      if (!isAccessible) {
        console.warn('time_entries table not accessible, returning mock entry')
        // Return a mock entry if the table is not accessible
        return {
          id: 'mock-' + Date.now(),
          task_id: taskId,
          user_id: userId,
          description,
          start_time: new Date().toISOString(),
          end_time: undefined,
          duration_minutes: undefined,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      }
      
      const supabase = await getSupabaseClient()
      
      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          task_id: taskId,
          user_id: userId,
          description,
          start_time: new Date().toISOString(),
          is_active: true
        })
        .select()
        .single()
      
      if (error) {
        console.warn('Error creating time entry:', error)
        // Return a mock entry if the table doesn't exist
        return {
          id: 'mock-' + Date.now(),
          task_id: taskId,
          user_id: userId,
          description,
          start_time: new Date().toISOString(),
          end_time: undefined,
          duration_minutes: undefined,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      }
      
      return data
    } catch (error) {
      console.warn('Error in startTimeTracking:', error)
      // Return a mock entry if there's any error
      return {
        id: 'mock-' + Date.now(),
        task_id: taskId,
        user_id: userId,
        description,
        start_time: new Date().toISOString(),
        end_time: undefined,
        duration_minutes: undefined,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }
  }

  static async stopTimeTracking(entryId: string): Promise<TimeEntry> {
    const endTime = new Date().toISOString()
    
    try {
      // Check if time_entries table is accessible
      const isAccessible = await this.isTimeEntriesAccessible()
      
      if (!isAccessible) {
        console.warn('time_entries table not accessible, returning mock stopped entry')
        // Return a mock stopped entry
        return {
          id: entryId,
          task_id: 'unknown',
          user_id: 'unknown',
          description: 'Mock entry',
          start_time: new Date().toISOString(),
          end_time: endTime,
          duration_minutes: 0,
          is_active: false,
          created_at: new Date().toISOString(),
          updated_at: endTime
        }
      }
      
      const supabase = await getSupabaseClient()
      
      // Get the entry to calculate duration
      const { data: entry, error: fetchError } = await supabase
        .from('time_entries')
        .select('start_time, task_id')
        .eq('id', entryId)
        .single()
      
      if (fetchError) {
        console.warn('Error fetching time entry:', fetchError)
        // Return a mock stopped entry
        return {
          id: entryId,
          task_id: 'unknown',
          user_id: 'unknown',
          description: 'Mock entry',
          start_time: new Date().toISOString(),
          end_time: endTime,
          duration_minutes: 0,
          is_active: false,
          created_at: new Date().toISOString(),
          updated_at: endTime
        }
      }
      
      const startTime = new Date(entry.start_time)
      const duration = Math.round((new Date(endTime).getTime() - startTime.getTime()) / (1000 * 60)) // minutes

      const { data, error } = await supabase
        .from('time_entries')
        .update({
          end_time: endTime,
          duration_minutes: duration,
          is_active: false,
          updated_at: endTime
        })
        .eq('id', entryId)
        .select()
        .single()
      
      if (error) {
        console.warn('Error updating time entry:', error)
        // Return a mock stopped entry
        return {
          id: entryId,
          task_id: entry.task_id,
          user_id: 'unknown',
          description: 'Mock entry',
          start_time: entry.start_time,
          end_time: endTime,
          duration_minutes: duration,
          is_active: false,
          created_at: new Date().toISOString(),
          updated_at: endTime
        }
      }
      
      // Update task actual hours
      await this.updateTaskActualHours(data.task_id)
      
      return data
    } catch (error) {
      console.warn('Error in stopTimeTracking:', error)
      // Return a mock stopped entry
      return {
        id: entryId,
        task_id: 'unknown',
        user_id: 'unknown',
        description: 'Mock entry',
        start_time: new Date().toISOString(),
        end_time: endTime,
        duration_minutes: 0,
        is_active: false,
        created_at: new Date().toISOString(),
        updated_at: endTime
      }
    }
  }

  static async stopAllActiveTimeEntries(userId: string): Promise<void> {
    try {
      // Check if time_entries table is accessible
      const isAccessible = await this.isTimeEntriesAccessible()
      
      if (!isAccessible) {
        console.warn('time_entries table not accessible, skipping stopAllActiveTimeEntries')
        return
      }
      
      const supabase = await getSupabaseClient()
      
      const { data: activeEntries, error: fetchError } = await supabase
        .from('time_entries')
        .select('id, task_id, start_time')
        .eq('user_id', userId)
        .eq('is_active', true)
      
      if (fetchError) {
        console.warn('Error fetching active time entries:', fetchError)
        return
      }
    
      for (const entry of activeEntries || []) {
        await this.stopTimeTracking(entry.id)
      }
    } catch (error) {
      console.warn('Error in stopAllActiveTimeEntries:', error)
    }
  }

  static async getActiveTimeEntry(userId: string): Promise<TimeEntry | null> {
    try {
      // Check if this specific user can access time_entries
      const canAccess = await this.canUserAccessTimeEntries(userId)
      
      if (!canAccess) {
        console.warn(`User ${userId} cannot access time_entries, returning null`)
        return null
      }
      
      const supabase = await getSupabaseClient()
      
      // Now try the actual query with error handling
      const { data, error } = await supabase
        .from('time_entries')
        .select('id, task_id, user_id, description, start_time, end_time, duration_minutes, is_active, created_at, updated_at')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found - this is normal
          return null
        }
        // If we get a 406 error, mark user as unable to access time_entries
        if (error.message?.includes('406') || error.message?.includes('Not Acceptable')) {
          console.warn(`User ${userId} got 406 error, marking as unable to access time_entries`)
          this.userTimeEntriesAccess.set(userId, false)
          return null
        }
        console.warn('Error fetching active time entry:', error)
        return null
      }
      
      return data
    } catch (error) {
      console.warn('Error in getActiveTimeEntry:', error)
      return null
    }
  }

  static async updateTaskActualHours(taskId: string): Promise<void> {
    try {
      // Check if time_entries table is accessible
      const isAccessible = await this.isTimeEntriesAccessible()
      
      if (!isAccessible) {
        console.warn('time_entries table not accessible, skipping updateTaskActualHours')
        return
      }
      
      const supabase = await getSupabaseClient()
      
      const { data: timeEntries, error: fetchError } = await supabase
        .from('time_entries')
        .select('duration_minutes')
        .eq('task_id', taskId)
        .not('duration_minutes', 'is', null)
      
      if (fetchError) {
        console.warn('Error fetching time entries for task:', fetchError)
        return
      }
      
      const totalMinutes = timeEntries?.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0) || 0
      const totalHours = totalMinutes / 60

      const { error } = await supabase
        .from('tasks')
        .update({ actual_hours: totalHours })
        .eq('id', taskId)
      
      if (error) {
        console.warn('Error updating task actual hours:', error)
      }
    } catch (error) {
      console.warn('Error in updateTaskActualHours:', error)
    }
  }

  // Get time entries for a specific booking through the relationship chain
  static async getTimeEntriesByBookingId(bookingId: string): Promise<TimeEntry[]> {
    try {
      // Check if time_entries table is accessible
      const isAccessible = await this.isTimeEntriesAccessible()
      
      if (!isAccessible) {
        console.warn('time_entries table not accessible, returning empty array')
        return []
      }
      
      const supabase = await getSupabaseClient()
      // First, get all task IDs for this booking through milestones
      const { data: milestones, error: milestonesError } = await supabase
        .from('milestones')
        .select(`
          id,
          tasks(
            id
          )
        `)
        .eq('booking_id', bookingId)
      
      if (milestonesError) throw milestonesError
      
      // Extract all task IDs
      const allTaskIds = milestones?.flatMap(milestone => 
        milestone.tasks?.map((task: any) => task.id) || []
      ) || []
      
      // Filter out invalid task IDs (booking IDs, non-UUIDs, etc.)
      const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
      const taskIds = allTaskIds.filter((id: string) => {
        const isValid = isUuid(id)
        if (!isValid) {
          console.warn('⚠️ Filtering out invalid task ID from time entries query:', id)
        }
        return isValid
      })
      
      if (taskIds.length === 0) {
        return []
      }
      
      // Now get time entries for these tasks
      const { data: timeEntries, error: timeEntriesError } = await supabase
        .from('time_entries')
        .select(`
          id,
          task_id,
          user_id,
          description,
          start_time,
          end_time,
          duration_minutes,
          is_active,
          created_at,
          updated_at
        `)
        .in('task_id', taskIds)
        .order('created_at', { ascending: false })
      
      if (timeEntriesError) {
        console.warn('Error fetching time entries:', timeEntriesError)
        return []
      }
      return timeEntries || []
      
    } catch (error) {
      console.warn('Error fetching time entries by booking ID:', error)
      return []
    }
  }

  // Comment operations
  static async addTaskComment(taskId: string, userId: string, comment: string, isInternal: boolean = false): Promise<TaskComment> {
    const supabase = await getSupabaseClient()
    const { data, error } = await supabase
      .from('task_comments')
      .insert({
        task_id: taskId,
        user_id: userId,
        comment,
        is_internal: isInternal
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  static async getTaskComments(taskId: string): Promise<TaskComment[]> {
    const supabase = await getSupabaseClient()
    const { data, error } = await supabase
      .from('task_comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })
    
    if (error) throw error
    return data || []
  }

  // Approval operations
  static async approveTask(taskId: string, approvedBy: string, notes?: string): Promise<Task> {
    const supabase = await getSupabaseClient()
    const { data, error } = await supabase
      .from('tasks')
      .update({
        approval_status: 'approved',
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
        approval_notes: notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  static async rejectTask(taskId: string, rejectedBy: string, notes?: string): Promise<Task> {
    const supabase = await getSupabaseClient()
    const { data, error } = await supabase
      .from('tasks')
      .update({
        approval_status: 'rejected',
        approved_by: rejectedBy,
        approved_at: new Date().toISOString(),
        approval_notes: notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  // Progress operations
  static async getBookingProgress(bookingId: string): Promise<BookingProgress | null> {
    const supabase = await getSupabaseClient()
    const { data, error } = await supabase
      .from('booking_progress_view')
      .select('*')
      .eq('booking_id', bookingId)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  static async updateOverdueStatus(): Promise<void> {
    const supabase = await getSupabaseClient()
    const { error } = await supabase.rpc('update_overdue_status')
    if (error) throw error
  }

  // Utility methods for cache management
  static clearTimeEntriesCache(): void {
    this.timeEntriesAccessible = null
    this.userTimeEntriesAccess.clear()
  }

  static async isTimeTrackingAvailable(): Promise<boolean> {
    return await this.isTimeEntriesAccessible()
  }
}

// Utility functions
export function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800'
    case 'in_progress':
      return 'bg-blue-100 text-blue-800'
    case 'pending':
      return 'bg-yellow-100 text-yellow-800'
    case 'cancelled':
      return 'bg-red-100 text-red-800'
    case 'on_hold':
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'urgent':
      return 'bg-red-100 text-red-800'
    case 'high':
      return 'bg-orange-100 text-orange-800'
    case 'medium':
      return 'bg-yellow-100 text-yellow-800'
    case 'low':
      return 'bg-green-100 text-green-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  
  if (hours > 0) {
    return `${hours}h ${mins}m`
  }
  return `${mins}m`
}

export function isOverdue(dueDate: string, status: string): boolean {
  if (status === 'completed' || status === 'cancelled') return false
  return new Date(dueDate) < new Date()
}
