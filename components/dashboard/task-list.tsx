'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Play, 
  Pause,
  Edit,
  Trash2,
  Timer,
  Calendar,
  User,
  Plus
} from 'lucide-react';
import { Task, UserRole } from '@/types/progress';

interface TaskListProps {
  tasks: Task[];
  userRole: UserRole;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onTaskCreate: (milestoneId: string, task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'is_overdue' | 'actual_hours'>) => Promise<void>;
  onTaskDelete: (taskId: string) => Promise<void>;
  onTimeLog: (taskId: string, duration: number, description: string) => Promise<void>;
  milestoneId: string;
}

export function TaskList({
  tasks,
  userRole,
  onTaskUpdate,
  onTaskCreate,
  onTaskDelete,
  onTimeLog,
  milestoneId
}: TaskListProps) {
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending': return 'bg-gray-100 text-gray-800 border-gray-200';
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'in_progress': return <Clock className="w-4 h-4 text-blue-600" />;
      case 'pending': return <AlertTriangle className="w-4 h-4 text-gray-600" />;
      default: return <AlertTriangle className="w-4 h-4 text-gray-600" />;
    }
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    await onTaskUpdate(taskId, { status: newStatus as any });
  };

  const handleTaskProgressChange = async (taskId: string, progress: number) => {
    await onTaskUpdate(taskId, { progress });
  };

  const handleAddTask = async () => {
    const newTask: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'is_overdue' | 'actual_hours'> = {
      milestone_id: milestoneId,
      title: 'New Task',
      description: 'Task description',
      status: 'pending',
      progress: 0,
      priority: 'normal',
      order_index: tasks.length
    };
    await onTaskCreate(milestoneId, newTask);
    setShowAddTask(false);
  };

  const handleTimeLog = async (taskId: string) => {
    const duration = prompt('Enter time in hours:');
    const description = prompt('Enter description:');
    if (duration && description) {
      await onTimeLog(taskId, parseFloat(duration), description);
    }
  };

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Tasks Yet</h3>
            <p className="text-gray-600 mb-4">Add tasks to track progress for this milestone.</p>
            {userRole === 'provider' && (
              <Button onClick={handleAddTask} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Add First Task
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-gray-900">Tasks ({tasks.length})</h4>
        {userRole === 'provider' && (
          <Button
            size="sm"
            onClick={handleAddTask}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Task
          </Button>
        )}
      </div>

      {tasks.map((task) => (
        <Card key={task.id} className={`transition-all duration-200 hover:shadow-md ${task.is_overdue ? 'border-red-200 bg-red-50' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(task.status)}
                  <div>
                    <h5 className="font-semibold text-gray-900">{task.title}</h5>
                    {task.description && (
                      <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                    )}
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge className={getStatusColor(task.status)}>
                        {task.status.replace('_', ' ')}
                      </Badge>
                      {task.priority && (
                        <Badge className={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                      )}
                      {task.is_overdue && (
                        <Badge className="bg-red-100 text-red-800 border-red-200">
                          Overdue
                        </Badge>
                      )}
                      {task.due_date && (
                        <div className="flex items-center space-x-1 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(task.due_date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                {/* Progress */}
                <div className="text-right min-w-[80px]">
                  <div className="text-sm font-medium text-gray-900">{task.progress || 0}%</div>
                  <div className="w-16 bg-gray-200 rounded-full h-2 mt-1">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${task.progress || 0}%` }}
                    ></div>
                  </div>
                </div>

                {/* Time Tracking */}
                <div className="text-right min-w-[60px]">
                  <div className="text-sm font-medium text-gray-900">{task.actual_hours || 0}h</div>
                  <div className="text-xs text-gray-500">logged</div>
                </div>

                {/* Actions */}
                {userRole === 'provider' && (
                  <div className="flex items-center space-x-1">
                    {task.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTaskStatusChange(task.id, 'in_progress')}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        <Play className="w-3 h-3" />
                      </Button>
                    )}
                    {task.status === 'in_progress' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTaskStatusChange(task.id, 'completed')}
                        className="text-green-600 border-green-200 hover:bg-green-50"
                      >
                        <CheckCircle className="w-3 h-3" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTimeLog(task.id)}
                      className="text-purple-600 border-purple-200 hover:bg-purple-50"
                    >
                      <Timer className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingTask(task.id)}
                      className="text-gray-600 border-gray-200 hover:bg-gray-50"
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onTaskDelete(task.id)}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Progress Slider for Providers */}
            {userRole === 'provider' && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-gray-700">Progress:</span>
                  <div className="flex-1">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={task.progress || 0}
                      onChange={(e) => handleTaskProgressChange(task.id, parseInt(e.target.value))}
                      className="w-full task-progress-slider"
                      aria-label={`Progress for ${task.title}`}
                    />
                  </div>
                  <span className="text-sm text-gray-600 min-w-[40px]">{task.progress || 0}%</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
