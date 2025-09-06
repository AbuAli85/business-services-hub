'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Play, 
  Pause, 
  Square, 
  Timer, 
  Clock,
  Activity
} from 'lucide-react'
import { Milestone, TimeEntry } from '@/lib/progress-tracking'
import { format, formatDistanceToNow } from 'date-fns'

interface TimeTrackingWidgetProps {
  milestone: Milestone
  activeTimeEntry: TimeEntry | null
  onStartTimeTracking: (taskId: string, description?: string) => Promise<void>
  onStopTimeTracking: (entryId: string) => Promise<void>
}

export function TimeTrackingWidget({
  milestone,
  activeTimeEntry,
  onStartTimeTracking,
  onStopTimeTracking
}: TimeTrackingWidgetProps) {
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isTracking, setIsTracking] = useState(false)

  // Check if any task in this milestone is being tracked
  const milestoneTasks = milestone.tasks || []
  const activeTask = milestoneTasks.find(task => 
    activeTimeEntry && activeTimeEntry.task_id === task.id
  )

  // Update elapsed time for active tracking
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (activeTimeEntry && activeTimeEntry.is_active) {
      setIsTracking(true)
      const startTime = new Date(activeTimeEntry.start_time)
      
      interval = setInterval(() => {
        const now = new Date()
        const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000)
        setElapsedTime(elapsed)
      }, 1000)
    } else {
      setIsTracking(false)
      setElapsedTime(0)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [activeTimeEntry])

  // Format elapsed time
  const formatElapsedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  // Calculate total time for milestone
  const totalMilestoneTime = milestoneTasks.reduce((sum, task) => {
    return sum + (task.actual_hours || 0)
  }, 0)

  // Handle start tracking
  const handleStartTracking = async (taskId: string) => {
    try {
      const task = milestoneTasks.find(t => t.id === taskId)
      await onStartTimeTracking(taskId, `Working on ${task?.title}`)
    } catch (error) {
      console.error('Error starting time tracking:', error)
    }
  }

  // Handle stop tracking
  const handleStopTracking = async () => {
    if (activeTimeEntry) {
      try {
        await onStopTimeTracking(activeTimeEntry.id)
      } catch (error) {
        console.error('Error stopping time tracking:', error)
      }
    }
  }

  // Get available tasks for tracking
  const availableTasks = milestoneTasks.filter(task => 
    task.status !== 'completed' && task.status !== 'cancelled'
  )

  if (availableTasks.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center space-x-2">
            <Timer className="h-5 w-5" />
            <span>Time Tracking</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">No active tasks to track</p>
            <p className="text-sm text-gray-400">All tasks are completed or cancelled</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center space-x-2">
          <Timer className="h-5 w-5" />
          <span>Time Tracking</span>
          {isTracking && (
            <Badge variant="destructive" className="animate-pulse">
              <Activity className="h-3 w-3 mr-1" />
              Tracking
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Tracking Status */}
        {isTracking && activeTask && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-green-900">Currently Tracking</p>
                <p className="text-sm text-green-700">{activeTask.title}</p>
                <p className="text-xs text-green-600">
                  Started {formatDistanceToNow(new Date(activeTimeEntry!.start_time), { addSuffix: true })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-900">
                  {formatElapsedTime(elapsedTime)}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleStopTracking}
                  className="mt-2 text-red-600 hover:text-red-700"
                >
                  <Square className="h-4 w-4 mr-1" />
                  Stop
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Available Tasks */}
        {!isTracking && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Start tracking time for:</p>
            <div className="space-y-2">
              {availableTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium text-gray-900">{task.title}</p>
                    <p className="text-sm text-gray-500">
                      {task.estimated_hours || 0}h estimated • {task.actual_hours || 0}h logged
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleStartTracking(task.id)}
                    className="flex items-center space-x-1"
                  >
                    <Play className="h-4 w-4" />
                    <span>Start</span>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Milestone Summary */}
        <div className="border-t pt-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {totalMilestoneTime.toFixed(1)}h
              </p>
              <p className="text-sm text-gray-500">Total Logged</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {milestone.estimated_hours || 0}h
              </p>
              <p className="text-sm text-gray-500">Estimated</p>
            </div>
          </div>
          
          {milestone.estimated_hours && milestone.estimated_hours > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">Progress</span>
                <span className="text-gray-900">
                  {((totalMilestoneTime / milestone.estimated_hours) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min((totalMilestoneTime / milestone.estimated_hours) * 100, 100)}%`
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}