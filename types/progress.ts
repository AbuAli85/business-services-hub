export interface Milestone {
  id: string
  title: string
  description: string
  progress_percentage: number
  status: string
  due_date?: string
  weight: number
  order_index: number
  editable: boolean
  tasks: Task[]
  created_at?: string
  updated_at?: string
}

export interface Task {
  id: string
  title: string
  status: string
  progress_percentage: number
  due_date?: string
  editable: boolean
  milestone_id?: string
  estimated_hours?: number
  actual_hours?: number
  priority?: string
  created_at?: string
  updated_at?: string
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
