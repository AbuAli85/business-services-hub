// Shared types for the professional milestone system

export interface Milestone {
  id: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  start_date: string
  due_date: string
  actual_start_date?: string
  actual_end_date?: string
  estimated_hours: number
  actual_hours: number
  progress_percentage: number
  critical_path: boolean
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  phase_id?: string
  template_id?: string
  created_at: string
  updated_at: string
  tasks?: Task[]
  dependencies?: MilestoneDependency[]
  dependents?: MilestoneDependency[]
}

export interface Task {
  id: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  start_date: string
  due_date: string
  actual_start_date?: string
  actual_end_date?: string
  estimated_hours: number
  actual_hours: number
  progress_percentage: number
  critical_path: boolean
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  assigned_to?: string
  created_by: string
  milestone_id: string
  phase_id?: string
  created_at: string
  updated_at: string
  dependencies?: TaskDependency[]
  dependents?: TaskDependency[]
}

export interface MilestoneDependency {
  id: string
  milestone_id: string
  depends_on_milestone_id: string
  dependency_type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish'
  lag_days: number
  depends_on_milestone: Milestone
  created_at: string
}

export interface TaskDependency {
  id: string
  task_id: string
  depends_on_task_id: string
  dependency_type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish'
  lag_days: number
  depends_on_task: Task
  created_at: string
}

export interface ProjectPhase {
  id: string
  name: string
  description: string
  start_date: string
  end_date: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
  order_index: number
  milestones: Milestone[]
  created_at: string
  updated_at: string
}

export interface MilestoneTemplate {
  id: string
  name: string
  description: string
  service_type: string
  estimated_duration_days: number
  is_active: boolean
  created_by?: string
  created_at: string
  updated_at: string
  tasks: MilestoneTemplateTask[]
}

export interface MilestoneTemplateTask {
  id: string
  title: string
  description: string
  estimated_hours: number
  priority: 'low' | 'medium' | 'high' | 'urgent'
  order_index: number
  created_at: string
}

export interface WorkflowStep {
  id: string
  name: string
  description: string
  type: 'milestone' | 'task' | 'approval' | 'notification' | 'condition'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
  order_index: number
  conditions?: WorkflowCondition[]
  actions?: WorkflowAction[]
  next_steps?: string[]
  previous_steps?: string[]
  estimated_duration: number
  actual_duration?: number
  assigned_to?: string
  due_date?: string
  created_at: string
  updated_at: string
}

export interface WorkflowCondition {
  id: string
  field: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains'
  value: string
  logical_operator?: 'AND' | 'OR'
}

export interface WorkflowAction {
  id: string
  type: 'create_milestone' | 'create_task' | 'send_notification' | 'update_status' | 'assign_user' | 'set_due_date'
  parameters: Record<string, any>
  order_index: number
}

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  service_type: string
  steps: WorkflowStep[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface WorkflowExecution {
  id: string
  workflow_id: string
  booking_id: string
  current_step_id: string
  status: 'running' | 'paused' | 'completed' | 'cancelled' | 'error'
  started_at: string
  completed_at?: string
  error_message?: string
  step_executions: WorkflowStepExecution[]
}

export interface WorkflowStepExecution {
  id: string
  step_id: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped'
  started_at: string
  completed_at?: string
  error_message?: string
  result_data?: Record<string, any>
}

export interface MilestoneSettings {
  // General Settings
  default_priority: 'low' | 'medium' | 'high' | 'urgent'
  default_risk_level: 'low' | 'medium' | 'high' | 'critical'
  auto_progress_calculation: boolean
  critical_path_enabled: boolean
  dependency_validation: boolean
  
  // Notification Settings
  milestone_reminders: boolean
  task_reminders: boolean
  dependency_alerts: boolean
  overdue_notifications: boolean
  completion_notifications: boolean
  
  // Workflow Settings
  auto_status_updates: boolean
  require_approval: boolean
  client_visibility: boolean
  progress_reporting: boolean
  
  // Template Settings
  default_template: string
  auto_create_tasks: boolean
  task_estimation: boolean
  
  // UI Settings
  theme: 'light' | 'dark' | 'auto'
  compact_view: boolean
  show_progress_bars: boolean
  show_dependencies: boolean
  show_risk_indicators: boolean
}
