'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Play, 
  Pause,
  Plus,
  Edit,
  Trash2,
  MessageSquare,
  Timer,
  Calendar,
  User,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Milestone, Task, UserRole } from '@/types/progress';
import { TaskList } from './task-list';

interface MilestoneListProps {
  milestones: Milestone[];
  userRole: UserRole;
  onMilestoneUpdate: (milestoneId: string, updates: Partial<Milestone>) => Promise<void>;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onTaskCreate: (milestoneId: string, task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'is_overdue' | 'actual_hours'>) => Promise<void>;
  onTaskDelete: (taskId: string) => Promise<void>;
  onCommentAdd: (milestoneId: string, content: string) => Promise<void>;
  onTimeLog: (taskId: string, duration: number, description: string) => Promise<void>;
}

export function MilestoneList({
  milestones,
  userRole,
  onMilestoneUpdate,
  onTaskUpdate,
  onTaskCreate,
  onTaskDelete,
  onCommentAdd,
  onTimeLog
}: MilestoneListProps) {
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());
  const [editingMilestone, setEditingMilestone] = useState<string | null>(null);

  const toggleMilestone = (milestoneId: string) => {
    const newExpanded = new Set(expandedMilestones);
    if (newExpanded.has(milestoneId)) {
      newExpanded.delete(milestoneId);
    } else {
      newExpanded.add(milestoneId);
    }
    setExpandedMilestones(newExpanded);
  };

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
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'in_progress': return <Clock className="w-5 h-5 text-blue-600" />;
      case 'pending': return <AlertTriangle className="w-5 h-5 text-gray-600" />;
      default: return <AlertTriangle className="w-5 h-5 text-gray-600" />;
    }
  };

  const canStartMilestone = (milestone: Milestone) => {
    if (milestone.status === 'completed') return true;
    if (milestone.status === 'in_progress') return true;
    if (milestone.order_index === 1) return true;
    
    const previousMilestone = milestones.find(m => m.order_index === milestone.order_index - 1);
    return previousMilestone ? previousMilestone.status === 'completed' : false;
  };

  const handleMilestoneStatusChange = async (milestoneId: string, newStatus: string) => {
    await onMilestoneUpdate(milestoneId, { status: newStatus as any });
  };

  const handleAddTask = async (milestoneId: string) => {
    const newTask: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'is_overdue' | 'actual_hours'> = {
      milestone_id: milestoneId,
      title: 'New Task',
      description: 'Task description',
      status: 'pending',
      progress_percentage: 0,
      priority: 'normal',
      order_index: milestones.find(m => m.id === milestoneId)?.tasks.length || 0
    };
    await onTaskCreate(milestoneId, newTask);
  };

  return (
    <div className="space-y-4">
      {milestones.map((milestone) => {
        const isExpanded = expandedMilestones.has(milestone.id);
        const completedTasks = milestone.tasks.filter(t => t.status === 'completed').length;
        const totalTasks = milestone.tasks.length;
        const canStart = canStartMilestone(milestone);
        const isLocked = !canStart && milestone.status === 'pending';

        return (
          <Card key={milestone.id} className={`transition-all duration-200 ${isExpanded ? 'shadow-lg' : 'hover:shadow-md'}`}>
            <CardHeader 
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleMilestone(milestone.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {milestone.order_index}
                  </div>
                  <div>
                    <CardTitle className="text-xl group-hover:text-blue-600 transition-colors duration-200">
                      {milestone.title}
                    </CardTitle>
                    <p className="text-gray-600 mt-1">{milestone.description}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      {getStatusIcon(milestone.status)}
                      <Badge className={getStatusColor(milestone.status)}>
                        {milestone.status.replace('_', ' ')}
                      </Badge>
                      {milestone.priority && (
                        <Badge className={getPriorityColor(milestone.priority)}>
                          {milestone.priority}
                        </Badge>
                      )}
                      {isLocked && (
                        <Badge className="bg-gray-100 text-gray-600 border-gray-200">
                          Locked
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">{milestone.progress_percentage}%</div>
                    <div className="text-sm text-gray-600">
                      {completedTasks}/{totalTasks} tasks
                    </div>
                  </div>
                  <div className="w-20">
                    <Progress value={milestone.progress_percentage} className="h-2" />
                  </div>
                  <div className="text-gray-400">
                    {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </div>
                </div>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="pt-0">
                <div className="space-y-4">
                  {/* Milestone Actions */}
                  {userRole === 'provider' && (
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-700">Milestone Actions:</span>
                        {milestone.status === 'pending' && canStart && (
                          <Button
                            size="sm"
                            onClick={() => handleMilestoneStatusChange(milestone.id, 'in_progress')}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Play className="w-4 h-4 mr-1" />
                            Start
                          </Button>
                        )}
                        {milestone.status === 'in_progress' && (
                          <Button
                            size="sm"
                            onClick={() => handleMilestoneStatusChange(milestone.id, 'completed')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Complete
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingMilestone(milestone.id)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAddTask(milestone.id)}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Task
                      </Button>
                    </div>
                  )}

                  {/* Tasks List */}
                  <TaskList
                    tasks={milestone.tasks}
                    userRole={userRole}
                    onTaskUpdate={onTaskUpdate}
                    onTaskCreate={onTaskCreate}
                    onTaskDelete={onTaskDelete}
                    onTimeLog={onTimeLog}
                    milestoneId={milestone.id}
                  />

                  {/* Milestone Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{totalTasks}</div>
                      <div className="text-sm text-gray-600">Total Tasks</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{completedTasks}</div>
                      <div className="text-sm text-gray-600">Completed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{milestone.estimated_hours || 0}h</div>
                      <div className="text-sm text-gray-600">Estimated</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{milestone.actual_hours || 0}h</div>
                      <div className="text-sm text-gray-600">Actual</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
