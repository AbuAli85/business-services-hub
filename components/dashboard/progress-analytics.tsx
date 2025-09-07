'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  Activity,
  Clock,
  Target,
  Award,
  Zap,
  Calendar,
  Users
} from 'lucide-react';

interface AnalyticsData {
  milestones: Array<{
    id: string;
    title: string;
    progress_percentage: number;
    completed_tasks: number;
    total_tasks: number;
    estimated_hours: number;
    actual_hours: number;
  }>;
  timeEntries: Array<{
    id: string;
    duration_hours: number;
    logged_at: string;
  }>;
  overallProgress: number;
  totalTasks: number;
  completedTasks: number;
  totalEstimatedHours: number;
  totalActualHours: number;
}

interface ProgressAnalyticsProps {
  data: AnalyticsData;
}

export default function ProgressAnalytics({ data }: ProgressAnalyticsProps) {
  const efficiency = data.totalEstimatedHours > 0 
    ? Math.round((data.totalActualHours / data.totalEstimatedHours) * 100) 
    : 0;

  const averageTaskTime = data.completedTasks > 0 
    ? data.totalActualHours / data.completedTasks 
    : 0;

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency <= 50) return 'text-red-600';
    if (efficiency <= 75) return 'text-yellow-600';
    if (efficiency <= 100) return 'text-green-600';
    return 'text-blue-600';
  };

  const getEfficiencyBgColor = (efficiency: number) => {
    if (efficiency <= 50) return 'bg-red-100';
    if (efficiency <= 75) return 'bg-yellow-100';
    if (efficiency <= 100) return 'bg-green-100';
    return 'bg-blue-100';
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overall Progress</p>
                <p className="text-3xl font-bold text-blue-600">{data.overallProgress}%</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <Progress value={data.overallProgress} className="mt-4" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tasks Completed</p>
                <p className="text-3xl font-bold text-green-600">{data.completedTasks}/{data.totalTasks}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Target className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-500">
              {data.totalTasks - data.completedTasks} remaining
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Time Efficiency</p>
                <p className={`text-3xl font-bold ${getEfficiencyColor(efficiency)}`}>{efficiency}%</p>
              </div>
              <div className={`p-3 ${getEfficiencyBgColor(efficiency)} rounded-full`}>
                <Award className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-500">
              {data.totalActualHours.toFixed(1)}h / {data.totalEstimatedHours}h
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Task Time</p>
                <p className="text-3xl font-bold text-orange-600">{averageTaskTime.toFixed(1)}h</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-500">
              per completed task
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Milestone Progress Breakdown */}
      <Card className="hover:shadow-lg transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <span>Milestone Progress Breakdown</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {data.milestones.map((milestone, index) => (
              <div key={milestone.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-semibold">{milestone.title}</h4>
                      <p className="text-sm text-gray-600">
                        {milestone.completed_tasks}/{milestone.total_tasks} tasks • {milestone.actual_hours.toFixed(1)}h logged
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">{milestone.progress_percentage}%</div>
                    <div className="text-sm text-gray-500">complete</div>
                  </div>
                </div>
                <Progress value={milestone.progress_percentage} className="h-3" />
                <div className="grid grid-cols-3 gap-4 text-center text-sm">
                  <div className="p-2 bg-blue-50 rounded">
                    <div className="font-semibold text-blue-600">{milestone.completed_tasks}</div>
                    <div className="text-gray-600">Completed</div>
                  </div>
                  <div className="p-2 bg-purple-50 rounded">
                    <div className="font-semibold text-purple-600">{milestone.actual_hours.toFixed(1)}h</div>
                    <div className="text-gray-600">Logged</div>
                  </div>
                  <div className="p-2 bg-orange-50 rounded">
                    <div className="font-semibold text-orange-600">{milestone.estimated_hours}h</div>
                    <div className="text-gray-600">Estimated</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Time Tracking Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChart className="w-5 h-5" />
              <span>Time Distribution</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.milestones.map((milestone, index) => {
                const percentage = data.totalActualHours > 0 
                  ? (milestone.actual_hours / data.totalActualHours) * 100 
                  : 0;
                return (
                  <div key={milestone.id} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{milestone.title}</span>
                      <span>{percentage.toFixed(1)}%</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5" />
              <span>Performance Metrics</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {data.completedTasks > 0 ? (data.totalActualHours / data.completedTasks).toFixed(1) : 0}h
                </div>
                <div className="text-sm text-gray-600">Average time per task</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-xl font-bold text-green-600">
                    {data.totalActualHours > 0 ? Math.round((data.completedTasks / data.totalActualHours) * 60) : 0}
                  </div>
                  <div className="text-xs text-gray-600">Tasks per hour</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-xl font-bold text-purple-600">
                    {data.timeEntries.length}
                  </div>
                  <div className="text-xs text-gray-600">Time entries</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="hover:shadow-lg transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Recent Time Entries</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.timeEntries.slice(0, 5).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors duration-200">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <Clock className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium">Time logged</p>
                    <p className="text-sm text-gray-600">
                      {new Date(entry.logged_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-purple-600">{entry.duration_hours}h</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}