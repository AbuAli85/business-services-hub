'use client'

import { useState, useEffect } from 'react'
import { Bell, AlertTriangle, Clock, CheckCircle, XCircle, RefreshCw, BarChart3 } from 'lucide-react'
import { Milestone, Task } from '@/types/progress'
import { getSupabaseClient } from '@/lib/supabase'

interface SmartFeaturesProps {
  bookingId: string
  userRole: 'provider' | 'client'
}

interface OverdueItem {
  id: string
  title: string
  type: 'milestone' | 'task'
  due_date: string
  overdue_days: number
  priority: string
}

export function SmartFeatures({ bookingId, userRole }: SmartFeaturesProps) {
  const [user, setUser] = useState<any>(null)
  const [overdueItems, setOverdueItems] = useState<OverdueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [lastChecked, setLastChecked] = useState<Date>(new Date())

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadOverdueItems()
      updateOverdueStatus()
    }
  }, [bookingId, user])

  const loadUser = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    } catch (error) {
      console.error('Error loading user:', error)
    }
  }

  const loadOverdueItems = async () => {
    try {
      setLoading(true)
      const supabase = await getSupabaseClient()
      const { data: milestones, error } = await supabase
        .from('milestones')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true })
      
      if (error) throw error
      
      const overdue: OverdueItem[] = []
      
      // Check overdue milestones
      milestones.forEach(milestone => {
        if (milestone.due_date && new Date(milestone.due_date) < new Date() && milestone.status !== 'completed') {
          const dueDate = new Date(milestone.due_date)
          const now = new Date()
          const overdueDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
          
          overdue.push({
            id: milestone.id,
            title: milestone.title,
            type: 'milestone',
            due_date: milestone.due_date,
            overdue_days: overdueDays,
            priority: milestone.priority
          })
        }
        
        // Check overdue tasks
        milestone.tasks?.forEach((task: any) => {
          if (task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed') {
            const dueDate = new Date(task.due_date)
            const now = new Date()
            const overdueDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
            
            overdue.push({
              id: task.id,
              title: task.title,
              type: 'task',
              due_date: task.due_date,
              overdue_days: overdueDays,
              priority: task.priority
            })
          }
        })
      })
      
      // Sort by overdue days (most overdue first)
      overdue.sort((a, b) => b.overdue_days - a.overdue_days)
      
      setOverdueItems(overdue)
    } catch (error) {
      console.error('Error loading overdue items:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateOverdueStatus = async () => {
    try {
      // Update overdue status - this would be handled by database triggers in the new system
      console.log('Overdue status update handled by database triggers')
    } catch (error) {
      console.error('Error updating overdue status:', error)
    }
  }

  const handleRefresh = () => {
    loadOverdueItems()
    updateOverdueStatus()
    setLastChecked(new Date())
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Overdue Items Alert */}
      {overdueItems.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <h3 className="text-sm font-medium text-red-900">
                {overdueItems.length} Overdue Item{overdueItems.length !== 1 ? 's' : ''}
              </h3>
            </div>
            <button
              onClick={handleRefresh}
              className="p-1 text-red-600 hover:text-red-700"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
          
          <div className="space-y-2">
            {overdueItems.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center justify-between bg-white p-2 rounded border">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    item.type === 'milestone' ? 'bg-blue-500' : 'bg-green-500'
                  }`}></div>
                  <span className="text-sm font-medium text-gray-900">{item.title}</span>
                  <span className="text-xs text-gray-500">
                    ({item.type === 'milestone' ? 'Milestone' : 'Task'})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    item.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                    item.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                    item.priority === 'normal' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {item.priority}
                  </span>
                  <span className="text-xs text-red-600 font-medium">
                    {item.overdue_days} day{item.overdue_days !== 1 ? 's' : ''} overdue
                  </span>
                </div>
              </div>
            ))}
            
            {overdueItems.length > 5 && (
              <div className="text-xs text-red-600 text-center">
                +{overdueItems.length - 5} more overdue items
              </div>
            )}
          </div>
        </div>
      )}

      {/* Progress Notifications */}
      <ProgressNotifications bookingId={bookingId} userRole={userRole} />

      {/* Weekly Summary */}
      <WeeklySummary bookingId={bookingId} userRole={userRole} />
    </div>
  )
}

// Progress Notifications Component
function ProgressNotifications({ bookingId, userRole }: { bookingId: string, userRole: 'provider' | 'client' }) {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadNotifications()
  }, [bookingId])

  const loadNotifications = async () => {
    try {
      setLoading(true)
      // This would integrate with the notifications system
      // For now, we'll create some mock notifications based on progress
      const supabase = await getSupabaseClient()
      const { data: milestones, error } = await supabase
        .from('milestones')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true })
      
      if (error) throw error
      
      const mockNotifications: any[] = []
      
      // Check for completed milestones
      const completedMilestones = milestones.filter(m => m.status === 'completed')
      completedMilestones.forEach(milestone => {
        mockNotifications.push({
          id: `milestone-${milestone.id}`,
          type: 'milestone_completed',
          title: 'Milestone Completed',
          message: `"${milestone.title}" has been completed`,
          timestamp: milestone.completed_at || milestone.updated_at,
          priority: 'success'
        })
      })
      
      // Check for tasks pending approval
      const pendingApprovalTasks = milestones.flatMap((m: any) =>
        (m.tasks || []).filter((t: any) => t.approval_status === 'pending' && t.status === 'completed')
      )
      pendingApprovalTasks.forEach((task: any) => {
        mockNotifications.push({
          id: `task-${task.id}`,
          type: 'task_pending_approval',
          title: 'Task Pending Approval',
          message: `"${task.title}" is ready for your approval`,
          timestamp: task.updated_at,
          priority: 'warning'
        })
      })
      
      setNotifications(mockNotifications)
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (notifications.length === 0) {
    return null
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Bell className="h-4 w-4 text-blue-600" />
        <h3 className="text-sm font-medium text-gray-900">Recent Activity</h3>
      </div>
      
      <div className="space-y-2">
        {notifications.slice(0, 3).map((notification) => (
          <div key={notification.id} className="flex items-start gap-3 p-2 bg-gray-50 rounded">
            <div className={`w-2 h-2 rounded-full mt-2 ${
              notification.priority === 'success' ? 'bg-green-500' :
              notification.priority === 'warning' ? 'bg-yellow-500' :
              'bg-blue-500'
            }`}></div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">{notification.title}</div>
              <div className="text-xs text-gray-600">{notification.message}</div>
              <div className="text-xs text-gray-500 mt-1">
                {new Date(notification.timestamp).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Weekly Summary Component
function WeeklySummary({ bookingId, userRole }: { bookingId: string, userRole: 'provider' | 'client' }) {
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWeeklySummary()
  }, [bookingId])

  const loadWeeklySummary = async () => {
    try {
      setLoading(true)
      const supabase = await getSupabaseClient()
      const { data: milestones, error } = await supabase
        .from('milestones')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true })
      
      if (error) throw error
      
      // Calculate weekly summary
      const now = new Date()
      const weekStart = new Date(now.getTime() - (now.getDay() * 24 * 60 * 60 * 1000))
      const weekEnd = new Date(weekStart.getTime() + (7 * 24 * 60 * 60 * 1000))
      
      const weeklyTasks = milestones.flatMap((m: any) =>
        (m.tasks || []).filter((t: any) => {
          const taskDate = new Date(t.updated_at)
          return taskDate >= weekStart && taskDate <= weekEnd
        })
      )
      
      const completedThisWeek = weeklyTasks.filter((t: any) => t.status === 'completed').length
      const totalTasks = milestones.reduce((sum: number, m: any) => sum + (m.tasks?.length || 0), 0)
      const totalHours = milestones.reduce((sum: number, m: any) =>
        sum + (m.tasks?.reduce((taskSum: number, t: any) => taskSum + (t.actual_hours || 0), 0) || 0), 0
      )
      
      setSummary({
        completedThisWeek,
        totalTasks,
        totalHours,
        weekStart: weekStart.toLocaleDateString(),
        weekEnd: weekEnd.toLocaleDateString()
      })
    } catch (error) {
      console.error('Error loading weekly summary:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (!summary) return null

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="h-4 w-4 text-green-600" />
        <h3 className="text-sm font-medium text-gray-900">This Week's Progress</h3>
      </div>
      
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-lg font-bold text-green-600">{summary.completedThisWeek}</div>
          <div className="text-xs text-gray-600">Tasks Completed</div>
        </div>
        <div>
          <div className="text-lg font-bold text-blue-600">{summary.totalTasks}</div>
          <div className="text-xs text-gray-600">Total Tasks</div>
        </div>
        <div>
          <div className="text-lg font-bold text-purple-600">{summary.totalHours.toFixed(1)}h</div>
          <div className="text-xs text-gray-600">Hours Logged</div>
        </div>
      </div>
      
      <div className="mt-3 text-xs text-gray-500 text-center">
        Week of {summary.weekStart} - {summary.weekEnd}
      </div>
    </div>
  )
}

// Overdue Badge Component
export function OverdueBadge({ item, type }: { item: { due_date?: string, status: string }, type: 'milestone' | 'task' }) {
  if (!item.due_date) {
    return null
  }

  // Use a unique variable name to avoid redeclaration
  const dueDate = new Date(item.due_date)
  const nowOverdueBadge = new Date()
  const isOverdue = dueDate < nowOverdueBadge && item.status !== 'completed'
  if (!isOverdue) {
    return null
  }
  const now = new Date()
  const overdueDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
      <AlertTriangle className="h-3 w-3" />
      {overdueDays} day{overdueDays !== 1 ? 's' : ''} overdue
    </span>
  )
}

// Progress Indicator Component
export function ProgressIndicator({ 
  current, 
  total, 
  showPercentage = true 
}: { 
  current: number
  total: number
  showPercentage?: boolean 
}) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">Progress</span>
        {showPercentage && (
          <span className="text-gray-900 font-medium">{percentage}%</span>
        )}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <div className="text-xs text-gray-500 text-center">
        {current} of {total} completed
      </div>
    </div>
  )
}
