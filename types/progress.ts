// Standardized Progress Tracking Types
// This file contains all the core types used across the progress tracking system

export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type MilestoneStatus = "pending" | "in_progress" | "completed" | "cancelled" | "on_hold";
export type UserRole = "provider" | "client" | "admin";

export interface Task {
  id: string;
  milestone_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  progress_percentage?: number; // ✅ Fixed: Use progress_percentage to match database
  due_date?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  estimated_hours?: number;
  actual_hours?: number;
  priority?: "low" | "normal" | "high" | "urgent";
  assigned_to?: string;
  order_index: number;
  is_overdue?: boolean;
  // Phase 6 additions
  weight?: number;
  tags?: string[];
  attachments?: Array<{
    url: string;
    filename: string;
    uploaded_by: string;
    uploaded_at: string;
  }>;
}

export interface Milestone {
  id: string;
  booking_id: string;
  title: string;
  description?: string;
  status: MilestoneStatus;
  due_date: string;
  progress_percentage: number; // ✅ Fixed: Use progress_percentage to match database
  tasks: Task[];
  created_at: string;
  updated_at: string;
  estimated_hours?: number;
  actual_hours?: number;
  priority?: "low" | "normal" | "high" | "urgent";
  weight?: number;
  order_index: number;
  is_overdue?: boolean;
  completed_at?: string;
  created_by?: string;
  overdue_since?: string;
  completed_tasks?: number;
  total_tasks?: number;
  editable?: boolean;
}

export interface MilestoneApproval {
  id: string;
  milestone_id: string;
  user_id: string;
  status: 'approved' | 'rejected';
  comment?: string;
  created_at: string;
}

export interface TimeEntry {
  duration_minutes: number;
  is_active: any;
  id: string;
  milestone_id?: string;
  task_id?: string;
  booking_id: string;
  user_id: string;
  duration_hours: number;
  description?: string;
  logged_at: string;
  created_at: string;
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
  parent_id?: string | null;
  replies?: Comment[];
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
  priority: "low" | "normal" | "high" | "urgent";
  due_date: string;
  assigned_to?: string;
  progress_percentage: number; // ✅ Already correct
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface ProgressUpdate {
  milestoneId: string;
  milestoneProgress: number;
  overallProgress: number;
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