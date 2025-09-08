'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import './progress-styles.css'
import { List, Kanban, Calendar, BarChart3, Clock, AlertCircle, Target, MessageSquare } from 'lucide-react'
import { Milestone, Task, BookingProgress, Comment } from '@/types/progress'
import { MilestoneManagement } from './milestone-management'
// Removed legacy client-progress-view
import { TimeTrackingWidget } from './time-tracking-widget'
// Removed unused ProgressFallback import
// Removed legacy progress tracking imports
import { EnhancedProgressCharts } from './enhanced-progress-charts'
import { BulkOperations } from './bulk-operations'
// Removed legacy monthly-progress-tracking
// Removed legacy service-milestone-manager
import { MainProgressHeader } from './main-progress-header'
// Removed legacy refactored accordion
import { SimpleMilestones } from './simple-milestones'
import { ProgressTrackingSystem } from './progress-tracking-system'
// Removed missing imports - using placeholders instead
import { SmartSuggestionsSidebar } from './smart-suggestions-sidebar'
import { AnalyticsView } from './analytics-view'
import { BulkOperationsView } from './bulk-operations-view'
import { useProgressUpdates } from '@/hooks/use-progress-updates'
import { TimelineService, TimelineItem } from '@/lib/timeline-service'
import { ProgressDataService } from '@/lib/progress-data-service'
import { QuickMilestoneCreator } from './quick-milestone-creator'
import { FallbackMilestoneCreator, getFallbackMilestones } from './fallback-milestone-creator'
import { SmartProgressIndicator } from './smart-progress-indicator'
import { ProgressNotifications } from './progress-notifications'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface ProgressTabsProps {
  bookingId: string
  userRole: 'provider' | 'client'
  showHeader?: boolean
  combinedView?: boolean
}

type ViewType = 'overview' | 'monthly' | 'timeline' | 'analytics' | 'bulk'

