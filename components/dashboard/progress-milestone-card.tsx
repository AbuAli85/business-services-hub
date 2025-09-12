'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  Clock, 
  PlayCircle, 
  PauseCircle, 
  Plus, 
  Edit3, 
  Timer,
  Activity,
  Target,
  Calendar,
  Users,
  Zap
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'normal' | 'high';
  estimated_hours: number;
  actual_hours: number;
  order_index: number;
}

interface MilestoneCardProps {
  milestone: {
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
  };
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTimeLog: (taskId: string, hours: number, description: string) => void;
  onAddTask: (milestoneId: string, task: {
    title: string;
    description: string;
    priority: 'low' | 'normal' | 'high';
    estimated_hours: number;
    status: 'pending' | 'in_progress' | 'completed';
    actual_hours: number;
    order_index: number;
  }) => void;
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
}

export default function ProgressMilestoneCard({
  milestone,
  onTaskUpdate,
  onTimeLog,
  onAddTask,
  isExpanded = false,
  onToggleExpanded
}: MilestoneCardProps) {
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'normal' as 'low' | 'normal' | 'high',
    estimated_hours: 1
  });

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'in_progress': return <Activity className="w-5 h-5 text-blue-600" />;
      case 'pending': return <Clock className="w-5 h-5 text-gray-600" />;
      default: return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const handleAddTask = () => {
    if (newTask.title.trim()) {
      onAddTask(milestone.id, {
        ...newTask,
        status: 'pending',
        actual_hours: 0,
        order_index: milestone.tasks.length
      });
      setNewTask({
        title: '',
        description: '',
        priority: 'normal',
        estimated_hours: 1
      });
      setShowAddTask(false);
    }
  };

  const progressColor = milestone.progress_percentage === 100 
    ? 'bg-green-500' 
    : milestone.progress_percentage > 0 
    ? 'bg-blue-500' 
    : 'bg-gray-300';

  return (
    <Card className={`group hover:shadow-xl transition-all duration-300 border-l-4 ${
      milestone.status === 'completed' ? 'border-l-green-500' :
      milestone.status === 'in_progress' ? 'border-l-blue-500' :
      'border-l-gray-300'
    }`}>
      <CardHeader 
        className="cursor-pointer hover:bg-gray-50 transition-colors duration-200"
        onClick={onToggleExpanded}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
              milestone.status === 'completed' ? 'bg-gradient-to-r from-green-500 to-green-600' :
              milestone.status === 'in_progress' ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
              'bg-gradient-to-r from-gray-400 to-gray-500'
            }`}>
              {milestone.order_index + 1}
            </div>
            <div>
              <CardTitle className="text-xl group-hover:text-blue-600 transition-colors duration-200">
                {milestone.title}
              </CardTitle>
              <p className="text-gray-600 mt-1">{milestone.description}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {getStatusIcon(milestone.status)}
            <Badge className={getStatusColor(milestone.status)}>
              {milestone.status.replace('_', ' ')}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            >
              {isExpanded ? '▼' : '▶'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Section */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-lg font-bold text-gray-900">{milestone.progress_percentage}%</span>
          </div>
          <div className="relative">
            <Progress 
              value={milestone.progress_percentage} 
              className="h-3"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`w-2 h-2 rounded-full ${progressColor} shadow-lg`}></div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {milestone.completed_tasks}/{milestone.total_tasks}
            </div>
            <div className="text-xs text-gray-600">Tasks</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {milestone.actual_hours.toFixed(1)}h
            </div>
            <div className="text-xs text-gray-600">Logged</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {milestone.estimated_hours}h
            </div>
            <div className="text-xs text-gray-600">Estimated</div>
          </div>
        </div>

        {/* Tasks Section */}
        {isExpanded && (
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-lg flex items-center space-x-2">
                <Target className="w-5 h-5" />
                <span>Tasks</span>
              </h4>
              <Button
                size="sm"
                onClick={() => setShowAddTask(!showAddTask)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Task
              </Button>
            </div>

            {/* Add Task Form */}
            {showAddTask && (
              <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Task title"
                    value={newTask.title}
                    onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                    className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({...newTask, priority: e.target.value as any})}
                    className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    aria-label="Select task priority"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Description"
                    value={newTask.description}
                    onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                    className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="number"
                    placeholder="Estimated hours"
                    value={newTask.estimated_hours}
                    onChange={(e) => setNewTask({...newTask, estimated_hours: parseFloat(e.target.value) || 1})}
                    className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex space-x-2">
                  <Button onClick={handleAddTask} className="bg-green-600 hover:bg-green-700">
                    Add Task
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowAddTask(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Tasks List */}
            <div className="space-y-2">
              {milestone.tasks.map((task) => (
                <div key={task.id} className="group/task flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-all duration-200">
                  <input
                    type="checkbox"
                    checked={task.status === 'completed'}
                    onChange={(e) => onTaskUpdate(task.id, { 
                      status: e.target.checked ? 'completed' : 'pending' 
                    })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    aria-label={`Mark task "${task.title}" as ${task.status === 'completed' ? 'incomplete' : 'completed'}`}
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium group-hover/task:text-blue-600 transition-colors duration-200">
                        {task.title}
                      </span>
                      <Badge className={getPriorityColor(task.priority)}>
                        {task.priority}
                      </Badge>
                      <Badge className={getStatusColor(task.status)}>
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                    <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                      <span className="flex items-center space-x-1">
                        <Timer className="w-3 h-3" />
                        <span>{task.actual_hours.toFixed(1)}h logged</span>
                      </span>
                      <span>{task.estimated_hours}h estimated</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 opacity-0 group-hover/task:opacity-100 transition-opacity duration-200">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onTimeLog(task.id, 1, 'Manual time entry')}
                      className="hover:bg-blue-50"
                    >
                      <Timer className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="hover:bg-gray-50"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
