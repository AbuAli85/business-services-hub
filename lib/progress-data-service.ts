import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export interface Task {
  id: string;
  milestone_id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  estimated_hours: number;
  actual_hours: number;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface Milestone {
  id: string;
  booking_id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  progress_percentage: number;
  completed_tasks: number;
  total_tasks: number;
  estimated_hours: number;
  actual_hours: number;
  order_index: number;
  created_at: string;
  updated_at: string;
  tasks: Task[];
}

export interface TimeEntry {
  id: string;
  booking_id: string;
  milestone_id: string;
  task_id: string;
  user_id: string;
  duration_hours: number;
  description: string;
  start_time: string;
  logged_at: string;
  created_at: string;
}

export interface ProgressData {
  milestones: Milestone[];
  timeEntries: TimeEntry[];
  overallProgress: number;
  totalTasks: number;
  completedTasks: number;
  totalEstimatedHours: number;
  totalActualHours: number;
}

export class ProgressDataService {
  static async getProgressData(bookingId: string): Promise<ProgressData> {
    try {
      // Fetch milestones with tasks
      const { data: milestones, error: milestonesError } = await supabase
        .from('milestones')
        .select(`
          *,
          tasks (*)
        `)
        .eq('booking_id', bookingId)
        .order('order_index');

      if (milestonesError) throw milestonesError;

      // Fetch time entries
      const { data: timeEntries, error: timeEntriesError } = await supabase
        .from('time_entries')
        .select('*')
        .eq('booking_id', bookingId)
        .order('logged_at', { ascending: false });

      if (timeEntriesError) throw timeEntriesError;

      // Calculate overall progress
      const totalTasks = milestones.reduce((sum, m) => sum + (m.tasks?.length || 0), 0);
      const completedTasks = milestones.reduce((sum, m) => 
        sum + (m.tasks?.filter((t: Task) => t.status === 'completed').length || 0), 0
      );
      const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      const totalEstimatedHours = milestones.reduce((sum, m) => sum + (m.estimated_hours || 0), 0);
      const totalActualHours = milestones.reduce((sum, m) => sum + (m.actual_hours || 0), 0);

      return {
        milestones: milestones || [],
        timeEntries: timeEntries || [],
        overallProgress,
        totalTasks,
        completedTasks,
        totalEstimatedHours,
        totalActualHours
      };
    } catch (error) {
      console.error('Error fetching progress data:', error);
      throw error;
    }
  }

  static async updateTaskStatus(taskId: string, status: 'pending' | 'in_progress' | 'completed'): Promise<void> {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating task status:', error);
      throw error;
    }
  }

  static async updateTaskDetails(
    taskId: string, 
    updates: {
      title?: string;
      description?: string;
      priority?: 'low' | 'medium' | 'high';
      estimated_hours?: number;
    }
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating task details:', error);
      throw error;
    }
  }

  static async addTask(
    milestoneId: string,
    task: {
      title: string;
      description: string;
      priority: 'low' | 'medium' | 'high';
      estimated_hours: number;
    }
  ): Promise<Task> {
    try {
      // Get the next order index
      const { data: existingTasks } = await supabase
        .from('tasks')
        .select('order_index')
        .eq('milestone_id', milestoneId)
        .order('order_index', { ascending: false })
        .limit(1);

      const nextOrderIndex = existingTasks?.[0]?.order_index + 1 || 0;

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          milestone_id: milestoneId,
          title: task.title,
          description: task.description,
          status: 'pending',
          priority: task.priority,
          estimated_hours: task.estimated_hours,
          actual_hours: 0,
          order_index: nextOrderIndex
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding task:', error);
      throw error;
    }
  }

  static async logTime(
    taskId: string,
    durationHours: number,
    description: string
  ): Promise<TimeEntry> {
    try {
      // Get task details to find milestone and booking
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select(`
          milestone_id,
          milestones!inner(booking_id)
        `)
        .eq('id', taskId)
        .single();

      if (taskError) throw taskError;

      // Extract booking_id from the nested structure
      const bookingId = (task as any).milestones.booking_id;

      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          booking_id: bookingId,
          milestone_id: task.milestone_id,
          task_id: taskId,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          duration_hours: durationHours,
          description,
          start_time: new Date(Date.now() - durationHours * 3600000).toISOString(),
          logged_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Update task actual_hours
      await this.updateTaskActualHours(taskId);

      return data;
    } catch (error) {
      console.error('Error logging time:', error);
      throw error;
    }
  }

  static async updateTaskActualHours(taskId: string): Promise<void> {
    try {
      // Get total hours for this task
      const { data: timeEntries, error: timeError } = await supabase
        .from('time_entries')
        .select('duration_hours')
        .eq('task_id', taskId);

      if (timeError) throw timeError;

      const totalHours = timeEntries?.reduce((sum, entry) => sum + entry.duration_hours, 0) || 0;

      // Update task
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ 
          actual_hours: totalHours,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error updating task actual hours:', error);
      throw error;
    }
  }

  static async refreshProgressData(bookingId: string): Promise<ProgressData> {
    // Force refresh by adding a timestamp to bypass cache
    return this.getProgressData(bookingId);
  }
}
