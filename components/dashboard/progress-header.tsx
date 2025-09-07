'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Target, 
  Clock, 
  TrendingUp,
  RefreshCw,
  BarChart3,
  Calendar
} from 'lucide-react';
import { BookingProgress } from '@/types/progress';

interface ProgressHeaderProps {
  bookingProgress: BookingProgress | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  refreshing: boolean;
}

export function ProgressHeader({
  bookingProgress,
  loading,
  error,
  onRefresh,
  refreshing
}: ProgressHeaderProps) {
  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mb-6 border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <Target className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-900">Error Loading Progress</h3>
                <p className="text-red-600">{error}</p>
              </div>
            </div>
            <Button
              onClick={onRefresh}
              disabled={refreshing}
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-100"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Retrying...' : 'Retry'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!bookingProgress) {
    return (
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="text-center">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Progress Data</h3>
            <p className="text-gray-600">Progress tracking will begin when milestones are created.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const efficiency = bookingProgress.total_estimated_hours > 0 
    ? Math.round((bookingProgress.total_actual_hours / bookingProgress.total_estimated_hours) * 100)
    : 0;

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              {bookingProgress.booking_title}
            </CardTitle>
            <div className="flex items-center space-x-2 mt-2">
              <Badge 
                className={
                  bookingProgress.booking_status === 'completed' 
                    ? 'bg-green-100 text-green-800 border-green-200'
                    : bookingProgress.booking_status === 'in_progress'
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : 'bg-gray-100 text-gray-800 border-gray-200'
                }
              >
                {bookingProgress.booking_status.replace('_', ' ')}
              </Badge>
              <span className="text-sm text-gray-600">
                {bookingProgress.completed_milestones} of {bookingProgress.total_milestones} milestones
              </span>
            </div>
          </div>
          <Button
            onClick={onRefresh}
            disabled={refreshing}
            variant="outline"
            className="hover:bg-gray-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Overall Progress */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-600">Overall Progress</p>
                <p className="text-2xl font-bold text-blue-900">{bookingProgress.booking_progress}%</p>
                <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full progress-bar-dynamic"
                    style={{ width: `${bookingProgress.booking_progress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Tasks Completed */}
          <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-600">Tasks Completed</p>
                <p className="text-2xl font-bold text-green-900">
                  {bookingProgress.completed_tasks}/{bookingProgress.total_tasks}
                </p>
                <p className="text-xs text-green-700">
                  {bookingProgress.total_tasks - bookingProgress.completed_tasks} remaining
                </p>
              </div>
            </div>
          </div>

          {/* Time Logged */}
          <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-purple-600">Time Logged</p>
                <p className="text-2xl font-bold text-purple-900">
                  {bookingProgress.total_actual_hours}h
                </p>
                <p className="text-xs text-purple-700">
                  of {bookingProgress.total_estimated_hours}h estimated
                </p>
              </div>
            </div>
          </div>

          {/* Efficiency */}
          <div className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-orange-600">Efficiency</p>
                <p className="text-2xl font-bold text-orange-900">{efficiency}%</p>
                <p className="text-xs text-orange-700">Time utilization</p>
              </div>
            </div>
          </div>
        </div>

        {/* Overdue Tasks Warning */}
        {bookingProgress.overdue_tasks > 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">!</span>
              </div>
              <p className="text-sm text-red-800">
                <span className="font-semibold">{bookingProgress.overdue_tasks}</span> overdue tasks need attention
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
