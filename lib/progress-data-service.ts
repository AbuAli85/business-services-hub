import { getSupabaseClient } from './supabase';
import { Task, Milestone, TimeEntry, BookingProgress } from '@/types/progress';

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
      const supabase = await getSupabaseClient();
      
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
      const supabase = await getSupabaseClient();
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
    updates: Partial<Task>
  ): Promise<void> {
    try {
      const supabase = await getSupabaseClient();
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
    task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'is_overdue' | 'actual_hours'>
  ): Promise<Task> {
    try {
      const supabase = await getSupabaseClient();
      
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
          description: task.description || '',
          status: task.status || 'pending',
          priority: task.priority || 'medium',
          estimated_hours: task.estimated_hours || 0,
          actual_hours: 0,
          order_index: nextOrderIndex,
          due_date: task.due_date,
          progress: task.progress || 0
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
    duration: number,
    description: string
  ): Promise<TimeEntry> {
    try {
      const supabase = await getSupabaseClient();
      
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
          duration_hours: duration,
          description: description,
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
      const supabase = await getSupabaseClient();
      
      // Get total hours for this task
      const { data: timeEntries, error: timeError } = await supabase
        .from('time_entries')
        .select('duration_hours')
        .eq('task_id', taskId);

      if (timeError) throw timeError;

      const totalHours = timeEntries?.reduce((sum, entry) => sum + (entry.duration_hours || 0), 0) || 0;

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

  // Milestone management methods
  static async createMilestone(
    bookingId: string,
    milestone: Omit<Milestone, 'id' | 'created_at' | 'updated_at' | 'tasks'>
  ): Promise<Milestone> {
    try {
      const supabase = await getSupabaseClient();
      
      // Get the next order index
      const { data: existingMilestones } = await supabase
        .from('milestones')
        .select('order_index')
        .eq('booking_id', bookingId)
        .order('order_index', { ascending: false })
        .limit(1);

      const nextOrderIndex = existingMilestones?.[0]?.order_index + 1 || 0;

      const { data, error } = await supabase
        .from('milestones')
        .insert({
          booking_id: bookingId,
          title: milestone.title,
          description: milestone.description || '',
          status: milestone.status || 'not_started',
          start_date: milestone.start_date,
          end_date: milestone.end_date,
          progress: milestone.progress || 0,
          estimated_hours: milestone.estimated_hours || 0,
          actual_hours: 0,
          order_index: nextOrderIndex
        })
        .select()
        .single();

      if (error) throw error;
      return { ...data, tasks: [] };
    } catch (error) {
      console.error('Error creating milestone:', error);
      throw error;
    }
  }

  static async updateMilestone(
    milestoneId: string,
    updates: Partial<Milestone>
  ): Promise<void> {
    try {
      const supabase = await getSupabaseClient();
      const { error } = await supabase
        .from('milestones')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', milestoneId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating milestone:', error);
      throw error;
    }
  }

  static async deleteMilestone(milestoneId: string): Promise<void> {
    try {
      const supabase = await getSupabaseClient();
      const { error } = await supabase
        .from('milestones')
        .delete()
        .eq('id', milestoneId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting milestone:', error);
      throw error;
    }
  }

  // Comment management methods
  static async addComment(
    milestoneId: string,
    content: string,
    isInternal: boolean = false
  ): Promise<Comment> {
    try {
      const supabase = await getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('milestone_comments')
        .insert({
          milestone_id: milestoneId,
          content,
          author_id: user.id,
          is_internal: isInternal
        })
        .select(`
          *,
          author:profiles!milestone_comments_author_id_fkey(full_name, role)
        `)
        .single();

      if (error) throw error;
      
      return {
        id: data.id,
        milestone_id: data.milestone_id,
        content: data.content,
        author: data.author?.full_name || 'Unknown',
        author_role: data.author?.role || 'client',
        created_at: data.created_at
      } as unknown as Comment;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }

  static async getComments(milestoneId: string): Promise<Comment[]> {
    try {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase
        .from('milestone_comments')
        .select(`
          *,
          author:profiles!milestone_comments_author_id_fkey(full_name, role)
        `)
        .eq('milestone_id', milestoneId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      return data.map(comment => ({
        id: comment.id,
        milestone_id: comment.milestone_id,
        content: comment.content,
        author: comment.author?.full_name || 'Unknown',
        author_role: comment.author?.role || 'client',
        created_at: comment.created_at
      })) as unknown as Comment[];
    } catch (error) {
      console.error('Error fetching comments:', error);
      throw error;
    }
  }

  // Real-time subscription methods
  static async subscribeToProgressUpdates(
    bookingId: string,
    onUpdate: (data: ProgressData) => void
  ) {
    const supabase = await getSupabaseClient();
    
    // Subscribe to milestones changes
    const milestonesSubscription = supabase
      .channel('milestones-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'milestones',
          filter: `booking_id=eq.${bookingId}`
        },
        async () => {
          const data = await this.getProgressData(bookingId);
          onUpdate(data);
        }
      )
      .subscribe();

    // Subscribe to tasks changes
    const tasksSubscription = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks'
        },
        async (payload: any) => {
          // Check if the task belongs to this booking
          const { data: task } = await supabase
            .from('tasks')
            .select('milestone_id, milestones!inner(booking_id)')
            .eq('id', payload.new?.id || payload.old?.id)
            .single();

          if (task && (task as any).milestones?.booking_id === bookingId) {
            const data = await this.getProgressData(bookingId);
            onUpdate(data);
          }
        }
      )
      .subscribe();

    // Subscribe to time entries changes
    const timeEntriesSubscription = supabase
      .channel('time-entries-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'time_entries',
          filter: `booking_id=eq.${bookingId}`
        },
        async () => {
          const data = await this.getProgressData(bookingId);
          onUpdate(data);
        }
      )
      .subscribe();

    // Return cleanup function
    return () => {
      supabase.removeChannel(milestonesSubscription);
      supabase.removeChannel(tasksSubscription);
      supabase.removeChannel(timeEntriesSubscription);
    };
  }
}
