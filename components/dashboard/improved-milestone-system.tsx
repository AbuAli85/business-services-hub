'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Play, 
  Pause, 
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Calendar,
  User,
  Target
} from 'lucide-react'
import { toast } from 'sonner'
import { getSupabaseClient } from '@/lib/supabase'

interface Milestone {
  id: string
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  progress_percentage: number
  due_date?: string
  completed_at?: string
  created_at: string
  updated_at: string
  weight: number
  estimated_hours?: number
  actual_hours?: number
  total_tasks: number
  completed_tasks: number
  tasks: Task[]
}

interface Task {
  id: string
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  progress_percentage: number
  due_date?: string
  assigned_to?: string
  estimated_hours?: number
  actual_hours?: number
  is_overdue: boolean
  created_at: string
  updated_at: string
}

interface ImprovedMilestoneSystemProps {
  bookingId: string
  userRole: 'client' | 'provider' | 'admin'
  className?: string
}

export function ImprovedMilestoneSystem({ 
  bookingId, 
  userRole, 
  className = '' 
}: ImprovedMilestoneSystemProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [progressLoading, setProgressLoading] = useState<Set<string>>(new Set())

  // Load milestones with optimized query
  const loadMilestones = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const supabase = await getSupabaseClient()
      
      const { data, error: fetchError } = await supabase
        .from('milestones')
        .select(`
          id,
          title,
          description,
          status,
          priority,
          progress_percentage,
          due_date,
          completed_at,
          created_at,
          updated_at,
          weight,
          estimated_hours,
          actual_hours,
          total_tasks,
          completed_tasks,
          tasks (
            id,
            title,
            description,
            status,
            progress_percentage,
            due_date,
            assigned_to,
            estimated_hours,
            actual_hours,
            is_overdue,
            created_at,
            updated_at
          )
        `)
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true })

      if (fetchError) {
        throw fetchError
      }

      setMilestones(data || [])
    } catch (err) {
      console.error('Error loading milestones:', err)
      setError(err instanceof Error ? err.message : 'Failed to load milestones')
    } finally {
      setLoading(false)
    }
  }, [bookingId])

  // Update progress with optimized API call
  const updateProgress = useCallback(async (milestoneId: string, taskId?: string) => {
    try {
      setProgressLoading(prev => new Set(prev).add(milestoneId))
      
      const response = await fetch('/api/progress/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          booking_id: bookingId,
          milestone_id: milestoneId,
          task_id: taskId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update progress')
      }

      const result = await response.json()
      
      if (result.success) {
        // Refresh milestones to get updated data
        await loadMilestones()
        toast.success('Progress updated successfully')
      } else {
        throw new Error(result.error || 'Failed to update progress')
      }
    } catch (err) {
      console.error('Error updating progress:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to update progress')
    } finally {
      setProgressLoading(prev => {
        const newSet = new Set(prev)
        newSet.delete(milestoneId)
        return newSet
      })
    }
  }, [bookingId, loadMilestones])

  // Update task status
  const updateTaskStatus = useCallback(async (taskId: string, status: string) => {
    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)

      if (error) {
        throw error
      }

      // Find the milestone this task belongs to
      const taskMilestone = milestones.find(m => 
        m.tasks.some(t => t.id === taskId)
      )

      if (taskMilestone) {
        await updateProgress(taskMilestone.id, taskId)
      }
    } catch (err) {
      console.error('Error updating task status:', err)
      toast.error('Failed to update task status')
    }
  }, [milestones, updateProgress])

  // Update milestone status
  const updateMilestoneStatus = useCallback(async (milestoneId: string, status: string) => {
    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('milestones')
        .update({ 
          status,
          updated_at: new Date().toISOString(),
          completed_at: status === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', milestoneId)

      if (error) {
        throw error
      }

      await updateProgress(milestoneId)
    } catch (err) {
      console.error('Error updating milestone status:', err)
      toast.error('Failed to update milestone status')
    }
  }, [updateProgress])

  // Calculate overall progress
  const overallProgress = useMemo(() => {
    if (milestones.length === 0) return 0
    
    const totalWeight = milestones.reduce((sum, m) => sum + (m.weight || 1), 0)
    const weightedProgress = milestones.reduce((sum, m) => 
      sum + ((m.progress_percentage || 0) * (m.weight || 1)), 0)
    
    return totalWeight > 0 ? Math.round(weightedProgress / totalWeight) : 0
  }, [milestones])

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'in_progress':
        return <Play className="h-4 w-4 text-blue-600" />
      case 'on_hold':
        return <Pause className="h-4 w-4 text-yellow-600" />
      case 'cancelled':
        return <RotateCcw className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Check if milestone is overdue
  const isOverdue = (milestone: Milestone) => {
    if (!milestone.due_date || milestone.status === 'completed') return false
    return new Date(milestone.due_date) < new Date()
  }

  // Load milestones on mount
  useEffect(() => {
    loadMilestones()
  }, [loadMilestones])

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Error Loading Milestones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={loadMilestones} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overall Progress Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Project Progress Overview
          </CardTitle>
          <CardDescription>
            Overall progress across all milestones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-gray-600">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold text-green-600">
                  {milestones.filter(m => m.status === 'completed').length}
                </div>
                <div className="text-gray-600">Completed</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-blue-600">
                  {milestones.filter(m => m.status === 'in_progress').length}
                </div>
                <div className="text-gray-600">In Progress</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-600">
                  {milestones.filter(m => m.status === 'pending').length}
                </div>
                <div className="text-gray-600">Pending</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Milestones List */}
      <div className="space-y-4">
        {milestones.map((milestone) => (
          <Card key={milestone.id} className={`${isOverdue(milestone) ? 'border-red-200 bg-red-50' : ''}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    {getStatusIcon(milestone.status)}
                    {milestone.title}
                    {isOverdue(milestone) && (
                      <Badge variant="destructive" className="ml-2">
                        Overdue
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {milestone.description}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getPriorityColor(milestone.priority)}>
                    {milestone.priority}
                  </Badge>
                  <Badge variant="outline">
                    Weight: {milestone.weight}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Progress</span>
                    <span className="text-sm text-gray-600">
                      {milestone.progress_percentage}%
                    </span>
                  </div>
                  <Progress value={milestone.progress_percentage} className="h-2" />
                </div>

                {/* Milestone Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="font-semibold">{milestone.total_tasks}</div>
                    <div className="text-gray-600">Total Tasks</div>
                  </div>
                  <div>
                    <div className="font-semibold text-green-600">{milestone.completed_tasks}</div>
                    <div className="text-gray-600">Completed</div>
                  </div>
                  <div>
                    <div className="font-semibold">{milestone.estimated_hours || 0}h</div>
                    <div className="text-gray-600">Estimated</div>
                  </div>
                  <div>
                    <div className="font-semibold">{milestone.actual_hours || 0}h</div>
                    <div className="text-gray-600">Actual</div>
                  </div>
                </div>

                {/* Due Date */}
                {milestone.due_date && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    Due: {new Date(milestone.due_date).toLocaleDateString()}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateProgress(milestone.id)}
                    disabled={progressLoading.has(milestone.id)}
                  >
                    {progressLoading.has(milestone.id) ? 'Updating...' : 'Refresh Progress'}
                  </Button>
                  
                  {userRole !== 'client' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateMilestoneStatus(milestone.id, 'completed')}
                      disabled={milestone.status === 'completed'}
                    >
                      Mark Complete
                    </Button>
                  )}
                </div>

                {/* Tasks Preview */}
                {milestone.tasks.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Recent Tasks</h4>
                    <div className="space-y-2">
                      {milestone.tasks.slice(0, 3).map((task) => (
                        <div key={task.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              task.status === 'completed' ? 'bg-green-500' :
                              task.status === 'in_progress' ? 'bg-blue-500' :
                              'bg-gray-400'
                            }`} />
                            <span className="text-sm">{task.title}</span>
                            {task.is_overdue && (
                              <Badge variant="destructive" className="text-xs">
                                Overdue
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-600">
                              {task.progress_percentage}%
                            </span>
                            {userRole !== 'client' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => updateTaskStatus(task.id, 'completed')}
                                disabled={task.status === 'completed'}
                              >
                                ✓
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                      {milestone.tasks.length > 3 && (
                        <div className="text-sm text-gray-600 text-center">
                          +{milestone.tasks.length - 3} more tasks
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {milestones.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Milestones Yet</h3>
            <p className="text-gray-600">
              Milestones will appear here once they are created for this project.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
