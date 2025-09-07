'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Calendar,
  Users,
  Target
} from 'lucide-react';
import { Milestone, Task } from '@/types/progress';

interface ProgressSummaryProps {
  milestones: Milestone[];
  userRole: 'provider' | 'client' | 'admin';
}

export function ProgressSummary({ milestones, userRole }: ProgressSummaryProps) {
  // Calculate summary statistics
  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter(m => m.status === 'completed').length;
  const inProgressMilestones = milestones.filter(m => m.status === 'in_progress').length;
  
  const totalTasks = milestones.reduce((sum, m) => sum + m.tasks.length, 0);
  const completedTasks = milestones.reduce((sum, m) => 
    sum + m.tasks.filter(t => t.status === 'completed').length, 0
  );
  const overdueTasks = milestones.reduce((sum, m) => 
    sum + m.tasks.filter(t => t.is_overdue).length, 0
  );
  
  const totalEstimatedHours = milestones.reduce((sum, m) => sum + (m.estimated_hours || 0), 0);
  const totalActualHours = milestones.reduce((sum, m) => sum + (m.actual_hours || 0), 0);
  
  const overallProgress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;
  const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const timeEfficiency = totalEstimatedHours > 0 ? Math.round((totalActualHours / totalEstimatedHours) * 100) : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'not_started': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Overall Progress Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="w-5 h-5" />
            <span>Project Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Milestones Progress */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Milestones</span>
                <span className="text-sm text-gray-600">{completedMilestones}/{totalMilestones}</span>
              </div>
              <Progress value={overallProgress} className="h-2" />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{overallProgress}% Complete</span>
                <span>{totalMilestones - completedMilestones} Remaining</span>
              </div>
            </div>

            {/* Tasks Progress */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Tasks</span>
                <span className="text-sm text-gray-600">{completedTasks}/{totalTasks}</span>
              </div>
              <Progress value={taskProgress} className="h-2" />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{taskProgress}% Complete</span>
                <span>{totalTasks - completedTasks} Remaining</span>
              </div>
            </div>

            {/* Time Efficiency */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Time Efficiency</span>
                <span className="text-sm text-gray-600">{timeEfficiency}%</span>
              </div>
              <Progress value={timeEfficiency} className="h-2" />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{totalActualHours}h Logged</span>
                <span>{totalEstimatedHours}h Estimated</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Milestones Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5" />
            <span>Milestones Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {milestones.map((milestone) => (
              <div key={milestone.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                    {milestone.order_index}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{milestone.title}</h4>
                    <p className="text-sm text-gray-600">{milestone.description}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge className={getStatusColor(milestone.status)}>
                        {milestone.status.replace('_', ' ')}
                      </Badge>
                      {milestone.priority && (
                        <Badge className={getPriorityColor(milestone.priority)}>
                          {milestone.priority}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">{milestone.progress}%</div>
                  <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
                    <div 
                      className="bg-blue-500 h-2 rounded-full progress-bar-dynamic"
                      style={{ width: `${milestone.progress}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {milestone.tasks.filter(t => t.status === 'completed').length}/{milestone.tasks.length} tasks
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{completedMilestones}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">{inProgressMilestones}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Overdue</p>
              <p className="text-2xl font-bold text-gray-900">{overdueTasks}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Tasks</p>
              <p className="text-2xl font-bold text-gray-900">{totalTasks}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
