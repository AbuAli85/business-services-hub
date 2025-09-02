'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Package,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  FileText,
  RefreshCw,
  Upload,
  Download,
  Paperclip,
  History,
  Link,
  Star,
  Edit,
  Save,
  X,
  Plus,
  Minus,
  TrendingUp,
  BarChart3,
  Clock3,
  Target,
  Award,
  Shield,
  Zap,
  Eye,
  Building,
  Lightbulb,
  Play,
  Code,
  Palette,
  Bug,
  Pause,
  SkipForward,
  FastForward,
  RotateCcw,
  RotateCw,
  Maximize2,
  Minimize2,
  Layout,
  Grid,
  List,
  Columns,
  Table2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Users,
  Filter,
  Tag,
  Timer,
  ChevronUp,
  ChevronDown,
  Copy,
  Trash2,
  Send,
  Bell
} from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import { authenticatedGet, authenticatedPost, authenticatedPatch } from '@/lib/api-utils'
import toast from 'react-hot-toast'
import { MessagesThread } from '@/components/dashboard/messages-thread'

interface Booking {
  id: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'approved' | 'declined' | 'rescheduled'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  created_at: string
  updated_at: string
  scheduled_date?: string
  scheduled_time?: string
  notes?: string
  amount?: number
  currency?: string
  estimated_duration?: string
  location?: string
  payment_status?: 'pending' | 'paid' | 'refunded'
  rating?: number
  review?: string
  service: {
    id: string
    name: string
    description?: string
    category?: string
  }
  client: {
    id: string
    full_name: string
    email: string
    phone?: string
    company_name?: string
  }
}

interface TimelineStep {
  status: string
  label: string
  date?: string
  completed: boolean
  icon: React.ReactNode
  description?: string
}

interface BookingHistory {
  id: string
  action: string
  description: string
  timestamp: string
  user: string
}

interface RelatedBooking {
  id: string
  service_name: string
  status: string
  created_at: string
  amount?: number
}

