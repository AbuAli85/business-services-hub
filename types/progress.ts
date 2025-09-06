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
  completed_milestones: number
  total_milestones: number
  completed_tasks: number
  total_tasks: number
  total_estimated_hours: number
  total_actual_hours: number
  overdue_tasks: number
  created_at: string
  updated_at: string
}

export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled'
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type Priority = 'high' | 'medium' | 'low'
