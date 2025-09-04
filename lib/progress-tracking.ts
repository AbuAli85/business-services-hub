import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Types for progress tracking
export interface Milestone {
  id: string
  booking_id: string
  title: string
  description?: string
  due_date?: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  progress_percentage: number
  weight: number
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
  priority: 'low' | 'medium' | 'high' | 'urgent'
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
  // Milestone operations
  static async getMilestones(bookingId: string): Promise<Milestone[]> {
    const { data, error } = await supabase
      .from('milestones')
      .select(`
        *,
        tasks (
          *,
          task_comments (*),
          time_entries (*)
        )
      `)
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true })
    
    if (error) throw error
    return data || []
  }

  static async createMilestone(milestone: Omit<Milestone, 'id' | 'created_at' | 'updated_at' | 'is_overdue'>): Promise<Milestone> {
    const { data, error } = await supabase
      .from('milestones')
      .insert(milestone)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  static async updateMilestone(id: string, updates: Partial<Milestone>): Promise<Milestone> {
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
    const { error } = await supabase
      .from('milestones')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }

  // Task operations
  static async getTasks(milestoneId: string): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        task_comments (*),
        time_entries (*)
      `)
      .eq('milestone_id', milestoneId)
      .order('created_at', { ascending: true })
    
    if (error) throw error
    return data || []
  }

  static async createTask(task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'is_overdue' | 'actual_hours'>): Promise<Task> {
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
    
    if (error) throw error
    return data
  }

  static async stopTimeTracking(entryId: string): Promise<TimeEntry> {
    const endTime = new Date().toISOString()
    
    // Get the entry to calculate duration
    const { data: entry, error: fetchError } = await supabase
      .from('time_entries')
      .select('start_time')
      .eq('id', entryId)
      .single()
    
    if (fetchError) throw fetchError
    
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
    
    if (error) throw error
    
    // Update task actual hours
    await this.updateTaskActualHours(data.task_id)
    
    return data
  }

  static async stopAllActiveTimeEntries(userId: string): Promise<void> {
    const { data: activeEntries, error: fetchError } = await supabase
      .from('time_entries')
      .select('id, task_id, start_time')
      .eq('user_id', userId)
      .eq('is_active', true)
    
    if (fetchError) throw fetchError
    
    for (const entry of activeEntries || []) {
      await this.stopTimeTracking(entry.id)
    }
  }

  static async getActiveTimeEntry(userId: string): Promise<TimeEntry | null> {
    const { data, error } = await supabase
      .from('time_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows found
    return data
  }

  static async updateTaskActualHours(taskId: string): Promise<void> {
    const { data: timeEntries, error: fetchError } = await supabase
      .from('time_entries')
      .select('duration_minutes')
      .eq('task_id', taskId)
      .not('duration_minutes', 'is', null)
    
    if (fetchError) throw fetchError
    
    const totalMinutes = timeEntries?.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0) || 0
    const totalHours = totalMinutes / 60
    
    const { error } = await supabase
      .from('tasks')
      .update({ actual_hours: totalHours })
      .eq('id', taskId)
    
    if (error) throw error
  }

  // Comment operations
  static async addTaskComment(taskId: string, userId: string, comment: string, isInternal: boolean = false): Promise<TaskComment> {
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
    const { data, error } = await supabase
      .from('booking_progress_view')
      .select('*')
      .eq('booking_id', bookingId)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  static async updateOverdueStatus(): Promise<void> {
    const { error } = await supabase.rpc('update_overdue_status')
    if (error) throw error
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
