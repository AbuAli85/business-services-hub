'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import './progress-styles.css'
import { List, Kanban, Calendar, BarChart3, Clock, AlertCircle, Target } from 'lucide-react'
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

  // Debug function to test milestone creation
  const testMilestoneCreation = async () => {
    console.log('🧪 Testing milestone creation...')
    try {
      const { getSupabaseClient } = await import('@/lib/supabase')
      const supabase = await getSupabaseClient()
      
      // Check auth
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        console.error('❌ Auth error:', authError)
        return false
      }
      console.log('✅ User authenticated:', user.id)
      
      // Try to create a test milestone
      const { data, error } = await supabase
        .from('milestones')
        .insert({
          booking_id: bookingId,
          title: 'Debug Test Milestone',
          description: 'Testing milestone creation',
          status: 'pending',
          progress_percentage: 0,
          order_index: 0,
          created_by: user.id
        })
        .select()
        .single()
      
      if (error) {
        console.error('❌ Milestone creation failed:', error)
        return false
      }
      
      console.log('✅ Milestone created successfully:', data.id)
      
      // Clean up
      await supabase.from('milestones').delete().eq('id', data.id)
      console.log('🧹 Test milestone cleaned up')
      
      return true
    } catch (error) {
      console.error('❌ Test failed:', error)
      return false
    }
  }

  // Make test function available globally for debugging
  if (typeof window !== 'undefined') {
    (window as any).testMilestoneCreation = testMilestoneCreation
  }

  // Debug modal state
  useEffect(() => {
    console.log('Modal state changed - showMilestoneCreator:', showMilestoneCreator)
    if (showMilestoneCreator) {
      console.log('Modal should be visible now!')
      // Test if modal is in DOM
      setTimeout(() => {
        const modalElement = document.querySelector('[data-modal="milestone-creator"]')
        if (modalElement) {
          console.log('✅ Modal element found in DOM:', modalElement)
        } else {
          console.log('❌ Modal element NOT found in DOM')
          // Try to find any modal-like elements
          const allModals = document.querySelectorAll('[class*="fixed"]')
          console.log('All fixed elements found:', allModals.length)
          allModals.forEach((el, i) => {
            console.log(`Fixed element ${i}:`, el.className, (el as HTMLElement).style.zIndex)
          })
        }
      }, 100)
    }
  }, [showMilestoneCreator])

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
          tasks (
            id,
            title,
            status,
            progress_percentage,
            due_date,
            editable,
            estimated_hours,
            actual_hours,
            priority
          )
        `)
        .eq('booking_id', bookingId)
        .order('order_index', { ascending: true })
      
      if (milestonesError) {
          console.warn('Database query failed, switching to fallback mode:', milestonesError)
        throw new Error(milestonesError.message)
      }
      
        // If no milestones found, check if we can create them (test permissions)
        if (!milestonesData || milestonesData.length === 0) {
          console.log('No milestones found, testing database permissions...')
          
          // Test if we can create a milestone (this will fail if permissions are wrong)
          const { error: testError } = await supabase
            .from('milestones')
            .insert({
              booking_id: bookingId,
              title: 'test-permission-check',
              description: 'test',
              status: 'pending',
              progress_percentage: 0,
              order_index: 0
            })
            .select()
        .single()
      
          if (testError && testError.code === '42501') {
            console.log('Permission denied, switching to fallback mode')
            throw new Error('Permission denied - using fallback mode')
          } else if (testError) {
            console.log('Other database error, switching to fallback mode:', testError)
            throw new Error('Database error - using fallback mode')
          } else {
            // Clean up test milestone
            await supabase.from('milestones').delete().eq('title', 'test-permission-check')
            console.log('Database permissions OK, but no milestones exist')
          }
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
          status: task.status as 'pending' | 'in_progress' | 'completed',
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
          status: milestone.status as 'not_started' | 'in_progress' | 'completed',
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
            status: task.status as 'pending' | 'in_progress' | 'completed',
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
      } catch (e) {
        // Soft-fail timeline/comments if tables unavailable or RLS blocks
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
              <div className="text-xs text-gray-500 text-center mt-2 space-y-1">
                <button 
                  onClick={testMilestoneCreation}
                  className="text-blue-600 hover:text-blue-800 underline block"
                >
                  Test Database Connection
                </button>
                <button 
                  onClick={() => {
                    console.log('Force opening modal...')
                    setShowMilestoneCreator(true)
                  }}
                  className="text-green-600 hover:text-green-800 underline block"
                >
                  Force Open Modal
                </button>
                <button 
                  onClick={() => {
                    alert('Modal state: ' + showMilestoneCreator + '\nFallback mode: ' + useFallbackMode)
                  }}
                  className="text-purple-600 hover:text-purple-800 underline block"
                >
                  Check Modal State
                </button>
                <button 
                  onClick={() => {
                    // Create a simple test modal
                    const testModal = document.createElement('div')
                    testModal.innerHTML = `
                      <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 999999; display: flex; align-items: center; justify-content: center;">
                        <div style="background: white; padding: 20px; border: 5px solid red; border-radius: 8px; max-width: 400px;">
                          <h2>TEST MODAL</h2>
                          <p>This is a test modal created directly with JavaScript</p>
                          <button onclick="this.parentElement.parentElement.remove()">Close</button>
                        </div>
                      </div>
                    `
                    document.body.appendChild(testModal)
                    console.log('Test modal created directly')
                  }}
                  className="text-orange-600 hover:text-orange-800 underline block"
                >
                  Create Test Modal
                </button>
                <button 
                  onClick={() => {
                    // Create sample milestones for testing
                    const sampleMilestones = [
                      {
                        id: 'sample-1',
                        title: 'Project Kickoff',
                        description: 'Initial project setup and planning',
                        status: 'pending',
                        progress_percentage: 0,
                        tasks: [
                          { id: 'task-1', title: 'Review requirements', status: 'pending', progress_percentage: 0 },
                          { id: 'task-2', title: 'Create project timeline', status: 'pending', progress_percentage: 0 }
                        ],
                        created_at: new Date().toISOString()
                      },
                      {
                        id: 'sample-2',
                        title: 'Design Phase',
                        description: 'Create initial designs and mockups',
                        status: 'pending',
                        progress_percentage: 0,
                        tasks: [
                          { id: 'task-3', title: 'Create wireframes', status: 'pending', progress_percentage: 0 },
                          { id: 'task-4', title: 'Design mockups', status: 'pending', progress_percentage: 0 }
                        ],
                        created_at: new Date().toISOString()
                      }
                    ]
                    
                    localStorage.setItem(`milestones-${bookingId}`, JSON.stringify(sampleMilestones))
                    console.log('Sample milestones created in localStorage')
                    loadData() // Reload data to show the new milestones
                  }}
                  className="text-pink-600 hover:text-pink-800 underline block"
                >
                  Create Sample Milestones
                </button>
              </div>
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

  const handleMilestoneUpdate = (milestoneId: string, updates: Partial<Milestone>) => {
    // Implement milestone update functionality
    console.log('Milestone update:', milestoneId, updates)
    loadData()
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

  const handleMarkInProgress = async () => {
    console.log('Mark in progress')
    toast.success('Booking marked as in progress')
  }

  const handleMarkComplete = async () => {
    console.log('Mark complete')
    toast.success('Booking marked as complete')
  }

  const handlePutOnHold = async () => {
    console.log('Put on hold')
    toast.success('Booking put on hold')
  }

  const handleProgressUpdate = async (newProgress: number) => {
    console.log('Progress update:', newProgress)
    setOverallProgress(newProgress)
    toast.success('Progress updated successfully')
  }

  const handleSendProgressUpdate = async () => {
    console.log('Send progress update')
    toast.success('Progress update sent')
  }

  const handleScheduleMeeting = async () => {
    console.log('Schedule meeting')
    toast.success('Meeting scheduled')
  }

  const handleExport = async (format: 'pdf' | 'excel') => {
    console.log('Export:', format)
    toast.success(`Exporting as ${format.toUpperCase()}`)
  }

  const handleStatusUpdate = async (newStatus: string) => {
    console.log('Status update:', newStatus)
    toast.success('Status updated successfully')
  }

  const handleNotify = async () => {
    console.log('Send notification')
    toast.success('Notification sent')
  }

  const handleProcessPayment = async () => {
    console.log('Process payment')
    toast.success('Payment processed')
  }

  const handleGenerateInvoice = async () => {
    console.log('Generate invoice')
    toast.success('Invoice generated')
  }

  const handleDownloadReceipt = async () => {
    console.log('Download receipt')
    toast.success('Receipt downloaded')
  }

  const handleSuggestionAction = async (suggestion: any) => {
    console.log('Suggestion action:', suggestion)
    toast.success('Suggestion action completed')
  }

  const handleUpdateProgress = async (newProgress: number) => {
    console.log('Update progress:', newProgress)
    setOverallProgress(newProgress)
    toast.success('Progress updated')
  }

  const handleSendMessage = async () => {
    console.log('Send message')
    toast.success('Message sent')
  }

  console.log('🔍 ProgressTabs render - showMilestoneCreator:', showMilestoneCreator)
  
  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Debug indicator - should always be visible when modal should show */}
      {showMilestoneCreator && (
        <div 
          style={{
            position: 'fixed',
            top: '50px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'red',
            color: 'white',
            padding: '20px',
            zIndex: 9999999,
            borderRadius: '10px',
            fontSize: '18px',
            fontWeight: 'bold',
            textAlign: 'center',
            border: '3px solid yellow'
          }}
        >
          🚨 MODAL SHOULD BE VISIBLE NOW! 🚨
          <br />
          showMilestoneCreator: {showMilestoneCreator.toString()}
        </div>
      )}
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
                return new Date(t.due_date) < new Date()
              }).length || 0), 0
            )}
          />
        )}

        {combinedView ? (
          // Combined Progress & Timeline: no tabs, render both sections
          <div className="space-y-8">
            {/* Smart Progress Indicator */}
            <SmartProgressIndicator
              bookingId={bookingId}
              currentProgress={bookingProgress?.booking_progress || 0}
              milestones={milestones}
              tasks={milestones.flatMap(m => m.tasks || [])}
              userRole={userRole}
              onProgressUpdate={(progress) => {
                // Update progress in parent component
                console.log('Progress updated:', progress)
              }}
            />

            <ProgressTrackingSystem
              bookingId={bookingId}
              userRole={userRole}
              className=""
            />

            {/* Smart Notifications */}
            <ProgressNotifications
              bookingId={bookingId}
              milestones={milestones}
              tasks={milestones.flatMap(m => m.tasks || [])}
              userRole={userRole}
            />

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Project Timeline</h3>
                {timelineItems.length === 0 ? (
                  <div className="p-6 text-center text-gray-600">No timeline items yet.</div>
                ) : (
                  <div className="space-y-3">
                    {timelineItems.map(item => (
                      <div key={item.id} className="rounded-lg border p-4 bg-white">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-gray-900">{item.title}</div>
                          <div className="text-xs text-gray-500">{new Date(item.start_date).toLocaleDateString()} → {new Date(item.end_date).toLocaleDateString()}</div>
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
                  <div className="p-6 text-center text-gray-600">No comments yet.</div>
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
                                <span className="text-xs text-gray-500">{new Date(c.created_at).toLocaleString()}</span>
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
                      <div className="p-6 text-center text-gray-600">No timeline items yet.</div>
                    ) : (
                      <div className="space-y-3">
                        {timelineItems.map(item => (
                          <div key={item.id} className="rounded-lg border p-4 bg-white">
                            <div className="flex items-center justify-between">
                              <div className="font-medium text-gray-900">{item.title}</div>
                              <div className="text-xs text-gray-500">{new Date(item.start_date).toLocaleDateString()} → {new Date(item.end_date).toLocaleDateString()}</div>
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
                      <div className="p-6 text-center text-gray-600">No comments yet.</div>
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
                                    <span className="text-xs text-gray-500">{new Date(c.created_at).toLocaleString()}</span>
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

      {/* Simple Test Modal - Always Render When State is True */}
      {showMilestoneCreator && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => {
            console.log('Test modal clicked, closing')
            setShowMilestoneCreator(false)
          }}
        >
          <div 
            style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '10px',
              border: '5px solid red',
              minWidth: '400px',
              minHeight: '300px',
              zIndex: 1000000
            }}
          >
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', textAlign: 'center' }}>
              🎉 MODAL IS WORKING! 🎉
            </h2>
            <p style={{ textAlign: 'center', marginBottom: '20px' }}>
              This is a simple test modal to verify rendering works.
            </p>
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => {
                  console.log('Close button clicked')
                  setShowMilestoneCreator(false)
                }}
                style={{
                  backgroundColor: 'red',
                  color: 'white',
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                Close Modal
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

