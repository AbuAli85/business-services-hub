'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  CheckCircle2, 
  PlayCircle, 
  PauseCircle, 
  Plus, 
  Edit3, 
  Trash2, 
  Timer,
  TrendingUp,
  Users,
  Calendar,
  Target,
  Zap,
  Star,
  Award,
  BarChart3,
  Activity
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  estimated_hours: number;
  actual_hours: number;
  order_index: number;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  progress_percentage: number;
  completed_tasks: number;
  total_tasks: number;
  estimated_hours: number;
  actual_hours: number;
  order_index: number;
  tasks: Task[];
}

interface TimeEntry {
  id: string;
  duration_hours: number;
  description: string;
  logged_at: string;
  task_id: string;
}

interface ProgressDashboardProps {
  bookingId: string;
  milestones: Milestone[];
  timeEntries: TimeEntry[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTimeLog: (taskId: string, hours: number, description: string) => void;
  onAddTask: (milestoneId: string, task: Omit<Task, 'id'>) => void;
}

export default function EnhancedProgressDashboard({
  bookingId,
  milestones,
  timeEntries,
  onTaskUpdate,
  onTimeLog,
  onAddTask
}: ProgressDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'milestones' | 'time' | 'analytics'>('overview');
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerDuration, setTimerDuration] = useState(0);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);

  // Calculate overall progress
  const totalTasks = milestones.reduce((sum, m) => sum + m.total_tasks, 0);
  const completedTasks = milestones.reduce((sum, m) => sum + m.completed_tasks, 0);
  const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const totalEstimatedHours = milestones.reduce((sum, m) => sum + m.estimated_hours, 0);
  const totalActualHours = milestones.reduce((sum, m) => sum + m.actual_hours, 0);
  const timeEfficiency = totalEstimatedHours > 0 ? Math.round((totalActualHours / totalEstimatedHours) * 100) : 0;

  // Timer functionality
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getMilestoneStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'in_progress': return <Activity className="w-5 h-5 text-blue-600" />;
      case 'pending': return <Clock className="w-5 h-5 text-gray-600" />;
      default: return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Real-time Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Progress Dashboard
          </h1>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">Real-time connected</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            className="hover:bg-blue-50"
          >
            <Zap className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overall Progress</p>
                <p className="text-3xl font-bold text-blue-600">{overallProgress}%</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <Progress value={overallProgress} className="mt-4" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tasks Completed</p>
                <p className="text-3xl font-bold text-green-600">{completedTasks}/{totalTasks}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-500">
              {totalTasks - completedTasks} remaining
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Time Logged</p>
                <p className="text-3xl font-bold text-purple-600">{totalActualHours.toFixed(1)}h</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Timer className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-500">
              of {totalEstimatedHours}h estimated
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Efficiency</p>
                <p className="text-3xl font-bold text-orange-600">{timeEfficiency}%</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Award className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-500">
              Time utilization
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'milestones', label: 'Milestones', icon: Target },
            { id: 'time', label: 'Time Tracking', icon: Clock },
            { id: 'analytics', label: 'Analytics', icon: TrendingUp }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Milestones Overview */}
            <Card className="hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="w-5 h-5" />
                  <span>Project Milestones</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {milestones.map((milestone, index) => (
                    <div key={milestone.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors duration-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{milestone.title}</h3>
                            <p className="text-sm text-gray-600">{milestone.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getMilestoneStatusIcon(milestone.status)}
                          <Badge className={getStatusColor(milestone.status)}>
                            {milestone.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress: {milestone.progress_percentage}%</span>
                          <span>{milestone.completed_tasks}/{milestone.total_tasks} tasks</span>
                        </div>
                        <Progress value={milestone.progress_percentage} className="h-2" />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>{milestone.actual_hours.toFixed(1)}h logged</span>
                          <span>{milestone.estimated_hours}h estimated</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'milestones' && (
          <div className="space-y-6">
            {milestones.map((milestone, index) => (
              <Card key={milestone.id} className="hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {index + 1}
                      </div>
                      <div>
                        <CardTitle className="text-xl">{milestone.title}</CardTitle>
                        <p className="text-gray-600">{milestone.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getMilestoneStatusIcon(milestone.status)}
                      <Badge className={getStatusColor(milestone.status)}>
                        {milestone.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">{milestone.progress_percentage}%</p>
                        <p className="text-sm text-gray-600">Progress</p>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{milestone.completed_tasks}/{milestone.total_tasks}</p>
                        <p className="text-sm text-gray-600">Tasks</p>
                      </div>
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <p className="text-2xl font-bold text-purple-600">{milestone.actual_hours.toFixed(1)}h</p>
                        <p className="text-sm text-gray-600">Time Logged</p>
                      </div>
                    </div>
                    
                    <Progress value={milestone.progress_percentage} className="h-3" />
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">Tasks</h4>
                        <Button
                          size="sm"
                          onClick={() => setShowAddTask(true)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Task
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {milestone.tasks.map((task) => (
                          <div key={task.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors duration-200">
                            <input
                              type="checkbox"
                              checked={task.status === 'completed'}
                              onChange={(e) => onTaskUpdate(task.id, { 
                                status: e.target.checked ? 'completed' : 'pending' 
                              })}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{task.title}</span>
                                <Badge className={getPriorityColor(task.priority)}>
                                  {task.priority}
                                </Badge>
                                <Badge className={getStatusColor(task.status)}>
                                  {task.status.replace('_', ' ')}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600">{task.description}</p>
                              <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                                <span>{task.actual_hours.toFixed(1)}h logged</span>
                                <span>{task.estimated_hours}h estimated</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedTask(task.id)}
                              >
                                <Edit3 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onTimeLog(task.id, 1, 'Manual time entry')}
                              >
                                <Timer className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'time' && (
          <div className="space-y-6">
            {/* Timer Section */}
            <Card className="border-l-4 border-l-purple-500">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Timer className="w-5 h-5" />
                  <span>Time Tracker</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-4">
                  <div className="text-6xl font-mono font-bold text-purple-600">
                    {formatTime(timerDuration)}
                  </div>
                  <div className="flex justify-center space-x-4">
                    <Button
                      onClick={() => setIsTimerRunning(!isTimerRunning)}
                      className={`px-8 py-3 ${
                        isTimerRunning 
                          ? 'bg-red-600 hover:bg-red-700' 
                          : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      {isTimerRunning ? (
                        <>
                          <PauseCircle className="w-5 h-5 mr-2" />
                          Pause
                        </>
                      ) : (
                        <>
                          <PlayCircle className="w-5 h-5 mr-2" />
                          Start
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setTimerDuration(0);
                        setIsTimerRunning(false);
                      }}
                    >
                      Reset
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Time Entries */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="w-5 h-5" />
                  <span>Recent Time Entries</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {timeEntries.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors duration-200">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <Clock className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium">{entry.description}</p>
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
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Progress Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    <BarChart3 className="w-12 h-12" />
                    <span className="ml-2">Chart coming soon</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Task Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {milestones.map((milestone) => (
                      <div key={milestone.id} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{milestone.title}</span>
                          <span>{milestone.completed_tasks}/{milestone.total_tasks}</span>
                        </div>
                        <Progress value={(milestone.completed_tasks / milestone.total_tasks) * 100} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
