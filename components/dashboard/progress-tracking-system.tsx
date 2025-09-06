'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  BarChart3, 
  Calendar, 
  Clock, 
  Target, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Play,
  Pause,
  RefreshCw
} from 'lucide-react'
import { ProgressTrackingService, Milestone, Task, BookingProgress, TimeEntry } from '@/lib/progress-tracking'
import { MainProgressHeader } from './main-progress-header'
import { SmartSuggestionsSidebar } from './smart-suggestions-sidebar'
import { SimpleMilestones } from './simple-milestones'
import { SimpleTimeline } from './simple-timeline'
import { TimelineView } from './timeline-view'
import { AnalyticsView } from './analytics-view'
import { useProgressUpdates } from '@/hooks/use-progress-updates'
import toast from 'react-hot-toast'

interface ProgressTrackingSystemProps {
  bookingId: string
  userRole: 'provider' | 'client'
  className?: string
}

type ViewType = 'overview' | 'monthly' | 'timeline' | 'analytics' | 'bulk'

export function ProgressTrackingSystem({ 
  bookingId, 
  userRole, 
  className = "" 
}: ProgressTrackingSystemProps) {
  const [activeView, setActiveView] = useState<ViewType>('overview')
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [bookingProgress, setBookingProgress] = useState<BookingProgress | null>(null)
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Transform milestones to simple format - Always exactly 4 phases
  const transformToSimpleMilestones = (milestones: Milestone[]) => {
    const standardPhases = [
      { 
        id: '550e8400-e29b-41d4-a716-446655440001', // Planning & Setup UUID
        title: 'Planning & Setup', 
        phaseNumber: 1, 
        color: '#3B82F6' 
      },
      { 
        id: '550e8400-e29b-41d4-a716-446655440002', // Development UUID
        title: 'Development', 
        phaseNumber: 2, 
        color: '#10B981' 
      },
      { 
        id: '550e8400-e29b-41d4-a716-446655440003', // Testing & Quality UUID
        title: 'Testing & Quality', 
        phaseNumber: 3, 
        color: '#F59E0B' 
      },
      { 
        id: '550e8400-e29b-41d4-a716-446655440004', // Delivery & Launch UUID
        title: 'Delivery & Launch', 
        phaseNumber: 4, 
        color: '#8B5CF6' 
      }
    ]

    // If we have real milestones, use them; otherwise create placeholders
    if (milestones.length > 0) {
      return milestones.map((milestone, index) => {
        const phase = standardPhases[index] || standardPhases[0]
        return {
          id: milestone.id,
          title: milestone.title,
          description: milestone.description || `${milestone.title} phase`,
          purpose: milestone.description || `Complete ${milestone.title} phase`,
          mainGoal: `Complete ${milestone.title} phase`,
          startDate: milestone.created_at || new Date().toISOString(),
          endDate: milestone.due_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: (milestone.status as 'pending' | 'in_progress' | 'completed') || 'pending',
          color: phase.color,
          phaseNumber: (index + 1) as 1 | 2 | 3 | 4,
          estimatedHours: 0,
          actualHours: 0,
          clientComments: [],
          isRecurring: false,
          projectType: 'one_time' as const,
          tasks: (milestone.tasks || []).map(task => ({
            id: task.id,
            title: task.title,
            description: task.description || '',
            completed: task.status === 'completed',
            dueDate: task.due_date,
            isRecurring: false,
            recurringType: 'monthly' as const,
            priority: 'medium' as const,
            estimatedHours: 1,
            actualHours: task.actual_hours || 0
          }))
        }
      })
    }

    // Create 4 standard phases if no real data exists
    return standardPhases.map((phase, index) => {
      return {
        id: phase.id,
        title: phase.title,
        description: `${phase.title} phase`,
        purpose: `Complete ${phase.title} phase`,
        mainGoal: `Complete ${phase.title} phase`,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending' as const,
        color: phase.color,
        phaseNumber: phase.phaseNumber as 1 | 2 | 3 | 4,
        estimatedHours: 0,
        actualHours: 0,
        clientComments: [],
        isRecurring: false,
        projectType: 'one_time' as const,
        tasks: []
      }
    })
  }

  const { 
    isUpdating, 
    updateTaskProgress, 
    updateMilestoneProgress, 
    addTask, 
    deleteTask 
  } = useProgressUpdates({
    bookingId,
    onProgressUpdate: (updates) => {
      // Update local state when progress changes
      setMilestones(prev => prev.map(m => 
        m.id === updates.milestoneId 
          ? { ...m, progress_percentage: updates.milestoneProgress }
          : m
      ))
      setBookingProgress(prev => prev ? {
        ...prev,
        booking_progress: updates.overallProgress
      } : null)
    }
  })

  // Load all data
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('Loading progress data for booking:', bookingId)

      // Create 4 standard phases instead of loading all milestones
      let milestonesData: Milestone[] = []
      try {
        // Create the 4 standard phases
        const standardPhases = [
          {
            id: '550e8400-e29b-41d4-a716-446655440001',
            title: 'Planning & Setup',
            description: 'Initial planning, requirements gathering, and project setup',
            status: 'pending' as const,
            booking_id: bookingId,
            priority: 'medium' as const,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            progress_percentage: 0,
            is_overdue: false,
            estimated_hours: 0,
            actual_hours: 0,
            tags: [],
            notes: '',
            order_index: 1,
            editable: true,
            weight: 1,
            tasks: []
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440002',
            title: 'Development',
            description: 'Core development and implementation phase',
            status: 'pending' as const,
            booking_id: bookingId,
            priority: 'medium' as const,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            progress_percentage: 0,
            is_overdue: false,
            estimated_hours: 0,
            actual_hours: 0,
            tags: [],
            notes: '',
            order_index: 2,
            editable: true,
            weight: 1,
            tasks: []
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440003',
            title: 'Testing & Quality',
            description: 'Testing, quality assurance, and bug fixes',
            status: 'pending' as const,
            booking_id: bookingId,
            priority: 'medium' as const,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            due_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
            progress_percentage: 0,
            is_overdue: false,
            estimated_hours: 0,
            actual_hours: 0,
            tags: [],
            notes: '',
            order_index: 3,
            editable: true,
            weight: 1,
            tasks: []
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440004',
            title: 'Delivery & Launch',
            description: 'Final delivery, deployment, and project launch',
            status: 'pending' as const,
            booking_id: bookingId,
            priority: 'medium' as const,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            due_date: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
            progress_percentage: 0,
            is_overdue: false,
            estimated_hours: 0,
            actual_hours: 0,
            tags: [],
            notes: '',
            order_index: 4,
            editable: true,
            weight: 1,
            tasks: []
          }
        ]

        // Try to load existing milestones and update the standard phases
      try {
        const rawMilestones = await ProgressTrackingService.getMilestones(bookingId)
        console.log('Raw milestones from service:', rawMilestones)
        
          // Update standard phases with existing data if available
          milestonesData = standardPhases.map(phase => {
            const existingMilestone = rawMilestones?.find(m => m.title === phase.title)
            if (existingMilestone) {
              return {
                ...phase,
                ...existingMilestone,
                booking_id: bookingId,
                priority: existingMilestone.priority || 'medium',
                created_at: existingMilestone.created_at || phase.created_at,
                updated_at: existingMilestone.updated_at || phase.updated_at,
                is_overdue: existingMilestone.is_overdue || false,
                estimated_hours: existingMilestone.estimated_hours || 0,
                actual_hours: existingMilestone.actual_hours || 0,
                tags: existingMilestone.tags || [],
                notes: existingMilestone.notes || '',
                assigned_to: existingMilestone.assigned_to || undefined,
                created_by: existingMilestone.created_by || undefined,
                completed_at: existingMilestone.completed_at || undefined,
                overdue_since: existingMilestone.overdue_since || undefined,
                order_index: existingMilestone.order_index || phase.order_index,
                editable: existingMilestone.editable !== undefined ? existingMilestone.editable : true,
                tasks: (existingMilestone.tasks || []).map(task => ({
                  ...task,
                  milestone_id: phase.id,
                  title: task.title,
                  description: task.description || '',
                  status: task.status || 'pending',
                  priority: task.priority || 'medium',
                  due_date: task.due_date,
                  progress_percentage: task.progress_percentage || 0,
                  estimated_hours: task.estimated_hours || 1,
                  actual_hours: task.actual_hours || 0,
                  tags: task.tags || [],
                  steps: task.steps || [],
                  completed_at: task.completed_at || undefined,
                  created_at: task.created_at || new Date().toISOString(),
                  updated_at: task.updated_at || new Date().toISOString(),
                  created_by: task.created_by || undefined,
                  assigned_to: task.assigned_to || undefined,
                  is_overdue: task.is_overdue || false,
                  overdue_since: task.overdue_since || undefined,
                  approval_status: task.approval_status || 'pending',
                  approved_by: task.approved_by || undefined,
                  approved_at: task.approved_at || undefined,
                  approval_notes: task.approval_notes || undefined
                }))
              }
            }
            return phase
          })
      } catch (milestoneError) {
          console.warn('Could not load existing milestones, using standard phases:', milestoneError)
          milestonesData = standardPhases
        }
        
        console.log('Transformed milestones (4 phases):', milestonesData)
      } catch (error) {
        console.error('Error creating standard phases:', error)
        milestonesData = []
      }

      // Try to load booking progress, but don't fail if it doesn't exist
      let progressData = null
      try {
        progressData = await ProgressTrackingService.getBookingProgress(bookingId)
        console.log('Loaded booking progress:', progressData)
      } catch (progressError) {
        console.warn('Could not load booking progress, using fallback:', progressError)
        // Create a fallback progress object based on 4 phases
        const completedMilestones = milestonesData.filter(m => m.status === 'completed').length
        const completedTasks = milestonesData.reduce((sum, m) => 
          sum + (m.tasks?.filter(t => t.status === 'completed').length || 0), 0
        )
        const totalTasks = milestonesData.reduce((sum, m) => sum + (m.tasks?.length || 0), 0)
        const overallProgress = Math.round((completedMilestones / 4) * 100) // Always calculate based on 4 phases
        
        progressData = {
          booking_id: bookingId,
          booking_title: 'Project Progress',
          booking_status: overallProgress === 100 ? 'completed' : 'in_progress',
          booking_progress: overallProgress,
          completed_milestones: completedMilestones,
          total_milestones: 4, // Always 4 phases
          completed_tasks: completedTasks,
          total_tasks: totalTasks,
          total_estimated_hours: 0,
          total_actual_hours: 0,
          overdue_tasks: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      }

      // Try to load time entries, but don't fail if it doesn't work
      let timeEntriesData: TimeEntry[] = []
      try {
        const rawTimeEntries = await ProgressTrackingService.getTimeEntriesByBookingId(bookingId)
        console.log('Raw time entries from service:', rawTimeEntries)
        
        // Transform time entries data to ensure all required properties exist
        timeEntriesData = (rawTimeEntries || []).map(entry => ({
          ...entry,
          id: entry.id || '',
          task_id: entry.task_id || '',
          user_id: entry.user_id || '',
          description: entry.description || '',
          start_time: entry.start_time || new Date().toISOString(),
          end_time: entry.end_time || undefined,
          duration_minutes: entry.duration_minutes || 0,
          is_active: entry.is_active || false,
          created_at: entry.created_at || new Date().toISOString(),
          updated_at: entry.updated_at || new Date().toISOString()
        }))
        console.log('Transformed time entries:', timeEntriesData)
      } catch (timeError) {
        console.warn('Could not load time entries:', timeError)
        timeEntriesData = []
      }

      // Update progress data with real calculations for 4 phases
      if (milestonesData.length > 0) {
        const completedMilestones = milestonesData.filter(m => m.status === 'completed').length
        const completedTasks = milestonesData.reduce((sum, m) => 
          sum + (m.tasks?.filter(t => t.status === 'completed').length || 0), 0
        )
        const totalTasks = milestonesData.reduce((sum, m) => sum + (m.tasks?.length || 0), 0)
        const overallProgress = Math.round((completedMilestones / 4) * 100) // Always calculate based on 4 phases
        
        progressData = {
          ...progressData,
          booking_id: bookingId,
          booking_title: progressData?.booking_title || 'Project Progress',
          booking_progress: overallProgress,
          completed_milestones: completedMilestones,
          total_milestones: 4, // Always 4 phases
          completed_tasks: completedTasks,
          total_tasks: totalTasks,
          booking_status: overallProgress === 100 ? 'completed' : 'in_progress',
          total_estimated_hours: progressData?.total_estimated_hours || 0,
          total_actual_hours: progressData?.total_actual_hours || 0,
          overdue_tasks: progressData?.overdue_tasks || 0,
          created_at: progressData?.created_at || new Date().toISOString(),
          updated_at: progressData?.updated_at || new Date().toISOString()
        }
      }

      setMilestones(milestonesData)
      setBookingProgress(progressData)
      setTimeEntries(timeEntriesData)
    } catch (err) {
      console.error('Error loading progress data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load progress data')
      toast.error('Failed to load progress data')
    } finally {
      setLoading(false)
    }
  }, [bookingId])

  // Refresh data
  const refreshData = useCallback(async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
    toast.success('Data refreshed')
  }, [loadData])

  // Ensure standard milestones exist
  const ensureStandardMilestones = useCallback(async () => {
    try {
      const standardPhases = [
        { id: '550e8400-e29b-41d4-a716-446655440001', title: 'Planning & Setup' },
        { id: '550e8400-e29b-41d4-a716-446655440002', title: 'Development' },
        { id: '550e8400-e29b-41d4-a716-446655440003', title: 'Testing & Quality' },
        { id: '550e8400-e29b-41d4-a716-446655440004', title: 'Delivery & Launch' }
      ]

      for (const phase of standardPhases) {
        try {
          await ProgressTrackingService.createMilestone({
            booking_id: bookingId,
            title: phase.title,
            description: `${phase.title} phase`,
            status: 'pending',
            due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            progress_percentage: 0,
            priority: 'medium',
            weight: 1,
            order_index: 0,
            editable: true
          })
        } catch (err) {
          // Milestone might already exist, that's okay
          console.log(`Milestone ${phase.title} might already exist`)
        }
      }
    } catch (err) {
      console.error('Error ensuring standard milestones:', err)
    }
  }, [bookingId])

  // Load data on mount and when bookingId changes
  useEffect(() => {
    loadData()
  }, [loadData])

  // Set up real-time updates every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadData()
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [loadData])

  // Handle task operations
  const handleTaskUpdate = useCallback(async (taskId: string, updates: Partial<Task>) => {
    try {
      await ProgressTrackingService.updateTask(taskId, updates)
      
      // Update local state immediately for better UX
      setMilestones(prev => prev.map(milestone => ({
        ...milestone,
        tasks: milestone.tasks?.map(task => 
          task.id === taskId ? { ...task, ...updates } : task
        ) || []
      })))
      
      // Recalculate progress
      const updatedMilestones = milestones.map(milestone => ({
        ...milestone,
        tasks: milestone.tasks?.map(task => 
          task.id === taskId ? { ...task, ...updates } : task
        ) || []
      }))
      
      const completedTasks = updatedMilestones.reduce((sum, m) => 
        sum + (m.tasks?.filter(t => t.status === 'completed').length || 0), 0
      )
      const totalTasks = updatedMilestones.reduce((sum, m) => sum + (m.tasks?.length || 0), 0)
      
      setBookingProgress(prev => prev ? {
        ...prev,
        completed_tasks: completedTasks,
        total_tasks: totalTasks
      } : null)
      
      await loadData() // Refresh data to ensure consistency
      toast.success('Task updated successfully')
    } catch (err) {
      console.error('Error updating task:', err)
      toast.error('Failed to update task')
    }
  }, [loadData, milestones])

  const handleTaskCreate = useCallback(async (milestoneId: string, taskData: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'is_overdue' | 'actual_hours'>) => {
    try {
      const fullTaskData: Task = {
        ...taskData,
        milestone_id: milestoneId,
        actual_hours: 0,
        id: '', // Will be generated by the service
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_overdue: false
      }
      await ProgressTrackingService.createTask(fullTaskData)
      
      // Update local state immediately for better UX
      const newTask = { ...fullTaskData, id: `temp_${Date.now()}` } // Temporary ID for local state
      setMilestones(prev => prev.map(milestone => 
        milestone.id === milestoneId 
          ? { ...milestone, tasks: [...(milestone.tasks || []), newTask] }
          : milestone
      ))
      
      // Recalculate progress
      const updatedMilestones = milestones.map(milestone => 
        milestone.id === milestoneId 
          ? { ...milestone, tasks: [...(milestone.tasks || []), newTask] }
          : milestone
      )
      
      const completedTasks = updatedMilestones.reduce((sum, m) => 
        sum + (m.tasks?.filter(t => t.status === 'completed').length || 0), 0
      )
      const totalTasks = updatedMilestones.reduce((sum, m) => sum + (m.tasks?.length || 0), 0)
      
      setBookingProgress(prev => prev ? {
        ...prev,
        completed_tasks: completedTasks,
        total_tasks: totalTasks
      } : null)
      
      await loadData() // Refresh data to ensure consistency
      toast.success('Task created successfully')
    } catch (err) {
      console.error('Error creating task:', err)
      toast.error('Failed to create task')
    }
  }, [loadData, milestones])

  const handleTaskDelete = useCallback(async (taskId: string) => {
    try {
      await ProgressTrackingService.deleteTask(taskId)
      await loadData() // Refresh data
      toast.success('Task deleted successfully')
    } catch (err) {
      console.error('Error deleting task:', err)
      toast.error('Failed to delete task')
    }
  }, [loadData])

  // Handle milestone operations
  const handleMilestoneUpdate = useCallback(async (milestoneId: string, updates: Partial<Milestone>) => {
    try {
      await ProgressTrackingService.updateMilestone(milestoneId, updates)
      
      // Update local state immediately for better UX
      setMilestones(prev => prev.map(m => 
        m.id === milestoneId ? { ...m, ...updates } : m
      ))
      
      // Recalculate progress
      const updatedMilestones = milestones.map(m => 
        m.id === milestoneId ? { ...m, ...updates } : m
      )
      const completedMilestones = updatedMilestones.filter(m => m.status === 'completed').length
      const overallProgress = Math.round((completedMilestones / 4) * 100) // Always calculate based on 4 phases
      
      setBookingProgress(prev => prev ? {
        ...prev,
        booking_progress: overallProgress,
        completed_milestones: completedMilestones,
        booking_status: overallProgress === 100 ? 'completed' : 'in_progress'
      } : null)
      
      await loadData() // Refresh data to ensure consistency
      toast.success('Milestone updated successfully')
    } catch (err) {
      console.error('Error updating milestone:', err)
      toast.error('Failed to update milestone')
    }
  }, [loadData, milestones])

  const handleCommentAdd = useCallback(async (milestoneId: string, comment: any) => {
    try {
      // TODO: Implement comment saving to database
      console.log('Adding comment to milestone:', milestoneId, comment)
      toast.success('Comment added successfully')
    } catch (error) {
      console.error('Error adding comment:', error)
      toast.error('Failed to add comment')
    }
  }, [])

  const handleProjectTypeChange = useCallback(async (projectType: 'one_time' | 'monthly' | '3_months' | '6_months' | '9_months' | '12_months') => {
    try {
      // TODO: Implement project type saving to database
      console.log('Project type changed to:', projectType)
      
      // Update milestone dates based on project type
      if (milestones && milestones.length > 0) {
        const baseDate = new Date()
        const phaseDuration = getPhaseDuration(projectType)
        
        for (let i = 0; i < milestones.length; i++) {
          const milestone = milestones[i]
          const startDate = new Date(baseDate.getTime() + (i * phaseDuration))
          const endDate = new Date(startDate.getTime() + phaseDuration)
          
          await handleMilestoneUpdate(milestone.id, {
            due_date: endDate.toISOString()
          })
        }
      }
      
      const projectTypeLabels = {
        'one_time': 'One Time',
        'monthly': 'Monthly Recurring',
        '3_months': '3 Month',
        '6_months': '6 Month',
        '9_months': '9 Month',
        '12_months': '12 Month'
      }
      
      toast.success(`Project type set to ${projectTypeLabels[projectType]}`)
    } catch (error) {
      console.error('Error changing project type:', error)
      toast.error('Failed to change project type')
    }
  }, [milestones, handleMilestoneUpdate])

  const getPhaseDuration = (projectType: string) => {
    switch (projectType) {
      case 'one_time':
        return 7 * 24 * 60 * 60 * 1000 // 1 week per phase
      case 'monthly':
        return 7 * 24 * 60 * 60 * 1000 // 1 week per phase
      case '3_months':
        return 20 * 24 * 60 * 60 * 1000 // ~3 weeks per phase
      case '6_months':
        return 45 * 24 * 60 * 60 * 1000 // ~6 weeks per phase
      case '9_months':
        return 68 * 24 * 60 * 60 * 1000 // ~10 weeks per phase
      case '12_months':
        return 90 * 24 * 60 * 60 * 1000 // ~13 weeks per phase
      default:
        return 7 * 24 * 60 * 60 * 1000 // 1 week per phase
    }
  }

  // Handle time tracking
  const handleStartTimeTracking = useCallback(async (taskId: string, description?: string) => {
    try {
      const userId = 'current-user-id' // TODO: Get from auth context
      await ProgressTrackingService.startTimeTracking(taskId, userId, description)
      await loadData() // Refresh data
      toast.success('Time tracking started')
    } catch (err) {
      console.error('Error starting time tracking:', err)
      toast.error('Failed to start time tracking')
    }
  }, [loadData])

  const handleStopTimeTracking = useCallback(async (entryId: string) => {
    try {
      await ProgressTrackingService.stopTimeTracking(entryId)
      await loadData() // Refresh data
      toast.success('Time tracking stopped')
    } catch (err) {
      console.error('Error stopping time tracking:', err)
      toast.error('Failed to stop time tracking')
    }
  }, [loadData])

  // Calculate derived data with safety checks
  const safeMilestones = milestones || []
  const safeTimeEntries = timeEntries || []
  
  const completedMilestones = safeMilestones.filter(m => m && m.status === 'completed').length
  const totalMilestones = safeMilestones.length
  const completedTasks = safeMilestones.reduce((sum, m) => {
    if (!m || !m.tasks) return sum
    return sum + (m.tasks.filter(t => t && t.status === 'completed').length || 0)
  }, 0)
  const totalTasks = safeMilestones.reduce((sum, m) => {
    if (!m || !m.tasks) return sum
    return sum + (m.tasks.length || 0)
  }, 0)
  const totalEstimatedHours = safeMilestones.reduce((sum, m) => {
    if (!m) return sum
    return sum + (m.estimated_hours || 0)
  }, 0)
  const totalActualHours = safeTimeEntries.reduce((sum, entry) => {
    if (!entry) return sum
    return sum + (entry.duration_minutes || 0) / 60
  }, 0)
  const overdueTasks = safeMilestones.reduce((sum, m) => {
    if (!m || !m.tasks) return sum
    return sum + (m.tasks.filter(t => t && t.is_overdue).length || 0)
  }, 0)

  // Loading state
  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span>Loading progress data...</span>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Progress</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={loadData} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Add error boundary for render
  try {
    // If we have no data and not loading, show a simple fallback
    if (!loading && (!milestones || milestones.length === 0)) {
      return (
        <div className={`space-y-6 ${className}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Progress Tracking</h2>
              <p className="text-gray-600">Monitor and manage project progress</p>
            </div>
            <Button 
              onClick={refreshData} 
              disabled={refreshing}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          
          <Card>
            <CardContent className="p-8 text-center">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Progress Data</h3>
              <p className="text-gray-600 mb-4">
                No milestones or tasks have been created for this booking yet.
              </p>
              <Button onClick={refreshData} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }

    return (
      <div className={`space-y-6 ${className}`}>
        {/* Header with refresh button */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Progress Tracking</h2>
            <p className="text-gray-600">Monitor and manage project progress</p>
          </div>
            <Button 
              onClick={refreshData} 
              disabled={refreshing}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
        </div>



      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3">
          <Tabs value={activeView} onValueChange={(value) => setActiveView(value as ViewType)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview" className="flex items-center space-x-2">
                <Target className="h-4 w-4" />
                <span>Overview</span>
              </TabsTrigger>
              <TabsTrigger value="timeline" className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>Timeline</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4" />
                <span>Analytics</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Main Progress Header */}
              <MainProgressHeader
                bookingProgress={bookingProgress || {
                  booking_progress: 0,
                  booking_title: 'Project Progress',
                  booking_status: 'in_progress'
                }}
                completedMilestones={completedMilestones || 0}
                totalMilestones={totalMilestones || 0}
                completedTasks={completedTasks || 0}
                totalTasks={totalTasks || 0}
                totalEstimatedHours={totalEstimatedHours || 0}
                totalActualHours={totalActualHours || 0}
                overdueTasks={overdueTasks || 0}
              />
              
              {/* Simple Milestones Display */}
              <SimpleMilestones
                milestones={transformToSimpleMilestones(milestones || [])}
                userRole={userRole}
                onTaskUpdate={async (taskId: string, updates: any) => {
                  // Find the milestone containing this task
                  const milestone = milestones.find(m => m.tasks?.some(t => t.id === taskId))
                  if (milestone) {
                    await handleTaskUpdate(taskId, updates)
                  }
                }}
                onTaskAdd={async (milestoneId: string, taskData: any) => {
                  await handleTaskCreate(milestoneId, {
                    title: taskData.title,
                    description: taskData.description || '',
                    status: taskData.completed ? 'completed' : 'pending',
                    due_date: taskData.dueDate,
                    estimated_hours: taskData.estimatedHours || 1,
                    priority: taskData.priority || 'medium',
                    milestone_id: milestoneId,
                    steps: [],
                    approval_status: 'pending',
                    tags: [],
                    progress_percentage: taskData.completed ? 100 : 0
                  })
                }}
                onTaskDelete={async (milestoneId: string, taskId: string) => {
                  await handleTaskDelete(taskId)
                }}
                onMilestoneUpdate={async (milestoneId: string, updates: any) => {
                  await handleMilestoneUpdate(milestoneId, {
                    title: updates.title,
                    description: updates.description,
                    status: updates.status,
                    due_date: updates.endDate,
                    progress_percentage: updates.progress_percentage || 0
                  })
                }}
                onCommentAdd={handleCommentAdd}
                onProjectTypeChange={handleProjectTypeChange}
              />
            </TabsContent>


            <TabsContent value="timeline" className="space-y-6">
              <SimpleTimeline
                milestones={transformToSimpleMilestones(milestones || [])}
                userRole={userRole}
              />
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <AnalyticsView
                milestones={milestones || []}
                timeEntries={timeEntries || []}
                totalEstimatedHours={totalEstimatedHours || 0}
                totalActualHours={totalActualHours || 0}
              />
            </TabsContent>

          </Tabs>
        </div>

        {/* Smart Suggestions Sidebar */}
        <div className="lg:col-span-1">
          <SmartSuggestionsSidebar
            milestones={milestones || []}
            bookingProgress={bookingProgress}
            timeEntries={timeEntries || []}
            userRole={userRole}
            onRefresh={refreshData}
          />
        </div>
      </div>
    </div>
  )
  } catch (renderError) {
    console.error('Error rendering ProgressTrackingSystem:', renderError)
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Render Error</h3>
              <p className="text-gray-600 mb-4">An error occurred while rendering the progress tracking system.</p>
              <Button onClick={loadData} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
}
