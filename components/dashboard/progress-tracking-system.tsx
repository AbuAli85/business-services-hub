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
import { ClientTimelineView } from './client-timeline-view'
import { useProgressUpdates } from '@/hooks/use-progress-updates'
import { getSupabaseClient } from '@/lib/supabase'
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
  const [activeView, setActiveView] = useState<ViewType>(userRole === 'client' ? 'timeline' : 'overview')
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [bookingProgress, setBookingProgress] = useState<BookingProgress | null>(null)
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // No transformation needed - SimpleMilestones now uses standardized interfaces

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

      // Loading progress data silently

      // Create 4 standard phases instead of loading all milestones
      let milestonesData: Milestone[] = []
      try {
        // Create the 4 standard phases - ready to start
        const now = new Date()
        const standardPhases = [
          {
            id: '550e8400-e29b-41d4-a716-446655440001',
            title: 'Planning & Setup',
            description: 'Initial planning, requirements gathering, and project setup. Define project scope, gather requirements, and create detailed project plan.',
            status: 'pending' as const,
            booking_id: bookingId,
            priority: 'high' as const,
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
            due_date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            progress_percentage: 0,
            is_overdue: false,
            estimated_hours: 20,
            actual_hours: 0,
            tags: ['planning', 'requirements', 'setup'],
            notes: 'Ready to begin - Phase 1 of 4',
            order_index: 1,
            editable: true,
            weight: 1,
            tasks: [
              {
                id: `task-${Date.now()}-1`,
                milestone_id: '550e8400-e29b-41d4-a716-446655440001',
                title: 'Project Requirements Gathering',
                description: 'Collect and document all project requirements from stakeholders',
                status: 'pending' as const,
                priority: 'high' as const,
                due_date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
                progress_percentage: 0,
                estimated_hours: 8,
                actual_hours: 0,
                tags: ['requirements', 'stakeholders'],
                steps: [
                  { title: 'Schedule stakeholder meetings', completed: false, due_date: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString() },
                  { title: 'Document functional requirements', completed: false, due_date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString() },
                  { title: 'Document technical requirements', completed: false, due_date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString() }
                ],
                completed_at: undefined,
                created_at: now.toISOString(),
                updated_at: now.toISOString(),
                created_by: undefined,
                assigned_to: undefined,
                is_overdue: false,
                overdue_since: undefined,
                approval_status: 'pending' as const,
                approved_by: undefined,
                approved_at: undefined,
                approval_notes: undefined
              },
              {
                id: `task-${Date.now()}-2`,
                milestone_id: '550e8400-e29b-41d4-a716-446655440001',
                title: 'Project Planning & Timeline',
                description: 'Create detailed project plan with timeline and milestones',
                status: 'pending' as const,
                priority: 'high' as const,
                due_date: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
                progress_percentage: 0,
                estimated_hours: 12,
                actual_hours: 0,
                tags: ['planning', 'timeline'],
                steps: [
                  { title: 'Create project timeline', completed: false, due_date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString() },
                  { title: 'Define resource allocation', completed: false, due_date: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString() },
                  { title: 'Set up project tracking tools', completed: false, due_date: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString() }
                ],
                completed_at: undefined,
                created_at: now.toISOString(),
                updated_at: now.toISOString(),
                created_by: undefined,
                assigned_to: undefined,
                is_overdue: false,
                overdue_since: undefined,
                approval_status: 'pending' as const,
                approved_by: undefined,
                approved_at: undefined,
                approval_notes: undefined
              }
            ]
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440002',
            title: 'Development',
            description: 'Core development and implementation phase. Build the main features and functionality according to specifications.',
            status: 'pending' as const,
            booking_id: bookingId,
            priority: 'high' as const,
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
            due_date: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString(),
            progress_percentage: 0,
            is_overdue: false,
            estimated_hours: 60,
            actual_hours: 0,
            tags: ['development', 'implementation', 'coding'],
            notes: 'Ready to begin after Planning & Setup completion',
            order_index: 2,
            editable: true,
            weight: 1,
            tasks: [
              {
                id: `task-${Date.now()}-3`,
                milestone_id: '550e8400-e29b-41d4-a716-446655440002',
                title: 'Core Feature Development',
                description: 'Develop the main features and functionality',
                status: 'pending' as const,
                priority: 'high' as const,
                due_date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                progress_percentage: 0,
                estimated_hours: 40,
                actual_hours: 0,
                tags: ['development', 'features'],
                steps: [
                  { title: 'Set up development environment', completed: false, due_date: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000).toISOString() },
                  { title: 'Implement core features', completed: false, due_date: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000).toISOString() },
                  { title: 'Integrate components', completed: false, due_date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString() }
                ],
                completed_at: undefined,
                created_at: now.toISOString(),
                updated_at: now.toISOString(),
                created_by: undefined,
                assigned_to: undefined,
                is_overdue: false,
                overdue_since: undefined,
                approval_status: 'pending' as const,
                approved_by: undefined,
                approved_at: undefined,
                approval_notes: undefined
              },
              {
                id: `task-${Date.now()}-4`,
                milestone_id: '550e8400-e29b-41d4-a716-446655440002',
                title: 'Database & Backend Setup',
                description: 'Set up database schema and backend services',
                status: 'pending' as const,
                priority: 'medium' as const,
                due_date: new Date(now.getTime() + 18 * 24 * 60 * 60 * 1000).toISOString(),
                progress_percentage: 0,
                estimated_hours: 20,
                actual_hours: 0,
                tags: ['database', 'backend'],
                steps: [
                  { title: 'Design database schema', completed: false, due_date: new Date(now.getTime() + 9 * 24 * 60 * 60 * 1000).toISOString() },
                  { title: 'Implement backend APIs', completed: false, due_date: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString() },
                  { title: 'Set up authentication', completed: false, due_date: new Date(now.getTime() + 18 * 24 * 60 * 60 * 1000).toISOString() }
                ],
                completed_at: undefined,
                created_at: now.toISOString(),
                updated_at: now.toISOString(),
                created_by: undefined,
                assigned_to: undefined,
                is_overdue: false,
                overdue_since: undefined,
                approval_status: 'pending' as const,
                approved_by: undefined,
                approved_at: undefined,
                approval_notes: undefined
              }
            ]
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440003',
            title: 'Testing & Quality',
            description: 'Comprehensive testing, quality assurance, and bug fixes. Ensure the product meets all requirements and standards.',
            status: 'pending' as const,
            booking_id: bookingId,
            priority: 'high' as const,
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
            due_date: new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000).toISOString(),
            progress_percentage: 0,
            is_overdue: false,
            estimated_hours: 30,
            actual_hours: 0,
            tags: ['testing', 'quality', 'qa'],
            notes: 'Ready to begin after Development completion',
            order_index: 3,
            editable: true,
            weight: 1,
            tasks: [
              {
                id: `task-${Date.now()}-5`,
                milestone_id: '550e8400-e29b-41d4-a716-446655440003',
                title: 'Unit & Integration Testing',
                description: 'Perform comprehensive unit and integration testing',
                status: 'pending' as const,
                priority: 'high' as const,
                due_date: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000).toISOString(),
                progress_percentage: 0,
                estimated_hours: 20,
                actual_hours: 0,
                tags: ['testing', 'unit', 'integration'],
                steps: [
                  { title: 'Write unit tests', completed: false, due_date: new Date(now.getTime() + 22 * 24 * 60 * 60 * 1000).toISOString() },
                  { title: 'Perform integration testing', completed: false, due_date: new Date(now.getTime() + 24 * 24 * 60 * 60 * 1000).toISOString() },
                  { title: 'Fix identified bugs', completed: false, due_date: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000).toISOString() }
                ],
                completed_at: undefined,
                created_at: now.toISOString(),
                updated_at: now.toISOString(),
                created_by: undefined,
                assigned_to: undefined,
                is_overdue: false,
                overdue_since: undefined,
                approval_status: 'pending' as const,
                approved_by: undefined,
                approved_at: undefined,
                approval_notes: undefined
              },
              {
                id: `task-${Date.now()}-6`,
                milestone_id: '550e8400-e29b-41d4-a716-446655440003',
                title: 'User Acceptance Testing',
                description: 'Conduct user acceptance testing with stakeholders',
                status: 'pending' as const,
                priority: 'medium' as const,
                due_date: new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000).toISOString(),
                progress_percentage: 0,
                estimated_hours: 10,
                actual_hours: 0,
                tags: ['testing', 'uat', 'stakeholders'],
                steps: [
                  { title: 'Prepare test scenarios', completed: false, due_date: new Date(now.getTime() + 26 * 24 * 60 * 60 * 1000).toISOString() },
                  { title: 'Conduct UAT sessions', completed: false, due_date: new Date(now.getTime() + 27 * 24 * 60 * 60 * 1000).toISOString() },
                  { title: 'Document feedback and fixes', completed: false, due_date: new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000).toISOString() }
                ],
                completed_at: undefined,
                created_at: now.toISOString(),
                updated_at: now.toISOString(),
                created_by: undefined,
                assigned_to: undefined,
                is_overdue: false,
                overdue_since: undefined,
                approval_status: 'pending' as const,
                approved_by: undefined,
                approved_at: undefined,
                approval_notes: undefined
              }
            ]
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440004',
            title: 'Delivery & Launch',
            description: 'Final delivery, deployment, and project launch. Deploy to production and ensure smooth launch.',
            status: 'pending' as const,
            booking_id: bookingId,
            priority: 'high' as const,
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
            due_date: new Date(now.getTime() + 35 * 24 * 60 * 60 * 1000).toISOString(),
            progress_percentage: 0,
            is_overdue: false,
            estimated_hours: 15,
            actual_hours: 0,
            tags: ['delivery', 'deployment', 'launch'],
            notes: 'Ready to begin after Testing & Quality completion',
            order_index: 4,
            editable: true,
            weight: 1,
            tasks: [
              {
                id: `task-${Date.now()}-7`,
                milestone_id: '550e8400-e29b-41d4-a716-446655440004',
                title: 'Production Deployment',
                description: 'Deploy the application to production environment',
                status: 'pending' as const,
                priority: 'high' as const,
                due_date: new Date(now.getTime() + 32 * 24 * 60 * 60 * 1000).toISOString(),
                progress_percentage: 0,
                estimated_hours: 8,
                actual_hours: 0,
                tags: ['deployment', 'production'],
                steps: [
                  { title: 'Prepare production environment', completed: false, due_date: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString() },
                  { title: 'Deploy application', completed: false, due_date: new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000).toISOString() },
                  { title: 'Verify deployment', completed: false, due_date: new Date(now.getTime() + 32 * 24 * 60 * 60 * 1000).toISOString() }
                ],
                completed_at: undefined,
                created_at: now.toISOString(),
                updated_at: now.toISOString(),
                created_by: undefined,
                assigned_to: undefined,
                is_overdue: false,
                overdue_since: undefined,
                approval_status: 'pending' as const,
                approved_by: undefined,
                approved_at: undefined,
                approval_notes: undefined
              },
              {
                id: `task-${Date.now()}-8`,
                milestone_id: '550e8400-e29b-41d4-a716-446655440004',
                title: 'Launch & Documentation',
                description: 'Launch the project and provide final documentation',
                status: 'pending' as const,
                priority: 'medium' as const,
                due_date: new Date(now.getTime() + 35 * 24 * 60 * 60 * 1000).toISOString(),
                progress_percentage: 0,
                estimated_hours: 7,
                actual_hours: 0,
                tags: ['launch', 'documentation'],
                steps: [
                  { title: 'Create user documentation', completed: false, due_date: new Date(now.getTime() + 33 * 24 * 60 * 60 * 1000).toISOString() },
                  { title: 'Train end users', completed: false, due_date: new Date(now.getTime() + 34 * 24 * 60 * 60 * 1000).toISOString() },
                  { title: 'Project handover', completed: false, due_date: new Date(now.getTime() + 35 * 24 * 60 * 60 * 1000).toISOString() }
                ],
                completed_at: undefined,
                created_at: now.toISOString(),
                updated_at: now.toISOString(),
                created_by: undefined,
                assigned_to: undefined,
                is_overdue: false,
                overdue_since: undefined,
                approval_status: 'pending' as const,
                approved_by: undefined,
                approved_at: undefined,
                approval_notes: undefined
              }
            ]
          }
        ]

        // Try to load existing milestones and update the standard phases
      try {
        const rawMilestones = await ProgressTrackingService.getMilestones(bookingId)
        
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
          // Using standard phases as fallback
          milestonesData = standardPhases
        }
        
        // Milestones loaded successfully
      } catch (error) {
        // Error creating standard phases, using empty array
        milestonesData = []
      }

      // Try to load booking progress, but don't fail if it doesn't exist
      let progressData = null
      try {
        progressData = await ProgressTrackingService.getBookingProgress(bookingId)
        // Booking progress loaded
      } catch (progressError) {
        // Using fallback progress data
        // Create a fallback progress object based on 4 phases
        const completedMilestones = milestonesData.filter(m => m.status === 'completed').length
        const completedTasks = milestonesData.reduce((sum, m) => 
          sum + (m.tasks?.filter(t => t.status === 'completed').length || 0), 0
        )
        const totalTasks = milestonesData.reduce((sum, m) => sum + (m.tasks?.length || 0), 0)
        const totalEstimatedHours = milestonesData.reduce((sum, m) => sum + (m.estimated_hours || 0), 0)
        const totalActualHours = milestonesData.reduce((sum, m) => sum + (m.actual_hours || 0), 0)
        const overallProgress = Math.round((completedMilestones / 4) * 100) // Always calculate based on 4 phases
        
        progressData = {
          booking_id: bookingId,
          booking_title: 'Project Progress',
          booking_status: 'pending', // Default to pending for new bookings
          booking_progress: overallProgress,
          completed_milestones: completedMilestones,
          total_milestones: 4, // Always 4 phases
          completed_tasks: completedTasks,
          total_tasks: totalTasks,
          total_estimated_hours: totalEstimatedHours,
          total_actual_hours: totalActualHours,
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
        // Time entries loaded
      } catch (timeError) {
        // Time entries not available
        timeEntriesData = []
      }

      // Update progress data with real calculations for 4 phases
      if (milestonesData.length > 0) {
        const completedMilestones = milestonesData.filter(m => m.status === 'completed').length
        const completedTasks = milestonesData.reduce((sum, m) => 
          sum + (m.tasks?.filter(t => t.status === 'completed').length || 0), 0
        )
        const totalTasks = milestonesData.reduce((sum, m) => sum + (m.tasks?.length || 0), 0)
        const totalEstimatedHours = milestonesData.reduce((sum, m) => sum + (m.estimated_hours || 0), 0)
        const totalActualHours = milestonesData.reduce((sum, m) => sum + (m.actual_hours || 0), 0)
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
          booking_status: progressData?.booking_status || (overallProgress === 100 ? 'completed' : 'pending'),
          total_estimated_hours: totalEstimatedHours,
          total_actual_hours: totalActualHours,
          overdue_tasks: progressData?.overdue_tasks || 0,
          created_at: progressData?.created_at || new Date().toISOString(),
          updated_at: progressData?.updated_at || new Date().toISOString()
        }
      }

      setMilestones(milestonesData)
      setBookingProgress(progressData)
      setTimeEntries(timeEntriesData)
    } catch (err) {
      // Error loading progress data
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

  // Set up real-time updates every 2 minutes (less frequent)
  useEffect(() => {
    const interval = setInterval(() => {
      loadData()
    }, 120000) // Refresh every 2 minutes

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
      toast.error('Failed to create task')
    }
  }, [loadData, milestones])

  const handleTaskDelete = useCallback(async (taskId: string) => {
    try {
      await ProgressTrackingService.deleteTask(taskId)
      await loadData() // Refresh data
      toast.success('Task deleted successfully')
    } catch (err) {
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
      toast.error('Failed to update milestone')
    }
  }, [loadData, milestones])

  const handleCommentAdd = useCallback(async (milestoneId: string, comment: any) => {
    try {
      // Save comment to database
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('milestone_comments')
        .insert({
          milestone_id: milestoneId,
          content: typeof comment === 'string' ? comment : comment.content,
          author_id: user.id,
          created_at: new Date().toISOString()
        })

      if (error) throw error

      toast.success('Comment added successfully')
      await loadData()
    } catch (error) {
      console.error('Error adding comment:', error)
      toast.error('Failed to add comment')
    }
  }, [loadData])

  const handleActionRequest = useCallback(async (milestoneId: string, request: any) => {
    try {
      // Create action request in the database
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('action_requests')
        .insert({
          booking_id: bookingId,
          milestone_id: milestoneId,
          type: request.type,
          title: request.title,
          description: request.description,
          priority: request.priority,
          status: 'pending',
          requested_by: user.id,
          created_at: new Date().toISOString()
        })

      if (error) throw error

      toast.success('Action request submitted successfully')
      await loadData()
    } catch (error) {
      console.error('Error submitting action request:', error)
      toast.error('Failed to submit action request')
    }
  }, [bookingId, loadData])

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
            <h2 className="text-2xl font-bold text-gray-900">
              {userRole === 'client' ? 'Project Timeline' : 'Progress Tracking'}
            </h2>
            <p className="text-gray-600">
              {userRole === 'client' ? 'Review project progress and provide feedback' : 'Monitor and manage project progress'}
            </p>
          </div>
          {userRole !== 'client' && (
            <Button 
              onClick={refreshData} 
              disabled={refreshing}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
        </div>



      <div className={`grid grid-cols-1 gap-6 ${userRole === 'client' ? 'lg:grid-cols-1' : 'lg:grid-cols-4'}`}>
        {/* Main Content */}
        <div className={userRole === 'client' ? 'lg:col-span-1' : 'lg:col-span-3'}>
          <Tabs value={activeView} onValueChange={(value) => setActiveView(value as ViewType)}>
            <TabsList className={`grid w-full ${userRole === 'client' ? 'grid-cols-1' : 'grid-cols-3'}`}>
              {userRole !== 'client' && (
                <TabsTrigger value="overview" className="flex items-center space-x-2">
                  <Target className="h-4 w-4" />
                  <span>Overview</span>
                </TabsTrigger>
              )}
              <TabsTrigger value="timeline" className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>Timeline</span>
              </TabsTrigger>
              {userRole !== 'client' && (
                <TabsTrigger value="analytics" className="flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4" />
                  <span>Analytics</span>
                </TabsTrigger>
              )}
            </TabsList>

            {userRole !== 'client' && (
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
                  milestones={milestones || []}
                  userRole={userRole}
                  onTaskUpdate={userRole === 'provider' ? (taskId: string, updates: any) => {
                    // Find the milestone containing this task
                    const milestone = milestones.find(m => m.tasks?.some(t => t.id === taskId))
                    if (milestone) {
                      handleTaskUpdate(taskId, updates)
                    }
                  } : () => {}}
                  onTaskAdd={userRole === 'provider' ? (milestoneId: string, taskData: any) => {
                    handleTaskCreate(milestoneId, {
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
                  } : () => {}}
                  onTaskDelete={userRole === 'provider' ? (milestoneId: string, taskId: string) => {
                    handleTaskDelete(taskId)
                  } : () => {}}
                  onMilestoneUpdate={userRole === 'provider' ? (milestoneId: string, updates: any) => {
                    handleMilestoneUpdate(milestoneId, {
                      title: updates.title,
                      description: updates.description,
                      status: updates.status,
                      due_date: updates.endDate,
                      progress_percentage: updates.progress_percentage || 0
                    })
                  } : () => {}}
                  onCommentAdd={handleCommentAdd}
                  onProjectTypeChange={userRole === 'provider' ? handleProjectTypeChange : () => {}}
                />
              </TabsContent>
            )}


            <TabsContent value="timeline" className="space-y-6">
              {userRole === 'client' ? (
                <ClientTimelineView
                  bookingId={bookingId}
                  milestones={milestones || []}
                  comments={[]} // TODO: Load comments from database
                  actionRequests={[]} // TODO: Load action requests from database
                  onCommentAdd={handleCommentAdd}
                  onActionRequest={handleActionRequest}
                />
              ) : (
                <SimpleTimeline
                  milestones={milestones || []}
                  userRole={userRole}
                />
              )}
            </TabsContent>

            {userRole !== 'client' && (
              <TabsContent value="analytics" className="space-y-6">
                <AnalyticsView
                  milestones={milestones || []}
                  timeEntries={timeEntries || []}
                  totalEstimatedHours={totalEstimatedHours || 0}
                  totalActualHours={totalActualHours || 0}
                />
              </TabsContent>
            )}

          </Tabs>
        </div>

        {/* Smart Suggestions Sidebar - Only for providers */}
        {userRole !== 'client' && (
          <div className="lg:col-span-1">
            <SmartSuggestionsSidebar
              milestones={milestones || []}
              bookingProgress={bookingProgress}
              timeEntries={timeEntries || []}
              userRole={userRole}
              onRefresh={refreshData}
            />
          </div>
        )}
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
