export interface Booking {
  id: string
  client_id: string
  provider_id: string
  service_id: string
  package_id?: string
  title: string
  requirements?: any
  status: BookingStatus
  subtotal: number
  vat_percent: number
  vat_amount: number
  total_amount: number
  currency: string
  due_at?: string
  progress_percentage: number
  created_at: string
  updated_at: string
}

export type BookingStatus = 
  | 'draft' 
  | 'pending' 
  | 'approved'
  | 'declined'
  | 'in_progress' 
  | 'completed' 
  | 'cancelled'

export interface BookingMilestone {
  id: string
  booking_id: string
  service_milestone_id?: string // Reference to original service milestone
  title: string
  description: string
  due_date?: string
  status: MilestoneStatus
  priority: 'low' | 'medium' | 'high' | 'urgent'
  progress_percentage: number
  weight: number
  order_index: number
  completed_at?: string
  created_at: string
  updated_at: string
}

export type MilestoneStatus = 
  | 'pending' 
  | 'in_progress' 
  | 'completed' 
  | 'cancelled' 
  | 'on_hold'

export interface BookingTask {
  id: string
  milestone_id: string
  booking_id: string
  title: string
  description?: string
  status: TaskStatus
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: string
  assigned_to?: string
  completed_at?: string
  created_at: string
  updated_at: string
}

export type TaskStatus = 
  | 'pending' 
  | 'in_progress' 
  | 'completed' 
  | 'cancelled'

export interface BookingService {
  id: string
  booking_id: string
  service_id: string
  created_at: string
}
