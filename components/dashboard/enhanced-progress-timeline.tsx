'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Calendar, 
  User, 
  Download,
  FileText,
  BarChart3,
  Target,
  TrendingUp,
  AlertCircle,
  CheckCheck,
  Play,
  Pause,
  X
} from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import toast from 'react-hot-toast'

interface BookingTask {
  id: string
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assigned_to?: string
  due_date?: string
  completed_at?: string
  created_at: string
  updated_at: string
  is_overdue: boolean
  overdue_since?: string
  weight: number
  milestone_id?: string
}

interface BookingMilestone {
  id: string
  title: string
  description?: string
  due_date?: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
}

interface ProgressTimelineProps {
  bookingId: string
  userRole: 'client' | 'provider'
  onExport?: (format: 'pdf' | 'excel') => void
}

export default function EnhancedProgressTimeline({ 
  bookingId, 
  userRole, 
  onExport 
}: ProgressTimelineProps) {
  const [tasks, setTasks] = useState<BookingTask[]>([])
  const [milestones, setMilestones] = useState<BookingMilestone[]>([])
  const [loading, setLoading] = useState(true)
  const [overdueCount, setOverdueCount] = useState(0)
  const [progressStats, setProgressStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    pendingApproval: 0,
    overallProgress: 0
  })

  useEffect(() => {
    if (bookingId) {
      loadProgressData()
      updateOverdueStatus()
    }
  }, [bookingId])

  const loadProgressData = async () => {
    try {
      setLoading(true)
      const supabase = await getSupabaseClient()

      // Load tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('booking_tasks')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false })

      if (tasksError) throw tasksError

      // Load milestones
      const { data: milestonesData, error: milestonesError } = await supabase
        .from('booking_milestones')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false })

      if (milestonesError) throw milestonesError

      setTasks(tasksData || [])
      setMilestones(milestonesData || [])

      // Calculate stats
      const totalTasks = tasksData?.length || 0
      const completedTasks = tasksData?.filter(t => t.status === 'completed').length || 0
      const overdueTasks = tasksData?.filter(t => t.is_overdue).length || 0
      const pendingApproval = tasksData?.filter(t => t.status === 'pending').length || 0
      const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

      setProgressStats({
        totalTasks,
        completedTasks,
        overdueTasks,
        pendingApproval,
        overallProgress
      })

      setOverdueCount(overdueTasks)
    } catch (error) {
      console.error('Error loading progress data:', error)
      toast.error('Failed to load progress data')
    } finally {
      setLoading(false)
    }
  }

  const updateOverdueStatus = async () => {
    try {
      const supabase = await getSupabaseClient()
      await supabase.rpc('update_overdue_tasks')
    } catch (error) {
      console.error('Error updating overdue status:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    const icons = {
      pending: <Clock className="h-4 w-4" />,
      in_progress: <Play className="h-4 w-4" />,
      completed: <CheckCircle className="h-4 w-4" />,
      cancelled: <X className="h-4 w-4" />
    }
    return icons[status as keyof typeof icons] || <Clock className="h-4 w-4" />
  }

  const getStatusColor = (status: string, isOverdue: boolean = false) => {
    if (isOverdue) return 'bg-red-100 text-red-800 border-red-300'
    
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      in_progress: 'bg-blue-100 text-blue-800 border-blue-300',
      completed: 'bg-green-100 text-green-800 border-green-300',
      cancelled: 'bg-gray-100 text-gray-800 border-gray-300'
    }
    return colors[status as keyof typeof colors] || colors.pending
  }

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    }
    return colors[priority as keyof typeof colors] || colors.medium
  }

  const formatDate = (date: string) => {
    return format(parseISO(date), 'MMM dd, yyyy')
  }

  const formatTime = (date: string) => {
    return format(parseISO(date), 'h:mm a')
  }

  const isOverdue = (dueDate: string, status: string) => {
    if (!dueDate || status === 'completed' || status === 'cancelled') return false
    return new Date(dueDate) < new Date()
  }

  const getOverdueDays = (dueDate: string) => {
    const now = new Date()
    const due = new Date(dueDate)
    const diffTime = now.getTime() - due.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded-lg mb-4"></div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-700 text-sm font-medium">Overall Progress</p>
                <p className="text-2xl font-bold text-blue-900">{progressStats.overallProgress}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
            <Progress value={progressStats.overallProgress} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-700 text-sm font-medium">Completed</p>
                <p className="text-2xl font-bold text-green-900">{progressStats.completedTasks}</p>
                <p className="text-xs text-green-600">of {progressStats.totalTasks} tasks</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-red-50 to-red-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-700 text-sm font-medium">Overdue</p>
                <p className="text-2xl font-bold text-red-900">{progressStats.overdueTasks}</p>
                {progressStats.overdueTasks > 0 && (
                  <p className="text-xs text-red-600">Needs attention</p>
                )}
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-700 text-sm font-medium">Pending</p>
                <p className="text-2xl font-bold text-orange-900">{progressStats.pendingApproval}</p>
                <p className="text-xs text-orange-600">Awaiting approval</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress and Timeline Tabs */}
      <Tabs defaultValue="progress" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="progress" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Progress</span>
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Timeline</span>
            </TabsTrigger>
          </TabsList>

          {/* Export Buttons */}
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExport?.('pdf')}
              className="border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <FileText className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExport?.('excel')}
              className="border-green-200 text-green-700 hover:bg-green-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
          </div>
        </div>

        {/* Progress Tab */}
        <TabsContent value="progress" className="space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-blue-600" />
                <span>Task Progress</span>
                {overdueCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {overdueCount} Overdue
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Target className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p>No tasks created yet</p>
                    {userRole === 'provider' && (
                      <Button className="mt-4" onClick={() => {/* Add task creation logic */}}>
                        Create First Task
                      </Button>
                    )}
                  </div>
                ) : (
                  tasks.map((task) => {
                    const taskOverdue = isOverdue(task.due_date || '', task.status)
                    const overdueDays = taskOverdue ? getOverdueDays(task.due_date || '') : 0

                    return (
                      <div
                        key={task.id}
                        className={`p-4 rounded-lg border ${
                          taskOverdue 
                            ? 'border-red-200 bg-red-50' 
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="font-medium text-gray-900">{task.title}</h4>
                              <Badge className={`px-2 py-1 ${getStatusColor(task.status, taskOverdue)}`}>
                                <div className="flex items-center space-x-1">
                                  {getStatusIcon(task.status)}
                                  <span className="capitalize">{task.status.replace('_', ' ')}</span>
                                </div>
                              </Badge>
                              <Badge className={`px-2 py-1 ${getPriorityColor(task.priority)}`}>
                                {task.priority}
                              </Badge>
                              {taskOverdue && (
                                <Badge variant="destructive" className="px-2 py-1">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  {overdueDays} day{overdueDays !== 1 ? 's' : ''} overdue
                                </Badge>
                              )}
                            </div>
                            
                            {task.description && (
                              <p className="text-gray-600 text-sm mb-2">{task.description}</p>
                            )}

                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              {task.due_date && (
                                <div className="flex items-center space-x-1">
                                  <Calendar className="h-4 w-4" />
                                  <span>Due: {formatDate(task.due_date)}</span>
                                </div>
                              )}
                              {task.assigned_to && (
                                <div className="flex items-center space-x-1">
                                  <User className="h-4 w-4" />
                                  <span>Assigned</span>
                                </div>
                              )}
                              <div className="flex items-center space-x-1">
                                <Clock className="h-4 w-4" />
                                <span>Weight: {task.weight}</span>
                              </div>
                            </div>
                          </div>

                          {userRole === 'provider' && task.status !== 'completed' && (
                            <div className="flex space-x-2 ml-4">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {/* Update task status */}}
                              >
                                Update
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <span>Project Timeline</span>
                {overdueCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {overdueCount} Overdue
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Milestones */}
                {milestones.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-4">Milestones</h4>
                    <div className="space-y-3">
                      {milestones.map((milestone) => {
                        const milestoneOverdue = isOverdue(milestone.due_date || '', milestone.status)
                        const overdueDays = milestoneOverdue ? getOverdueDays(milestone.due_date || '') : 0

                        return (
                          <div
                            key={milestone.id}
                            className={`p-4 rounded-lg border ${
                              milestoneOverdue 
                                ? 'border-red-200 bg-red-50' 
                                : 'border-gray-200 bg-white'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className={`p-2 rounded-full ${
                                  milestone.status === 'completed' 
                                    ? 'bg-green-100 text-green-600'
                                    : milestoneOverdue
                                    ? 'bg-red-100 text-red-600'
                                    : 'bg-blue-100 text-blue-600'
                                }`}>
                                  {milestone.status === 'completed' ? (
                                    <CheckCircle className="h-4 w-4" />
                                  ) : (
                                    <Target className="h-4 w-4" />
                                  )}
                                </div>
                                <div>
                                  <h5 className="font-medium text-gray-900">{milestone.title}</h5>
                                  {milestone.description && (
                                    <p className="text-sm text-gray-600">{milestone.description}</p>
                                  )}
                                  {milestone.due_date && (
                                    <p className="text-xs text-gray-500">
                                      Due: {formatDate(milestone.due_date)}
                                      {milestoneOverdue && (
                                        <span className="text-red-600 ml-2">
                                          ({overdueDays} days overdue)
                                        </span>
                                      )}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <Badge className={`px-2 py-1 ${getStatusColor(milestone.status, milestoneOverdue)}`}>
                                <div className="flex items-center space-x-1">
                                  {getStatusIcon(milestone.status)}
                                  <span className="capitalize">{milestone.status.replace('_', ' ')}</span>
                                </div>
                              </Badge>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Tasks Timeline */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Tasks Timeline</h4>
                  <div className="space-y-3">
                    {tasks.map((task) => {
                      const taskOverdue = isOverdue(task.due_date || '', task.status)
                      const overdueDays = taskOverdue ? getOverdueDays(task.due_date || '') : 0

                      return (
                        <div
                          key={task.id}
                          className={`p-4 rounded-lg border ${
                            taskOverdue 
                              ? 'border-red-200 bg-red-50' 
                              : 'border-gray-200 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`p-2 rounded-full ${
                                task.status === 'completed' 
                                  ? 'bg-green-100 text-green-600'
                                  : taskOverdue
                                  ? 'bg-red-100 text-red-600'
                                  : 'bg-blue-100 text-blue-600'
                              }`}>
                                {getStatusIcon(task.status)}
                              </div>
                              <div>
                                <h5 className="font-medium text-gray-900">{task.title}</h5>
                                {task.description && (
                                  <p className="text-sm text-gray-600">{task.description}</p>
                                )}
                                <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                                  {task.due_date && (
                                    <span>
                                      Due: {formatDate(task.due_date)}
                                      {taskOverdue && (
                                        <span className="text-red-600 ml-1">
                                          ({overdueDays} days overdue)
                                        </span>
                                      )}
                                    </span>
                                  )}
                                  <span>Priority: {task.priority}</span>
                                  <span>Weight: {task.weight}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={`px-2 py-1 ${getStatusColor(task.status, taskOverdue)}`}>
                                <div className="flex items-center space-x-1">
                                  {getStatusIcon(task.status)}
                                  <span className="capitalize">{task.status.replace('_', ' ')}</span>
                                </div>
                              </Badge>
                              {taskOverdue && (
                                <Badge variant="destructive" className="px-2 py-1">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Overdue
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
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
