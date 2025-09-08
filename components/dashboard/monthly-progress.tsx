'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, 
  TrendingUp, 
  Clock, 
  Target,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  PieChart
} from 'lucide-react';
import { Milestone, Task, TimeEntry } from '@/types/progress';

interface MonthlyProgressProps {
  milestones: Milestone[];
  timeEntries: TimeEntry[];
  userRole: 'provider' | 'client' | 'admin';
}

export function MonthlyProgress({ milestones, timeEntries, userRole }: MonthlyProgressProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview');

  // Get current month data
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  // Filter milestones for current month
  const monthlyMilestones = milestones.filter(milestone => {
    const milestoneDate = new Date(milestone.created_at);
    return milestoneDate.getMonth() === currentMonth && milestoneDate.getFullYear() === currentYear;
  });

  // Filter time entries for current month
  const monthlyTimeEntries = timeEntries.filter(entry => {
    const entryDate = new Date(entry.logged_at);
    return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear;
  });

  // Calculate monthly statistics
  const totalTasks = monthlyMilestones.reduce((sum, m) => sum + m.tasks.length, 0);
  const completedTasks = monthlyMilestones.reduce((sum, m) => 
    sum + m.tasks.filter(t => t.status === 'completed').length, 0
  );
  const totalHours = monthlyTimeEntries.reduce((sum, entry) => sum + (entry.duration_hours || 0), 0);
  const totalEstimatedHours = monthlyMilestones.reduce((sum, m) => sum + (m.estimated_hours || 0), 0);
  
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const timeEfficiency = totalEstimatedHours > 0 ? Math.round((totalHours / totalEstimatedHours) * 100) : 0;

  // Get previous/next month
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const goToCurrentMonth = () => {
    setCurrentDate(new Date());
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getWeekData = () => {
    const weeks = [];
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    
    let currentWeek = [];
    let currentDate = new Date(firstDay);
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay.getDay(); i++) {
      currentWeek.push(null);
    }
    
    // Add days of the month
    while (currentDate <= lastDay) {
      currentWeek.push(new Date(currentDate));
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Add remaining empty cells
    while (currentWeek.length < 7 && currentWeek.length > 0) {
      currentWeek.push(null);
    }
    
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }
    
    return weeks;
  };

  const getDayProgress = (date: Date) => {
    const dayTimeEntries = monthlyTimeEntries.filter(entry => {
      const entryDate = new Date(entry.logged_at);
      return entryDate.toDateString() === date.toDateString();
    });
    
    const dayHours = dayTimeEntries.reduce((sum, entry) => sum + (entry.duration_hours || 0), 0);
    const dayTasks = monthlyMilestones.reduce((sum, milestone) => {
      return sum + milestone.tasks.filter(task => {
        const taskDate = new Date(task.created_at);
        return taskDate.toDateString() === date.toDateString();
      }).length;
    }, 0);
    
    return { hours: dayHours, tasks: dayTasks };
  };

  const weeks = getWeekData();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Monthly Progress - {formatMonthYear(currentDate)}</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousMonth}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToCurrentMonth}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextMonth}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{completedTasks}</div>
              <div className="text-sm text-blue-800">Tasks Completed</div>
              <div className="text-xs text-blue-600">{totalTasks} total</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{taskCompletionRate}%</div>
              <div className="text-sm text-green-800">Completion Rate</div>
              <div className="w-full bg-green-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-green-500 h-2 rounded-full progress-bar-dynamic"
                  style={{ width: `${taskCompletionRate}%` }}
                ></div>
              </div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{totalHours}h</div>
              <div className="text-sm text-purple-800">Hours Logged</div>
              <div className="text-xs text-purple-600">{totalEstimatedHours}h estimated</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{timeEfficiency}%</div>
              <div className="text-sm text-orange-800">Time Efficiency</div>
              <div className="w-full bg-orange-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-orange-500 h-2 rounded-full progress-bar-dynamic"
                  style={{ width: `${timeEfficiency}%` }}
                ></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar View */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Progress Calendar</CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === 'overview' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('overview')}
              >
                <BarChart3 className="w-4 h-4 mr-1" />
                Overview
              </Button>
              <Button
                variant={viewMode === 'detailed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('detailed')}
              >
                <PieChart className="w-4 h-4 mr-1" />
                Detailed
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Week day headers */}
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day) => (
                <div key={day} className="text-center text-sm font-medium text-gray-600 p-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="space-y-1">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="grid grid-cols-7 gap-2">
                  {week.map((day, dayIndex) => {
                    if (!day) {
                      return <div key={dayIndex} className="h-16"></div>;
                    }

                    const dayProgress = getDayProgress(day);
                    const isToday = day.toDateString() === new Date().toDateString();
                    const isCurrentMonth = day.getMonth() === currentMonth;

                    return (
                      <div
                        key={dayIndex}
                        className={`h-16 p-2 border rounded-lg calendar-day ${
                          isToday 
                            ? 'bg-blue-100 border-blue-300' 
                            : isCurrentMonth 
                            ? 'bg-white border-gray-200 hover:bg-gray-50' 
                            : 'bg-gray-50 border-gray-100'
                        }`}
                      >
                        <div className="flex flex-col h-full">
                          <div className="text-xs font-medium text-gray-600">
                            {day.getDate()}
                          </div>
                          <div className="flex-1 flex flex-col justify-center">
                            {dayProgress.hours > 0 && (
                              <div className="text-xs text-blue-600 font-medium">
                                {dayProgress.hours}h
                              </div>
                            )}
                            {dayProgress.tasks > 0 && (
                              <div className="text-xs text-green-600">
                                {dayProgress.tasks} tasks
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Milestones for the month */}
      {monthlyMilestones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Milestones for {formatMonthYear(currentDate)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {monthlyMilestones.map((milestone) => (
                <div key={milestone.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-semibold text-gray-900">{milestone.title}</h4>
                    <p className="text-sm text-gray-600">{milestone.description}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge className={
                        milestone.status === 'completed' 
                          ? 'bg-green-100 text-green-800'
                          : milestone.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }>
                        {milestone.status.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {milestone.tasks.filter(t => t.status === 'completed').length}/{milestone.tasks.length} tasks
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">{milestone.progress}%</div>
                    <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
                    <div 
                      className="bg-blue-500 h-2 rounded-full progress-bar-dynamic"
                      style={{ width: `${milestone.progress}%` }}
                    ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


