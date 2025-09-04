'use client'

import { useState, useEffect } from 'react'
import { Play, Pause, Square, Clock, Timer } from 'lucide-react'
import { ProgressTrackingService, TimeEntry, formatDuration } from '@/lib/progress-tracking'
import { getSupabaseClient } from '@/lib/supabase'

interface TimeTrackingWidgetProps {
  taskId: string
  taskTitle: string
  onTimeUpdate?: () => void
}

export function TimeTrackingWidget({ taskId, taskTitle, onTimeUpdate }: TimeTrackingWidgetProps) {
  const [user, setUser] = useState<any>(null)
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadActiveTimeEntry()
    }
  }, [taskId, user])

  const loadUser = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    } catch (error) {
      console.error('Error loading user:', error)
    }
  }

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (activeEntry && activeEntry.is_active) {
      interval = setInterval(() => {
        const startTime = new Date(activeEntry.start_time).getTime()
        const now = new Date().getTime()
        setElapsedTime(Math.floor((now - startTime) / 1000))
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [activeEntry])

  const loadActiveTimeEntry = async () => {
    if (!user) return

    try {
      const entry = await ProgressTrackingService.getActiveTimeEntry(user.id)
      setActiveEntry(entry)
      
      if (entry && entry.is_active) {
        const startTime = new Date(entry.start_time).getTime()
        const now = new Date().getTime()
        setElapsedTime(Math.floor((now - startTime) / 1000))
      }
    } catch (error) {
      console.error('Error loading active time entry:', error)
    }
  }

  const handleStartTracking = async () => {
    if (!user || isLoading) return

    try {
      setIsLoading(true)
      const entry = await ProgressTrackingService.startTimeTracking(taskId, user.id, `Working on: ${taskTitle}`)
      setActiveEntry(entry)
      setElapsedTime(0)
      onTimeUpdate?.()
    } catch (error) {
      console.error('Error starting time tracking:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStopTracking = async () => {
    if (!activeEntry || isLoading) return

    try {
      setIsLoading(true)
      await ProgressTrackingService.stopTimeTracking(activeEntry.id)
      setActiveEntry(null)
      setElapsedTime(0)
      onTimeUpdate?.()
    } catch (error) {
      console.error('Error stopping time tracking:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatElapsedTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const isTracking = activeEntry?.is_active && activeEntry.task_id === taskId

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {isTracking ? (
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            ) : (
              <Clock className="h-4 w-4 text-gray-400" />
            )}
            <span className="text-sm font-medium text-gray-900">
              {isTracking ? 'Tracking Time' : 'Time Tracking'}
            </span>
          </div>
          
          {isTracking && (
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Timer className="h-4 w-4" />
              <span className="font-mono">{formatElapsedTime(elapsedTime)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isTracking ? (
            <button
              onClick={handleStartTracking}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Play className="h-3 w-3" />
              Start
            </button>
          ) : (
            <button
              onClick={handleStopTracking}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Pause className="h-3 w-3" />
              Stop
            </button>
          )}
        </div>
      </div>

      {isTracking && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-600">
            <div className="flex items-center justify-between">
              <span>Task: {taskTitle}</span>
              <span>Started: {new Date(activeEntry.start_time).toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Time Tracking Summary Component
export function TimeTrackingSummary({ taskId }: { taskId: string }) {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTimeEntries()
  }, [taskId])

  const loadTimeEntries = async () => {
    try {
      setLoading(true)
      // This would need to be implemented in the service
      // const entries = await ProgressTrackingService.getTimeEntries(taskId)
      // setTimeEntries(entries)
    } catch (error) {
      console.error('Error loading time entries:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalMinutes = timeEntries.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0)
  const totalHours = totalMinutes / 60

  if (loading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-900">Time Logged</span>
        </div>
        <span className="text-sm font-medium text-gray-900">
          {formatDuration(totalMinutes)}
        </span>
      </div>
      
      {timeEntries.length > 0 && (
        <div className="mt-2 space-y-1">
          {timeEntries.slice(0, 3).map((entry) => (
            <div key={entry.id} className="text-xs text-gray-600 flex items-center justify-between">
              <span>{new Date(entry.start_time).toLocaleDateString()}</span>
              <span>{formatDuration(entry.duration_minutes || 0)}</span>
            </div>
          ))}
          {timeEntries.length > 3 && (
            <div className="text-xs text-gray-500">
              +{timeEntries.length - 3} more entries
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Global Time Tracking Status Component
export function GlobalTimeTrackingStatus() {
  const [user, setUser] = useState<any>(null)
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (!user) return

    loadActiveTimeEntry()

    const interval = setInterval(() => {
      if (activeEntry && activeEntry.is_active) {
        const startTime = new Date(activeEntry.start_time).getTime()
        const now = new Date().getTime()
        setElapsedTime(Math.floor((now - startTime) / 1000))
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [user, activeEntry])

  const loadUser = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    } catch (error) {
      console.error('Error loading user:', error)
    }
  }

  const loadActiveTimeEntry = async () => {
    if (!user) return

    try {
      const entry = await ProgressTrackingService.getActiveTimeEntry(user.id)
      setActiveEntry(entry)
      
      if (entry && entry.is_active) {
        const startTime = new Date(entry.start_time).getTime()
        const now = new Date().getTime()
        setElapsedTime(Math.floor((now - startTime) / 1000))
      }
    } catch (error) {
      console.error('Error loading active time entry:', error)
    }
  }

  const formatElapsedTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (!activeEntry || !activeEntry.is_active) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50">
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
        <div>
          <div className="text-sm font-medium text-gray-900">Time Tracking Active</div>
          <div className="text-xs text-gray-600">
            {activeEntry.description || 'Working on task'}
          </div>
        </div>
        <div className="text-sm font-mono text-gray-900">
          {formatElapsedTime(elapsedTime)}
        </div>
      </div>
    </div>
  )
}
