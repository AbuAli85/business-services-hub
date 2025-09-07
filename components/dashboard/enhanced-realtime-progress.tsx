'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Play, 
  Pause, 
  Square, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Target,
  TrendingUp,
  Users,
  Calendar,
  Timer,
  Zap,
  RefreshCw
} from 'lucide-react'
import { useRealtimeProgress } from '@/hooks/use-realtime-progress'
import { realtimeProgressService, ProgressUpdate } from '@/lib/realtime-progress-service'
import toast from 'react-hot-toast'

interface EnhancedRealtimeProgressProps {
  bookingId: string
  userRole: 'provider' | 'client'
  className?: string
}

interface TimeEntry {
  id: string
  duration_hours: number
  description: string
  logged_at: string
  user_id: string
}

interface Task {
  id: string
  title: string
  status: 'pending' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled'
  progress_percentage: number
  estimated_hours: number
  actual_hours: number
  due_date: string
  is_overdue: boolean
}

interface Milestone {
  id: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled'
  progress_percentage: number
  completed_tasks: number
  total_tasks: number
  estimated_hours: number
  actual_hours: number
  due_date: string
  is_overdue: boolean
  tasks: Task[]
}

interface BookingProgress {
  booking_id: string
  booking_title: string
  booking_progress: number
  completed_milestones: number
  total_milestones: number
  completed_tasks: number
  total_tasks: number
  booking_status: string
  total_estimated_hours: number
  total_actual_hours: number
  overdue_tasks: number
  created_at: string
  updated_at: string
}