export default function BookingDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<'client' | 'provider' | 'admin' | null>(null)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview')
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [editedNotes, setEditedNotes] = useState('')
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  const [bookingHistory, setBookingHistory] = useState<BookingHistory[]>([])
  const [relatedBookings, setRelatedBookings] = useState<RelatedBooking[]>([])
  const [showAdvancedActions, setShowAdvancedActions] = useState(false)
  const [showStatusConfirmation, setShowStatusConfirmation] = useState(false)
  const [pendingStatusChange, setPendingStatusChange] = useState<string>('')
  const [statusChangeReason, setStatusChangeReason] = useState('')
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [showPriorityChange, setShowPriorityChange] = useState(false)
  const [showProgressUpdate, setShowProgressUpdate] = useState(false)
  const [progressUpdate, setProgressUpdate] = useState({
    progress_percentage: 0,
    milestone_notes: '',
    estimated_completion_date: '',
    actual_start_date: '',
    quality_score: 0
  })
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false)
  const [showServiceSuggestion, setShowServiceSuggestion] = useState(false)
  const [suggestedService, setSuggestedService] = useState({
    service_id: '',
    reason: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent'
  })
  const [availableServices, setAvailableServices] = useState<any[]>([])
  const [isLoadingServices, setIsLoadingServices] = useState(false)
  const [isCreatingSuggestion, setIsCreatingSuggestion] = useState(false)
  const [pendingPriorityChange, setPendingPriorityChange] = useState<string>('')
  const [showTimelineEdit, setShowTimelineEdit] = useState(false)
  const [customTimelineSteps, setCustomTimelineSteps] = useState<any[]>([])
  const [showQuickActions, setShowQuickActions] = useState(false)
  const [showExportOptions, setShowExportOptions] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [showClientDetails, setShowClientDetails] = useState(false)
  const [showServiceDetails, setShowServiceDetails] = useState(false)
  const [activeQuickAction, setActiveQuickAction] = useState<string>('')
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)
  const [confirmationData, setConfirmationData] = useState<any>(null)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [deleteReason, setDeleteReason] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [fileCategory, setFileCategory] = useState('contract')
  const [showAddMilestone, setShowAddMilestone] = useState(false)
  // Enhanced Task Management State
  const [projectTasks, setProjectTasks] = useState<any[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    status: 'not_started' as 'not_started' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    estimated_hours: '',
    actual_hours: '',
    start_date: '',
    due_date: '',
    category: 'development' as 'development' | 'design' | 'testing' | 'documentation' | 'meeting' | 'review',
    assigned_to: '',
    dependencies: [] as string[],
    tags: [] as string[],
    attachments: [] as any[]
  })
  const [isCreatingTask, setIsCreatingTask] = useState(false)
  const [editingTask, setEditingTask] = useState<any>(null)
  const [showTaskComments, setShowTaskComments] = useState<{ [key: string]: boolean }>({})
  const [taskComments, setTaskComments] = useState<{ [key: string]: string }>({})
  
  // Enhanced Features State
  const [milestones, setMilestones] = useState<any[]>([])
  const [taskTemplates, setTaskTemplates] = useState<any[]>([])
  const [showTaskDetails, setShowTaskDetails] = useState<{ [key: string]: boolean }>({})
  const [taskFilter, setTaskFilter] = useState({
    status: 'all',
    priority: 'all',
    category: 'all',
    assignee: 'all'
  })
  const [showGanttView, setShowGanttView] = useState(false)
  const [timeTracking, setTimeTracking] = useState<{ [key: string]: { start: Date | null, total: number } }>({})
  const [showTaskTemplates, setShowTaskTemplates] = useState(false)
  
  // Smart Tracking & Notifications State
  const [notificationSettings, setNotificationSettings] = useState({
    email: true,
    whatsapp: true,
    push: true,
    reports: true
  })
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([])
  const [approvalRequests, setApprovalRequests] = useState<any[]>([])
  const [showNotificationCenter, setShowNotificationCenter] = useState(false)
  const [trackingData, setTrackingData] = useState({
    lastUpdate: new Date().toISOString(),
    totalUpdates: 0,
    clientEngagement: 0,
    providerActivity: 0
  })
  // Suggestions state
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [creatingSuggestion, setCreatingSuggestion] = useState(false)
  const [newSuggestion, setNewSuggestion] = useState<{ service_id: string; reason: string; priority: 'low' | 'medium' | 'high' | 'urgent' }>({ service_id: '', reason: '', priority: 'medium' })
  // Timeline comments/reactions
  const [timelineComments, setTimelineComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [userReaction, setUserReaction] = useState<'up' | 'down' | null>(null)

  const bookingId = params.id as string

  useEffect(() => {
    if (bookingId) {
      loadBooking()
      loadBookingHistory()
      loadRelatedBookings()
      // Realtime subscription for booking updates
      setupRealtime()
      loadSuggestions()
      loadTimelineComments()
      loadProjectTasks()
    }
    return teardownRealtime
  }, [bookingId])

  // --- Realtime: bookings/messages/files ---
  let realtimeCleanup: (() => void) | null = null
  const setupRealtime = async () => {
    try {
      const supabase = await getSupabaseClient()
      const channel = supabase.channel(`booking_${bookingId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `id=eq.${bookingId}`
        }, (payload) => {
          // Refresh quick state on updates
          loadBooking()
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `booking_id=eq.${bookingId}`
        }, () => {
          // Ideally add incremental append; for now refresh the tab
          if (activeTab === 'messages') loadBooking()
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'files',
          filter: `booking_id=eq.${bookingId}`
        }, () => {
          if (activeTab === 'files') loadBooking()
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'booking_timeline_comments',
          filter: `booking_id=eq.${bookingId}`
        }, () => {
          if (activeTab === 'timeline') loadTimelineComments()
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'booking_timeline_reactions',
          filter: `booking_id=eq.${bookingId}`
        }, () => {
          if (activeTab === 'timeline') loadTimelineComments()
        })
        .subscribe()
      realtimeCleanup = () => {
        try { supabase.removeChannel(channel) } catch {}
      }
    } catch (e) {}
  }
  const teardownRealtime = () => {
    if (realtimeCleanup) realtimeCleanup()
  }

  // --- Suggestions ---
  const loadSuggestions = async () => {
    try {
      setLoadingSuggestions(true)
      const res = await authenticatedGet(`/api/service-suggestions?status=&limit=50`)
      if (!res.ok) {
        console.error('Failed to load suggestions:', res.status, await res.text())
        return
      }
      const data = await res.json()
      const filtered = (data.suggestions || []).filter((s: any) => s.original_booking_id === bookingId)
      setSuggestions(filtered)
    } catch (error) {
      console.error('Error loading suggestions:', error)
    } finally {
      setLoadingSuggestions(false)
    }
  }

  const createSuggestion = async () => {
    if (!booking || !newSuggestion.service_id || !newSuggestion.reason) return
    try {
      setCreatingSuggestion(true)
      const body = {
        client_id: (booking as any).client_id || booking.client?.id,
        suggested_service_id: newSuggestion.service_id,
        original_booking_id: booking.id,
        suggestion_reason: newSuggestion.reason,
        priority: newSuggestion.priority
      }
      const res = await authenticatedPost('/api/service-suggestions', body)
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload?.error || 'Failed to create suggestion')
      toast.success('Suggestion sent to client')
      setNewSuggestion({ service_id: '', reason: '', priority: 'medium' })
      loadSuggestions()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create suggestion')
    } finally {
      setCreatingSuggestion(false)
    }
  }

  const respondSuggestion = async (id: string, status: 'accepted' | 'declined' | 'viewed', notes?: string) => {
    try {
      const res = await authenticatedPatch(`/api/service-suggestions?id=${id}`, { status, response_notes: notes || '' })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload?.error || 'Failed to update suggestion')
      toast.success(status === 'accepted' ? 'Suggestion accepted' : status === 'declined' ? 'Suggestion declined' : 'Viewed')
      loadSuggestions()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update suggestion')
    }
  }

  // --- Enhanced Task Management Functions ---
  const loadProjectTasks = async () => {
    try {
      setLoadingTasks(true)
      // Enhanced mock data with more realistic project management features
      const mockTasks = [
        {
          id: '1',
          title: 'Project Setup & Requirements Gathering',
          description: 'Initial project setup, client requirements analysis, and project scope definition',
          status: 'completed',
          priority: 'high',
          category: 'documentation',
          estimated_hours: '8',
          actual_hours: '7.5',
          due_date: '2025-08-30',
          assigned_to: 'provider',
          tags: ['setup', 'requirements', 'planning'],
          dependencies: [],
          attachments: [
            { id: '1', name: 'Requirements.pdf', type: 'document', size: '2.3MB', url: '#' }
          ],
          created_at: '2025-08-25T10:00:00Z',
          updated_at: '2025-08-25T14:00:00Z',
          comments: [
            { id: '1', text: 'Requirements document prepared and sent to client', created_at: '2025-08-25T12:00:00Z', user: 'Provider' },
            { id: '2', text: 'Client approved requirements with minor adjustments', created_at: '2025-08-25T16:00:00Z', user: 'Client' }
          ]
        },
        {
          id: '2',
          title: 'Design & Development Phase',
          description: 'Create initial designs, wireframes, and begin development work',
          status: 'in_progress',
          priority: 'high',
          category: 'development',
          estimated_hours: '24',
          actual_hours: '12',
          due_date: '2025-09-15',
          assigned_to: 'provider',
          tags: ['design', 'development', 'wireframes'],
          dependencies: ['1'],
          attachments: [
            { id: '2', name: 'Wireframes.fig', type: 'design', size: '5.7MB', url: '#' },
            { id: '3', name: 'Progress_Screenshot.png', type: 'image', size: '1.2MB', url: '#' }
          ],
          created_at: '2025-08-26T09:00:00Z',
          updated_at: '2025-08-27T11:30:00Z',
          comments: [
            { id: '3', text: 'Wireframes completed, starting development', created_at: '2025-08-27T11:30:00Z', user: 'Provider' },
            { id: '4', text: 'Frontend layout 60% complete', created_at: '2025-08-28T14:00:00Z', user: 'Provider' }
          ]
        },
        {
          id: '3',
          title: 'Testing & Quality Assurance',
          description: 'Comprehensive testing, bug fixes, and quality assurance',
          status: 'not_started',
          priority: 'medium',
          category: 'testing',
          estimated_hours: '12',
          actual_hours: '0',
          due_date: '2025-09-20',
          assigned_to: 'provider',
          tags: ['testing', 'qa', 'bugs'],
          dependencies: ['2'],
          attachments: [],
          created_at: '2025-08-25T10:00:00Z',
          updated_at: '2025-08-25T10:00:00Z',
          comments: []
        },
        {
          id: '4',
          title: 'Client Review & Feedback',
          description: 'Present work to client and incorporate feedback',
          status: 'not_started',
          priority: 'medium',
          category: 'review',
          estimated_hours: '4',
          actual_hours: '0',
          due_date: '2025-09-22',
          assigned_to: 'client',
          tags: ['review', 'feedback', 'approval'],
          dependencies: ['3'],
          attachments: [],
          created_at: '2025-08-25T10:00:00Z',
          updated_at: '2025-08-25T10:00:00Z',
          comments: []
        }
      ]
      setProjectTasks(mockTasks)
      
      // Load task templates
      const templates = [
        {
          id: 'web-dev',
          name: 'Web Development Project',
          tasks: [
            { title: 'Requirements Gathering', category: 'documentation', estimated_hours: '8', priority: 'high' },
            { title: 'UI/UX Design', category: 'design', estimated_hours: '16', priority: 'high' },
            { title: 'Frontend Development', category: 'development', estimated_hours: '32', priority: 'high' },
            { title: 'Backend Development', category: 'development', estimated_hours: '24', priority: 'high' },
            { title: 'Testing & QA', category: 'testing', estimated_hours: '12', priority: 'medium' },
            { title: 'Client Review', category: 'review', estimated_hours: '4', priority: 'medium' },
            { title: 'Deployment', category: 'development', estimated_hours: '8', priority: 'medium' }
          ]
        },
        {
          id: 'marketing',
          name: 'Digital Marketing Campaign',
          tasks: [
            { title: 'Campaign Strategy', category: 'documentation', estimated_hours: '6', priority: 'high' },
            { title: 'Content Creation', category: 'design', estimated_hours: '20', priority: 'high' },
            { title: 'Social Media Setup', category: 'development', estimated_hours: '8', priority: 'medium' },
            { title: 'Campaign Launch', category: 'development', estimated_hours: '4', priority: 'high' },
            { title: 'Performance Analysis', category: 'review', estimated_hours: '6', priority: 'medium' }
          ]
        }
      ]
      setTaskTemplates(templates)
      
      // Load milestones
      const projectMilestones = [
        {
          id: 'm1',
          title: 'Project Kickoff',
          description: 'Project officially started',
          date: '2025-08-25',
          status: 'completed',
          tasks: ['1']
        },
        {
          id: 'm2',
          title: 'Design Approval',
          description: 'Client approves designs and wireframes',
          date: '2025-09-05',
          status: 'pending',
          tasks: ['2']
        },
        {
          id: 'm3',
          title: 'Development Complete',
          description: 'All development work finished',
          date: '2025-09-15',
          status: 'pending',
          tasks: ['2', '3']
        },
        {
          id: 'm4',
          title: 'Project Delivery',
          description: 'Final delivery to client',
          date: '2025-09-25',
          status: 'pending',
          tasks: ['4']
        }
      ]
      setMilestones(projectMilestones)
      
    } catch (error) {
      console.error('Error loading tasks:', error)
    } finally {
      setLoadingTasks(false)
    }
  }

  const createTask = async () => {
    if (!newTask.title.trim()) {
      toast.error('Task title is required')
      return
    }
    
    try {
      setIsCreatingTask(true)
      const task = {
        id: Date.now().toString(),
        ...newTask,
        actual_hours: '0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        comments: [],
        attachments: []
      }
      
      setProjectTasks(prev => [task, ...prev])
      setNewTask({
        title: '',
        description: '',
        status: 'not_started',
        priority: 'medium',
        estimated_hours: '',
        actual_hours: '',
        start_date: '',
        due_date: '',
        category: 'development',
        assigned_to: '',
        dependencies: [],
        tags: [],
        attachments: []
      })
      setShowAddMilestone(false)
      toast.success('Task created successfully')
    } catch (error) {
      toast.error('Failed to create task')
    } finally {
      setIsCreatingTask(false)
    }
  }

  const createTaskFromTemplate = async (templateId: string) => {
    const template = taskTemplates.find(t => t.id === templateId)
    if (!template) return

    try {
      setIsCreatingTask(true)
      const newTasks = template.tasks.map((taskTemplate: any, index: number) => ({
        id: (Date.now() + index).toString(),
        title: taskTemplate.title,
        description: `Generated from ${template.name} template`,
        status: 'not_started',
        priority: taskTemplate.priority,
        category: taskTemplate.category,
        estimated_hours: taskTemplate.estimated_hours,
        actual_hours: '0',
        due_date: '',
        assigned_to: 'provider',
        dependencies: index > 0 ? [(Date.now() + index - 1).toString()] : [],
        tags: [template.name.toLowerCase().replace(/\s+/g, '-')],
        attachments: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        comments: []
      }))

      setProjectTasks(prev => [...newTasks, ...prev])
      setShowTaskTemplates(false)
      toast.success(`Created ${newTasks.length} tasks from ${template.name} template`)
    } catch (error) {
      toast.error('Failed to create tasks from template')
    } finally {
      setIsCreatingTask(false)
    }
  }

  const startTimeTracking = (taskId: string) => {
    setTimeTracking(prev => ({
      ...prev,
      [taskId]: {
        start: new Date(),
        total: prev[taskId]?.total || 0
      }
    }))
    toast.success('Time tracking started')
  }

  const stopTimeTracking = (taskId: string) => {
    setTimeTracking(prev => {
      const current = prev[taskId]
      if (!current?.start) return prev

      const elapsed = (new Date().getTime() - current.start.getTime()) / (1000 * 60 * 60) // hours
      return {
        ...prev,
        [taskId]: {
          start: null,
          total: current.total + elapsed
        }
      }
    })
    toast.success('Time tracking stopped')
  }

  const toggleTaskDetails = (taskId: string) => {
    setShowTaskDetails(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }))
  }

  const deleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return
    
    try {
      setProjectTasks(prev => prev.filter(task => task.id !== taskId))
      toast.success('Task deleted successfully')
    } catch (error) {
      toast.error('Failed to delete task')
    }
  }

  const duplicateTask = async (taskId: string) => {
    const task = projectTasks.find(t => t.id === taskId)
    if (!task) return

    try {
      const duplicatedTask = {
        ...task,
        id: Date.now().toString(),
        title: `${task.title} (Copy)`,
        status: 'not_started',
        actual_hours: '0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        comments: []
      }
      
      setProjectTasks(prev => [duplicatedTask, ...prev])
      toast.success('Task duplicated successfully')
    } catch (error) {
      toast.error('Failed to duplicate task')
    }
  }

  // Smart Tracking & Notification Functions
  const sendNotification = async (type: 'email' | 'whatsapp' | 'push', message: string, recipient: 'client' | 'provider') => {
    try {
      // Simulate notification sending
      console.log(`Sending ${type} notification to ${recipient}: ${message}`)
      
      if (notificationSettings[type]) {
        // In real implementation, this would call your notification service
        toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} notification sent to ${recipient}`)
        
        // Update tracking data
        setTrackingData(prev => ({
          ...prev,
          totalUpdates: prev.totalUpdates + 1,
          lastUpdate: new Date().toISOString(),
          [recipient === 'client' ? 'clientEngagement' : 'providerActivity']: prev[recipient === 'client' ? 'clientEngagement' : 'providerActivity'] + 1
        }))
      }
    } catch (error) {
      toast.error(`Failed to send ${type} notification`)
    }
  }

  const requestApproval = async (taskId: string, type: 'milestone' | 'completion' | 'change') => {
    try {
      const task = projectTasks.find(t => t.id === taskId)
      if (!task) return

      const approvalRequest = {
        id: Date.now().toString(),
        taskId,
        taskTitle: task.title,
        type,
        requestedBy: 'provider',
        requestedAt: new Date().toISOString(),
        status: 'pending',
        message: `Please review and approve ${type} for: ${task.title}`
      }

      setApprovalRequests(prev => [approvalRequest, ...prev])
      
      // Send notification to client
      await sendNotification('email', 
        `New approval request: ${task.title} (${type})`, 
        'client'
      )
      
      toast.success('Approval request sent to client')
    } catch (error) {
      toast.error('Failed to send approval request')
    }
  }

  const handleApproval = async (requestId: string, approved: boolean, notes?: string) => {
    try {
      setApprovalRequests(prev => prev.map(req => 
        req.id === requestId 
          ? { ...req, status: approved ? 'approved' : 'rejected', responseNotes: notes, respondedAt: new Date().toISOString() }
          : req
      ))
      
      const request = approvalRequests.find(r => r.id === requestId)
      if (request) {
        // Send notification to provider
        await sendNotification('email', 
          `Approval ${approved ? 'granted' : 'denied'} for: ${request.taskTitle}`, 
          'provider'
        )
      }
      
      toast.success(`Request ${approved ? 'approved' : 'rejected'} successfully`)
    } catch (error) {
      toast.error('Failed to process approval')
    }
  }

  const generateProgressReport = async () => {
    try {
      const report = {
        id: Date.now().toString(),
        generatedAt: new Date().toISOString(),
        projectProgress: Math.round((filteredTasks.filter(t => t.status === 'completed').length / Math.max(filteredTasks.length, 1)) * 100),
        completedTasks: filteredTasks.filter(t => t.status === 'completed').length,
        inProgressTasks: filteredTasks.filter(t => t.status === 'in_progress').length,
        pendingTasks: filteredTasks.filter(t => t.status === 'not_started').length,
        totalHours: filteredTasks.reduce((sum, task) => sum + parseFloat(task.actual_hours || '0'), 0),
        estimatedHours: filteredTasks.reduce((sum, task) => sum + parseFloat(task.estimated_hours || '0'), 0),
        pendingApprovals: approvalRequests.filter(r => r.status === 'pending').length
      }

      // Send report via email and WhatsApp
      await sendNotification('email', 
        `Weekly Progress Report - ${report.projectProgress}% Complete`, 
        userRole === 'provider' ? 'client' : 'provider'
      )
      
      if (notificationSettings.whatsapp) {
        await sendNotification('whatsapp', 
          `📊 Project Update: ${report.projectProgress}% complete. ${report.completedTasks} tasks done, ${report.inProgressTasks} in progress.`, 
          userRole === 'provider' ? 'client' : 'provider'
        )
      }
      
      toast.success('Progress report generated and sent!')
    } catch (error) {
      toast.error('Failed to generate progress report')
    }
  }

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      setProjectTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, status: newStatus, updated_at: new Date().toISOString() }
          : task
      ))
      toast.success('Task status updated')
    } catch (error) {
      toast.error('Failed to update task status')
    }
  }

  const addTaskComment = async (taskId: string) => {
    const comment = taskComments[taskId]?.trim()
    if (!comment) return
    
    try {
      const newComment = {
        id: Date.now().toString(),
        text: comment,
        created_at: new Date().toISOString(),
        user: 'Provider'
      }
      
      setProjectTasks(prev => prev.map(task =>
        task.id === taskId
          ? { ...task, comments: [...(task.comments || []), newComment], updated_at: new Date().toISOString() }
          : task
      ))
      
      setTaskComments(prev => ({ ...prev, [taskId]: '' }))
      toast.success('Comment added')
    } catch (error) {
      toast.error('Failed to add comment')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'on_hold': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'development': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'design': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'testing': return 'bg-green-100 text-green-800 border-green-200'
      case 'documentation': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'meeting': return 'bg-indigo-100 text-indigo-800 border-indigo-200'
      case 'review': return 'bg-orange-100 text-orange-800 border-orange-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'development': return <Code className="h-4 w-4" />
      case 'design': return <Palette className="h-4 w-4" />
      case 'testing': return <Bug className="h-4 w-4" />
      case 'documentation': return <FileText className="h-4 w-4" />
      case 'meeting': return <Users className="h-4 w-4" />
      case 'review': return <Eye className="h-4 w-4" />
      default: return <Package className="h-4 w-4" />
    }
  }

  const filteredTasks = projectTasks.filter(task => {
    if (taskFilter.status !== 'all' && task.status !== taskFilter.status) return false
    if (taskFilter.priority !== 'all' && task.priority !== taskFilter.priority) return false
    if (taskFilter.category !== 'all' && task.category !== taskFilter.category) return false
    if (taskFilter.assignee !== 'all' && task.assigned_to !== taskFilter.assignee) return false
    return true
  })

  // --- Timeline comments & reactions ---
  const loadTimelineComments = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data, error } = await supabase
        .from('booking_timeline_comments')
        .select('id, booking_id, user_id, comment, created_at, reaction')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false })
      if (!error) setTimelineComments(data || [])
    } catch {}
  }

  const addTimelineComment = async () => {
    if (!newComment.trim()) return
    try {
      const supabase = await getSupabaseClient()
      const { error } = await supabase
        .from('booking_timeline_comments')
        .insert({ booking_id: bookingId, comment: newComment })
      if (error) throw error
      setNewComment('')
      loadTimelineComments()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to add comment')
    }
  }

  const setReaction = async (reaction: 'up' | 'down') => {
    try {
      setUserReaction(reaction)
      const supabase = await getSupabaseClient()
      // Upsert user reaction
      await supabase
        .from('booking_timeline_reactions')
        .upsert({ booking_id: bookingId, reaction })
      loadTimelineComments()
    } catch {}
  }

  const loadBooking = async () => {
    try {
      setLoading(true)
      const supabase = await getSupabaseClient()
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Please sign in to view booking details')
        router.push('/auth/sign-in')
        return
      }
      
      setUser(user)
      
      // Get user profile to determine role
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('id', user.id)
        .maybeSingle()
      setUserRole((profile?.role as any) || null)
      
      // Load booking details based on user role
      let bookingData: any = null
      let error: any = null

      if (profile?.role === 'provider') {
        const { data, error: providerError } = await supabase
          .from('bookings')
          .select('*')
          .eq('id', bookingId)
          .eq('provider_id', user.id)
          .maybeSingle()
        
        bookingData = data
        error = providerError
      } else if (profile?.role === 'client') {
        const { data, error: clientError } = await supabase
          .from('bookings')
          .select('*')
          .eq('id', bookingId)
          .eq('client_id', user.id)
          .maybeSingle()
        
        bookingData = data
        error = clientError
      } else {
        // Fallback: check if user is either client or provider for this booking
        // Use separate queries and check if either returns results
        const [clientBooking, providerBooking] = await Promise.all([
          supabase
            .from('bookings')
            .select('*')
            .eq('id', bookingId)
            .eq('client_id', user.id)
            .maybeSingle(),
          supabase
            .from('bookings')
            .select('*')
            .eq('id', bookingId)
            .eq('provider_id', user.id)
            .maybeSingle()
        ])
        
        // Use whichever booking was found
        bookingData = clientBooking.data || providerBooking.data
        error = clientBooking.error || providerBooking.error
      }

      if (error) {
        console.error('Error loading booking:', error)
        toast.error('Failed to load booking details')
        return
      }

      if (!bookingData) {
        toast.error('Booking not found')
        router.push('/dashboard/bookings')
        return
      }

      // Load related data separately to avoid relationship conflicts
      let serviceData: any = null
      let clientData: any = null

      if (bookingData.service_id) {
        try {
          const { data, error: serviceError } = await supabase
            .from('services')
            .select('id, title, description, category')
            .eq('id', bookingData.service_id)
            .maybeSingle() // Use maybeSingle instead of single to handle no rows
          
          if (!serviceError && data) {
            serviceData = data
          }
        } catch (serviceError) {
          console.warn('Could not load service data:', serviceError)
        }
      }

      if (bookingData.client_id) {
        try {
          const { data, error: clientError } = await supabase
            .from('profiles')
            .select('id, full_name, email, phone, company_name')
            .eq('id', bookingData.client_id)
            .maybeSingle() // Use maybeSingle instead of single to handle no rows
          
          if (!clientError && data) {
            clientData = data
          }
        } catch (clientError) {
          console.warn('Could not load client data:', clientError)
        }
      }

      // Transform the data
      const transformedBooking: Booking = {
        id: bookingData.id,
        status: bookingData.status,
        priority: bookingData.priority || 'normal',
        created_at: bookingData.created_at,
        updated_at: bookingData.updated_at,
        scheduled_date: bookingData.scheduled_date,
        scheduled_time: bookingData.scheduled_time,
        notes: bookingData.notes,
        amount: bookingData.amount,
        currency: bookingData.currency,
        estimated_duration: bookingData.estimated_duration,
        location: bookingData.location,
        payment_status: bookingData.payment_status,
        rating: bookingData.rating,
        review: bookingData.review,
        service: {
          id: serviceData?.id || '',
          name: serviceData?.title || 'Unknown Service',
          description: serviceData?.description,
          category: serviceData?.category
        },
        client: {
          id: clientData?.id || '',
          full_name: clientData?.full_name || 'Unknown Client',
          email: clientData?.email || '',
          phone: clientData?.phone,
          company_name: clientData?.company_name
        }
      }

      setBooking(transformedBooking)
      setEditedNotes(transformedBooking.notes || '')
      setLoading(false)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to load booking details')
      setLoading(false)
    }
  }

  const loadBookingHistory = async () => {
    try {
      const supabase = await getSupabaseClient()
      // This would typically come from a booking_logs or audit table
      // For now, we'll create mock data
      const mockHistory: BookingHistory[] = [
        {
          id: '1',
          action: 'Status Updated',
          description: 'Booking status changed from "pending" to "in_progress"',
          timestamp: new Date().toISOString(),
          user: 'Provider'
        },
        {
          id: '2',
          action: 'Note Added',
          description: 'Added note: "Client requested additional consultation"',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          user: 'Provider'
        },
        {
          id: '3',
          action: 'Booking Created',
          description: 'New booking created by client',
          timestamp: new Date(Date.now() - 172800000).toISOString(),
          user: 'Client'
        }
      ]
      setBookingHistory(mockHistory)
    } catch (error) {
      console.error('Error loading booking history:', error)
    }
  }

  const loadRelatedBookings = async () => {
    try {
      // Only load related bookings if we have a client ID and it's different from the current booking
      if (!booking?.client?.id) {
        setRelatedBookings([])
        return
      }

      const supabase = await getSupabaseClient()
      // Load bookings from the same client, excluding the current booking
      const { data: relatedData, error } = await supabase
        .from('bookings')
        .select('id, created_at, amount, service_id')
        .eq('client_id', booking.client.id)
        .order('created_at', { ascending: false })
        .limit(6) // Get one extra to account for potential filtering

      if (!error && relatedData) {
        // Load service names for related bookings
        const serviceIds = relatedData.map(b => b.service_id).filter(Boolean)
        let servicesData: any[] = []
        
        if (serviceIds.length > 0) {
          try {
            const { data } = await supabase
              .from('services')
              .select('id, name')
              .in('id', serviceIds)
            servicesData = data || []
          } catch (serviceError) {
            console.warn('Could not load related service data:', serviceError)
            servicesData = []
          }
        }

        const transformedRelated: RelatedBooking[] = relatedData
          .filter(relatedBooking => relatedBooking.id !== bookingId) // Filter out current booking
          .slice(0, 5) // Ensure we only show max 5
          .map(relatedBooking => {
            const service = servicesData?.find(s => s.id === relatedBooking.service_id)
            return {
              id: relatedBooking.id,
              service_name: service?.name || 'Unknown Service',
              status: 'completed', // Mock status
              created_at: relatedBooking.created_at,
              amount: relatedBooking.amount
            }
          })
        setRelatedBookings(transformedRelated)
      }
    } catch (error) {
      console.error('Error loading related bookings:', error)
    }
  }

  const handleMarkComplete = async () => {
    if (!booking) return
    
    try {
      setIsUpdatingStatus(true)
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: 'completed',
          operational_status: 'done',
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id)

      if (error) {
        console.error('Error updating booking:', error)
        toast.error('Failed to mark booking as complete')
        return
      }

      toast.success('Booking marked as complete!')
      loadBooking() // Reload to get updated data
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to update booking status')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleUpdateNotes = async () => {
    if (!booking) return
    
    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('bookings')
        .update({ 
          notes: editedNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id)

      if (error) {
        console.error('Error updating notes:', error)
        toast.error('Failed to update notes')
        return
      }

      toast.success('Notes updated successfully!')
      setBooking(prev => prev ? { ...prev, notes: editedNotes } : null)
      setIsEditingNotes(false)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to update notes')
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!booking) return
    
    // Check if status change requires confirmation
    const requiresConfirmation = ['cancelled', 'declined', 'rescheduled'].includes(newStatus)
    
    if (requiresConfirmation) {
      setPendingStatusChange(newStatus)
      setShowStatusConfirmation(true)
      return
    }
    
    await updateBookingStatus(newStatus)
  }

  const updateBookingStatus = async (newStatus: string, reason?: string) => {
    if (!booking) return
    
    try {
      setIsUpdatingStatus(true)
      const supabase = await getSupabaseClient()
      
      const updateData: any = { 
        status: newStatus,
        updated_at: new Date().toISOString()
      }
      
      // Add reason if provided
      if (reason) {
        updateData.status_change_reason = reason
      }
      
      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', booking.id)

      if (error) {
        console.error('Error updating status:', error)
        toast.error('Failed to update status')
        return
      }

      // Add to booking history
      const historyEntry: BookingHistory = {
        id: Date.now().toString(),
        action: 'Status Updated',
        description: `Status changed from "${booking.status}" to "${newStatus}"${reason ? ` - Reason: ${reason}` : ''}`,
        timestamp: new Date().toISOString(),
        user: 'Provider'
      }
      
      setBookingHistory(prev => [historyEntry, ...prev])

      toast.success(`Status updated to ${newStatus}!`)
      loadBooking() // Reload to get updated data
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to update status')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const confirmStatusChange = async () => {
    if (pendingStatusChange && statusChangeReason.trim()) {
      await updateBookingStatus(pendingStatusChange, statusChangeReason.trim())
      setShowStatusConfirmation(false)
      setPendingStatusChange('')
      setStatusChangeReason('')
    } else {
      toast.error('Please provide a reason for the status change')
    }
  }

  const cancelStatusChange = () => {
    setShowStatusConfirmation(false)
    setPendingStatusChange('')
    setStatusChangeReason('')
  }

  const handlePriorityChange = async (newPriority: string) => {
    if (!booking) return
    
    try {
      setIsUpdatingStatus(true)
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('bookings')
        .update({ 
          priority: newPriority,
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id)

      if (error) {
        console.error('Error updating priority:', error)
        toast.error('Failed to update priority')
        return
      }

      // Add to booking history
      const historyEntry: BookingHistory = {
        id: Date.now().toString(),
        action: 'Priority Updated',
        description: `Priority changed from "${booking.priority}" to "${newPriority}"`,
        timestamp: new Date().toISOString(),
        user: 'Provider'
      }
      
      setBookingHistory(prev => [historyEntry, ...prev])

      toast.success(`Priority updated to ${newPriority}!`)
      loadBooking() // Reload to get updated data
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to update priority')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleSaveNotes = async () => {
    if (!booking || !editedNotes.trim()) return
    
    try {
      setIsSavingNotes(true)
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('bookings')
        .update({ 
          notes: editedNotes.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id)

      if (error) {
        console.error('Error saving notes:', error)
        toast.error('Failed to save notes')
        return
      }

      // Add to booking history
      const historyEntry: BookingHistory = {
        id: Date.now().toString(),
        action: 'Notes Updated',
        description: `Notes updated: "${editedNotes.trim().substring(0, 100)}${editedNotes.trim().length > 100 ? '...' : ''}"`,
        timestamp: new Date().toISOString(),
        user: 'Provider'
      }
      
      setBookingHistory(prev => [historyEntry, ...prev])

      toast.success('Notes saved successfully!')
      setIsEditingNotes(false)
      loadBooking() // Reload to get updated data
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to save notes')
    } finally {
      setIsSavingNotes(false)
    }
  }

  const handleCancelNotes = () => {
    setEditedNotes(booking?.notes || '')
    setIsEditingNotes(false)
  }

  const handleDeleteBooking = async () => {
    if (!booking) return
    
    // Immediately close modal and show loading state
    setShowDeleteConfirmation(false)
    setDeleteReason('')
    
    try {
      setIsUpdatingStatus(true)
      
      // Use setTimeout to defer heavy operations and prevent UI blocking
      setTimeout(async () => {
        try {
          const supabase = await getSupabaseClient()
          
          // First, check if we can actually delete this booking
          if (['completed', 'cancelled'].includes(booking.status)) {
            // For completed/cancelled bookings, we can delete
            const { error } = await supabase
              .from('bookings')
              .delete()
              .eq('id', booking.id)
            
            if (error) {
              console.error('Error deleting booking:', error)
              toast.error('Failed to delete booking')
              setIsUpdatingStatus(false)
              return
            }
            
            toast.success('Booking deleted successfully!')
            router.push('/dashboard/bookings')
          } else {
            // For active bookings, we should cancel instead of delete
            const { error } = await supabase
              .from('bookings')
              .update({ 
                status: 'cancelled',
                updated_at: new Date().toISOString(),
                status_change_reason: 'Booking cancelled by provider'
              })
              .eq('id', booking.id)
            
            if (error) {
              console.error('Error cancelling booking:', error)
              toast.error('Failed to cancel booking')
              setIsUpdatingStatus(false)
              return
            }
            
            toast.success('Booking cancelled successfully!')
            loadBooking() // Reload to get updated data
          }
        } catch (error) {
          console.error('Error:', error)
          toast.error('Failed to process booking deletion')
          setIsUpdatingStatus(false)
        }
      }, 0) // Defer to next tick
      
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to process booking deletion')
      setIsUpdatingStatus(false)
    }
  }

  const handleExportBooking = async () => {
    if (!booking) return
    
    try {
      setIsExporting(true)
      
      // Use requestIdleCallback to prevent UI blocking during export
      const performExport = async () => {
        try {
          // Create a comprehensive booking report
          const reportData = {
            booking_id: booking.id,
            service_name: booking.service.name,
            client_name: booking.client.full_name,
            status: booking.status,
            priority: booking.priority,
            created_at: booking.created_at,
            amount: booking.amount,
            notes: booking.notes,
            timeline_progress: getTimelineProgress(),
            days_active: getDaysSinceCreation(),
            next_milestone: getNextMilestone()
          }
          
          // Convert to JSON and download
          const dataStr = JSON.stringify(reportData, null, 2)
          const dataBlob = new Blob([dataStr], { type: 'application/json' })
          const url = URL.createObjectURL(dataBlob)
          const link = document.createElement('a')
          link.href = url
          link.download = `booking-${booking.id.slice(0, 8)}-report.json`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(url)
          
          toast.success('Booking report exported successfully!')
        } catch (error) {
          console.error('Error exporting booking:', error)
          toast.error('Failed to export booking report')
        } finally {
          setIsExporting(false)
        }
      }

      // Defer heavy operations to prevent UI blocking
      if (window.requestIdleCallback) {
        window.requestIdleCallback(performExport)
      } else {
        setTimeout(performExport, 0)
      }
      
    } catch (error) {
      console.error('Error exporting booking:', error)
      toast.error('Failed to export booking report')
      setIsExporting(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setSelectedFiles(files)
  }

  const handleFileUpload = async () => {
    if (selectedFiles.length === 0 || !booking) {
      toast.error('Please select files to upload')
      return
    }
    try {
      setIsUploading(true)
      const supabase = await getSupabaseClient()
      for (const file of selectedFiles) {
        const ext = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const objectPath = `booking-files/${booking.id}/${fileCategory}/${fileName}`
        const { error: uploadError } = await supabase.storage
          .from('message-files')
          .upload(objectPath, file)
        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('message-files')
          .getPublicUrl(objectPath)

        setUploadedFiles(prev => [{
          id: objectPath,
          name: file.name,
          category: fileCategory,
          size: formatFileSize(file.size),
          uploadedAt: new Date().toISOString(),
          type: file.type,
          url: publicUrl
        }, ...prev])
      }
      toast.success(`${selectedFiles.length} file(s) uploaded successfully!`)
      setSelectedFiles([])
      setShowFileUpload(false)
      const historyEntry: BookingHistory = {
        id: Date.now().toString(),
        action: 'Files Uploaded',
        description: `Uploaded ${selectedFiles.length} file(s) in category: ${fileCategory}`,
        timestamp: new Date().toISOString(),
        user: 'Provider'
      }
      setBookingHistory(prev => [historyEntry, ...prev])
    } catch (error: any) {
      console.error('Error uploading files:', error)
      toast.error(error?.message || 'Failed to upload files')
    } finally {
      setIsUploading(false)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleFileDownload = (file: any) => {
    if (file?.url) {
      window.open(file.url, '_blank')
    } else {
      toast.error('File URL not found')
    }
  }

  const handleFileDelete = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
    toast.success('File removed successfully')
    
    // Add to booking history
    const historyEntry: BookingHistory = {
      id: Date.now().toString(),
      action: 'File Removed',
      description: 'File removed from booking',
      timestamp: new Date().toISOString(),
      user: 'Provider'
    }
    setBookingHistory(prev => [historyEntry, ...prev])
  }

  const handleUpdateProgress = async () => {
    if (!booking) return

    try {
      setIsUpdatingProgress(true)
      const supabase = await getSupabaseClient()

      // Update booking with progress information
      const { error } = await supabase
        .from('bookings')
        .update({
          progress_percentage: progressUpdate.progress_percentage,
          milestone_notes: progressUpdate.milestone_notes,
          estimated_completion_date: progressUpdate.estimated_completion_date || null,
          actual_start_date: progressUpdate.actual_start_date || null,
          quality_score: progressUpdate.quality_score || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id)

      if (error) {
        console.error('Error updating progress:', error)
        toast.error('Failed to update progress')
        return
      }

      // Update local state
      setBooking(prev => prev ? {
        ...prev,
        progress_percentage: progressUpdate.progress_percentage,
        milestone_notes: progressUpdate.milestone_notes,
        estimated_completion_date: progressUpdate.estimated_completion_date,
        actual_start_date: progressUpdate.actual_start_date,
        quality_score: progressUpdate.quality_score,
        updated_at: new Date().toISOString()
      } : null)

      // Reset form
      setProgressUpdate({
        progress_percentage: 0,
        milestone_notes: '',
        estimated_completion_date: '',
        actual_start_date: '',
        quality_score: 0
      })
      setShowProgressUpdate(false)

      toast.success('Progress updated successfully!')
    } catch (error) {
      console.error('Error updating progress:', error)
      toast.error('Failed to update progress')
    } finally {
      setIsUpdatingProgress(false)
    }
  }

  const handleOpenProgressUpdate = () => {
    if (booking) {
      setProgressUpdate({
        progress_percentage: (booking as any).progress_percentage || 0,
        milestone_notes: (booking as any).milestone_notes || '',
        estimated_completion_date: (booking as any).estimated_completion_date || '',
        actual_start_date: (booking as any).actual_start_date || '',
        quality_score: (booking as any).quality_score || 0
      })
    }
    setShowProgressUpdate(true)
  }

  const loadAvailableServices = async () => {
    if (!user?.id) return

    try {
      setIsLoadingServices(true)
      const supabase = await getSupabaseClient()

      const { data: services, error } = await supabase
        .from('services')
        .select('id, title, description, base_price, currency, category')
        .eq('provider_id', user.id)
        .eq('approval_status', 'approved')
        .eq('status', 'active')
        .order('title')

      if (error) {
        console.error('Error loading services:', error)
        toast.error('Failed to load services')
        return
      }

      setAvailableServices(services || [])
    } catch (error) {
      console.error('Error loading services:', error)
      toast.error('Failed to load services')
    } finally {
      setIsLoadingServices(false)
    }
  }

  const handleOpenServiceSuggestion = async () => {
    await loadAvailableServices()
    setShowServiceSuggestion(true)
  }

  const handleCreateServiceSuggestion = async () => {
    if (!booking || !suggestedService.service_id || !suggestedService.reason.trim()) {
      toast.error('Please select a service and provide a reason')
      return
    }

    try {
      setIsCreatingSuggestion(true)
      const supabase = await getSupabaseClient()

      const { data, error } = await supabase
        .from('service_suggestions')
        .insert({
          provider_id: user.id,
          client_id: (booking as any).client_id || booking.client?.id,
          suggested_service_id: suggestedService.service_id,
          original_booking_id: booking.id,
          suggestion_reason: suggestedService.reason,
          priority: suggestedService.priority,
          status: 'pending'
        })
        .select(`
          *,
          suggested_service:services(id, title, description, base_price, currency)
        `)
        .single()

      if (error) {
        console.error('Error creating suggestion:', error)
        toast.error('Failed to create service suggestion')
        return
      }

      // Reset form
      setSuggestedService({
        service_id: '',
        reason: '',
        priority: 'medium'
      })
      setShowServiceSuggestion(false)

      toast.success('Service suggestion sent successfully!')
    } catch (error) {
      console.error('Error creating suggestion:', error)
      toast.error('Failed to create service suggestion')
    } finally {
      setIsCreatingSuggestion(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pending', variant: 'secondary' as const },
      in_progress: { label: 'In Progress', variant: 'default' as const },
      completed: { label: 'Completed', variant: 'default' as const },
      cancelled: { label: 'Cancelled', variant: 'destructive' as const },
      approved: { label: 'Approved', variant: 'default' as const },
      declined: { label: 'Declined', variant: 'destructive' as const },
      rescheduled: { label: 'Rescheduled', variant: 'secondary' as const }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, variant: 'secondary' as const }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: { label: 'Low', variant: 'secondary' as const },
      normal: { label: 'Normal', variant: 'default' as const },
      high: { label: 'High', variant: 'destructive' as const },
      urgent: { label: 'Urgent', variant: 'destructive' as const }
    }

    const config = priorityConfig[priority as keyof typeof priorityConfig] || { label: priority, variant: 'secondary' as const }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'OMR'
    }).format(amount)
  }

  const getTimelineSteps = (): TimelineStep[] => {
    if (!booking) return []
    
    const steps: TimelineStep[] = [
      {
        status: 'booked',
        label: 'Booked',
        date: booking.created_at,
        completed: true,
        icon: <Calendar className="h-4 w-4" />,
        description: 'Booking was created and confirmed'
      },
      {
        status: 'in_progress',
        label: 'In Progress',
        date: booking.status === 'in_progress' || booking.status === 'completed' ? booking.updated_at : undefined,
        completed: ['in_progress', 'completed'].includes(booking.status),
        icon: <RefreshCw className="h-4 w-4" />,
        description: 'Work has begun on the service'
      },
      {
        status: 'completed',
        label: 'Completed',
        date: booking.status === 'completed' ? booking.updated_at : undefined,
        completed: booking.status === 'completed',
        icon: <CheckCircle className="h-4 w-4" />,
        description: 'Service has been delivered successfully'
      }
    ]

    return steps
  }

  const getTimelineProgress = () => {
    if (!booking) return 0

    const steps = getTimelineSteps()
    const completedSteps = steps.filter(step => step.completed).length
    return completedSteps / steps.length
  }

  const getEstimatedCompletion = () => {
    if (!booking || !booking.estimated_duration) return 'N/A'
    const estimatedDate = new Date(booking.created_at)
    const duration = booking.estimated_duration.split(' ')[0] // Extract number of days
    const unit = booking.estimated_duration.split(' ')[1] // Extract unit (e.g., 'days', 'hours')

    if (unit === 'days') {
      estimatedDate.setDate(estimatedDate.getDate() + parseInt(duration, 10))
    } else if (unit === 'hours') {
      estimatedDate.setHours(estimatedDate.getHours() + parseInt(duration, 10))
    }

    return estimatedDate.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getDaysSinceCreation = () => {
    if (!booking || !booking.created_at) return 'N/A'
    const createdAt = new Date(booking.created_at)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - createdAt.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getStatusEfficiency = () => {
    if (!booking || !booking.updated_at) return 'N/A'
    const createdAt = new Date(booking.created_at)
    const updatedAt = new Date(booking.updated_at)
    const diffTime = Math.abs(updatedAt.getTime() - createdAt.getTime())
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60))

    if (diffHours < 24) {
      return `${diffHours}h`
    } else {
      return `${Math.floor(diffHours / 24)}d`
    }
  }

  const getClientSatisfaction = () => {
    if (!booking || booking.rating === undefined) return 'N/A'
    return `${booking.rating}/5`
  }

  const getRevenueImpact = () => {
    if (!booking || booking.amount === undefined) return 'N/A'
    return formatCurrency(booking.amount)
  }

  const getBookingHealth = () => {
    if (!booking) return 'N/A'
    
    const daysActive = getDaysSinceCreation()
    if (daysActive === 'N/A') return 'N/A'
    
    if (daysActive <= 3) return 'Excellent'
    if (daysActive <= 7) return 'Good'
    if (daysActive <= 14) return 'Fair'
    return 'Needs Attention'
  }

  const getNextMilestone = () => {
    if (!booking) return 'N/A'
    
    if (booking.status === 'pending') return 'Start Work'
    if (booking.status === 'in_progress') return 'Complete Service'
    if (booking.status === 'completed') return 'Get Review'
    return 'N/A'
  }

  const getBookingScore = () => {
    if (!booking) return 0
    
    let score = 0
    if (booking.status === 'completed') score += 40
    if (booking.priority === 'high' || booking.priority === 'urgent') score += 20
    if (booking.notes) score += 15
    if (booking.rating && booking.rating >= 4) score += 25
    
    return Math.min(score, 100)
  }

  const getTimeToDeadline = () => {
    if (!booking || !booking.estimated_duration) return 'N/A'
    
    const createdAt = new Date(booking.created_at)
    const now = new Date()
    const duration = parseInt(booking.estimated_duration.split(' ')[0])
    const unit = booking.estimated_duration.split(' ')[1]
    
    let deadline: Date
    if (unit === 'days') {
      deadline = new Date(createdAt.getTime() + (duration * 24 * 60 * 60 * 1000))
    } else if (unit === 'hours') {
      deadline = new Date(createdAt.getTime() + (duration * 60 * 60 * 1000))
    } else {
      return 'N/A'
    }
    
    const timeLeft = deadline.getTime() - now.getTime()
    if (timeLeft <= 0) return 'Overdue'
    
    const daysLeft = Math.ceil(timeLeft / (24 * 60 * 60 * 1000))
    const hoursLeft = Math.ceil(timeLeft / (60 * 60 * 1000))
    
    if (daysLeft > 1) return `${daysLeft} days`
    if (daysLeft === 1) return '1 day'
    if (hoursLeft > 1) return `${hoursLeft} hours`
    return '1 hour'
  }

  const getClientEngagement = () => {
    if (!booking) return 'N/A'
    
    // Mock engagement score based on booking data
    const engagementFactors = [
      booking.notes ? 20 : 0,
      booking.rating ? 30 : 0,
      booking.review ? 25 : 0,
      ['in_progress', 'completed'].includes(booking.status) ? 25 : 0
    ]
    
    const total = engagementFactors.reduce((sum, factor) => sum + factor, 0)
    if (total >= 80) return 'High'
    if (total >= 50) return 'Medium'
    return 'Low'
  }

  const getStatusOptions = () => {
    const currentStatus = booking?.status
    const options = [
      { value: 'pending', label: 'Pending', disabled: false },
      { value: 'in_progress', label: 'In Progress', disabled: false },
      { value: 'completed', label: 'Completed', disabled: false },
      { value: 'cancelled', label: 'Cancelled', disabled: false },
      { value: 'rescheduled', label: 'Rescheduled', disabled: false }
    ]
    
    return options.map(option => ({
      ...option,
      disabled: option.value === currentStatus
    }))
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Skeleton Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Skeleton Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>

        {/* Skeleton Content */}
        <div className="space-y-4">
          <div className="h-64 bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="h-96 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Booking Not Found</h2>
        <p className="text-gray-600 mb-4">The booking you're looking for doesn't exist or you don't have permission to view it.</p>
        <Button onClick={() => router.push('/dashboard/bookings')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Bookings
        </Button>
      </div>
    )
  }

  const timelineSteps = getTimelineSteps()
  const statusOptions = getStatusOptions()

  return (
    <div className="space-y-6">
      {/* Role-Specific Enhanced Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/bookings')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {userRole === 'provider' ? 'Service Booking' : 'Your Booking'} #{booking.id.slice(0, 8)}
            </h1>
            <p className="text-muted-foreground">
              {userRole === 'provider' 
                ? `Client: ${booking.client.full_name} • Created ${formatDate(booking.created_at)}`
                : `Service: ${booking.service.name} • Created ${formatDate(booking.created_at)}`
              }
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {getStatusBadge(booking.status)}
          {getPriorityBadge(booking.priority)}
          {userRole === 'provider' ? (
            <Button
              variant="default"
              onClick={() => setShowAdvancedActions(!showAdvancedActions)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Edit className="h-4 w-4 mr-2" />
              Manage Booking
            </Button>
          ) : userRole === 'client' ? (
            <Button
              variant="outline"
              onClick={() => setActiveTab('messages')}
              className="border-green-500 text-green-700 hover:bg-green-50"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Contact Provider
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => setShowAdvancedActions(!showAdvancedActions)}
            >
              <Zap className="h-4 w-4 mr-2" />
              Actions
            </Button>
          )}
        </div>
      </div>



      {/* Advanced Actions Panel (Provider/Admin only) */}
      {showAdvancedActions && (userRole === 'provider' || userRole === 'admin') && (
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg">
          <CardHeader>
            <CardTitle className="text-blue-900 flex items-center space-x-2">
              <Zap className="h-5 w-5" />
              <span>Professional Quick Actions</span>
            </CardTitle>
            <CardDescription className="text-blue-700">Manage this booking efficiently with advanced controls</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Status Management */}
              <div className="space-y-3">
                <label htmlFor="status-select" className="text-sm font-semibold text-blue-900 block">Change Status</label>
                <select
                  id="status-select"
                  aria-label="Change booking status"
                  className="w-full p-3 border-2 border-blue-300 rounded-lg bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  value={booking.status}
                  onChange={(e) => (userRole === 'provider' || userRole === 'admin') ? handleStatusChange(e.target.value) : undefined}
                  disabled={isUpdatingStatus || !(userRole === 'provider' || userRole === 'admin')}
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value} disabled={option.disabled}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-blue-600">Select new status for this booking</p>
              </div>

              {/* Priority Management */}
              <div className="space-y-3">
                <label htmlFor="priority-select" className="text-sm font-semibold text-blue-900 block">Priority Level</label>
                <select
                  id="priority-select"
                  aria-label="Change booking priority"
                  className="w-full p-3 border-2 border-blue-300 rounded-lg bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  value={booking.priority}
                  onChange={(e) => handlePriorityChange(e.target.value)}
                >
                  <option value="low">Low Priority</option>
                  <option value="normal">Normal Priority</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">Urgent Priority</option>
                </select>
                <p className="text-xs text-blue-600">Set booking importance level</p>
              </div>

              {/* Quick Actions */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-blue-900 block">Quick Actions</label>
                {userRole === 'provider' || userRole === 'admin' ? (
                  <div className="space-y-2">
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      variant="default"
                      onClick={handleMarkComplete}
                      disabled={isUpdatingStatus || booking.status === 'completed'}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {isUpdatingStatus ? 'Updating...' : 'Mark Complete'}
                    </Button>
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      variant="default"
                      onClick={() => setActiveTab('messages')}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Send Message
                    </Button>
                    <Button
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                      variant="default"
                      onClick={handleExportBooking}
                      disabled={isExporting}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {isExporting ? 'Exporting...' : 'Export Report'}
                    </Button>
                    <Button
                      className="w-full bg-red-600 hover:bg-red-700 text-white"
                      variant="default"
                      onClick={() => setShowDeleteConfirmation(true)}
                      disabled={isUpdatingStatus}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Delete/Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm text-gray-600">
                    <Button className="w-full" variant="outline" disabled>
                      <CheckCircle className="h-4 w-4 mr-2" /> Mark Complete (provider only)
                    </Button>
                    <Button className="w-full" variant="outline" onClick={() => setActiveTab('messages')}>
                      <MessageSquare className="h-4 w-4 mr-2" /> Message Provider
                    </Button>
                    <Button className="w-full" variant="outline" onClick={handleExportBooking} disabled={isExporting}>
                      <Download className="h-4 w-4 mr-2" /> {isExporting ? 'Exporting...' : 'Export Summary'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}



      {/* Priority Alert */}
      {booking.priority === 'high' || booking.priority === 'urgent' ? (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>High Priority:</strong> This booking requires immediate attention.
            {booking.notes && <span className="block mt-1">{booking.notes}</span>}
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Status Change Confirmation Dialog */}
      {showStatusConfirmation && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              <span>Confirm Status Change</span>
            </CardTitle>
            <CardDescription className="text-orange-700">
              You are about to change the status to "{pendingStatusChange}". This action requires a reason.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="status-reason" className="text-sm font-medium text-orange-800 mb-2 block">
                Reason for Status Change *
              </label>
              <Textarea
                id="status-reason"
                placeholder="Please provide a reason for changing the status..."
                value={statusChangeReason}
                onChange={(e) => setStatusChangeReason(e.target.value)}
                className="border-orange-300 focus:border-orange-500"
                rows={3}
              />
            </div>
            <div className="flex space-x-3">
              <Button
                onClick={confirmStatusChange}
                disabled={!statusChangeReason.trim()}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Confirm Change
              </Button>
              <Button
                variant="outline"
                onClick={cancelStatusChange}
                className="border-orange-300 text-orange-700 hover:bg-orange-100"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Update Dialog */}
      {showProgressUpdate && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-green-800">
              <TrendingUp className="h-5 w-5" />
              <span>Update Progress</span>
            </CardTitle>
            <CardDescription className="text-green-700">
              Update the progress and milestones for this booking.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="progress-percentage" className="text-sm font-medium text-green-800 mb-2 block">
                  Progress Percentage *
                </label>
                <Input
                  id="progress-percentage"
                  type="number"
                  min="0"
                  max="100"
                  value={progressUpdate.progress_percentage}
                  onChange={(e) => setProgressUpdate(prev => ({ ...prev, progress_percentage: parseInt(e.target.value) || 0 }))}
                  className="border-green-300 focus:border-green-500"
                  placeholder="0-100"
                />
              </div>
              <div>
                <label htmlFor="quality-score" className="text-sm font-medium text-green-800 mb-2 block">
                  Quality Score (1-5)
                </label>
                <Input
                  id="quality-score"
                  type="number"
                  min="1"
                  max="5"
                  value={progressUpdate.quality_score}
                  onChange={(e) => setProgressUpdate(prev => ({ ...prev, quality_score: parseInt(e.target.value) || 0 }))}
                  className="border-green-300 focus:border-green-500"
                  placeholder="1-5"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="milestone-notes" className="text-sm font-medium text-green-800 mb-2 block">
                Milestone Notes
              </label>
              <Textarea
                id="milestone-notes"
                placeholder="Describe the current progress and any important milestones..."
                value={progressUpdate.milestone_notes}
                onChange={(e) => setProgressUpdate(prev => ({ ...prev, milestone_notes: e.target.value }))}
                className="border-green-300 focus:border-green-500"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="actual-start-date" className="text-sm font-medium text-green-800 mb-2 block">
                  Actual Start Date
                </label>
                <Input
                  id="actual-start-date"
                  type="datetime-local"
                  value={progressUpdate.actual_start_date}
                  onChange={(e) => setProgressUpdate(prev => ({ ...prev, actual_start_date: e.target.value }))}
                  className="border-green-300 focus:border-green-500"
                />
              </div>
              <div>
                <label htmlFor="estimated-completion" className="text-sm font-medium text-green-800 mb-2 block">
                  Estimated Completion Date
                </label>
                <Input
                  id="estimated-completion"
                  type="datetime-local"
                  value={progressUpdate.estimated_completion_date}
                  onChange={(e) => setProgressUpdate(prev => ({ ...prev, estimated_completion_date: e.target.value }))}
                  className="border-green-300 focus:border-green-500"
                />
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                onClick={() => (userRole === 'provider' || userRole === 'admin') ? handleUpdateProgress() : undefined}
                disabled={isUpdatingProgress || !(userRole === 'provider' || userRole === 'admin')}
                className="bg-green-600 hover:bg-green-700"
              >
                {isUpdatingProgress ? 'Updating...' : 'Update Progress'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowProgressUpdate(false)}
                className="border-green-300 text-green-700 hover:bg-green-100"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Service Suggestion Dialog */}
      {showServiceSuggestion && (
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-purple-800">
              <Package className="h-5 w-5" />
              <span>Suggest Additional Service</span>
            </CardTitle>
            <CardDescription className="text-purple-700">
              Recommend an additional service to {booking?.client?.full_name || 'this client'}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="suggested-service" className="text-sm font-medium text-purple-800 mb-2 block">
                Select Service *
              </label>
              {isLoadingServices ? (
                <div className="p-4 text-center text-purple-600">
                  Loading your services...
                </div>
              ) : (
                <select
                  id="suggested-service"
                  value={suggestedService.service_id}
                  onChange={(e) => setSuggestedService(prev => ({ ...prev, service_id: e.target.value }))}
                  className="w-full p-3 border border-purple-300 rounded-md focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                >
                  <option value="">Choose a service to suggest...</option>
                  {availableServices.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.title} - {service.base_price} {service.currency}
                    </option>
                  ))}
                </select>
              )}
              {availableServices.length === 0 && !isLoadingServices && (
                <p className="text-sm text-purple-600 mt-2">
                  No approved services available. Please create and get approval for services first.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="suggestion-reason" className="text-sm font-medium text-purple-800 mb-2 block">
                Why are you suggesting this service? *
              </label>
              <Textarea
                id="suggestion-reason"
                placeholder="Explain why this service would be beneficial for the client..."
                value={suggestedService.reason}
                onChange={(e) => setSuggestedService(prev => ({ ...prev, reason: e.target.value }))}
                className="border-purple-300 focus:border-purple-500"
                rows={3}
              />
            </div>

            <div>
              <label htmlFor="suggestion-priority" className="text-sm font-medium text-purple-800 mb-2 block">
                Priority Level
              </label>
              <select
                id="suggestion-priority"
                value={suggestedService.priority}
                onChange={(e) => setSuggestedService(prev => ({ ...prev, priority: e.target.value as any }))}
                className="w-full p-3 border border-purple-300 rounded-md focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              >
                <option value="low">Low - General recommendation</option>
                <option value="medium">Medium - Good fit for client</option>
                <option value="high">High - Highly recommended</option>
                <option value="urgent">Urgent - Time-sensitive opportunity</option>
              </select>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                onClick={handleCreateServiceSuggestion}
                disabled={isCreatingSuggestion || !suggestedService.service_id || !suggestedService.reason.trim()}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isCreatingSuggestion ? 'Sending...' : 'Send Suggestion'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowServiceSuggestion(false)}
                className="border-purple-300 text-purple-700 hover:bg-purple-100"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className={`grid w-full ${userRole === 'provider' ? 'grid-cols-7' : 'grid-cols-6'}`}>
          <TabsTrigger value="overview">{userRole === 'provider' ? 'Client Details' : 'Service Details'}</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          {userRole === 'provider' && <TabsTrigger value="progress">Progress</TabsTrigger>}
          <TabsTrigger value="history">History</TabsTrigger>
          {userRole === 'provider' && <TabsTrigger value="related">Related</TabsTrigger>}
        </TabsList>

        {/* Role-Specific Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {userRole === 'provider' ? (
            <>
              {/* Provider View - Focus on Client & Service Management */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Primary Client Information */}
                <Card className="border border-gray-200 bg-white shadow-sm">
                  <CardHeader className="border-b border-gray-100 bg-gray-50">
                    <CardTitle className="flex items-center space-x-2 text-gray-800 text-lg font-semibold">
                      <User className="h-5 w-5 text-gray-600" />
                      <span>Client Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600 mb-1 block">Client Name</label>
                        <p className="text-lg font-semibold text-gray-900">{booking.client.full_name}</p>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center space-x-3">
                            <Mail className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">{booking.client.email}</span>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-xs h-8 px-3"
                            onClick={() => window.location.href = `mailto:${booking.client.email}`}
                          >
                            Email
                          </Button>
                        </div>
                        
                        {booking.client.phone && (
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center space-x-3">
                              <Phone className="h-4 w-4 text-gray-500" />
                              <span className="text-sm font-medium text-gray-700">{booking.client.phone}</span>
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-xs h-8 px-3"
                              onClick={() => window.location.href = `tel:${booking.client.phone}`}
                            >
                              Call
                            </Button>
                          </div>
                        )}
                        
                        {booking.client.company_name && (
                          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <Building className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">{booking.client.company_name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Service & Project Information */}
                <Card className="border border-gray-200 bg-white shadow-sm">
                  <CardHeader className="border-b border-gray-100 bg-gray-50">
                    <CardTitle className="flex items-center space-x-2 text-gray-800 text-lg font-semibold">
                      <Package className="h-5 w-5 text-gray-600" />
                      <span>Service Details</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600 mb-1 block">Service</label>
                        <p className="text-lg font-semibold text-gray-900">{booking.service.name}</p>
                      </div>
                      
                      {booking.service.category && (
                        <div>
                          <label className="text-sm font-medium text-gray-600 mb-1 block">Category</label>
                          <Badge variant="outline" className="text-gray-700 border-gray-300 bg-gray-50 font-medium">
                            {booking.service.category}
                          </Badge>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100">
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-sm font-medium text-gray-600 mb-1">Project Value</div>
                          <div className="text-lg font-semibold text-gray-900">{formatCurrency(booking.amount || 0)}</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-sm font-medium text-gray-600 mb-1">Duration</div>
                          <div className="text-lg font-semibold text-gray-900">{booking.estimated_duration || '—'}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Provider Action Panels */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="border border-gray-200 bg-white shadow-sm">
                  <CardHeader className="border-b border-gray-100 bg-gray-50">
                    <CardTitle className="text-gray-800 text-lg font-semibold">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => setActiveTab('messages')}>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Message Client
                      </Button>
                      <Button size="sm" variant="outline" className="w-full border-gray-300" onClick={() => setActiveTab('progress')}>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Update Progress
                      </Button>
                      <Button size="sm" variant="outline" className="w-full border-gray-300" onClick={() => setActiveTab('files')}>
                        <Paperclip className="h-4 w-4 mr-2" />
                        Request Files
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border border-gray-200 bg-white shadow-sm">
                  <CardHeader className="border-b border-gray-100 bg-gray-50">
                    <CardTitle className="text-gray-800 text-lg font-semibold">Project Status</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-600">Next Milestone</span>
                        <span className="text-sm font-semibold text-gray-900">{getNextMilestone()}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-600">Time to Deadline</span>
                        <span className="text-sm font-semibold text-gray-900">{getTimeToDeadline()}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm font-medium text-gray-600">Project Health</span>
                        <span className="text-sm font-semibold text-gray-900">{getBookingHealth()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-gray-200 bg-white shadow-sm">
                  <CardHeader className="border-b border-gray-100 bg-gray-50">
                    <CardTitle className="text-gray-800 text-lg font-semibold">Financial Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-600">Project Value</span>
                        <span className="text-lg font-semibold text-gray-900">{formatCurrency(booking.amount || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-600">Payment Status</span>
                        <Badge variant={booking.payment_status === 'paid' ? 'default' : 'secondary'} className="text-xs font-medium">
                          {booking.payment_status || 'pending'}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm font-medium text-gray-600">Client Rating</span>
                        <span className="text-sm font-semibold text-gray-900">{getClientSatisfaction()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <>
              {/* Client View - Focus on Service Details & Provider Info */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Service Information - Primary for Clients */}
                <Card className="border border-gray-200 bg-white shadow-sm">
                  <CardHeader className="border-b border-gray-100 bg-gray-50">
                    <CardTitle className="flex items-center space-x-2 text-gray-800 text-lg font-semibold">
                      <Package className="h-5 w-5 text-gray-600" />
                      <span>Service Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600 mb-1 block">Service Name</label>
                        <p className="text-lg font-semibold text-gray-900">{booking.service.name}</p>
                      </div>
                      
                      {booking.service.description && (
                        <div>
                          <label className="text-sm font-medium text-gray-600 mb-1 block">Description</label>
                          <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-200">{booking.service.description}</p>
                        </div>
                      )}
                      
                      {booking.service.category && (
                        <div>
                          <label className="text-sm font-medium text-gray-600 mb-1 block">Category</label>
                          <Badge variant="outline" className="text-gray-700 border-gray-300 bg-gray-50 font-medium">
                            {booking.service.category}
                          </Badge>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100">
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-sm font-medium text-gray-600 mb-1">Duration</div>
                          <div className="text-lg font-semibold text-gray-900">{booking.estimated_duration || '—'}</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-sm font-medium text-gray-600 mb-1">Total Cost</div>
                          <div className="text-lg font-semibold text-gray-900">{formatCurrency(booking.amount || 0)}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Booking Progress & Status */}
                <Card className="border border-gray-200 bg-white shadow-sm">
                  <CardHeader className="border-b border-gray-100 bg-gray-50">
                    <CardTitle className="flex items-center space-x-2 text-gray-800 text-lg font-semibold">
                      <Clock className="h-5 w-5 text-gray-600" />
                      <span>Booking Status</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600 mb-2 block">Current Status</label>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(booking.status)}
                          {getPriorityBadge(booking.priority)}
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-600 mb-2 block">Scheduled Date</label>
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-200">
                          {booking.scheduled_date ? formatDate(booking.scheduled_date) : 'To be scheduled by provider'}
                        </p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-600 mb-2 block">Location</label>
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-200">
                          {booking.location || 'To be determined'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Client Action Panels */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
                  <CardHeader><CardTitle className="text-green-900">Your Actions</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Button size="sm" className="w-full bg-green-600 hover:bg-green-700" onClick={() => setActiveTab('messages')}>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Message Provider
                      </Button>
                      <Button size="sm" variant="outline" className="w-full" onClick={() => setActiveTab('files')}>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Files
                      </Button>
                      <Button size="sm" variant="outline" className="w-full" onClick={() => setActiveTab('timeline')}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Progress
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50">
                  <CardHeader><CardTitle className="text-orange-900">Project Timeline</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div>
                        <div className="text-orange-600 font-medium">Created</div>
                        <div className="font-medium text-orange-800">{formatDate(booking.created_at)}</div>
                      </div>
                      <div>
                        <div className="text-orange-600 font-medium">Expected Completion</div>
                        <div className="font-medium text-orange-800">{getTimeToDeadline()}</div>
                      </div>
                      <div>
                        <div className="text-orange-600 font-medium">Days Active</div>
                        <div className="font-medium text-orange-800">{getDaysSinceCreation()} days</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50">
                  <CardHeader><CardTitle className="text-teal-900">Billing & Payment</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div>
                        <div className="text-teal-600 font-medium">Total Amount</div>
                        <div className="text-lg font-bold text-teal-900">{formatCurrency(booking.amount || 0)}</div>
                      </div>
                      <div>
                        <div className="text-teal-600 font-medium">Payment Status</div>
                        <Badge variant={booking.payment_status === 'paid' ? 'default' : 'secondary'} className="text-xs">
                          {booking.payment_status || 'pending'}
                        </Badge>
                      </div>
                      {booking.rating && (
                        <div>
                          <div className="text-teal-600 font-medium">Your Rating</div>
                          <div className="font-medium text-teal-800">{booking.rating}/5 ⭐</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {/* Enhanced Analytics & Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Analytics & Insights</span>
              </CardTitle>
              <CardDescription>Performance metrics and insights for this booking</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {getDaysSinceCreation()}
                  </div>
                  <div className="text-sm text-muted-foreground">Days Active</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {getStatusEfficiency()}
                  </div>
                  <div className="text-sm text-muted-foreground">Efficiency Score</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {getClientSatisfaction()}
                  </div>
                  <div className="text-sm text-muted-foreground">Client Satisfaction</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {getRevenueImpact()}
                  </div>
                  <div className="text-sm text-muted-foreground">Revenue Impact</div>
                </div>
              </div>
              
              {/* Additional Insights */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-3 border rounded-lg bg-blue-50">
                  <div className="text-lg font-semibold text-blue-700">
                    {getBookingHealth()}
                  </div>
                  <div className="text-sm text-blue-600">Booking Health</div>
                </div>
                <div className="text-center p-3 border rounded-lg bg-green-50">
                  <div className="text-lg font-semibold text-green-700">
                    {getNextMilestone()}
                  </div>
                  <div className="text-sm text-green-600">Next Milestone</div>
                </div>
                <div className="text-center p-3 border rounded-lg bg-purple-50">
                  <div className="text-lg font-semibold text-purple-700">
                    {getTimelineProgress() * 100}%
                  </div>
                  <div className="text-sm text-purple-600">Progress</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Booking Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Booking Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">{getStatusBadge(booking.status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Priority</label>
                  <div className="mt-1">{getPriorityBadge(booking.priority)}</div>
                </div>
              </div>
              {booking.scheduled_date && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Scheduled Date</label>
                  <p className="text-sm">{formatDate(booking.scheduled_date)}</p>
                </div>
              )}
              {booking.amount && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Amount</label>
                  <p className="text-lg font-semibold flex items-center space-x-1">
                    <DollarSign className="h-4 w-4" />
                    <span>{formatCurrency(booking.amount)}</span>
                  </p>
                </div>
              )}
              {booking.location && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Location</label>
                  <p className="text-sm flex items-center space-x-1">
                    <MapPin className="h-4 w-4" />
                    <span>{booking.location}</span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Enhanced Smart Actions & AI Insights - Role-Based */}
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="border-b border-gray-100 bg-gray-50">
              <CardTitle className="flex items-center space-x-2 text-gray-800">
                <Lightbulb className="h-5 w-5 text-blue-600" />
                <span>Smart Actions & AI Insights</span>
                <Badge variant="outline" className="ml-2 text-xs">
                  AI-Powered
                </Badge>
              </CardTitle>
              <CardDescription className="text-gray-600">
                {userRole === 'provider' 
                  ? 'Intelligent project management and business optimization recommendations'
                  : 'Smart tools to enhance your service experience and communication'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* Primary Action Buttons - Role Based */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700" 
                    onClick={() => setActiveTab('messages')}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    {userRole === 'provider' ? 'AI Message Client' : 'Contact Provider'}
                  </Button>
                  
                  {userRole === 'provider' ? (
                    <>
                      <Button 
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={() => setActiveTab('progress')}
                      >
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Manage Tasks
                      </Button>
                      
                      <Button 
                        className="w-full bg-purple-600 hover:bg-purple-700"
                        onClick={handleOpenServiceSuggestion}
                        disabled={isCreatingSuggestion}
                      >
                        <Package className="h-4 w-4 mr-2" />
                        {isCreatingSuggestion ? 'Loading...' : 'Suggest Service'}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button 
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={() => setActiveTab('timeline')}
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        View Progress
                      </Button>
                      
                      <Button 
                        className="w-full bg-orange-600 hover:bg-orange-700"
                        onClick={() => setActiveTab('files')}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Share Files
                      </Button>
                    </>
                  )}
                </div>

                {/* Status-Based Quick Actions */}
                {userRole === 'provider' && booking.status === 'in_progress' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button 
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                      onClick={handleMarkComplete}
                      disabled={isUpdatingStatus}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {isUpdatingStatus ? 'Updating...' : 'Mark as Complete'}
                    </Button>
                    
                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={handleOpenProgressUpdate}
                      disabled={isUpdatingProgress}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {isUpdatingProgress ? 'Sending...' : 'Send Update'}
                    </Button>
                  </div>
                )}

                {/* AI-Powered Action Suggestions - Role Based */}
                <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <h5 className="font-semibold text-blue-900 mb-3 flex items-center">
                    <Lightbulb className="h-4 w-4 mr-2" />
                    AI Action Suggestions
                    <Badge variant="outline" className="ml-2 text-xs bg-blue-100 text-blue-700">
                      Smart
                    </Badge>
                  </h5>
                  
                  <div className="space-y-3">
                    {userRole === 'provider' ? (
                      // Provider AI Suggestions
                      <>
                        {/* Task Management Suggestions */}
                        {projectTasks.filter(t => t.status === 'in_progress').length > 0 && (
                          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-200">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                              <span className="text-sm text-blue-800">
                                Update progress on {projectTasks.filter(t => t.status === 'in_progress').length} active task(s)
                              </span>
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="border-blue-300 text-blue-700 hover:bg-blue-50"
                              onClick={() => setActiveTab('progress')}
                            >
                              <TrendingUp className="h-3 w-3 mr-1" />
                              Update
                            </Button>
                          </div>
                        )}
                        
                        {/* Communication Suggestions */}
                        <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-200">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="text-sm text-blue-800">
                              Send weekly progress report to client
                            </span>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="border-blue-300 text-blue-700 hover:bg-blue-50"
                            onClick={() => setActiveTab('messages')}
                          >
                            <MessageSquare className="h-3 w-3 mr-1" />
                            Send
                          </Button>
                        </div>
                        
                        {/* Milestone Suggestions */}
                        {Math.round((projectTasks.filter(t => t.status === 'completed').length / Math.max(projectTasks.length, 1)) * 100) >= 50 && (
                          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-200">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                              <span className="text-sm text-blue-800">
                                Project is 50%+ complete - Schedule client review
                              </span>
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="border-blue-300 text-blue-700 hover:bg-blue-50"
                              onClick={() => setActiveTab('messages')}
                            >
                              <Calendar className="h-3 w-3 mr-1" />
                              Schedule
                            </Button>
                          </div>
                        )}
                        
                        {/* Business Optimization */}
                        {booking.status === 'completed' && (
                          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-200">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-sm text-blue-800">
                                Request client review and suggest follow-up services
                              </span>
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="border-blue-300 text-blue-700 hover:bg-blue-50"
                              onClick={handleOpenServiceSuggestion}
                            >
                              <Star className="h-3 w-3 mr-1" />
                              Request
                            </Button>
                          </div>
                        )}
                      </>
                    ) : (
                      // Client AI Suggestions
                      <>
                        {/* Progress Inquiry */}
                        <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-200">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="text-sm text-blue-800">
                              Request detailed progress update from provider
                            </span>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="border-blue-300 text-blue-700 hover:bg-blue-50"
                            onClick={() => setActiveTab('messages')}
                          >
                            <MessageSquare className="h-3 w-3 mr-1" />
                            Request
                          </Button>
                        </div>
                        
                        {/* Feedback Suggestions */}
                        {booking.status === 'completed' && (
                          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-200">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-sm text-blue-800">
                                Share feedback and rate your experience
                              </span>
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="border-blue-300 text-blue-700 hover:bg-blue-50"
                              onClick={() => setActiveTab('messages')}
                            >
                              <Star className="h-3 w-3 mr-1" />
                              Review
                            </Button>
                          </div>
                        )}
                        
                        {/* Meeting Suggestions */}
                        <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-200">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <span className="text-sm text-blue-800">
                              Schedule clarification meeting with provider
                            </span>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="border-blue-300 text-blue-700 hover:bg-blue-50"
                            onClick={() => setActiveTab('messages')}
                          >
                            <Calendar className="h-3 w-3 mr-1" />
                            Schedule
                          </Button>
                        </div>
                        
                        {/* File Sharing */}
                        <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-200">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            <span className="text-sm text-blue-800">
                              Share additional requirements or resources
                            </span>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="border-blue-300 text-blue-700 hover:bg-blue-50"
                            onClick={() => setActiveTab('files')}
                          >
                            <Upload className="h-3 w-3 mr-1" />
                            Share
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* AI Learning Notice */}
                  <div className="mt-3 p-2 bg-blue-100 rounded text-xs text-blue-700 text-center">
                    🤖 AI suggestions improve based on your project patterns and industry best practices
                  </div>
                </div>
              </div>

              {/* Editable Notes */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Notes</label>
                {isEditingNotes ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editedNotes}
                      onChange={(e) => setEditedNotes(e.target.value)}
                      placeholder="Add notes about this booking..."
                      rows={3}
                    />
                    <div className="flex space-x-2">
                      <Button size="sm" onClick={handleSaveNotes} disabled={isSavingNotes}>
                        <Save className="h-4 w-4 mr-2" />
                        {isSavingNotes ? 'Saving...' : 'Save'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleCancelNotes} disabled={isSavingNotes}>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm mb-2">{booking.notes || 'No notes added yet.'}</p>
                    <Button size="sm" variant="outline" onClick={() => setIsEditingNotes(true)}>
                      <Edit className="h-4 w-4 mr-2" />
                      {booking.notes ? 'Edit Notes' : 'Add Notes'}
                    </Button>
                  </div>
                )}
              </div>

              <div className="text-sm text-muted-foreground">
                <p>Last updated: {formatDate(booking.updated_at)}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-6">
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-blue-900">
                <Clock3 className="h-6 w-6" />
                <span>Enhanced Project Timeline</span>
                <Badge variant="default" className="bg-blue-600 text-white ml-2">
                  <Zap className="h-3 w-3 mr-1" />
                  Smart
                </Badge>
              </CardTitle>
              <CardDescription className="text-blue-700">
                Comprehensive project tracking with intelligent insights, progress monitoring, and detailed milestone analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Smart Progress Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-white rounded-lg border border-blue-200">
                    <div className="text-2xl font-bold text-blue-600">
                      {Math.round((getTimelineProgress() * 100))}%
                    </div>
                    <div className="text-sm text-blue-700 font-medium">Overall Progress</div>
                    <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${getTimelineProgress() * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg border border-blue-200">
                    <div className="text-2xl font-bold text-green-600">
                      {getDaysSinceCreation()}
                    </div>
                    <div className="text-sm text-green-700 font-medium">Days Active</div>
                    <div className="mt-2 text-xs text-green-600">Project Duration</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg border border-blue-200">
                    <div className="text-2xl font-bold text-purple-600">
                      {getTimeToDeadline()}
                    </div>
                    <div className="text-sm text-purple-700 font-medium">Time to Deadline</div>
                    <div className="mt-2 text-xs text-purple-600">Remaining Time</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg border border-blue-200">
                    <div className="text-2xl font-bold text-orange-600">
                      {getNextMilestone()}
                    </div>
                    <div className="text-sm text-orange-700 font-medium">Next Action</div>
                    <div className="mt-2 text-xs text-orange-600">Action Required</div>
                  </div>
                </div>

                {/* Enhanced Timeline Steps with Progress Lines */}
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-green-500 to-purple-500"></div>
                  <div className="space-y-6">
                    {timelineSteps.map((step, index) => (
                      <div key={step.status} className="relative flex items-start space-x-6">
                        {/* Step Icon with Progress Line */}
                        <div className="relative flex-shrink-0">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                            step.completed 
                              ? 'bg-green-500 border-green-600 text-white shadow-lg' 
                              : step.status === 'in_progress'
                              ? 'bg-blue-500 border-blue-600 text-white shadow-lg'
                              : 'bg-gray-200 border-gray-300 text-gray-500'
                          }`}>
                            {step.completed ? (
                              <CheckCircle className="h-5 w-5" />
                            ) : step.status === 'in_progress' ? (
                              <RefreshCw className="h-5 w-5" />
                            ) : (
                              step.icon
                            )}
                          </div>
                          {/* Progress Line Connector */}
                          {index < timelineSteps.length - 1 && (
                            <div className={`absolute left-1/2 top-8 w-0.5 h-6 transform -translate-x-1/2 ${
                              step.completed ? 'bg-green-500' : 'bg-gray-300'
                            }`}></div>
                          )}
                        </div>

                        {/* Step Content */}
                        <div className="flex-1 min-w-0 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className={`font-semibold text-lg ${
                              step.completed ? 'text-green-700' : 'text-gray-700'
                            }`}>
                              {step.label}
                            </h4>
                            <div className="flex items-center space-x-2">
                              {step.completed && (
                                <Badge variant="default" className="bg-green-100 text-green-800">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Completed
                                </Badge>
                              )}
                              {step.status === 'in_progress' && (
                                <Badge variant="default" className="bg-blue-100 text-blue-800">
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                  In Progress
                                </Badge>
                              )}
                              {!step.completed && step.status !== 'in_progress' && (
                                <Badge variant="outline" className="text-gray-500">
                                  Pending
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          {step.description && (
                            <p className="text-sm text-gray-600 mb-3">{step.description}</p>
                          )}
                          
                          {/* Step Details */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            {step.date && (
                              <div className="flex items-center space-x-2">
                                <Calendar className="h-4 w-4 text-blue-500" />
                                <span className="text-gray-600">Started:</span>
                                <span className="font-medium">{formatDate(step.date)}</span>
                              </div>
                            )}
                            {step.completed && step.date && (
                              <div className="flex items-center space-x-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span className="text-gray-600">Completed:</span>
                                <span className="font-medium">{formatDate(step.date)}</span>
                              </div>
                            )}
                          </div>

                          {/* Smart Insights for Each Step */}
                          {step.status === 'in_progress' && (
                            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <div className="flex items-center space-x-2 mb-2">
                                <Lightbulb className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-900">Smart Insights</span>
                              </div>
                              <div className="space-y-2 text-xs text-blue-800">
                                <div className="flex items-center justify-between">
                                  <span>Estimated completion:</span>
                                  <span className="font-medium">{getEstimatedCompletion()}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Time remaining:</span>
                                  <span className="font-medium">{getTimeToDeadline()}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Progress efficiency:</span>
                                  <span className="font-medium">{getStatusEfficiency()}</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Step Actions */}
                          {step.status === 'in_progress' && (
                            <div className="mt-3 flex space-x-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="border-blue-300 text-blue-700"
                                onClick={handleOpenProgressUpdate}
                                disabled={isUpdatingProgress}
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                {isUpdatingProgress ? 'Updating...' : 'Update Progress'}
                              </Button>
                              <Button size="sm" variant="outline" className="border-green-300 text-green-700">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Mark Complete
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Enhanced Time Tracking Dashboard */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                    <h4 className="font-semibold mb-3 text-gray-900 flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-blue-500" />
                      Project Timeline
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Project Start:</span>
                        <span className="font-medium">{formatDate(booking.created_at)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Last Updated:</span>
                        <span className="font-medium">{formatDate(booking.updated_at)}</span>
                      </div>
                      {booking.scheduled_date && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Scheduled Date:</span>
                          <span className="font-medium">{formatDate(booking.scheduled_date)}</span>
                        </div>
                      )}
                      {booking.estimated_duration && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Estimated Duration:</span>
                          <span className="font-medium">{booking.estimated_duration}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                    <h4 className="font-semibold mb-3 text-gray-900 flex items-center">
                      <TrendingUp className="h-4 w-4 mr-2 text-green-500" />
                      Performance Metrics
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Days Active:</span>
                        <span className="font-medium">{getDaysSinceCreation()} days</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Efficiency Score:</span>
                        <span className="font-medium">{getStatusEfficiency()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Client Rating:</span>
                        <span className="font-medium">{getClientSatisfaction()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Revenue Impact:</span>
                        <span className="font-medium">{getRevenueImpact()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Smart Timeline Actions */}
                <div className="p-4 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg border border-blue-200">
                  <h4 className="font-semibold mb-3 text-blue-900 flex items-center">
                    <Zap className="h-5 w-5 mr-2" />
                    Smart Timeline Actions
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="border-blue-300 text-blue-700 hover:bg-blue-50"
                      onClick={() => setShowTimelineEdit(true)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Customize Timeline
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="border-green-300 text-green-700 hover:bg-green-50"
                      onClick={() => setActiveTab('progress')}
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      View Progress
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="border-purple-300 text-purple-700 hover:bg-purple-50"
                      onClick={() => {
                        // Export timeline as PDF
                        toast.success('Timeline export feature coming soon!')
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export Timeline
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Progress Tab - Role-Based Access */}
        <TabsContent value="progress" className="space-y-6">
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="border-b border-gray-100 bg-gray-50">
              <CardTitle className="flex items-center justify-between text-gray-800">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-gray-600" />
                  <span>{userRole === 'provider' ? 'Advanced Project Management' : 'Project Progress Tracking'}</span>
                </div>
                {userRole === 'provider' ? (
                  <div className="flex items-center space-x-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setShowTaskTemplates(true)}
                      className="border-gray-300"
                    >
                      <Layout className="h-4 w-4 mr-2" />
                      Templates
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => setShowAddMilestone(true)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Task
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      <Eye className="h-3 w-3 mr-1" />
                      Tracking Mode
                    </Badge>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setActiveTab('messages')}
                      className="border-blue-300 text-blue-600"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Request Update
                    </Button>
                  </div>
                )}
              </CardTitle>
              <CardDescription className="text-gray-600">
                {userRole === 'provider' 
                  ? 'Comprehensive project management with tasks, milestones, time tracking, and client communication'
                  : 'Track project progress, provide feedback, and stay updated on all project activities'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {/* Enhanced Project Dashboard */}
              <div className="space-y-6">
                {/* Smart Tracking Dashboard */}
                {userRole === 'client' && (
                  <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-blue-900 flex items-center">
                        <Bell className="h-5 w-5 mr-2" />
                        Smart Project Tracking
                      </h4>
                      <div className="flex items-center space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={generateProgressReport}
                          className="border-blue-300 text-blue-700"
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Get Report
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setShowNotificationCenter(!showNotificationCenter)}
                          className="border-blue-300 text-blue-700"
                        >
                          <Bell className="h-4 w-4 mr-1" />
                          Settings
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-white rounded-lg border border-blue-200">
                        <div className="text-lg font-bold text-blue-600">{trackingData.totalUpdates}</div>
                        <div className="text-xs text-blue-700">Total Updates</div>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg border border-blue-200">
                        <div className="text-lg font-bold text-green-600">
                          {approvalRequests.filter(r => r.status === 'pending').length}
                        </div>
                        <div className="text-xs text-green-700">Pending Approvals</div>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg border border-blue-200">
                        <div className="text-lg font-bold text-purple-600">
                          {new Date(trackingData.lastUpdate).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-purple-700">Last Update</div>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg border border-blue-200">
                        <div className="text-lg font-bold text-orange-600">
                          {notificationSettings.email && notificationSettings.whatsapp ? 'All' : 
                           notificationSettings.email || notificationSettings.whatsapp ? 'Partial' : 'None'}
                        </div>
                        <div className="text-xs text-orange-700">Notifications</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Project Overview with More Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                  <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                    <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-green-600">
                      {filteredTasks.filter(t => t.status === 'completed').length}
                    </div>
                    <div className="text-sm text-green-700 font-medium">Completed</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <Clock className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-blue-600">
                      {filteredTasks.filter(t => t.status === 'in_progress').length}
                    </div>
                    <div className="text-sm text-blue-700 font-medium">In Progress</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <Calendar className="h-6 w-6 text-gray-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-600">
                      {filteredTasks.filter(t => t.status === 'not_started').length}
                    </div>
                    <div className="text-sm text-gray-700 font-medium">Pending</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <Pause className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-yellow-600">
                      {filteredTasks.filter(t => t.status === 'on_hold').length}
                    </div>
                    <div className="text-sm text-yellow-700 font-medium">On Hold</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <TrendingUp className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-purple-600">
                      {Math.round((filteredTasks.filter(t => t.status === 'completed').length / Math.max(filteredTasks.length, 1)) * 100)}%
                    </div>
                    <div className="text-sm text-purple-700 font-medium">Progress</div>
                  </div>
                </div>

                {/* Advanced Controls Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-4">
                    <Button
                      size="sm"
                      variant={showGanttView ? "default" : "outline"}
                      onClick={() => setShowGanttView(!showGanttView)}
                      className="border-gray-300"
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      {showGanttView ? 'List View' : 'Timeline View'}
                    </Button>
                    
                    <div className="flex items-center space-x-2">
                      <Filter className="h-4 w-4 text-gray-500" />
                      <select
                        value={taskFilter.status}
                        onChange={(e) => setTaskFilter(prev => ({ ...prev, status: e.target.value }))}
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="all">All Status</option>
                        <option value="not_started">Not Started</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="on_hold">On Hold</option>
                      </select>
                      
                      <select
                        value={taskFilter.priority}
                        onChange={(e) => setTaskFilter(prev => ({ ...prev, priority: e.target.value }))}
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="all">All Priorities</option>
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                      
                      <select
                        value={taskFilter.category}
                        onChange={(e) => setTaskFilter(prev => ({ ...prev, category: e.target.value }))}
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="all">All Categories</option>
                        <option value="development">Development</option>
                        <option value="design">Design</option>
                        <option value="testing">Testing</option>
                        <option value="documentation">Documentation</option>
                        <option value="meeting">Meeting</option>
                        <option value="review">Review</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    Showing {filteredTasks.length} of {projectTasks.length} tasks
                  </div>
                </div>

                {/* Enhanced Task Management Interface */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-900 flex items-center">
                      <Target className="h-5 w-5 mr-2" />
                      Project Tasks & Milestones
                    </h4>
                    
                    {/* View Toggle */}
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowGanttView(!showGanttView)}
                        className="border-gray-300"
                      >
                        {showGanttView ? <List className="h-4 w-4" /> : <BarChart3 className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  {loadingTasks ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-gray-600 mt-2">Loading tasks...</p>
                    </div>
                  ) : filteredTasks.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Target className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p>{projectTasks.length === 0 ? 'No tasks created yet. Add your first task to get started!' : 'No tasks match the current filters.'}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredTasks.map((task) => (
                        <div key={task.id} className="bg-white border border-gray-200 rounded-lg shadow-sm">
                          {/* Task Header */}
                          <div className="p-4 border-b border-gray-100">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <h5 className="font-semibold text-gray-900">{task.title}</h5>
                                  <Badge className={getCategoryColor(task.category)}>
                                    <span className="flex items-center space-x-1">
                                      {getCategoryIcon(task.category)}
                                      <span className="ml-1 text-xs">{task.category}</span>
                                    </span>
                                  </Badge>
                                  {task.tags && task.tags.length > 0 && (
                                    <div className="flex items-center space-x-1">
                                      {task.tags.slice(0, 2).map((tag: string) => (
                                        <Badge key={tag} variant="outline" className="text-xs">
                                          <Tag className="h-3 w-3 mr-1" />
                                          {tag}
                                        </Badge>
                                      ))}
                                      {task.tags.length > 2 && <span className="text-xs text-gray-500">+{task.tags.length - 2}</span>}
                                    </div>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                                
                                {/* Task Metadata */}
                                <div className="flex items-center space-x-4 text-xs text-gray-500">
                                  <span className="flex items-center">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Est. {task.estimated_hours}h
                                  </span>
                                  {task.actual_hours && parseFloat(task.actual_hours) > 0 && (
                                    <span className="flex items-center">
                                      <Timer className="h-3 w-3 mr-1" />
                                      Actual: {task.actual_hours}h
                                    </span>
                                  )}
                                  {task.due_date && (
                                    <span className="flex items-center">
                                      <Calendar className="h-3 w-3 mr-1" />
                                      Due: {new Date(task.due_date).toLocaleDateString()}
                                    </span>
                                  )}
                                  <span className="flex items-center">
                                    <User className="h-3 w-3 mr-1" />
                                    {task.assigned_to === 'provider' ? 'Provider' : task.assigned_to === 'client' ? 'Client' : 'Unassigned'}
                                  </span>
                                </div>
                                
                                {/* Dependencies */}
                                {task.dependencies && task.dependencies.length > 0 && (
                                  <div className="mt-2 text-xs text-gray-500">
                                    <span className="flex items-center">
                                      <Link className="h-3 w-3 mr-1" />
                                      Depends on: {task.dependencies.length} task(s)
                                    </span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Role-Based Task Controls */}
                              <div className="flex items-center space-x-2 ml-4">
                                <Badge className={getPriorityColor(task.priority)}>
                                  {task.priority}
                                </Badge>
                                
                                {userRole === 'provider' ? (
                                  // Provider Controls: Full Management
                                  <>
                                    <select
                                      value={task.status}
                                      onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                                      className={`text-xs px-2 py-1 border rounded ${getStatusColor(task.status)}`}
                                    >
                                      <option value="not_started">Not Started</option>
                                      <option value="in_progress">In Progress</option>
                                      <option value="completed">Completed</option>
                                      <option value="on_hold">On Hold</option>
                                      <option value="cancelled">Cancelled</option>
                                    </select>
                                    
                                    {/* Provider Actions */}
                                    <div className="flex items-center space-x-1">
                                      {timeTracking[task.id]?.start ? (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => stopTimeTracking(task.id)}
                                          className="h-8 w-8 p-0 border-red-300 text-red-600 hover:bg-red-50"
                                          title="Stop Time Tracking"
                                        >
                                          <Pause className="h-3 w-3" />
                                        </Button>
                                      ) : (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => startTimeTracking(task.id)}
                                          className="h-8 w-8 p-0 border-green-300 text-green-600 hover:bg-green-50"
                                          title="Start Time Tracking"
                                        >
                                          <Play className="h-3 w-3" />
                                        </Button>
                                      )}
                                      
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => requestApproval(task.id, 'completion')}
                                        className="h-8 w-8 p-0 border-blue-300 text-blue-600 hover:bg-blue-50"
                                        title="Request Client Approval"
                                      >
                                        <CheckCircle className="h-3 w-3" />
                                      </Button>
                                      
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => toggleTaskDetails(task.id)}
                                        className="h-8 w-8 p-0 border-gray-300"
                                        title="Toggle Details"
                                      >
                                        {showTaskDetails[task.id] ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                      </Button>
                                      
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => duplicateTask(task.id)}
                                        className="h-8 w-8 p-0 border-gray-300"
                                        title="Duplicate Task"
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                      
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => deleteTask(task.id)}
                                        className="h-8 w-8 p-0 border-red-300 text-red-600 hover:bg-red-50"
                                        title="Delete Task"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </>
                                ) : (
                                  // Client Controls: View-Only with Approval Actions
                                  <>
                                    <Badge className={getStatusColor(task.status)}>
                                      {task.status === 'not_started' ? 'Not Started' : 
                                       task.status === 'in_progress' ? 'In Progress' : 
                                       task.status === 'completed' ? 'Completed' :
                                       task.status === 'on_hold' ? 'On Hold' : 'Cancelled'}
                                    </Badge>
                                    
                                    {/* Client Actions */}
                                    <div className="flex items-center space-x-1">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => toggleTaskDetails(task.id)}
                                        className="h-8 w-8 p-0 border-blue-300 text-blue-600 hover:bg-blue-50"
                                        title="View Details"
                                      >
                                        <Eye className="h-3 w-3" />
                                      </Button>
                                      
                                      {/* Show approval button if there's a pending request for this task */}
                                      {approvalRequests.find(req => req.taskId === task.id && req.status === 'pending') && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            const request = approvalRequests.find(req => req.taskId === task.id && req.status === 'pending')
                                            if (request) handleApproval(request.id, true)
                                          }}
                                          className="h-8 w-8 p-0 border-green-300 text-green-600 hover:bg-green-50"
                                          title="Approve Task"
                                        >
                                          <CheckCircle className="h-3 w-3" />
                                        </Button>
                                      )}
                                      
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setActiveTab('messages')}
                                        className="h-8 w-8 p-0 border-orange-300 text-orange-600 hover:bg-orange-50"
                                        title="Ask Question"
                                      >
                                        <MessageSquare className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                        {/* Task Comments */}
                        {task.comments && task.comments.length > 0 && (
                          <div className="border-t border-gray-100 pt-3 mt-3">
                            <h6 className="text-sm font-medium text-gray-700 mb-2">Progress Updates:</h6>
                            <div className="space-y-2">
                              {task.comments.map((comment: any) => (
                                <div key={comment.id} className="bg-gray-50 p-2 rounded text-sm">
                                  <p className="text-gray-700">{comment.text}</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {comment.user} • {new Date(comment.created_at).toLocaleString()}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Add Comment Section */}
                        <div className="border-t border-gray-100 pt-3 mt-3">
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              placeholder="Add progress update..."
                              value={taskComments[task.id] || ''}
                              onChange={(e) => setTaskComments(prev => ({ ...prev, [task.id]: e.target.value }))}
                              className="flex-1 text-sm border border-gray-300 rounded px-3 py-1"
                              onKeyPress={(e) => e.key === 'Enter' && addTaskComment(task.id)}
                            />
                            <Button
                              size="sm"
                              onClick={() => addTaskComment(task.id)}
                              className="bg-blue-600 hover:bg-blue-700 text-xs"
                            >
                              Add Update
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}</div>
                  )}
                </div>
              </div>

              {/* Professional Task Creation Modal */}
              {showAddMilestone && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden">
                    {/* Modal Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                            <Plus className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold">Create New Task</h3>
                            <p className="text-blue-100 text-sm">Add a new task to your project timeline</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAddMilestone(false)}
                          className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg"
                        >
                          <X className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>

                    <div className="overflow-y-auto max-h-[calc(95vh-120px)]">
                      <div className="p-6 space-y-6">
                        {/* Task Title & Description */}
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                            <FileText className="h-4 w-4 mr-2 text-blue-600" />
                            Task Information
                          </h4>
                          
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                                Task Title *
                                <span className="text-red-500 ml-1">*</span>
                              </label>
                              <input
                                type="text"
                                value={newTask.title}
                                onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                placeholder="e.g., Implement user authentication system"
                              />
                              {!newTask.title.trim() && (
                                <p className="text-red-500 text-xs mt-1">Task title is required</p>
                              )}
                            </div>
                            
                            <div>
                              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                                Detailed Description
                              </label>
                              <textarea
                                value={newTask.description}
                                onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                rows={4}
                                placeholder="Provide comprehensive task requirements, acceptance criteria, and implementation notes..."
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Include specific requirements, deliverables, and any special instructions
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Task Classification */}
                        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                          <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                            <Tag className="h-4 w-4 mr-2 text-purple-600" />
                            Task Classification
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="text-sm font-semibold text-gray-700 mb-2 block">Category</label>
                              <select
                                value={newTask.category}
                                onChange={(e) => setNewTask(prev => ({ ...prev, category: e.target.value as any }))}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                              >
                                <option value="development">🔧 Development</option>
                                <option value="design">🎨 Design</option>
                                <option value="testing">🧪 Testing</option>
                                <option value="documentation">📚 Documentation</option>
                                <option value="meeting">👥 Meeting</option>
                                <option value="review">👁️ Review</option>
                              </select>
                            </div>
                            
                            <div>
                              <label className="text-sm font-semibold text-gray-700 mb-2 block">Priority Level</label>
                              <select
                                value={newTask.priority}
                                onChange={(e) => setNewTask(prev => ({ ...prev, priority: e.target.value as any }))}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                              >
                                <option value="low">🟢 Low Priority</option>
                                <option value="medium">🟡 Medium Priority</option>
                                <option value="high">🟠 High Priority</option>
                                <option value="critical">🔴 Critical Priority</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-sm font-semibold text-gray-700 mb-2 block">Task Status</label>
                              <select
                                value={newTask.status}
                                onChange={(e) => setNewTask(prev => ({ ...prev, status: e.target.value as any }))}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                              >
                                <option value="not_started">⏸️ Not Started</option>
                                <option value="in_progress">▶️ In Progress</option>
                                <option value="on_hold">⏸️ On Hold</option>
                                <option value="completed">✅ Completed</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Time & Resource Planning */}
                        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                          <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                            <Clock className="h-4 w-4 mr-2 text-green-600" />
                            Time & Resource Planning
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                                Estimated Hours
                                <span className="text-gray-500 text-xs ml-1">(decimal allowed)</span>
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  value={newTask.estimated_hours}
                                  onChange={(e) => setNewTask(prev => ({ ...prev, estimated_hours: e.target.value }))}
                                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all pl-8"
                                  placeholder="8.5"
                                  min="0"
                                  step="0.25"
                                />
                                <Timer className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                              </div>
                              <div className="text-xs text-gray-500 mt-1 space-y-1">
                                <div>• Small: 1-4 hours</div>
                                <div>• Medium: 4-16 hours</div>
                                <div>• Large: 16+ hours</div>
                              </div>
                            </div>
                            
                            <div>
                              <label className="text-sm font-semibold text-gray-700 mb-2 block">Start Date</label>
                              <input
                                type="date"
                                value={newTask.start_date || ''}
                                onChange={(e) => setNewTask(prev => ({ ...prev, start_date: e.target.value }))}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                                min={new Date().toISOString().split('T')[0]}
                              />
                            </div>
                            
                            <div>
                              <label className="text-sm font-semibold text-gray-700 mb-2 block">Due Date</label>
                              <input
                                type="date"
                                value={newTask.due_date}
                                onChange={(e) => setNewTask(prev => ({ ...prev, due_date: e.target.value }))}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                                min={newTask.start_date || new Date().toISOString().split('T')[0]}
                              />
                            </div>
                            
                            <div>
                              <label className="text-sm font-semibold text-gray-700 mb-2 block">Assigned To</label>
                              <select
                                value={newTask.assigned_to}
                                onChange={(e) => setNewTask(prev => ({ ...prev, assigned_to: e.target.value }))}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                              >
                                <option value="">👤 Unassigned</option>
                                <option value="provider">👨‍💼 Provider</option>
                                <option value="client">👥 Client</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Dependencies & Relationships */}
                        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                          <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                            <Link className="h-4 w-4 mr-2 text-orange-600" />
                            Dependencies & Labels
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                                Task Dependencies
                                <span className="text-gray-500 text-xs ml-1">(tasks that must be completed first)</span>
                              </label>
                              <select
                                multiple
                                value={newTask.dependencies}
                                onChange={(e) => {
                                  const selected = Array.from(e.target.selectedOptions, option => option.value)
                                  setNewTask(prev => ({ ...prev, dependencies: selected }))
                                }}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                                size={3}
                              >
                                {projectTasks.filter(task => task.id !== editingTask?.id).map(task => (
                                  <option key={task.id} value={task.id}>
                                    {task.title}
                                  </option>
                                ))}
                              </select>
                              <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple tasks</p>
                            </div>
                            
                            <div>
                              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                                Tags & Labels
                                <span className="text-gray-500 text-xs ml-1">(comma-separated)</span>
                              </label>
                              <input
                                type="text"
                                value={newTask.tags.join(', ')}
                                onChange={(e) => setNewTask(prev => ({ ...prev, tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag) }))}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                                placeholder="frontend, api, database, responsive"
                              />
                              <div className="mt-2 flex flex-wrap gap-1">
                                {['frontend', 'backend', 'api', 'database', 'ui', 'ux', 'responsive', 'mobile', 'testing', 'security'].map(tag => (
                                  <button
                                    key={tag}
                                    type="button"
                                    onClick={() => {
                                      if (!newTask.tags.includes(tag)) {
                                        setNewTask(prev => ({ ...prev, tags: [...prev.tags, tag] }))
                                      }
                                    }}
                                    className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors"
                                  >
                                    +{tag}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Smart Suggestions */}
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                            <Lightbulb className="h-4 w-4 mr-2 text-blue-600" />
                            Smart Suggestions
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="p-3 bg-white rounded border border-blue-200">
                              <h5 className="text-sm font-medium text-blue-900 mb-1">Quick Templates</h5>
                              <div className="space-y-1">
                                <button 
                                  onClick={() => setNewTask(prev => ({ 
                                    ...prev, 
                                    title: 'API Endpoint Development',
                                    category: 'development',
                                    estimated_hours: '8',
                                    tags: ['api', 'backend', 'endpoint']
                                  }))}
                                  className="text-xs text-blue-600 hover:text-blue-800 block"
                                >
                                  → API Development
                                </button>
                                <button 
                                  onClick={() => setNewTask(prev => ({ 
                                    ...prev, 
                                    title: 'UI Component Design',
                                    category: 'design',
                                    estimated_hours: '6',
                                    tags: ['ui', 'design', 'component']
                                  }))}
                                  className="text-xs text-blue-600 hover:text-blue-800 block"
                                >
                                  → UI Design
                                </button>
                                <button 
                                  onClick={() => setNewTask(prev => ({ 
                                    ...prev, 
                                    title: 'Testing & QA Review',
                                    category: 'testing',
                                    estimated_hours: '4',
                                    tags: ['testing', 'qa', 'review']
                                  }))}
                                  className="text-xs text-blue-600 hover:text-blue-800 block"
                                >
                                  → Testing
                                </button>
                              </div>
                            </div>
                            
                            <div className="p-3 bg-white rounded border border-blue-200">
                              <h5 className="text-sm font-medium text-blue-900 mb-1">Time Estimates</h5>
                              <div className="text-xs text-gray-600 space-y-1">
                                <div>• Research: 2-4 hours</div>
                                <div>• Simple feature: 4-8 hours</div>
                                <div>• Complex feature: 16-32 hours</div>
                                <div>• Testing: 25% of dev time</div>
                                <div>• Documentation: 10% of dev time</div>
                              </div>
                            </div>
                            
                            <div className="p-3 bg-white rounded border border-blue-200">
                              <h5 className="text-sm font-medium text-blue-900 mb-1">Best Practices</h5>
                              <div className="text-xs text-gray-600 space-y-1">
                                <div>✓ Keep tasks under 16 hours</div>
                                <div>✓ Add detailed acceptance criteria</div>
                                <div>✓ Set realistic deadlines</div>
                                <div>✓ Include relevant tags</div>
                                <div>✓ Define clear dependencies</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Modal Footer */}
                    <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                          <span className="font-medium">💡 Tip:</span> Use detailed descriptions and realistic time estimates for better project planning
                        </div>
                        <div className="flex space-x-3">
                          <Button
                            variant="outline"
                            onClick={() => setShowAddMilestone(false)}
                            className="px-6 py-2 border-gray-300"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={createTask}
                            disabled={isCreatingTask || !newTask.title.trim()}
                            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium"
                          >
                            {isCreatingTask ? (
                              <div className="flex items-center space-x-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                <span>Creating Task...</span>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <Plus className="h-4 w-4" />
                                <span>Create Task</span>
                              </div>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Task Templates Modal */}
              {showTaskTemplates && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-semibold">Project Templates</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowTaskTemplates(false)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {taskTemplates.map((template) => (
                        <div key={template.id} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-semibold text-gray-900">{template.name}</h4>
                            <Badge variant="outline" className="text-xs">
                              {template.tasks.length} tasks
                            </Badge>
                          </div>
                          
                          <div className="space-y-2 mb-4">
                            {template.tasks.slice(0, 3).map((task: any, index: number) => (
                              <div key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                <span>{task.title}</span>
                                <Badge className={getCategoryColor(task.category)} variant="outline">
                                  {task.category}
                                </Badge>
                              </div>
                            ))}
                            {template.tasks.length > 3 && (
                              <div className="text-xs text-gray-500 ml-4">
                                +{template.tasks.length - 3} more tasks
                              </div>
                            )}
                          </div>
                          
                          <Button
                            onClick={() => createTaskFromTemplate(template.id)}
                            disabled={isCreatingTask}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                          >
                            <Layout className="h-4 w-4 mr-2" />
                            Use Template
                          </Button>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="text-center text-gray-500">
                        <p className="text-sm">Templates help you quickly create standardized task sets for common project types.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notification Center Modal */}
              {showNotificationCenter && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-semibold">Notification Settings</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowNotificationCenter(false)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 className="font-semibold text-blue-900 mb-3">Smart Tracking Options</h4>
                        
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Mail className="h-4 w-4 text-gray-600" />
                              <span className="text-sm font-medium">Email Notifications</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={notificationSettings.email}
                                onChange={(e) => setNotificationSettings(prev => ({ ...prev, email: e.target.checked }))}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <MessageSquare className="h-4 w-4 text-gray-600" />
                              <span className="text-sm font-medium">WhatsApp Updates</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={notificationSettings.whatsapp}
                                onChange={(e) => setNotificationSettings(prev => ({ ...prev, whatsapp: e.target.checked }))}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Bell className="h-4 w-4 text-gray-600" />
                              <span className="text-sm font-medium">Push Notifications</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={notificationSettings.push}
                                onChange={(e) => setNotificationSettings(prev => ({ ...prev, push: e.target.checked }))}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <FileText className="h-4 w-4 text-gray-600" />
                              <span className="text-sm font-medium">Weekly Reports</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={notificationSettings.reports}
                                onChange={(e) => setNotificationSettings(prev => ({ ...prev, reports: e.target.checked }))}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                          </div>
                        </div>
                      </div>
                      
                      {/* Pending Approvals */}
                      {approvalRequests.filter(r => r.status === 'pending').length > 0 && (
                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                          <h4 className="font-semibold text-green-900 mb-3">Pending Approvals</h4>
                          <div className="space-y-2">
                            {approvalRequests.filter(r => r.status === 'pending').map((request) => (
                              <div key={request.id} className="flex items-center justify-between p-2 bg-white rounded border">
                                <div>
                                  <p className="text-sm font-medium">{request.taskTitle}</p>
                                  <p className="text-xs text-gray-500">{request.type} approval</p>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Button
                                    size="sm"
                                    onClick={() => handleApproval(request.id, true)}
                                    className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1"
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleApproval(request.id, false)}
                                    className="text-xs px-2 py-1"
                                  >
                                    Decline
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex space-x-3 pt-4 border-t border-gray-200">
                        <Button
                          onClick={() => {
                            toast.success('Notification settings saved!')
                            setShowNotificationCenter(false)
                          }}
                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                        >
                          Save Settings
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setShowNotificationCenter(false)}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab - Enhanced with Task Updates */}
        <TabsContent value="timeline" className="space-y-6">
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="border-b border-gray-100 bg-gray-50">
              <CardTitle className="flex items-center space-x-2 text-gray-800">
                <Clock3 className="h-5 w-5 text-gray-600" />
                <span>Project Timeline</span>
              </CardTitle>
              <CardDescription className="text-gray-600">
                Chronological view of all project activities and updates
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {/* Timeline showing task updates */}
              <div className="space-y-4">
                {/* Generate timeline from project tasks */}
                {projectTasks.length > 0 ? (
                  <div className="space-y-6">
                    {projectTasks.map((task) => (
                      <div key={task.id} className="relative">
                        {/* Timeline line */}
                        <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-gray-200"></div>
                        
                        {/* Task entry */}
                        <div className="flex items-start space-x-4">
                          <div className={`w-8 h-8 rounded-full border-2 bg-white flex items-center justify-center ${getStatusColor(task.status).replace('bg-', 'border-')}`}>
                            {task.status === 'completed' ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : task.status === 'in_progress' ? (
                              <Clock className="h-4 w-4 text-blue-600" />
                            ) : (
                              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                            )}
                          </div>
                          
                          <div className="flex-1 bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold text-gray-900">{task.title}</h4>
                              <Badge className={getStatusColor(task.status)}>
                                {task.status === 'not_started' ? 'Not Started' : 
                                 task.status === 'in_progress' ? 'In Progress' : 'Completed'}
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                            
                            <div className="flex items-center space-x-4 text-xs text-gray-500 mb-3">
                              <span>Created: {new Date(task.created_at).toLocaleDateString()}</span>
                              {task.due_date && <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>}
                              <span>Est. {task.estimated_hours}h</span>
                            </div>
                            
                            {/* Task comments in timeline */}
                            {task.comments && task.comments.length > 0 && (
                              <div className="space-y-2">
                                {task.comments.map((comment: any) => (
                                  <div key={comment.id} className="bg-white p-3 rounded border border-gray-200">
                                    <p className="text-sm text-gray-700">{comment.text}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {comment.user} • {new Date(comment.created_at).toLocaleString()}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Clock3 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p>No timeline updates yet. Tasks and progress will appear here.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-6">
          {booking && booking.id ? (
            <MessagesThread bookingId={booking.id} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">Messages</h3>
              <p>Loading messaging interface...</p>
            </div>
          )}
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Paperclip className="h-5 w-5" />
                <span>Project Files</span>
              </CardTitle>
              <CardDescription>Upload and manage project-related files</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Paperclip className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p>File management interface would be here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <History className="h-5 w-5" />
                <span>Booking History</span>
              </CardTitle>
              <CardDescription>View all changes and updates to this booking</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bookingHistory.map((entry) => (
                  <div key={entry.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{entry.action}</h4>
                      <p className="text-sm text-gray-600">{entry.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(entry.timestamp)} by {entry.user}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Related Bookings Tab - Provider Only */}
        {userRole === 'provider' && (
          <TabsContent value="related" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Link className="h-5 w-5" />
                <span>Related Bookings</span>
              </CardTitle>
              <CardDescription>Other bookings from the same client</CardDescription>
            </CardHeader>
            <CardContent>
              {relatedBookings.length > 0 ? (
                <div className="grid gap-4">
                  {relatedBookings.map((relatedBooking) => (
                    <div key={relatedBooking.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">Booking #{relatedBooking.id.slice(0, 8)}</h4>
                        <Badge variant="outline">{relatedBooking.status}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">Related Service</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{formatDate(relatedBooking.created_at)}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/dashboard/bookings/${relatedBooking.id}`)}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Link className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p>No related bookings found for this client</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        )}
      </Tabs>

      {/* File Upload Modal */}
      {showFileUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Upload Files</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFileUpload(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="file-category" className="text-sm font-medium mb-2 block">File Category</label>
                <select 
                  id="file-category"
                  aria-label="Select file category"
                  className="w-full p-2 border rounded-md"
                  value={fileCategory}
                  onChange={(e) => setFileCategory(e.target.value)}
                >
                  <option value="contract">Contract</option>
                  <option value="invoice">Invoice</option>
                  <option value="receipt">Receipt</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <input
                  type="file"
                  multiple
                  className="w-full p-2 border rounded-md"
                  onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                />
              </div>
              
              <div className="flex space-x-3">
                <Button 
                  className="flex-1" 
                  disabled={isUploading || selectedFiles.length === 0}
                  onClick={() => {
                    // Handle file upload logic here
                    toast.success('Files uploaded successfully')
                    setShowFileUpload(false)
                  }}
                >
                  {isUploading ? 'Uploading...' : 'Upload Files'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowFileUpload(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