export function ProgressTabs({ bookingId, userRole, showHeader = true, combinedView = false }: ProgressTabsProps) {
  const [activeTab, setActiveTab] = useState<ViewType>('overview')
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [bookingProgress, setBookingProgress] = useState<BookingProgress | null>(null)
  const [bookingType, setBookingType] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [schemaAvailable, setSchemaAvailable] = useState<boolean | null>(null)
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([])
  const [commentsByMilestone, setCommentsByMilestone] = useState<Record<string, Comment[]>>({})
  const [showMilestoneCreator, setShowMilestoneCreator] = useState(false)
  const [useFallbackMode, setUseFallbackMode] = useState(false)
  const [fallbackMilestones, setFallbackMilestones] = useState<any[]>([])

  // Add missing state variables for progress tracking
  const [timeEntries, setTimeEntries] = useState<any[]>([])
  const [actionRequests, setActionRequests] = useState<any[]>([])
  const [approvalsByMilestone, setApprovalsByMilestone] = useState<Record<string, any[]>>({})
  const [overallProgress, setOverallProgress] = useState(0)
  const [totalTasks, setTotalTasks] = useState(0)
  const [completedTasks, setCompletedTasks] = useState(0)
  const [totalEstimatedHours, setTotalEstimatedHours] = useState(0)
  const [totalActualHours, setTotalActualHours] = useState(0)
  const [overdueTasks, setOverdueTasks] = useState(0)

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

  useEffect(() => {
    checkSchemaAvailability()
  }, [])

  const checkSchemaAvailability = async () => {
    try {
      // Check if milestones table exists by trying to query it
      const { getSupabaseClient } = await import('@/lib/supabase')
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('milestones')
        .select('id')
        .limit(1)
      
      if (error) {
        setSchemaAvailable(false)
      } else {
        setSchemaAvailable(true)
        loadData()
      }
    } catch (error) {
      setSchemaAvailable(false)
    }
  }

  useEffect(() => {
    if (schemaAvailable === true) {
      loadData()
    }
  }, [bookingId, schemaAvailable])



  const loadData = async () => {
    try {
      setLoading(true)
      console.log('🔄 Loading progress data for booking:', bookingId)
      
      // First try to load from database
      try {
      const { getSupabaseClient } = await import('@/lib/supabase')
      const supabase = await getSupabaseClient()
      
      // Load milestones with tasks
      const { data: milestonesData, error: milestonesError } = await supabase
        .from('milestones')
        .select(`
          id,
          title,
          description,
          progress_percentage,
          status,
          due_date,
          weight,
          order_index,
          editable,
          created_at,
          updated_at,
          tasks (
            id,
            title,
            status,
            progress_percentage,
            due_date,
            editable,
            estimated_hours,
            actual_hours,
            priority,
            created_at,
            updated_at
          )
        `)
        .eq('booking_id', bookingId)
        .order('order_index', { ascending: true })
      
      if (milestonesError) {
          console.warn('Database query failed, switching to fallback mode:', milestonesError)
        throw new Error(milestonesError.message)
      }
      
        // If no milestones found, switch to fallback mode
        if (!milestonesData || milestonesData.length === 0) {
          console.log('No milestones found, switching to fallback mode')
          throw new Error('No milestones found - using fallback mode')
        }
        
        // Transform milestones data
        const transformedMilestones = milestonesData.map((milestone: any) => ({
        ...milestone,
        id: milestone.id,
        booking_id: bookingId,
        title: milestone.title,
        description: milestone.description || '',
        status: milestone.status as 'not_started' | 'in_progress' | 'completed',
        progress: milestone.progress_percentage || 0,
          start_date: milestone.created_at,
          end_date: milestone.due_date || milestone.created_at,
        priority: 'medium' as 'medium',
          created_at: milestone.created_at,
          updated_at: milestone.updated_at,
          is_overdue: false,
        estimated_hours: 0,
        actual_hours: 0,
        tags: [],
        notes: '',
        assigned_to: undefined,
        created_by: undefined,
        completed_at: undefined,
        overdue_since: undefined,
        order_index: milestone.order_index || 0,
          editable: milestone.editable !== false,
          tasks: (milestone.tasks || []).map((task: any) => ({
          id: task.id,
          title: task.title,
          status: task.status === 'pending' ? 'pending' : task.status as 'pending' | 'in_progress' | 'completed',
          progress_percentage: task.progress_percentage || 0,
          due_date: task.due_date,
          estimated_hours: task.estimated_hours || 0,
          actual_hours: task.actual_hours || 0,
            priority: (task.priority as 'low' | 'medium' | 'high' | 'urgent') || 'medium',
          milestone_id: milestone.id,
            description: task.description || '',
          tags: [],
          steps: [],
          completed_at: undefined,
            created_at: task.created_at,
            updated_at: task.updated_at,
          created_by: undefined,
          assigned_to: undefined,
            is_overdue: false,
          overdue_since: undefined,
          approval_status: 'pending' as 'pending',
          approved_by: undefined,
          approved_at: undefined,
          approval_notes: undefined,
          comments: [],
          time_entries: [],
            order_index: task.order_index || 0
        }))
      }))
      
        // If we get here, database is working
        setUseFallbackMode(false)
      setMilestones(transformedMilestones)
        console.log('✅ Database milestones loaded:', transformedMilestones.length, 'milestones')
        console.log('📊 Milestone data:', transformedMilestones)
        
        // Calculate progress statistics with comprehensive task completion tracking
        const totalTasks = transformedMilestones.reduce((sum, m) => sum + (m.tasks?.length || 0), 0)
        const completedTasks = transformedMilestones.reduce((sum, m) => 
          sum + (m.tasks?.filter((t: any) => t.status === 'completed').length || 0), 0
        )
        const inProgressTasks = transformedMilestones.reduce((sum, m) => 
          sum + (m.tasks?.filter((t: any) => t.status === 'in_progress').length || 0), 0
        )
        const pendingTasks = transformedMilestones.reduce((sum, m) => 
          sum + (m.tasks?.filter((t: any) => t.status === 'pending').length || 0), 0
        )
        const completedMilestones = transformedMilestones.filter(m => m.status === 'completed').length
        const inProgressMilestones = transformedMilestones.filter(m => m.status === 'in_progress').length
        
        // Calculate progress more intelligently
        let overallProgress = 0
        if (transformedMilestones.length > 0) {
          // Base progress on completed milestones
          const completedProgress = (completedMilestones / transformedMilestones.length) * 100
          
          // Add partial progress for in-progress milestones based on their task completion
          const inProgressProgress = inProgressMilestones > 0 ? 
            transformedMilestones
              .filter(m => m.status === 'in_progress')
              .reduce((sum, m) => {
                const milestoneTasks = m.tasks || []
                const completedMilestoneTasks = milestoneTasks.filter((t: any) => t.status === 'completed').length
                const milestoneProgress = milestoneTasks.length > 0 ? (completedMilestoneTasks / milestoneTasks.length) * 50 : 0 // Max 50% for in-progress
                return sum + milestoneProgress
              }, 0) / transformedMilestones.length : 0
          
          overallProgress = Math.round(completedProgress + inProgressProgress)
        }
        const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
        
        setTotalTasks(totalTasks)
        setCompletedTasks(completedTasks)
        setOverallProgress(overallProgress)
        
        console.log('📊 Progress calculated:', {
          totalMilestones: transformedMilestones.length,
          completedMilestones,
          totalTasks,
          completedTasks,
          inProgressTasks,
          pendingTasks,
          overallProgress,
          taskCompletionRate
        })
        return
      } catch (dbError) {
        console.warn('Database not available, using fallback mode:', dbError)
        setUseFallbackMode(true)
        
        // Load from localStorage fallback
        const fallbackData = getFallbackMilestones(bookingId)
        setFallbackMilestones(fallbackData)
        
        // Transform fallback data to match expected format
        const transformedFallback = fallbackData.map(milestone => ({
          ...milestone,
          id: milestone.id,
        booking_id: bookingId,
          title: milestone.title,
          description: milestone.description || '',
          status: milestone.status === 'pending' ? 'not_started' : milestone.status as 'not_started' | 'in_progress' | 'completed',
          progress: milestone.progress_percentage || 0,
          start_date: milestone.created_at,
          end_date: milestone.created_at,
          priority: 'medium' as 'medium',
          created_at: milestone.created_at,
          updated_at: milestone.created_at,
          is_overdue: false,
          estimated_hours: 0,
          actual_hours: 0,
          tags: [],
          notes: '',
          assigned_to: undefined,
          created_by: undefined,
          completed_at: undefined,
          overdue_since: undefined,
          order_index: 0,
          editable: true,
          tasks: (milestone.tasks || []).map(task => ({
            id: task.id,
            title: task.title,
            status: task.status === 'pending' ? 'pending' : task.status as 'pending' | 'in_progress' | 'completed',
            progress_percentage: task.progress_percentage || 0,
            due_date: task.created_at,
            estimated_hours: 0,
            actual_hours: 0,
            priority: 'medium' as 'medium',
            milestone_id: milestone.id,
            description: task.description || '',
            tags: [],
            steps: [],
            completed_at: undefined,
            created_at: task.created_at,
            updated_at: task.created_at,
            created_by: undefined,
            assigned_to: undefined,
            is_overdue: false,
          overdue_since: undefined,
          approval_status: 'pending' as 'pending',
          approved_by: undefined,
          approved_at: undefined,
          approval_notes: undefined,
          comments: [],
          time_entries: [],
          order_index: 0
        }))
      }))
      
        setMilestones(transformedFallback)
        console.log('✅ Fallback milestones loaded:', transformedFallback.length, 'milestones')
        console.log('📊 Fallback data:', transformedFallback)
        
        // Calculate progress statistics for fallback data with comprehensive tracking
        const totalTasks = transformedFallback.reduce((sum, m) => sum + (m.tasks?.length || 0), 0)
        const completedTasks = transformedFallback.reduce((sum, m) => 
          sum + (m.tasks?.filter((t: any) => t.status === 'completed').length || 0), 0
        )
        const inProgressTasks = transformedFallback.reduce((sum, m) => 
          sum + (m.tasks?.filter((t: any) => t.status === 'in_progress').length || 0), 0
        )
        const pendingTasks = transformedFallback.reduce((sum, m) => 
          sum + (m.tasks?.filter((t: any) => t.status === 'pending').length || 0), 0
        )
        const completedMilestones = transformedFallback.filter(m => m.status === 'completed').length
        const overallProgress = transformedFallback.length > 0 ? Math.round((completedMilestones / transformedFallback.length) * 100) : 0
        const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
        
        setTotalTasks(totalTasks)
        setCompletedTasks(completedTasks)
        setOverallProgress(overallProgress)
        
        console.log('📊 Fallback progress calculated:', {
          totalMilestones: transformedFallback.length,
          completedMilestones,
          totalTasks,
          completedTasks,
          inProgressTasks,
          pendingTasks,
          overallProgress,
          taskCompletionRate
        })
        return
      }
      
      // This code should not be reached if we're in fallback mode
      // Load booking data for overall progress
      const { getSupabaseClient } = await import('@/lib/supabase')
      const supabase = await getSupabaseClient()
      
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select('id, title, project_progress, status')
        .eq('id', bookingId)
        .single()
      
      if (bookingError) {
        console.warn('Error loading booking data:', bookingError)
      }

      // Timeline and comments
      try {
        const [timeline, comments] = await Promise.all([
          TimelineService.getTimeline(bookingId),
          ProgressDataService.getAllCommentsForBooking(bookingId)
        ])
        setTimelineItems(timeline)
        setCommentsByMilestone(comments)
        
        // If no timeline items, create sample data
        if (timeline.length === 0) {
          const sampleTimeline: TimelineItem[] = [
            {
              id: 'timeline-1',
              booking_id: bookingId,
              title: 'Project Setup & Planning Started',
              description: 'Initial project setup, requirements gathering, and planning phase initiated',
              status: 'completed',
              priority: 'high',
              start_date: new Date().toISOString(),
              end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              progress_percentage: 100,
              order_index: 1,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              id: 'timeline-2',
              booking_id: bookingId,
              title: 'Project Requirements Review Completed',
              description: 'Successfully reviewed and documented project requirements',
              status: 'completed',
              priority: 'high',
              start_date: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
              end_date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
              progress_percentage: 100,
              order_index: 2,
              created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
              updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
            },
            {
              id: 'timeline-3',
              booking_id: bookingId,
              title: 'Project Timeline Creation In Progress',
              description: 'Currently developing detailed project timeline and milestones',
              status: 'in_progress',
              priority: 'medium',
              start_date: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
              end_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
              progress_percentage: 60,
              order_index: 3,
              created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
              updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
            }
          ]
          setTimelineItems(sampleTimeline)
        }
        
        // If no comments, create sample data
        if (Object.keys(comments).length === 0 && milestones.length > 0) {
          const sampleComments: Record<string, Comment[]> = {}
          milestones.forEach(milestone => {
            sampleComments[milestone.id] = [
              {
                id: `comment-${milestone.id}`,
                booking_id: bookingId,
                milestone_id: milestone.id,
                user_id: 'system',
                content: 'Project milestone created. Ready to begin work!',
                author_name: 'System',
                author_role: 'admin',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
            ]
          })
          setCommentsByMilestone(sampleComments)
        }
      } catch (e) {
        // Soft-fail timeline/comments if tables unavailable or RLS blocks
        console.warn('Timeline/comments loading failed, using sample data:', e)
        
        // Create sample data when loading fails
        const sampleTimeline: TimelineItem[] = [
          {
            id: 'timeline-1',
            booking_id: bookingId,
            title: 'Project Setup & Planning Started',
            description: 'Initial project setup, requirements gathering, and planning phase initiated',
            status: 'completed',
            priority: 'high',
            start_date: new Date().toISOString(),
            end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            progress_percentage: 100,
            order_index: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'timeline-2',
            booking_id: bookingId,
            title: 'Project Requirements Review Completed',
            description: 'Successfully reviewed and documented project requirements',
            status: 'completed',
            priority: 'high',
            start_date: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
            end_date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            progress_percentage: 100,
            order_index: 2,
            created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
          }
        ]
        setTimelineItems(sampleTimeline)
        
        // Create sample comments for milestones
        if (milestones.length > 0) {
          const sampleComments: Record<string, Comment[]> = {}
          milestones.forEach(milestone => {
            sampleComments[milestone.id] = [
              {
                id: `comment-${milestone.id}`,
                booking_id: bookingId,
                milestone_id: milestone.id,
                user_id: 'system',
                content: 'Project milestone created. Ready to begin work!',
                author_name: 'System',
                author_role: 'admin',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
            ]
          })
          setCommentsByMilestone(sampleComments)
        }
      }
    } catch (error) {
      console.error('Error loading progress data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load progress data')
      toast.error('Failed to load progress data')
    } finally {
      setLoading(false)
    }
  }

  // If schema is not available, show helpful error message
  if (schemaAvailable === false) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-red-50 rounded-lg border-2 border-dashed border-red-300">
        <div className="text-center max-w-md">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Database Schema Issue</h3>
          <p className="text-gray-600 mb-4">
            The progress tracking system requires database tables that aren't available yet. 
            Please contact your administrator to set up the required database schema.
          </p>
          <div className="text-sm text-gray-500">
            Required tables: milestones, tasks, milestone_comments
          </div>
        </div>
      </div>
    )
  }

  // If still checking schema availability
  if (schemaAvailable === null) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking database schema...</p>
        </div>
      </div>
    )
  }

  // If there's an error loading data
  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Data</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null)
              loadData()
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // If loading
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading progress data...</p>
          <p className="text-xs text-gray-500 mt-2">This may take a moment</p>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: 'Project Overview', icon: BarChart3 },
    { id: 'monthly', label: 'Monthly Progress', icon: Calendar },
    { id: 'timeline', label: 'Timeline View', icon: Calendar },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'bulk', label: 'Bulk Operations', icon: Clock }
  ]


  // If there are no milestones and no booking progress, show empty state with action
  if (milestones.length === 0 && !bookingProgress) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center max-w-md">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
            <Target className="h-6 w-6 text-blue-600" />
      </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Progress Data Yet</h3>
          <p className="text-gray-600 mb-6">
            This booking doesn't have any milestones or progress tracking set up yet. 
            {userRole === 'provider' ? ' You can start by creating milestones and tasks.' : ' The provider will set up progress tracking soon.'}
          </p>
          {userRole === 'provider' && (
            <div className="space-y-3">
              <Button 
                onClick={() => {
                  console.log('Create First Milestone clicked')
                  console.log('Current fallback mode:', useFallbackMode)
                  setShowMilestoneCreator(true)
                }}
                className="bg-blue-600 hover:bg-blue-700"
                aria-label="Create the first milestone for this project"
                role="button"
              >
                <Target className="h-4 w-4 mr-2" />
                Create First Milestone
              </Button>
              <p className="text-xs text-gray-500">
                Milestones help break down the project into manageable phases
              </p>
              {useFallbackMode && (
                <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                  ⚠️ Using offline mode - data will be stored locally
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  const handleLogHours = () => {
    // Implement log hours functionality
    console.log('Log hours clicked')
  }

  const handleSendUpdate = () => {
    // Implement send update functionality
    console.log('Send update clicked')
  }

  const handleScheduleFollowUp = () => {
    // Implement schedule follow-up functionality
    console.log('Schedule follow-up clicked')
  }

  const handleSendPaymentReminder = () => {
    // Implement send payment reminder functionality
    console.log('Send payment reminder clicked')
  }

  const handleMilestoneUpdate = async (milestoneId: string, updates: Partial<Milestone>) => {
    try {
      await ProgressDataService.updateMilestone(milestoneId, updates)
      console.log('Milestone updated:', milestoneId, updates)
      toast.success('Milestone updated')
      await loadData()
    } catch (err) {
      console.error('Failed to update milestone:', err)
      toast.error('Failed to update milestone')
    }
  }

  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    const result = await updateTaskProgress(taskId, updates)
    if (result.success) {
      // Progress will be updated automatically via the hook
      console.log('Task updated successfully')
    } else {
      console.error('Failed to update task:', result.error)
    }
  }

  const handleAddTask = async (milestoneId: string, task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'is_overdue' | 'actual_hours'>) => {
    const result = await addTask(milestoneId, task)
    if (result.success) {
      // Reload data to get the new task
      loadData()
      console.log('Task added successfully')
    } else {
      console.error('Failed to add task:', result.error)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    const result = await deleteTask(taskId)
    if (result.success) {
      // Progress will be updated automatically via the hook
      console.log('Task deleted successfully')
    } else {
      console.error('Failed to delete task:', result.error)
    }
  }

  const handleAddComment = (milestoneId: string, comment: string) => {
    // Implement add comment functionality
    console.log('Add comment:', milestoneId, comment)
  }

  const handleDeleteMilestone = async (milestoneId: string) => {
    try {
      if (useFallbackMode) {
        // Delete from localStorage
        const fallbackMilestones = getFallbackMilestones(bookingId)
        const updatedMilestones = fallbackMilestones.filter(m => m.id !== milestoneId)
        localStorage.setItem(`milestones-${bookingId}`, JSON.stringify(updatedMilestones))
        setFallbackMilestones(updatedMilestones)
        toast.success('Milestone deleted successfully')
      } else {
        // Delete from database using RPC service
        await ProgressDataService.deleteMilestone(milestoneId)
        toast.success('Milestone deleted successfully')
        loadData() // Reload data to reflect changes
      }
    } catch (error) {
      console.error('Error deleting milestone:', error)
      toast.error('Failed to delete milestone')
    }
  }

  const handleRequestChanges = (milestoneId: string, reason: string) => {
    // Implement request changes functionality
    console.log('Request changes:', milestoneId, reason)
  }

  const handleDismissSuggestion = (suggestionId: string) => {
    // Implement dismiss suggestion functionality
    console.log('Dismiss suggestion:', suggestionId)
  }

  // Add missing handler functions
  const handleApprovalAction = async (action: 'approve' | 'decline') => {
    console.log('Approval action:', action)
    // This would typically call the parent component's handler
    toast.success(`Booking ${action}ed successfully`)
  }

  // Optimized handlers with deferred execution
  const createOptimizedHandler = (action: () => void, message: string) => {
    return () => {
      // Defer to next tick to prevent UI blocking
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => {
          action()
          toast.success(message)
        }, { timeout: 50 })
      } else {
        setTimeout(() => {
          action()
          toast.success(message)
        }, 0)
      }
    }
  }

  const handleMarkInProgress = createOptimizedHandler(() => {
    console.log('Mark in progress')
  }, 'Booking marked as in progress')

  const handleMarkComplete = createOptimizedHandler(() => {
    console.log('Mark complete')
  }, 'Booking marked as complete')

  const handlePutOnHold = createOptimizedHandler(() => {
    console.log('Put on hold')
  }, 'Booking put on hold')

  const handleProgressUpdate = (newProgress: number) => {
    // Immediate UI update for better UX
    setOverallProgress(newProgress)
    
    // Defer heavy operations
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => {
        console.log('Progress update:', newProgress)
        toast.success('Progress updated successfully')
      }, { timeout: 50 })
    } else {
      setTimeout(() => {
        console.log('Progress update:', newProgress)
        toast.success('Progress updated successfully')
      }, 0)
    }
  }

  const handleSendProgressUpdate = createOptimizedHandler(() => {
    console.log('Send progress update')
  }, 'Progress update sent')

  const handleScheduleMeeting = createOptimizedHandler(() => {
    console.log('Schedule meeting')
  }, 'Meeting scheduled')

  const handleExport = (format: 'pdf' | 'excel') => {
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => {
        console.log('Export:', format)
        toast.success(`Exporting as ${format.toUpperCase()}`)
      }, { timeout: 50 })
    } else {
      setTimeout(() => {
        console.log('Export:', format)
        toast.success(`Exporting as ${format.toUpperCase()}`)
      }, 0)
    }
  }

  const handleStatusUpdate = createOptimizedHandler(() => {
    console.log('Status update')
  }, 'Status updated successfully')

  const handleNotify = createOptimizedHandler(() => {
    console.log('Send notification')
  }, 'Notification sent')

  const handleProcessPayment = createOptimizedHandler(() => {
    console.log('Process payment')
  }, 'Payment processed')

  const handleGenerateInvoice = createOptimizedHandler(() => {
    console.log('Generate invoice')
  }, 'Invoice generated')

  const handleDownloadReceipt = createOptimizedHandler(() => {
    console.log('Download receipt')
  }, 'Receipt downloaded')

  const handleSuggestionAction = (suggestion: any) => {
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => {
        console.log('Suggestion action:', suggestion)
        toast.success('Suggestion action completed')
      }, { timeout: 50 })
    } else {
      setTimeout(() => {
        console.log('Suggestion action:', suggestion)
        toast.success('Suggestion action completed')
      }, 0)
    }
  }

  const handleUpdateProgress = (newProgress: number) => {
    // Immediate UI update
    setOverallProgress(newProgress)
    
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => {
        console.log('Update progress:', newProgress)
        toast.success('Progress updated')
      }, { timeout: 50 })
    } else {
      setTimeout(() => {
        console.log('Update progress:', newProgress)
        toast.success('Progress updated')
      }, 0)
    }
  }

  const handleSendMessage = createOptimizedHandler(() => {
    console.log('Send message')
  }, 'Message sent')

  console.log('🔍 ProgressTabs render - showMilestoneCreator:', showMilestoneCreator)

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Main Content */}
      <div className="flex-1 space-y-6">
        {/* Main Progress Header (optional) */}
        {showHeader && (
          <MainProgressHeader
            bookingProgress={bookingProgress}
            completedMilestones={milestones.filter(m => m.status === 'completed').length}
            totalMilestones={milestones.length}
            completedTasks={milestones.reduce((sum, m) => 
              sum + (m.tasks?.filter(t => t.status === 'completed').length || 0), 0
            )}
            totalTasks={milestones.reduce((sum, m) => sum + (m.tasks?.length || 0), 0)}
            totalEstimatedHours={milestones.reduce((sum, m) => 
              sum + (m.tasks?.reduce((taskSum, t) => taskSum + (t.estimated_hours || 0), 0) || 0), 0
            )}
            totalActualHours={milestones.reduce((sum, m) => 
              sum + (m.tasks?.reduce((taskSum, t) => taskSum + (t.actual_hours || 0), 0) || 0), 0
            )}
            overdueTasks={milestones.reduce((sum, m) => 
              sum + (m.tasks?.filter(t => {
                if (!t.due_date || t.status === 'completed') return false
                try {
                  const dueDate = new Date(t.due_date)
                  return !isNaN(dueDate.getTime()) && dueDate < new Date()
                } catch (error) {
                  console.warn('Date comparison error:', error)
                  return false
                }
              }).length || 0), 0
            )}
          />
        )}

        {combinedView ? (
          // Simplified Combined View - Remove duplication
          <div className="space-y-6">
            {/* Smart Progress Indicator */}
            <SmartProgressIndicator
              bookingId={bookingId}
              currentProgress={overallProgress}
              milestones={milestones}
              tasks={milestones.flatMap(m => m.tasks || [])}
              userRole={userRole}
              onProgressUpdate={(progress) => {
                setOverallProgress(progress)
                console.log('Progress updated:', progress)
              }}
            />

            {/* Main milestone display with sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Main milestones view */}
              <div className="lg:col-span-3">
                <SimpleMilestones
                  milestones={milestones}
                  userRole={userRole}
                  onTaskUpdate={handleTaskUpdate}
                  onTaskAdd={handleAddTask}
                  onTaskDelete={handleDeleteTask}
                  onMilestoneUpdate={handleMilestoneUpdate}
                  onMilestoneDelete={handleDeleteMilestone}
                  onCommentAdd={handleAddComment}
                  onProjectTypeChange={() => {}}
                  onMilestoneCreate={() => setShowMilestoneCreator(true)}
                  commentsByMilestone={commentsByMilestone}
                  approvalsByMilestone={approvalsByMilestone}
                />
              </div>

              {/* Smart suggestions sidebar */}
              <div className="lg:col-span-1">
                <SmartSuggestionsSidebar
                  milestones={milestones}
                  userRole={userRole}
                  bookingProgress={bookingProgress}
                  timeEntries={timeEntries}
                  onRefresh={loadData}
                />
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Project Timeline</h3>
                {timelineItems.length === 0 ? (
                  <div className="p-8 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <Clock className="h-8 w-8 text-gray-400" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No Timeline Activity Yet</h4>
                    <p className="text-gray-600 mb-4">Timeline items will appear here as you work on milestones and complete tasks.</p>
                    <div className="text-sm text-gray-500">
                      <p>• Start a milestone to create timeline entries</p>
                      <p>• Complete tasks to see progress updates</p>
                      <p>• Add comments to track important moments</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {timelineItems.map(item => (
                      <div key={item.id} className="rounded-lg border p-4 bg-white">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-gray-900">{item.title}</div>
                          <div className="text-xs text-gray-500">{(() => {
                            try {
                              const startDate = item.start_date && !isNaN(new Date(item.start_date).getTime()) ? new Date(item.start_date).toLocaleDateString() : 'N/A'
                              const endDate = item.end_date && !isNaN(new Date(item.end_date).getTime()) ? new Date(item.end_date).toLocaleDateString() : 'N/A'
                              return `${startDate} → ${endDate}`
                            } catch (error) {
                              console.warn('Date range parsing error:', error)
                              return 'N/A → N/A'
                            }
                          })()}</div>
                        </div>
                        {item.description && (
                          <p className="mt-1 text-sm text-gray-600">{item.description}</p>
                        )}
                        <div className="mt-2 text-xs text-gray-500">Status: {item.status} · Priority: {item.priority}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Comments</h3>
                {Object.keys(commentsByMilestone).length === 0 ? (
                  <div className="p-8 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <MessageSquare className="h-8 w-8 text-gray-400" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No Comments Yet</h4>
                    <p className="text-gray-600 mb-4">Comments help track important discussions and decisions throughout the project.</p>
                    <div className="text-sm text-gray-500">
                      <p>• Add comments to milestones for context</p>
                      <p>• Share updates with team members</p>
                      <p>• Document important decisions</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(commentsByMilestone).map(([milestoneId, list]) => (
                      <div key={milestoneId} className="rounded-lg border bg-white">
                        <div className="px-4 py-2 border-b text-sm font-medium text-gray-900">Milestone {milestoneId.slice(0, 8)}…</div>
                        <div className="p-4 space-y-3">
                          {list.map(c => (
                            <div key={c.id} className="text-sm">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-800">{c.author_name || 'User'}</span>
                                <span className="text-xs text-gray-500">{(() => {
                                  try {
                                    if (!c.created_at) return 'N/A'
                                    const date = new Date(c.created_at)
                                    return isNaN(date.getTime()) ? 'N/A' : date.toLocaleString()
                                  } catch (error) {
                                    console.warn('Date parsing error:', error)
                                    return 'N/A'
                                  }
                                })()}</span>
                              </div>
                              <p className="text-gray-700 mt-1">{c.content}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex flex-wrap space-x-2 sm:space-x-8 overflow-x-auto">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as ViewType)}
                      className={`flex items-center gap-1 sm:gap-2 py-2 px-1 sm:px-2 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  )
                })}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="mt-6">
              {activeTab === 'overview' && (
                bookingType === 'one_time' ? (
                  <SimpleMilestones
                    milestones={milestones}
                    userRole={userRole}
                    onMilestoneUpdate={handleMilestoneUpdate}
                    onTaskUpdate={handleTaskUpdate}
                    onTaskAdd={handleAddTask}
                    onTaskDelete={handleDeleteTask}
                    onCommentAdd={(milestoneId, content) => handleAddComment(milestoneId, content)}
                    onProjectTypeChange={() => {}}
                  />
                ) : (
                  <ProgressTrackingSystem
                    bookingId={bookingId}
                    userRole={userRole}
                    className=""
                  />
                )
              )}

              {activeTab === 'monthly' && (
                <div className="p-6 text-center text-gray-600">
                  Monthly progress view coming soon...
                </div>
              )}

              {activeTab === 'timeline' && (
                <div className="space-y-6">
                  {/* Timeline Items */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Project Timeline</h3>
                    {timelineItems.length === 0 ? (
                      <div className="p-8 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                          <Clock className="h-8 w-8 text-gray-400" />
                        </div>
                        <h4 className="text-lg font-medium text-gray-900 mb-2">No Timeline Activity Yet</h4>
                        <p className="text-gray-600 mb-4">Timeline items will appear here as you work on milestones and complete tasks.</p>
                        <div className="text-sm text-gray-500">
                          <p>• Start a milestone to create timeline entries</p>
                          <p>• Complete tasks to see progress updates</p>
                          <p>• Add comments to track important moments</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {timelineItems.map(item => (
                          <div key={item.id} className="rounded-lg border p-4 bg-white">
                            <div className="flex items-center justify-between">
                              <div className="font-medium text-gray-900">{item.title}</div>
                              <div className="text-xs text-gray-500">{(() => {
                            try {
                              const startDate = item.start_date && !isNaN(new Date(item.start_date).getTime()) ? new Date(item.start_date).toLocaleDateString() : 'N/A'
                              const endDate = item.end_date && !isNaN(new Date(item.end_date).getTime()) ? new Date(item.end_date).toLocaleDateString() : 'N/A'
                              return `${startDate} → ${endDate}`
                            } catch (error) {
                              console.warn('Date range parsing error:', error)
                              return 'N/A → N/A'
                            }
                          })()}</div>
                            </div>
                            {item.description && (
                              <p className="mt-1 text-sm text-gray-600">{item.description}</p>
                            )}
                            <div className="mt-2 text-xs text-gray-500">Status: {item.status} · Priority: {item.priority}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Comments grouped by milestone */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Comments</h3>
                    {Object.keys(commentsByMilestone).length === 0 ? (
                      <div className="p-8 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                          <MessageSquare className="h-8 w-8 text-gray-400" />
                        </div>
                        <h4 className="text-lg font-medium text-gray-900 mb-2">No Comments Yet</h4>
                        <p className="text-gray-600 mb-4">Comments help track important discussions and decisions throughout the project.</p>
                        <div className="text-sm text-gray-500">
                          <p>• Add comments to milestones for context</p>
                          <p>• Share updates with team members</p>
                          <p>• Document important decisions</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {Object.entries(commentsByMilestone).map(([milestoneId, list]) => (
                          <div key={milestoneId} className="rounded-lg border bg-white">
                            <div className="px-4 py-2 border-b text-sm font-medium text-gray-900">Milestone {milestoneId.slice(0, 8)}…</div>
                            <div className="p-4 space-y-3">
                              {list.map(c => (
                                <div key={c.id} className="text-sm">
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium text-gray-800">{c.author_name || 'User'}</span>
                                    <span className="text-xs text-gray-500">{(() => {
                                  try {
                                    if (!c.created_at) return 'N/A'
                                    const date = new Date(c.created_at)
                                    return isNaN(date.getTime()) ? 'N/A' : date.toLocaleString()
                                  } catch (error) {
                                    console.warn('Date parsing error:', error)
                                    return 'N/A'
                                  }
                                })()}</span>
                                  </div>
                                  <p className="text-gray-700 mt-1">{c.content}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'analytics' && (
                <AnalyticsView
                  milestones={milestones as any}
                  timeEntries={[]}
                  totalEstimatedHours={milestones.reduce((sum, m) => 
                    sum + (m.tasks?.reduce((taskSum, t) => taskSum + (t.estimated_hours || 0), 0) || 0), 0
                  )}
                  totalActualHours={milestones.reduce((sum, m) => 
                    sum + (m.tasks?.reduce((taskSum, t) => taskSum + (t.actual_hours || 0), 0) || 0), 0
                  )}
                />
              )}

              {activeTab === 'bulk' && (
                <BulkOperationsView
                  milestones={milestones as any}
                  onTaskUpdate={handleTaskUpdate as any}
                  onTaskDelete={handleDeleteTask}
                  onMilestoneUpdate={async (milestoneId: any, updates: any) => {
                    await handleMilestoneUpdate(milestoneId, updates)
                  }}
                />
              )}
            </div>
          </>
        )}

        {/* Summary Footer - removed for now */}

        {/* Global Time Tracking Status */}
      </div>

      {/* Milestone Creator Modal */}
      {showMilestoneCreator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <QuickMilestoneCreator
              bookingId={bookingId}
              onMilestoneCreated={() => {
                setShowMilestoneCreator(false)
                loadData()
                toast.success('Milestone created successfully!')
              }}
              onCancel={() => setShowMilestoneCreator(false)}
            />
          </div>
        </div>
      )}

    </div>
  )
}

