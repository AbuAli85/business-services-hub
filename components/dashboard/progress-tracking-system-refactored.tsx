'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  Calendar, 
  Clock, 
  Target, 
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { 
  Milestone, 
  Task, 
  BookingProgress, 
  TimeEntry, 
  UserRole,
  ProgressTrackingSystemProps
} from '@/types/progress';
import { ProgressHeader } from './progress-header';
import { ProgressSummary } from './progress-summary';
import { MilestoneList } from './milestone-list';
import { TimelineManagement } from './timeline-management';
import { MonthlyProgress } from './monthly-progress';
import { AnalyticsView } from './analytics-view';
import { useProgressUpdates } from '@/hooks/use-progress-updates';
import { getSupabaseClient } from '@/lib/supabase';
import toast from 'react-hot-toast';
import './progress-styles.css';

type ViewType = 'overview' | 'monthly' | 'timeline' | 'analytics';

export function ProgressTrackingSystemRefactored({ 
  bookingId, 
  userRole, 
  className = "" 
}: ProgressTrackingSystemProps) {
  const [activeView, setActiveView] = useState<ViewType>(userRole === 'client' ? 'timeline' : 'overview');
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [bookingProgress, setBookingProgress] = useState<BookingProgress | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Use the progress updates hook
  const { 
    isUpdating, 
    updateTaskProgress, 
    updateMilestoneProgress, 
    addTask, 
    deleteTask 
  } = useProgressUpdates(bookingId, (updates) => {
    // Update local state when progress changes
    if (updates.type === 'milestone') {
      setMilestones(prev => prev.map(m => 
        m.id === updates.milestoneId ? { ...m, ...updates.data } : m
      ));
    } else if (updates.type === 'task') {
      setMilestones(prev => prev.map(milestone => 
        milestone.id === updates.milestoneId
          ? {
              ...milestone,
              tasks: milestone.tasks.map(task =>
                task.id === updates.taskId
                  ? { ...task, ...updates.data }
                  : task
              )
            }
          : milestone
      ));
    }
  });

  // Load all data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const supabase = await getSupabaseClient();
      
      // Load milestones with tasks
      const { data: milestonesData, error: milestonesError } = await supabase
        .from('milestones')
        .select(`
          *,
          tasks (*)
        `)
        .eq('booking_id', bookingId)
        .order('order_index', { ascending: true });

      if (milestonesError) {
        console.error('Error loading milestones:', milestonesError);
        throw new Error('Failed to load milestones');
      }

      setMilestones(milestonesData || []);

      // Load booking progress
      const { data: progressData, error: progressError } = await supabase
        .from('booking_progress')
        .select('*')
        .eq('booking_id', bookingId)
        .single();

      if (progressError && progressError.code !== 'PGRST116') {
        console.error('Error loading booking progress:', progressError);
        // Create fallback progress data
        const completedMilestones = (milestonesData || []).filter(m => m.status === 'completed').length;
        const completedTasks = (milestonesData || []).reduce((sum, m) => 
          sum + (m.tasks?.filter(t => t.status === 'completed').length || 0), 0
        );
        const totalTasks = (milestonesData || []).reduce((sum, m) => sum + (m.tasks?.length || 0), 0);
        const totalEstimatedHours = (milestonesData || []).reduce((sum, m) => sum + (m.estimated_hours || 0), 0);
        const totalActualHours = (milestonesData || []).reduce((sum, m) => sum + (m.actual_hours || 0), 0);
        const overallProgress = Math.round((completedMilestones / Math.max(milestonesData?.length || 1, 1)) * 100);
        
        setBookingProgress({
          id: `progress-${bookingId}`,
          booking_id: bookingId,
          booking_title: 'Project Progress',
          booking_status: 'pending',
          booking_progress: overallProgress,
          completed_milestones: completedMilestones,
          total_milestones: milestonesData?.length || 0,
          completed_tasks: completedTasks,
          total_tasks: totalTasks,
          total_estimated_hours: totalEstimatedHours,
          total_actual_hours: totalActualHours,
          overdue_tasks: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      } else {
        setBookingProgress(progressData);
      }

      // Load time entries
      const { data: timeEntriesData, error: timeEntriesError } = await supabase
        .from('time_entries')
        .select('*')
        .eq('booking_id', bookingId)
        .order('timestamp', { ascending: false });

      if (timeEntriesError) {
        console.error('Error loading time entries:', timeEntriesError);
        // Don't throw error for time entries, just use empty array
        setTimeEntries([]);
      } else {
        setTimeEntries(timeEntriesData || []);
      }

    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load progress data');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast.success('Progress data refreshed');
  }, [loadData]);

  // Handle milestone updates
  const handleMilestoneUpdate = useCallback(async (milestoneId: string, updates: Partial<Milestone>) => {
    try {
      await updateMilestoneProgress(milestoneId, updates);
      toast.success('Milestone updated successfully');
    } catch (error) {
      console.error('Error updating milestone:', error);
      toast.error('Failed to update milestone');
    }
  }, [updateMilestoneProgress]);

  // Handle task updates
  const handleTaskUpdate = useCallback(async (taskId: string, updates: Partial<Task>) => {
    try {
      await updateTaskProgress(taskId, updates);
      toast.success('Task updated successfully');
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  }, [updateTaskProgress]);

  // Handle task creation
  const handleTaskCreate = useCallback(async (milestoneId: string, task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'is_overdue' | 'actual_hours'>) => {
    try {
      await addTask(milestoneId, task);
      toast.success('Task created successfully');
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    }
  }, [addTask]);

  // Handle task deletion
  const handleTaskDelete = useCallback(async (taskId: string) => {
    try {
      await deleteTask(taskId);
      toast.success('Task deleted successfully');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  }, [deleteTask]);

  // Handle time logging
  const handleTimeLog = useCallback(async (taskId: string, duration: number, description: string) => {
    try {
      const supabase = await getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('time_entries')
        .insert({
          task_id: taskId,
          booking_id: bookingId,
          user_id: user.id,
          duration: duration,
          description: description,
          timestamp: new Date().toISOString(),
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + duration * 60 * 60 * 1000).toISOString()
        });

      if (error) {
        throw error;
      }

      // Refresh data to show updated time entries
      await loadData();
      toast.success('Time logged successfully');
    } catch (error) {
      console.error('Error logging time:', error);
      toast.error('Failed to log time');
    }
  }, [bookingId, loadData]);

  // Handle comment addition
  const handleCommentAdd = useCallback(async (milestoneId: string, content: string) => {
    try {
      const supabase = await getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('comments')
        .insert({
          milestone_id: milestoneId,
          booking_id: bookingId,
          user_id: user.id,
          content: content
        });

      if (error) {
        throw error;
      }

      toast.success('Comment added successfully');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  }, [bookingId]);

  // Calculate totals
  const totalEstimatedHours = milestones.reduce((sum, m) => sum + (m.estimated_hours || 0), 0);
  const totalActualHours = milestones.reduce((sum, m) => sum + (m.actual_hours || 0), 0);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Progress Header */}
      <ProgressHeader
        bookingProgress={bookingProgress}
        loading={loading}
        error={error}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      {/* Main Content Tabs */}
      <Tabs value={activeView} onValueChange={(value) => setActiveView(value as ViewType)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <Target className="w-4 h-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="monthly" className="flex items-center space-x-2">
            <Calendar className="w-4 h-4" />
            <span>Monthly</span>
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <span>Timeline</span>
          </TabsTrigger>
          {userRole !== 'client' && (
            <TabsTrigger value="analytics" className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span>Analytics</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <ProgressSummary
            milestones={milestones}
            userRole={userRole}
          />
          <MilestoneList
            milestones={milestones}
            userRole={userRole}
            onMilestoneUpdate={handleMilestoneUpdate}
            onTaskUpdate={handleTaskUpdate}
            onTaskCreate={handleTaskCreate}
            onTaskDelete={handleTaskDelete}
            onCommentAdd={handleCommentAdd}
            onTimeLog={handleTimeLog}
          />
        </TabsContent>

        <TabsContent value="monthly" className="space-y-6">
          <MonthlyProgress
            milestones={milestones}
            timeEntries={timeEntries}
            userRole={userRole}
          />
        </TabsContent>

        <TabsContent value="timeline" className="space-y-6">
          <TimelineManagement
            bookingId={bookingId}
            userRole={userRole}
            onTimelineUpdate={(timeline) => {
              // Handle timeline updates
              console.log('Timeline updated:', timeline);
            }}
            onSave={async (timeline) => {
              // Handle timeline save
              console.log('Timeline saved:', timeline);
              toast.success('Timeline saved successfully');
            }}
          />
        </TabsContent>

        {userRole !== 'client' && (
          <TabsContent value="analytics" className="space-y-6">
            <AnalyticsView
              milestones={milestones}
              timeEntries={timeEntries}
              totalEstimatedHours={totalEstimatedHours}
              totalActualHours={totalActualHours}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