export function EnhancedRealtimeProgress({ 
  bookingId, 
  userRole, 
  className = "" 
}: EnhancedRealtimeProgressProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [bookingProgress, setBookingProgress] = useState<BookingProgress | null>(null)
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [timerStartTime, setTimerStartTime] = useState<Date | null>(null)
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)
  const [newTimeEntry, setNewTimeEntry] = useState({ duration: 0, description: '' })

  const handleProgressUpdate = useCallback((update: ProgressUpdate) => {
    console.log('📊 Progress update received:', update)
    
    // Update local state based on update type
    if (update.type === 'task') {
      setMilestones(prev => prev.map(milestone => 
        milestone.id === update.milestoneId
          ? {
              ...milestone,
              tasks: milestone.tasks.map(task =>
                task.id === update.taskId
                  ? { ...task, ...update.data }
                  : task
              )
            }
          : milestone
      ))
    } else if (update.type === 'milestone') {
      setMilestones(prev => prev.map(milestone =>
        milestone.id === update.milestoneId
          ? { ...milestone, ...update.data }
          : milestone
      ))
    } else if (update.type === 'booking') {
      setBookingProgress(prev => prev ? { ...prev, ...update.data } : null)
    }
  }, [])

  const handleMilestoneComplete = useCallback((milestoneId: string) => {
    toast.success('🎉 Milestone completed!')
    loadData() // Refresh all data
  }, [])

  const handleBookingComplete = useCallback((bookingId: string) => {
    toast.success('🎊 Project completed! Congratulations!')
    loadData() // Refresh all data
  }, [])

  const { isConnected, lastUpdate, broadcastProgressUpdate } = useRealtimeProgress({
    bookingId,
    onProgressUpdate: handleProgressUpdate,
    onMilestoneComplete: handleMilestoneComplete,
    onBookingComplete: handleBookingComplete
  })

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const supabase = await getSupabaseClient()
      
      // Load milestones with tasks
      const { data: milestonesData, error: milestonesError } = await supabase
        .from('milestones')
        .select(`
          id,
          title,
          description,
          status,
          progress_percentage,
          estimated_hours,
          actual_hours,
          due_date,
          order_index,
          tasks (
            id,
            title,
            status,
            progress_percentage,
            estimated_hours,
            actual_hours,
            due_date
          )
        `)
        .eq('booking_id', bookingId)
        .order('order_index', { ascending: true })

      if (milestonesError) throw milestonesError

      // Load booking progress
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          id,
          title,
          project_progress,
          status,
          created_at,
          updated_at
        `)
        .eq('id', bookingId)
        .single()

      if (bookingError) throw bookingError

      // Load time entries
      const { data: timeEntriesData, error: timeEntriesError } = await supabase
        .from('time_entries')
        .select(`
          id,
          duration_hours,
          description,
          logged_at,
          user_id
        `)
        .eq('booking_id', bookingId)
        .order('logged_at', { ascending: false })

      if (timeEntriesError) throw timeEntriesError

      // Process milestones data
      const processedMilestones = (milestonesData || []).map(milestone => {
        const tasks = milestone.tasks || []
        const completedTasks = tasks.filter((t: any) => t.status === 'completed').length
        const totalTasks = tasks.length
        const actualHours = tasks.reduce((sum: number, t: any) => sum + (t.actual_hours || 0), 0)
        
        return {
          ...milestone,
          completed_tasks: completedTasks,
          total_tasks: totalTasks,
          actual_hours: actualHours,
          is_overdue: milestone.due_date ? new Date(milestone.due_date) < new Date() && milestone.status !== 'completed' : false,
          tasks: tasks.map((task: any) => ({
            ...task,
            is_overdue: task.due_date ? new Date(task.due_date) < new Date() && task.status !== 'completed' : false
          }))
        }
      })

      // Calculate booking progress
      const totalMilestones = processedMilestones.length
      const completedMilestones = processedMilestones.filter(m => m.status === 'completed').length
      const totalTasks = processedMilestones.reduce((sum, m) => sum + m.total_tasks, 0)
      const completedTasks = processedMilestones.reduce((sum, m) => sum + m.completed_tasks, 0)
      const totalEstimatedHours = processedMilestones.reduce((sum, m) => sum + (m.estimated_hours || 0), 0)
      const totalActualHours = processedMilestones.reduce((sum, m) => sum + (m.actual_hours || 0), 0)
      const overdueTasks = processedMilestones.reduce((sum, m) => 
        sum + m.tasks.filter((t: any) => t.is_overdue).length, 0
      )

      const bookingProgressData: BookingProgress = {
        booking_id: bookingId,
        booking_title: bookingData.title || 'Project Progress',
        booking_progress: bookingData.project_progress || 0,
        completed_milestones: completedMilestones,
        total_milestones: totalMilestones,
        completed_tasks: completedTasks,
        total_tasks: totalTasks,
        booking_status: bookingData.status || 'pending',
        total_estimated_hours: totalEstimatedHours,
        total_actual_hours: totalActualHours,
        overdue_tasks: overdueTasks,
        created_at: bookingData.created_at,
        updated_at: bookingData.updated_at
      }

      setMilestones(processedMilestones)
      setBookingProgress(bookingProgressData)
      setTimeEntries(timeEntriesData || [])
    } catch (err) {
      console.error('Error loading progress data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load progress data')
      toast.error('Failed to load progress data')
    } finally {
      setLoading(false)
    }
  }, [bookingId])

  const updateTaskStatus = async (milestoneId: string, taskId: string, status: string) => {
    try {
      const result = await realtimeProgressService.updateTaskProgress(bookingId, milestoneId, taskId, {
        status: status as any,
        progress_percentage: status === 'completed' ? 100 : status === 'in_progress' ? 50 : 0
      })

      if (result.success) {
        toast.success(`Task ${status === 'completed' ? 'completed' : 'updated'}`)
      } else {
        toast.error(result.error || 'Failed to update task')
      }
    } catch (error) {
      console.error('Error updating task status:', error)
      toast.error('Failed to update task')
    }
  }

  const startTimer = (taskId: string) => {
    setCurrentTaskId(taskId)
    setTimerStartTime(new Date())
    setIsTimerRunning(true)
    toast.success('Timer started')
  }

  const stopTimer = async () => {
    if (!timerStartTime || !currentTaskId) return

    const duration = (Date.now() - timerStartTime.getTime()) / (1000 * 60 * 60) // Convert to hours
    const milestoneId = milestones.find(m => m.tasks.some(t => t.id === currentTaskId))?.id

    if (milestoneId) {
      const result = await realtimeProgressService.logTimeEntry(
        bookingId,
        milestoneId,
        currentTaskId,
        Math.round(duration * 100) / 100, // Round to 2 decimal places
        'Timer session'
      )

      if (result.success) {
        toast.success(`Logged ${Math.round(duration * 100) / 100}h of work`)
        loadData() // Refresh data
      } else {
        toast.error(result.error || 'Failed to log time')
      }
    }

    setIsTimerRunning(false)
    setTimerStartTime(null)
    setCurrentTaskId(null)
  }

  const logTimeEntry = async (taskId: string) => {
    if (newTimeEntry.duration <= 0) {
      toast.error('Please enter a valid duration')
      return
    }

    const milestoneId = milestones.find(m => m.tasks.some(t => t.id === taskId))?.id
    if (!milestoneId) return

    const result = await realtimeProgressService.logTimeEntry(
      bookingId,
      milestoneId,
      taskId,
      newTimeEntry.duration,
      newTimeEntry.description
    )

    if (result.success) {
      toast.success('Time entry logged')
      setNewTimeEntry({ duration: 0, description: '' })
      loadData() // Refresh data
    } else {
      toast.error(result.error || 'Failed to log time entry')
    }
  }

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading progress data...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-8">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Progress</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={loadData} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={className}>
      {/* Connection Status */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-600">
            {isConnected ? 'Real-time connected' : 'Connecting...'}
          </span>
          {lastUpdate && (
            <span className="text-xs text-gray-500">
              Last update: {new Date(lastUpdate).toLocaleTimeString()}
            </span>
          )}
        </div>
        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="time">Time Tracking</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Overall Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Project Progress</span>
                <Badge variant={bookingProgress?.booking_status === 'completed' ? 'default' : 'secondary'}>
                  {bookingProgress?.booking_status || 'Pending'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Overall Progress</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {bookingProgress?.booking_progress || 0}%
                  </span>
                </div>
                <Progress value={bookingProgress?.booking_progress || 0} className="h-3" />
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {bookingProgress?.completed_milestones || 0}/{bookingProgress?.total_milestones || 0}
                    </div>
                    <div className="text-sm text-blue-600">Milestones</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {bookingProgress?.completed_tasks || 0}/{bookingProgress?.total_tasks || 0}
                    </div>
                    <div className="text-sm text-green-600">Tasks</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {Math.round(bookingProgress?.total_actual_hours || 0)}h
                    </div>
                    <div className="text-sm text-purple-600">Time Logged</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {bookingProgress?.overdue_tasks || 0}
                    </div>
                    <div className="text-sm text-red-600">Overdue</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {isTimerRunning ? (
                  <Button onClick={stopTimer} variant="destructive">
                    <Square className="h-4 w-4 mr-2" />
                    Stop Timer
                  </Button>
                ) : (
                  <Button disabled>
                    <Play className="h-4 w-4 mr-2" />
                    Start Timer
                  </Button>
                )}
                <Button onClick={loadData} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Milestones Tab */}
        <TabsContent value="milestones" className="space-y-6">
          {milestones.map((milestone, index) => (
            <Card key={milestone.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-600">{index + 1}</span>
                    </div>
                    <div>
                      <CardTitle className="text-lg">{milestone.title}</CardTitle>
                      <p className="text-sm text-gray-600">{milestone.description}</p>
                    </div>
                  </div>
                  <Badge variant={
                    milestone.status === 'completed' ? 'default' :
                    milestone.status === 'in_progress' ? 'secondary' :
                    milestone.is_overdue ? 'destructive' : 'outline'
                  }>
                    {milestone.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Progress</span>
                    <span className="text-lg font-bold">{milestone.progress_percentage}%</span>
                  </div>
                  <Progress value={milestone.progress_percentage} className="h-2" />
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Tasks:</span>
                      <span className="ml-2 font-medium">
                        {milestone.completed_tasks}/{milestone.total_tasks}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Time:</span>
                      <span className="ml-2 font-medium">
                        {Math.round(milestone.actual_hours)}h / {milestone.estimated_hours}h
                      </span>
                    </div>
                  </div>

                  {/* Tasks */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900">Tasks</h4>
                    {milestone.tasks.map((task) => (
                      <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Button
                            size="sm"
                            variant={task.status === 'completed' ? 'default' : 'outline'}
                            onClick={() => updateTaskStatus(
                              milestone.id, 
                              task.id, 
                              task.status === 'completed' ? 'pending' : 'completed'
                            )}
                          >
                            {task.status === 'completed' ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <div className="w-4 h-4 border-2 border-gray-400 rounded" />
                            )}
                          </Button>
                          <div>
                            <div className="font-medium">{task.title}</div>
                            <div className="text-sm text-gray-600">
                              {task.actual_hours}h logged
                              {task.is_overdue && (
                                <span className="ml-2 text-red-600">(Overdue)</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {!isTimerRunning && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startTimer(task.id)}
                            >
                              <Timer className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Time Tracking Tab */}
        <TabsContent value="time" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Time Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Timer Status */}
                {isTimerRunning && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                        <span className="font-medium">Timer Running</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Started: {timerStartTime?.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                )}

                {/* Manual Time Entry */}
                <div className="space-y-4">
                  <h4 className="font-medium">Log Time Entry</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="duration-input" className="text-sm font-medium text-gray-700">Duration (hours)</label>
                      <input
                        id="duration-input"
                        type="number"
                        step="0.25"
                        min="0"
                        value={newTimeEntry.duration}
                        onChange={(e) => setNewTimeEntry(prev => ({ 
                          ...prev, 
                          duration: parseFloat(e.target.value) || 0 
                        }))}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label="Duration in hours"
                      />
                    </div>
                    <div>
                      <label htmlFor="description-input" className="text-sm font-medium text-gray-700">Description</label>
                      <input
                        id="description-input"
                        type="text"
                        value={newTimeEntry.description}
                        onChange={(e) => setNewTimeEntry(prev => ({ 
                          ...prev, 
                          description: e.target.value 
                        }))}
                        placeholder="What did you work on?"
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label="Description of work done"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button 
                        onClick={() => {
                          // Find first available task
                          const firstTask = milestones.find(m => m.tasks.length > 0)?.tasks[0]
                          if (firstTask) {
                            logTimeEntry(firstTask.id)
                          }
                        }}
                        disabled={newTimeEntry.duration <= 0}
                        className="w-full"
                      >
                        Log Time
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Time Entries List */}
                <div className="space-y-2">
                  <h4 className="font-medium">Recent Time Entries</h4>
                  {timeEntries.length > 0 ? (
                    <div className="space-y-2">
                      {timeEntries.slice(0, 10).map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium">{entry.description}</div>
                            <div className="text-sm text-gray-600">
                              {new Date(entry.logged_at).toLocaleString()}
                            </div>
                          </div>
                          <div className="text-lg font-bold text-blue-600">
                            {entry.duration_hours}h
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No time entries logged yet
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Progress Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Time Analysis</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Estimated Hours:</span>
                      <span className="font-medium">{bookingProgress?.total_estimated_hours || 0}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Actual Hours:</span>
                      <span className="font-medium">{Math.round(bookingProgress?.total_actual_hours || 0)}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Efficiency:</span>
                      <span className={`font-medium ${
                        (bookingProgress?.total_actual_hours || 0) <= (bookingProgress?.total_estimated_hours || 0) 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {bookingProgress?.total_estimated_hours 
                          ? Math.round(((bookingProgress?.total_estimated_hours || 0) / (bookingProgress?.total_actual_hours || 1)) * 100)
                          : 0}%
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium">Progress Metrics</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Completion Rate:</span>
                      <span className="font-medium">
                        {bookingProgress?.total_tasks 
                          ? Math.round(((bookingProgress?.completed_tasks || 0) / bookingProgress.total_tasks) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Milestone Progress:</span>
                      <span className="font-medium">
                        {bookingProgress?.total_milestones 
                          ? Math.round(((bookingProgress?.completed_milestones || 0) / bookingProgress.total_milestones) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Overdue Tasks:</span>
                      <span className={`font-medium ${(bookingProgress?.overdue_tasks || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {bookingProgress?.overdue_tasks || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Helper function to get Supabase client
async function getSupabaseClient() {
  const { getSupabaseClient } = await import('@/lib/supabase')
  return getSupabaseClient()
}
