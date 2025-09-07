// Standardized Progress Tracking Types
// This file contains all the core types used across the progress tracking system

export type TaskStatus = "pending" | "in_progress" | "completed";
export type MilestoneStatus = "not_started" | "in_progress" | "completed";
export type UserRole = "provider" | "client" | "admin";

export interface Task {
  id: string;
  milestone_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  progress?: number;
  due_date?: string;
  created_at: string;
  updated_at: string;
  estimated_hours?: number;
  actual_hours?: number;
  priority?: "low" | "medium" | "high" | "urgent";
  assigned_to?: string;
  order_index: number;
  is_overdue?: boolean;
}

export interface Milestone {
  id: string;
  booking_id: string;
  title: string;
  description?: string;
  status: MilestoneStatus;
  start_date: string;
  end_date: string;
  progress: number;
  tasks: Task[];
  created_at: string;
  updated_at: string;
  estimated_hours?: number;
  actual_hours?: number;
  priority?: "low" | "medium" | "high" | "urgent";
  weight?: number;
  order_index: number;
  is_overdue?: boolean;
}

export interface TimeEntry {
  id: string;
  milestone_id?: string;
  task_id?: string;
  booking_id: string;
  user_id: string;
  timestamp: string;
  notes?: string;
  duration?: number;
  start_time: string;
  end_time?: string;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  milestone_id?: string;
  task_id?: string;
  booking_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author_name?: string;
  author_role?: UserRole;
}

export interface BookingProgress {
  id: string;
  booking_id: string;
  booking_title: string;
  booking_status: string;
  booking_progress: number;
  completed_milestones: number;
  total_milestones: number;
  completed_tasks: number;
  total_tasks: number;
  total_estimated_hours: number;
  total_actual_hours: number;
  overdue_tasks: number;
  created_at: string;
  updated_at: string;
}

export interface TimelineItem {
  id: string;
  booking_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: "low" | "medium" | "high" | "urgent";
  start_date: string;
  end_date: string;
  assigned_to?: string;
  progress_percentage: number;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface ProgressUpdate {
  type: 'task' | 'milestone' | 'booking' | 'timeline';
  taskId?: string;
  milestoneId?: string;
  bookingId?: string;
  timelineId?: string;
  data: Partial<Task | Milestone | BookingProgress | TimelineItem>;
}

export interface ProgressStats {
  totalBookings: number;
  activeBookings: number;
  completedBookings: number;
  averageProgress: number;
  overdueTasks: number;
  totalHours: number;
  completedHours: number;
}

// Component Props Interfaces
export interface ProgressTrackingSystemProps {
  bookingId: string;
  userRole: UserRole;
  className?: string;
}

export interface MilestoneListProps {
  milestones: Milestone[];
  userRole: UserRole;
  onMilestoneUpdate: (milestoneId: string, updates: Partial<Milestone>) => Promise<void>;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onTaskCreate: (milestoneId: string, task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'is_overdue' | 'actual_hours'>) => Promise<void>;
  onTaskDelete: (taskId: string) => Promise<void>;
  onCommentAdd: (milestoneId: string, content: string) => Promise<void>;
}

export interface TaskListProps {
  tasks: Task[];
  userRole: UserRole;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onTaskCreate: (milestoneId: string, task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'is_overdue' | 'actual_hours'>) => Promise<void>;
  onTaskDelete: (taskId: string) => Promise<void>;
  onTimeLog: (taskId: string, duration: number, description: string) => Promise<void>;
}

export interface TimelineProps {
  timeline: TimelineItem[];
  userRole: UserRole;
  onTimelineUpdate: (timeline: TimelineItem[]) => void;
  onSave: (timeline: TimelineItem[]) => Promise<void>;
}

export interface AnalyticsProps {
  milestones: Milestone[];
  timeEntries: TimeEntry[];
  totalEstimatedHours: number;
  totalActualHours: number;
  stats?: ProgressStats;
}