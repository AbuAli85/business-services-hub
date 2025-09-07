'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ProgressDataService, ProgressData } from '@/lib/progress-data-service';
import { Task, TimeEntry } from '@/types/progress';
import EnhancedProgressDashboard from '@/components/dashboard/enhanced-progress-dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw, Zap } from 'lucide-react';

export default function BookingProgressPage() {
  const params = useParams();
  const bookingId = params.id as string;
  
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadProgressData = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      
      setError(null);
      const data = await ProgressDataService.getProgressData(bookingId);
      setProgressData(data);
    } catch (err) {
      console.error('Error loading progress data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load progress data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (bookingId) {
      loadProgressData();
    }
  }, [bookingId]);

  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    try {
      if (updates.status) {
        await ProgressDataService.updateTaskStatus(taskId, updates.status);
      }
      if (updates.title || updates.description || updates.priority || updates.estimated_hours) {
        await ProgressDataService.updateTaskDetails(taskId, updates);
      }
      
      // Refresh data to get updated progress calculations
      await loadProgressData(true);
    } catch (err) {
      console.error('Error updating task:', err);
      setError('Failed to update task');
    }
  };

  const handleTimeLog = async (taskId: string, hours: number, description: string) => {
    try {
      await ProgressDataService.logTime(taskId, hours, description);
      await loadProgressData(true);
    } catch (err) {
      console.error('Error logging time:', err);
      setError('Failed to log time');
    }
  };

  const handleAddTask = async (milestoneId: string, task: {
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    estimated_hours: number;
    status: 'pending' | 'in_progress' | 'completed';
    actual_hours: number;
    order_index: number;
  }) => {
    try {
      await ProgressDataService.addTask(milestoneId, {
        title: task.title,
        description: task.description,
        priority: task.priority,
        estimated_hours: task.estimated_hours
      });
      await loadProgressData(true);
    } catch (err) {
      console.error('Error adding task:', err);
      setError('Failed to add task');
    }
  };

  const handleRefresh = () => {
    loadProgressData(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Progress Data</h3>
            <p className="text-gray-600">Please wait while we fetch your project progress...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Data</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={handleRefresh} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!progressData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Found</h3>
            <p className="text-gray-600 mb-4">No progress data found for this booking.</p>
            <Button onClick={handleRefresh} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Button
              variant="outline"
              onClick={() => window.history.back()}
              className="hover:bg-gray-50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Bookings
            </Button>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              className="hover:bg-blue-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Progress Dashboard</h1>
              <p className="text-gray-600 mt-1">Track and manage your project progress in real-time</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">Real-time connected</span>
            </div>
          </div>
        </div>

        {/* Progress Dashboard */}
        <EnhancedProgressDashboard
          bookingId={bookingId}
          milestones={progressData.milestones}
          timeEntries={progressData.timeEntries}
          onTaskUpdate={handleTaskUpdate}
          onTimeLog={handleTimeLog}
          onAddTask={handleAddTask}
        />
      </div>
    </div>
  );
}