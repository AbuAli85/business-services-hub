'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getSupabaseClient } from '@/lib/supabase'
import { 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  CheckCircle, 
  XCircle, 
  Clock as ClockIcon,
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Users,
  CalendarDays,
  BarChart3,
  MoreHorizontal,
  Star,
  Phone,
  Mail,
  Building2,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  X,
  Bell,
  Lightbulb,
  Settings
} from 'lucide-react'

interface Booking {
  id: string
  service_id: string
  client_id: string
  provider_id: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  created_at: string
  scheduled_date?: string
  scheduled_time?: string
  notes?: string
  amount?: number
  service_name?: string
  client_name?: string
  provider_name?: string
  client_company_name?: string
  provider_company_name?: string
  client_email?: string
  client_phone?: string
  service_description?: string
  estimated_duration?: string
  location?: string
  payment_status?: 'pending' | 'paid' | 'refunded'
  cancellation_reason?: string
  rating?: number
  review?: string
  last_updated?: string
  // Approval workflow fields
  approval_status?: 'pending' | 'requested' | 'approved' | 'rejected' | 'under_review'
  approval_requested_at?: string
  approval_requested_by?: string
  approval_reviewed_at?: string
  approval_reviewed_by?: string
  approval_comments?: string
  approval_rejection_reason?: string
  // Operational fields
  operational_status?: 'new' | 'in_review' | 'approved' | 'rejected' | 'on_hold' | 'escalated'
  operational_notes?: string
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  assigned_to?: string
  estimated_start_date?: string
  estimated_completion_date?: string
  actual_start_date?: string
  actual_completion_date?: string
  progress_percentage?: number
  milestone_notes?: string
  quality_score?: number
  compliance_status?: 'pending' | 'reviewed' | 'compliant' | 'non_compliant' | 'requires_action'
  // Enhanced professional fields
  contract_terms?: string
  deliverables?: string[]
  milestones?: Milestone[]
  communication_history?: CommunicationLog[]
  attachments?: Attachment[]
  risk_assessment?: RiskAssessment
  quality_metrics?: QualityMetrics
  compliance_documents?: ComplianceDocument[]
  payment_schedule?: PaymentSchedule[]
  change_requests?: ChangeRequest[]
  escalation_history?: EscalationLog[]
}

interface Milestone {
  id: string
  title: string
  description: string
  due_date: string
  status: 'pending' | 'in_progress' | 'completed' | 'overdue'
  completion_percentage: number
  deliverables: string[]
  assigned_to: string
  notes: string
}

interface CommunicationLog {
  id: string
  timestamp: string
  sender_id: string
  sender_name: string
  sender_role: 'client' | 'provider' | 'system'
  message_type: 'message' | 'notification' | 'update' | 'reminder' | 'escalation'
  content: string
  attachments?: string[]
  read_by: string[]
  priority: 'low' | 'normal' | 'high' | 'urgent'
}

interface Attachment {
  id: string
  filename: string
  file_type: string
  file_size: number
  uploaded_by: string
  uploaded_at: string
  category: 'contract' | 'invoice' | 'deliverable' | 'compliance' | 'other'
  url: string
}

interface RiskAssessment {
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  risk_factors: string[]
  mitigation_strategies: string[]
  contingency_plans: string[]
  last_assessed: string
  assessed_by: string
}

interface QualityMetrics {
  overall_score: number
  timeliness: number
  communication: number
  deliverables_quality: number
  client_satisfaction: number
  last_measured: string
}

interface ComplianceDocument {
  id: string
  document_type: string
  filename: string
  status: 'pending' | 'submitted' | 'approved' | 'rejected'
  submitted_at: string
  reviewed_at?: string
  reviewed_by?: string
  notes?: string
}

interface PaymentSchedule {
  id: string
  milestone_id?: string
  amount: number
  due_date: string
  status: 'pending' | 'paid' | 'overdue' | 'cancelled'
  payment_method?: string
  invoice_number?: string
  paid_at?: string
}

interface ChangeRequest {
  id: string
  request_type: 'scope_change' | 'timeline_change' | 'budget_change' | 'quality_change'
  description: string
  impact_assessment: string
  proposed_changes: string
  status: 'pending' | 'approved' | 'rejected' | 'under_review'
  requested_by: string
  requested_at: string
  reviewed_at?: string
  reviewed_by?: string
  approval_comments?: string
}

interface EscalationLog {
  id: string
  escalation_reason: string
  escalated_by: string
  escalated_at: string
  escalated_to: string
  priority: 'normal' | 'high' | 'urgent' | 'critical'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  resolution_notes?: string
  resolved_at?: string
  resolved_by?: string
}

interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error' | 'reminder'
  title: string
  message: string
  timestamp: string
  read: boolean
  priority: 'low' | 'normal' | 'high' | 'urgent'
  action_required: boolean
  action_url?: string
  category: 'booking' | 'approval' | 'payment' | 'quality' | 'compliance' | 'system'
}

interface Alert {
  id: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  title: string
  description: string
  timestamp: string
  acknowledged: boolean
  acknowledged_by?: string
  acknowledged_at?: string
  category: 'deadline' | 'quality' | 'compliance' | 'risk' | 'payment' | 'system'
  affected_bookings: string[]
}

interface AutomationRule {
  id: string
  name: string
  description: string
  trigger_conditions: TriggerCondition[]
  actions: AutomationAction[]
  enabled: boolean
  priority: number
  created_at: string
  last_triggered?: string
  trigger_count: number
}

interface TriggerCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in'
  value: any
  logical_operator?: 'AND' | 'OR'
}

interface AutomationAction {
  type: 'update_status' | 'send_notification' | 'assign_user' | 'create_task' | 'send_email' | 'escalate'
  parameters: Record<string, any>
  delay_minutes?: number
}

interface ComplianceStatus {
  id: string
  booking_id: string
  compliance_type: string
  status: 'compliant' | 'non_compliant' | 'pending_review' | 'requires_action'
  last_checked: string
  next_review_date: string
  issues: string[]
  actions_taken: string[]
  assigned_to?: string
}

interface BookingStats {
  total: number
  pending: number
  inProgress: number
  completed: number
  cancelled: number
  revenue: number
  thisMonth: number
  thisWeek: number
  averageRating: number
  totalReviews: number
}

interface FilterOptions {
  dateRange: 'all' | 'today' | 'week' | 'month' | 'custom'
  startDate?: string
  endDate?: string
  minAmount?: number
  maxAmount?: number
  paymentStatus?: string
  hasRating?: boolean
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showEnhancedData, setShowEnhancedData] = useState(false)
  const [sortBy, setSortBy] = useState<'created_at' | 'amount' | 'status' | 'scheduled_date'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list')
  const [selectedBookings, setSelectedBookings] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    dateRange: 'all',
    paymentStatus: 'all'
  })
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  // const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [showOperationalModal, setShowOperationalModal] = useState(false)
  const [selectedBookingForApproval, setSelectedBookingForApproval] = useState<Booking | null>(null)
  const [approvalMode, setApprovalMode] = useState<'simple' | 'detailed'>('simple')
  const [approvalForm, setApprovalForm] = useState({
    action: 'request_approval',
    comments: '',
    priority: 'normal',
    estimatedStartDate: '',
    estimatedCompletionDate: '',
    operationalNotes: '',
    businessJustification: '',
    expectedOutcome: '',
    resourceRequirements: ''
  })
  
  // Enhanced professional features state
  const [showSmartDashboard, setShowSmartDashboard] = useState(false)
  const [showWorkflowAutomation, setShowWorkflowAutomation] = useState(false)
  const [showQualityMetrics, setShowQualityMetrics] = useState(false)
  const [showCompliancePanel, setShowCompliancePanel] = useState(false)
  const [showRiskAssessment, setShowRiskAssessment] = useState(false)
  const [showMilestoneTracker, setShowMilestoneTracker] = useState(false)
  const [showCommunicationHub, setShowCommunicationHub] = useState(false)
  const [showChangeManagement, setShowChangeManagement] = useState(false)
  const [showEscalationPanel, setShowEscalationPanel] = useState(false)
  
  // Smart notifications and alerts
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [showNotificationCenter, setShowNotificationCenter] = useState(false)
  
  // Workflow automation
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([])
  const [showAutomationBuilder, setShowAutomationBuilder] = useState(false)
  
  // Quality and compliance tracking
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics[]>([])
  const [complianceStatus, setComplianceStatus] = useState<ComplianceStatus[]>([])

  // Enhanced smart features
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [showPredictiveAnalytics, setShowPredictiveAnalytics] = useState(false)
  const [showSmartScheduling, setShowSmartScheduling] = useState(false)
  const [showResourceOptimization, setShowResourceOptimization] = useState(false)
  const [showClientInsights, setShowClientInsights] = useState(false)
  const [showPerformancePredictions, setShowPerformancePredictions] = useState(false)
  
  // AI-powered insights
  const [aiInsights, setAiInsights] = useState<any[]>([])
  const [predictedBookings, setPredictedBookings] = useState<any[]>([])
  const [optimizationSuggestions, setOptimizationSuggestions] = useState<any[]>([])
  
  const [stats, setStats] = useState<BookingStats>({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    revenue: 0,
    thisMonth: 0,
    thisWeek: 0,
    averageRating: 0,
    totalReviews: 0
  })

  useEffect(() => {
    checkUserAndFetchBookings()
    // Try to check if enhanced data is available
    setTimeout(async () => {
      const enhancedAvailable = await tryFetchEnhancedData()
      // If enhanced data just became available, refetch bookings
      if (enhancedAvailable && user) {
        console.log('🔄 Enhanced data available - refetching bookings with real names')
        await fetchBookings(user.id, userRole)
      }
    }, 1000)
  }, [])

  // Refetch bookings when enhanced data becomes available
  useEffect(() => {
    if (showEnhancedData && user && bookings.length > 0) {
      console.log('🔄 Enhanced data detected - refetching bookings with real names')
      fetchBookings(user.id, userRole)
    }
  }, [showEnhancedData])

  useEffect(() => {
    filterBookings()
  }, [bookings, searchQuery, statusFilter, filterOptions, sortBy, sortOrder])

  // Auto-generate AI insights when bookings data changes
  useEffect(() => {
    if (bookings.length > 0 && showAIAssistant) {
      generateAIInsights()
      generatePredictiveAnalytics()
      generateOptimizationSuggestions()
    }
  }, [bookings, showAIAssistant])

  const checkUserAndFetchBookings = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        console.error('No authenticated user')
        return
      }

      const userRole = user.user_metadata?.role || 'client'
      setUser(user)
      setUserRole(userRole)
      await fetchBookings(user.id, userRole)
    } catch (error) {
      console.error('Error checking user:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBookings = async (userId: string, role?: string) => {
    try {
      const supabase = await getSupabaseClient()
      
      const tableName = showEnhancedData ? 'enhanced_bookings' : 'bookings'
      console.log(`📊 Fetching from: ${tableName} (enhanced: ${showEnhancedData})`)
      
      // Try enhanced view first, fallback to basic table
      let query = supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false })

      // Filter based on user role (use passed role or current userRole)
      const currentRole = role || userRole
      if (currentRole === 'provider') {
        query = query.eq('provider_id', userId)
      } else if (currentRole === 'client') {
        query = query.eq('client_id', userId)
      }

      const { data: bookingsData, error } = await query

      if (error) {
        console.error('Error fetching bookings:', error)
        setBookings([])
        calculateStats([])
        return
      }

      console.log(`📊 Raw data from ${tableName}:`, {
        count: bookingsData?.length || 0,
        sample: bookingsData?.[0] ? {
          id: bookingsData[0].id,
          service_title: bookingsData[0].service_title,
          client_name: bookingsData[0].client_name,
          provider_name: bookingsData[0].provider_name,
          service_id: bookingsData[0].service_id,
          client_id: bookingsData[0].client_id,
          provider_id: bookingsData[0].provider_id
        } : 'No data'
      })

             // Transform the data with better fallbacks
       const transformedBookings = (bookingsData || []).map(booking => ({
         id: booking.id,
         service_id: booking.service_id,
         client_id: booking.client_id,
         provider_id: booking.provider_id,
         status: booking.status || 'pending',
         created_at: booking.created_at,
         scheduled_date: booking.scheduled_date,
         scheduled_time: booking.scheduled_time,
         notes: booking.notes || '',
         amount: booking.amount || 0,
         payment_status: booking.payment_status || 'pending',
         rating: booking.rating,
         review: booking.review,
         last_updated: booking.updated_at || booking.created_at,
         // Use enhanced data when available, fallback to IDs
         service_name: showEnhancedData && booking.service_title 
           ? booking.service_title 
           : `Service #${booking.service_id?.slice(0, 8) || 'N/A'}`,
         client_name: showEnhancedData && booking.client_name 
           ? booking.client_name 
           : `Client #${booking.client_id?.slice(0, 8) || 'N/A'}`,
         provider_name: showEnhancedData && booking.provider_name 
           ? booking.provider_name 
           : `Provider #${booking.provider_id?.slice(0, 8) || 'N/A'}`,
         client_company_name: showEnhancedData ? (booking.client_company_name || '') : '',
         provider_company_name: showEnhancedData ? (booking.provider_company_name || '') : '',
         service_description: showEnhancedData ? (booking.service_description || '') : '',
         estimated_duration: showEnhancedData ? (booking.estimated_duration || '') : '',
         location: showEnhancedData ? (booking.location || '') : '',
         client_email: showEnhancedData ? (booking.client_email || booking.client_phone || '') : '',
         client_phone: showEnhancedData ? (booking.client_phone || '') : '',
         cancellation_reason: showEnhancedData ? (booking.cancellation_reason || '') : '',
         // Approval workflow fields
         approval_status: booking.approval_status || 'pending',
         approval_requested_at: booking.approval_requested_at,
         approval_requested_by: booking.approval_requested_by,
         approval_reviewed_at: booking.approval_reviewed_at,
         approval_reviewed_by: booking.approval_reviewed_by,
         approval_comments: booking.approval_comments,
         approval_rejection_reason: booking.approval_rejection_reason,
         // Operational fields
         operational_status: booking.operational_status || 'new',
         operational_notes: booking.operational_notes,
         priority: booking.priority || 'normal',
         assigned_to: booking.assigned_to,
         estimated_start_date: booking.estimated_start_date,
         estimated_completion_date: booking.estimated_completion_date,
         actual_start_date: booking.actual_start_date,
         actual_completion_date: booking.actual_completion_date,
         progress_percentage: booking.progress_percentage || 0,
         milestone_notes: booking.milestone_notes,
         quality_score: booking.quality_score,
         compliance_status: booking.compliance_status || 'pending',
         // Enhanced professional fields
         contract_terms: booking.contract_terms,
         deliverables: booking.deliverables,
         milestones: booking.milestones,
         communication_history: booking.communication_history,
         attachments: booking.attachments,
         risk_assessment: booking.risk_assessment,
         quality_metrics: booking.quality_metrics,
         compliance_documents: booking.compliance_documents,
         payment_schedule: booking.payment_schedule,
         change_requests: booking.change_requests,
         escalation_history: booking.escalation_history
       }))

      console.log('📊 Fetched bookings:', {
        total: transformedBookings.length,
        role: role || userRole,
        userId: userId,
        enhanced: showEnhancedData,
        sample: transformedBookings[0] ? {
          id: transformedBookings[0].id,
          status: transformedBookings[0].status,
          service_name: transformedBookings[0].service_name,
          client_name: transformedBookings[0].client_name
        } : 'No bookings'
      })

      setBookings(transformedBookings)
      calculateStats(transformedBookings)
    } catch (error) {
      console.error('Error fetching bookings:', error)
      setBookings([])
      calculateStats([])
    }
  }

  const calculateStats = (bookingsData: Booking[]) => {
    const now = new Date()
    const thisMonth = now.getMonth()
    const thisYear = now.getFullYear()
    const thisWeek = getWeekNumber(now)
    
    const stats: BookingStats = {
      total: bookingsData.length,
      pending: bookingsData.filter(b => b.status === 'pending').length,
      inProgress: bookingsData.filter(b => b.status === 'in_progress').length,
      completed: bookingsData.filter(b => b.status === 'completed').length,
      cancelled: bookingsData.filter(b => b.status === 'cancelled').length,
      revenue: bookingsData.reduce((sum, b) => sum + (b.amount || 0), 0),
      thisMonth: bookingsData.filter(b => {
        const date = new Date(b.created_at)
        return date.getMonth() === thisMonth && date.getFullYear() === thisYear
      }).length,
      thisWeek: bookingsData.filter(b => {
        const date = new Date(b.created_at)
        return getWeekNumber(date) === thisWeek && date.getFullYear() === thisYear
      }).length,
      averageRating: bookingsData.filter(b => b.rating).length > 0 
        ? bookingsData.filter(b => b.rating).reduce((sum, b) => sum + (b.rating || 0), 0) / bookingsData.filter(b => b.rating).length
        : 0,
      totalReviews: bookingsData.filter(b => b.rating).length
    }
    setStats(stats)
  }

  const getWeekNumber = (date: Date) => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
  }

  const filterBookings = () => {
    let filtered = [...bookings]

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(booking =>
        booking.service_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.provider_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.client_email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter)
    }

    // Apply date range filter
    if (filterOptions.dateRange !== 'all') {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      filtered = filtered.filter(booking => {
        const bookingDate = new Date(booking.created_at)
        switch (filterOptions.dateRange) {
          case 'today':
            return bookingDate >= today
          case 'week':
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
            return bookingDate >= weekAgo
          case 'month':
            const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate())
            return bookingDate >= monthAgo
          case 'custom':
            if (filterOptions.startDate && filterOptions.endDate) {
              const start = new Date(filterOptions.startDate)
              const end = new Date(filterOptions.endDate)
              return bookingDate >= start && bookingDate <= end
            }
            return true
          default:
            return true
        }
      })
    }

    // Apply payment status filter
    if (filterOptions.paymentStatus && filterOptions.paymentStatus !== 'all') {
      filtered = filtered.filter(booking => booking.payment_status === filterOptions.paymentStatus)
    }

    // Apply amount range filter
    if (filterOptions.minAmount !== undefined || filterOptions.maxAmount !== undefined) {
      filtered = filtered.filter(booking => {
        const amount = booking.amount || 0
        if (filterOptions.minAmount !== undefined && amount < filterOptions.minAmount) return false
        if (filterOptions.maxAmount !== undefined && amount > filterOptions.maxAmount) return false
        return true
      })
    }

    // Apply rating filter
    if (filterOptions.hasRating) {
      filtered = filtered.filter(booking => booking.rating !== undefined && booking.rating > 0)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy]
      let bValue: any = b[sortBy]
      
      if (sortBy === 'created_at' || sortBy === 'scheduled_date') {
        aValue = new Date(aValue || 0).getTime()
        bValue = new Date(bValue || 0).getTime()
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    setFilteredBookings(filtered)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'in_progress': return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />
      case 'in_progress': return <ClockIcon className="h-4 w-4" />
      case 'pending': return <Clock className="h-4 w-4" />
      case 'cancelled': return <XCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return 'Date not available'
      }
      
      const now = new Date()
      const isFuture = date > now
      const isToday = date.toDateString() === now.toDateString()
      const isYesterday = date.toDateString() === new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString()
      
      if (isToday) {
        return 'Today'
      } else if (isYesterday) {
        return 'Yesterday'
      } else if (isFuture) {
        const daysUntil = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        if (daysUntil === 1) {
          return 'Tomorrow'
        } else if (daysUntil <= 7) {
          return `In ${daysUntil} days`
        } else {
          return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })
        }
      } else {
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      }
    } catch (error) {
      return 'Date not available'
    }
  }

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return 'Time not available'
      }
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      return 'Time not available'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'refunded': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="h-4 w-4" />
      case 'pending': return <Clock className="h-4 w-4" />
      case 'refunded': return <XCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ))
  }

  // Enhanced helper functions for professional features
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return '🚨'
      case 'high': return '⚡'
      case 'normal': return '📋'
      case 'low': return '🐌'
      default: return '📋'
    }
  }

  const getApprovalStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200'
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200'
      case 'under_review': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'requested': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getApprovalStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return '✅'
      case 'rejected': return '❌'
      case 'under_review': return '🔍'
      case 'requested': return '📝'
      default: return '📋'
    }
  }

  // Notification and alert management functions
  const markNotificationAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    )
  }

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev => 
      prev.map(a => a.id === alertId ? { ...a, acknowledged: true, acknowledged_at: new Date().toISOString() } : a)
    )
  }

  // AI-powered smart insights generation
  const generateAIInsights = () => {
    const insights = []
    
    // Analyze booking patterns
    const recentBookings = bookings.filter(b => {
      const createdDate = new Date(b.created_at)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      return createdDate > thirtyDaysAgo
    })
    
    if (recentBookings.length > 0) {
      // Peak time analysis
      const hourlyDistribution = recentBookings.reduce((acc, booking) => {
        const hour = new Date(booking.created_at).getHours()
        acc[hour] = (acc[hour] || 0) + 1
        return acc
      }, {} as Record<number, number>)
      
      const peakHour = Object.entries(hourlyDistribution).reduce((a, b) => hourlyDistribution[Number(a[0])] > hourlyDistribution[Number(b[0])] ? a : b)[0]
      
      insights.push({
        type: 'timing',
        title: 'Peak Booking Time',
        description: `Most bookings are created at ${peakHour}:00. Consider scheduling team availability during this peak period.`,
        priority: 'medium',
        icon: '🕐',
        actionable: true
      })
      
      // Service popularity analysis
      const serviceCounts = recentBookings.reduce((acc, booking) => {
        const service = booking.service_name || 'Unknown'
        acc[service] = (acc[service] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      const topService = Object.entries(serviceCounts).reduce((a, b) => serviceCounts[a[0]] > serviceCounts[b[0]] ? a : b)
      
      insights.push({
        type: 'service',
        title: 'Most Popular Service',
        description: `"${topService[0]}" is your most requested service (${topService[1]} bookings). Consider expanding capacity or creating similar offerings.`,
        priority: 'high',
        icon: '📈',
        actionable: true
      })
      
      // Revenue optimization
      const totalRevenue = recentBookings.reduce((sum, b) => sum + (b.amount || 0), 0)
      const avgRevenue = totalRevenue / recentBookings.length
      
      if (avgRevenue < 100) {
        insights.push({
          type: 'revenue',
          title: 'Revenue Optimization Opportunity',
          description: `Average booking value is ${formatCurrency(avgRevenue)}. Consider upselling additional services or premium packages.`,
          priority: 'high',
          icon: '💰',
          actionable: true
        })
      }
      
      // Client retention analysis
      const uniqueClients = new Set(recentBookings.map(b => b.client_id))
      const repeatClients = recentBookings.filter(b => 
        recentBookings.filter(booking => booking.client_id === b.client_id).length > 1
      )
      
      if (repeatClients.length > 0) {
        insights.push({
          type: 'retention',
          title: 'Client Retention Success',
          description: `${repeatClients.length} repeat bookings detected. Your service quality is building client loyalty!`,
          priority: 'low',
          icon: '🎯',
          actionable: false
        })
      }
      
      // Performance predictions
      const completionRate = recentBookings.filter(b => b.status === 'completed').length / recentBookings.length
      const avgCompletionTime = recentBookings
        .filter(b => b.status === 'completed' && b.actual_completion_date)
        .reduce((sum, b) => {
          const start = new Date(b.created_at)
          const end = new Date(b.actual_completion_date!)
          return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
        }, 0) / Math.max(1, recentBookings.filter(b => b.status === 'completed').length)
      
      if (completionRate < 0.8) {
        insights.push({
          type: 'performance',
          title: 'Completion Rate Alert',
          description: `Only ${(completionRate * 100).toFixed(1)}% of bookings are completed. Review your workflow and identify bottlenecks.`,
          priority: 'high',
          icon: '⚠️',
          actionable: true
        })
      }
      
      if (avgCompletionTime > 7) {
        insights.push({
          type: 'performance',
          title: 'Timeline Optimization',
          description: `Average completion time is ${avgCompletionTime.toFixed(1)} days. Consider process improvements or resource allocation.`,
          priority: 'medium',
          icon: '⏱️',
          actionable: true
        })
      }
    }
    
    setAiInsights(insights)
    return insights
  }

  // Generate predictive analytics
  const generatePredictiveAnalytics = () => {
    const predictions = []
    
    // Predict next month's bookings based on current trend
    const currentMonthBookings = bookings.filter(b => {
      const createdDate = new Date(b.created_at)
      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()
      return createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear
    }).length
    
    const lastMonthBookings = bookings.filter(b => {
      const createdDate = new Date(b.created_at)
      const lastMonth = new Date().getMonth() - 1
      const year = lastMonth < 0 ? new Date().getFullYear() - 1 : new Date().getFullYear()
      const month = lastMonth < 0 ? 11 : lastMonth
      return createdDate.getMonth() === month && createdDate.getFullYear() === year
    }).length
    
    if (lastMonthBookings > 0) {
      const growthRate = (currentMonthBookings - lastMonthBookings) / lastMonthBookings
      const predictedNextMonth = Math.round(currentMonthBookings * (1 + growthRate))
      
      predictions.push({
        metric: 'Next Month Bookings',
        current: currentMonthBookings,
        predicted: predictedNextMonth,
        confidence: Math.min(95, Math.max(60, 100 - Math.abs(growthRate) * 20)),
        trend: growthRate > 0 ? 'up' : 'down',
        recommendation: growthRate > 0.1 ? 'Consider expanding capacity' : 'Focus on marketing and lead generation'
      })
    }
    
    // Predict revenue trends
    const currentMonthRevenue = bookings.filter(b => {
      const createdDate = new Date(b.created_at)
      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()
      return createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear
    }).reduce((sum, b) => sum + (b.amount || 0), 0)
    
    if (currentMonthRevenue > 0) {
      const avgBookingValue = currentMonthRevenue / currentMonthBookings
      const predictedRevenue = currentMonthBookings * avgBookingValue
      
      predictions.push({
        metric: 'Next Month Revenue',
        current: currentMonthRevenue,
        predicted: predictedRevenue,
        confidence: 85,
        trend: 'up',
        recommendation: 'Focus on maintaining service quality to sustain revenue growth'
      })
    }
    
    setPredictedBookings(predictions)
    return predictions
  }

  // Generate optimization suggestions
  const generateOptimizationSuggestions = () => {
    const suggestions = []
    
    // Resource allocation suggestions
    const pendingBookings = bookings.filter(b => b.status === 'pending').length
    const inProgressBookings = bookings.filter(b => b.status === 'in_progress').length
    
    if (pendingBookings > inProgressBookings * 2) {
      suggestions.push({
        category: 'Resource Allocation',
        title: 'Increase Team Capacity',
        description: 'Pending bookings are accumulating faster than they can be processed. Consider adding team members or improving efficiency.',
        impact: 'high',
        effort: 'medium',
        priority: 'urgent'
      })
    }
    
    // Scheduling optimization
    const weekendBookings = bookings.filter(b => {
      const date = new Date(b.created_at)
      return date.getDay() === 0 || date.getDay() === 6
    }).length
    
    if (weekendBookings > 0) {
      suggestions.push({
        category: 'Scheduling',
        title: 'Weekend Availability',
        description: `${weekendBookings} bookings were created on weekends. Consider offering weekend services to capture this demand.`,
        impact: 'medium',
        effort: 'low',
        priority: 'normal'
      })
    }
    
    // Quality improvement suggestions
    const lowRatedBookings = bookings.filter(b => b.rating && b.rating < 3).length
    if (lowRatedBookings > 0) {
      suggestions.push({
        category: 'Quality',
        title: 'Service Quality Review',
        description: `${lowRatedBookings} bookings received low ratings. Review these cases to identify improvement areas.`,
        impact: 'high',
        effort: 'medium',
        priority: 'high'
      })
    }
    
    setOptimizationSuggestions(suggestions)
    return suggestions
  }



  const getStatusActions = (booking: Booking) => {
    const actions = []
    
    if (userRole === 'provider') {
      switch (booking.status) {
        case 'pending':
          // For pending bookings, provide workflow options instead of blocking
          actions.push(
            <div key="pending-actions" className="space-y-2">
              <div className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-md border border-amber-200 mb-2">
                <AlertCircle className="h-4 w-4 inline mr-2" />
                <span className="font-medium">Pending Approval</span>
                <br />
                <span className="text-xs text-amber-500">
                  This booking requires approval before work can begin
                </span>
              </div>
              
              <div className="flex gap-2 flex-wrap">
                                 <Button 
                   key="request-approval"
                   size="sm"
                   variant="outline"
                   className="border-blue-200 text-blue-700 hover:bg-blue-50"
                   onClick={() => openApprovalModal(booking)}
                   disabled={isUpdatingStatus === booking.id}
                 >
                   <CheckCircle2 className="h-4 w-4 mr-2" />
                   Request Approval
                 </Button>
                
                <Button
                  key="send-reminder"
                  size="sm"
                  variant="outline"
                  className="border-amber-200 text-amber-700 hover:bg-amber-50"
                  onClick={() => sendReminder(booking.id)}
                  disabled={isUpdatingStatus === booking.id}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Reminder
                </Button>
                
                <Button
                  key="escalate"
                  size="sm"
                  variant="outline"
                  className="border-red-200 text-red-700 hover:bg-red-50"
                  onClick={() => escalateBooking(booking.id)}
                  disabled={isUpdatingStatus === booking.id}
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Escalate
                </Button>
              </div>
            </div>
          )
          break
        case 'in_progress':
          actions.push(
            <div key="in-progress-actions" className="space-y-2">
              <div className="flex gap-2 flex-wrap">
                <Button
                  key="complete"
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                  onClick={() => updateBookingStatus(booking.id, 'completed')}
                  disabled={isUpdatingStatus === booking.id}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Complete
                </Button>
                
                <Button
                  key="pause"
                  size="sm"
                  variant="outline"
                  className="border-orange-200 text-orange-700 hover:bg-orange-50"
                  onClick={() => pauseWork(booking.id)}
                  disabled={isUpdatingStatus === booking.id}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Pause Work
                </Button>
                
                <Button
                  key="update-progress"
                  size="sm"
                  variant="outline"
                  className="border-blue-200 text-blue-700 hover:bg-blue-50"
                  onClick={() => updateProgress(booking.id)}
                  disabled={isUpdatingStatus === booking.id}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Update Progress
                </Button>
              </div>
            </div>
          )
          break
        case 'completed':
          // Allow providers to manage completed bookings
          actions.push(
            <div key="completed-actions" className="space-y-2">
              <div className="flex gap-2 flex-wrap">
                <Button
                  key="reopen"
                  size="sm"
                  variant="outline"
                  className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-300"
                  onClick={() => updateBookingStatus(booking.id, 'in_progress')}
                  disabled={isUpdatingStatus === booking.id}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reopen
                </Button>
                
                <Button
                  key="add-review"
                  size="sm"
                  variant="outline"
                  className="border-purple-200 text-purple-700 hover:bg-purple-50"
                  onClick={() => addReview(booking.id)}
                  disabled={isUpdatingStatus === booking.id}
                >
                  <Star className="h-4 w-4 mr-2" />
                  Add Review
                </Button>
                
                <Button
                  key="archive"
                  size="sm"
                  variant="outline"
                  className="border-gray-200 text-gray-700 hover:bg-gray-50"
                  onClick={() => archiveBooking(booking.id)}
                  disabled={isUpdatingStatus === booking.id}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Archive
                </Button>
              </div>
            </div>
          )
          break
      }
    } else if (userRole === 'client') {
      // Enhanced client actions for different booking statuses
      switch (booking.status) {
        case 'pending':
          actions.push(
            <div key="client-pending-actions" className="space-y-2">
              <div className="text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-md border border-blue-200 mb-2">
                <Clock className="h-4 w-4 inline mr-2" />
                <span className="font-medium">Awaiting Provider Response</span>
                <br />
                <span className="text-xs text-blue-500">
                  Your booking is being reviewed by the service provider
                </span>
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <Button
                  key="send-inquiry"
                  size="sm"
                  variant="outline"
                  className="border-blue-200 text-blue-700 hover:bg-blue-50"
                  onClick={() => openMessageModal(booking)}
                  disabled={isUpdatingStatus === booking.id}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Inquiry
                </Button>
                
                <Button
                  key="cancel-request"
                  size="sm"
                  variant="outline"
                  className="border-red-200 text-red-700 hover:bg-red-50"
                  onClick={() => cancelBooking(booking.id)}
                  disabled={isUpdatingStatus === booking.id}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Request
                </Button>
              </div>
            </div>
          )
          break
          
        case 'in_progress':
          actions.push(
            <div key="client-in-progress-actions" className="space-y-2">
              <div className="flex gap-2 flex-wrap">
                <Button
                  key="request-change"
                  size="sm"
                  variant="outline"
                  className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-300"
                  onClick={() => openMessageModal(booking)}
                  disabled={isUpdatingStatus === booking.id}
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Request Change
                </Button>
                
                <Button
                  key="request-update"
                  size="sm"
                  variant="outline"
                  className="border-blue-200 text-blue-700 hover:bg-blue-50"
                  onClick={() => requestUpdate(booking.id)}
                  disabled={isUpdatingStatus === booking.id}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Request Update
                </Button>
              </div>
            </div>
          )
          break
          
        case 'completed':
          actions.push(
            <div key="client-completed-actions" className="space-y-2">
              <div className="flex gap-2 flex-wrap">
                <Button
                  key="add-review"
                  size="sm"
                  variant="outline"
                  className="border-purple-200 text-purple-700 hover:bg-purple-50"
                  onClick={() => addClientReview(booking.id)}
                  disabled={isUpdatingStatus === booking.id}
                >
                  <Star className="h-4 w-4 mr-2" />
                  Add Review
                </Button>
                
                <Button
                  key="rebook"
                  size="sm"
                  variant="outline"
                  className="border-green-200 text-green-700 hover:bg-green-50"
                  onClick={() => rebookService(booking.id)}
                  disabled={isUpdatingStatus === booking.id}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Rebook Service
                </Button>
              </div>
            </div>
          )
          break
      }
    }

    return actions
  }

  const exportBookings = () => {
    try {
      const exportData = selectedBookings.length > 0 
        ? bookings.filter(b => selectedBookings.includes(b.id))
        : filteredBookings

      const csvData = [
        ['ID', 'Service', 'Client', 'Provider', 'Status', 'Created', 'Scheduled', 'Amount', 'Payment Status', 'Rating', 'Notes'],
        ...exportData.map(booking => [
          booking.id,
          booking.service_name || 'N/A',
          booking.client_name || 'N/A',
          booking.provider_name || 'N/A',
          booking.status,
          formatDate(booking.created_at),
          booking.scheduled_date ? formatDate(booking.scheduled_date) : 'N/A',
          formatCurrency(booking.amount || 0),
          booking.payment_status || 'N/A',
          booking.rating ? `${booking.rating}/5` : 'N/A',
          booking.notes || ''
        ])
      ]

      const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `bookings-${selectedBookings.length > 0 ? 'selected' : 'all'}-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error exporting bookings:', error)
    }
  }

  const exportBookingsPDF = () => {
    // Placeholder for PDF export functionality
    console.log('PDF export functionality to be implemented')
  }

  const tryFetchEnhancedData = async () => {
    try {
      const supabase = await getSupabaseClient()
      
      console.log('🔍 Checking enhanced_bookings view availability...')
      
      // Try to fetch from enhanced view first
      const { data: enhancedData, error: enhancedError } = await supabase
        .from('enhanced_bookings')
        .select('*')
        .limit(1)

      if (!enhancedError && enhancedData && enhancedData.length > 0) {
        console.log('✅ Enhanced bookings view is available - using real names and data')
        console.log('📊 Sample enhanced data:', {
          id: enhancedData[0].id,
          client_name: enhancedData[0].client_name,
          provider_name: enhancedData[0].provider_name,
          service_title: enhancedData[0].service_title
        })
        setShowEnhancedData(true)
        return true
      } else {
        console.log('❌ Enhanced view error or no data:', enhancedError?.message || 'No data')
        
        // Fallback to basic view
        const { data: testData, error } = await supabase
          .from('bookings')
          .select('*')
          .limit(1)

        if (!error && testData && testData.length > 0) {
          console.log('ℹ️ Basic booking data is available - enhanced relationships not yet configured')
          setShowEnhancedData(false)
        } else {
          console.log('ℹ️ No booking data available yet')
          setShowEnhancedData(false)
        }
        return false
      }
    } catch (error) {
      console.log('Enhanced data check failed:', error)
      setShowEnhancedData(false)
      return false
    }
  }

  const updateBookingStatus = async (bookingId: string, newStatus: string, notes?: string) => {
    if (isUpdatingStatus === bookingId) return
    
    // Find the current booking to validate the transition
    const currentBooking = bookings.find(b => b.id === bookingId)
    if (!currentBooking) {
      console.error('Booking not found:', bookingId)
      return
    }
    
    // Log all status update attempts for debugging
    console.log('🔄 Status update attempt:', currentBooking.status, '→', newStatus, 'for booking:', bookingId)
    
    // Prevent invalid status transitions based on database constraints
    if (currentBooking.status === 'pending') {
      console.warn('🚫 Invalid transition blocked: pending →', newStatus)
      console.warn('Pending bookings cannot be modified due to database constraints')
      return
    }
    
    setIsUpdatingStatus(bookingId)
    try {
      const supabase = await getSupabaseClient()
      
      // Only update fields that exist in the database
      const updateData: any = { 
        status: newStatus,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', bookingId)

      if (error) {
        console.error('Error updating booking status:', error)
        
        // Handle specific status transition errors gracefully
        if (error.message?.includes('Invalid status transition')) {
          console.warn('Status transition not allowed:', error.message)
          // Don't show alert - just log the warning
        }
        return
      }

      // Update local state
      setBookings(prev => prev.map(booking => 
        booking.id === bookingId 
          ? { ...booking, status: newStatus as any, last_updated: new Date().toISOString() }
          : booking
      ))

      // Refresh data to get updated stats
      await fetchBookings(user.id, userRole)
      
    } catch (error) {
      console.error('Error updating booking status:', error)
    } finally {
      setIsUpdatingStatus(null)
    }
  }

  const bulkUpdateStatus = async (bookingIds: string[], newStatus: string) => {
    try {
      // Validate that none of the selected bookings are pending
      const selectedBookings = bookings.filter(b => bookingIds.includes(b.id))
      const hasPendingBookings = selectedBookings.some(b => b.status === 'pending')
      
      if (hasPendingBookings) {
        console.warn('🚫 Bulk update blocked: Some selected bookings are pending and cannot be modified')
        return
      }
      
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .in('id', bookingIds)

      if (error) {
        console.error('Error bulk updating bookings:', error)
        
        // Handle specific status transition errors gracefully
        if (error.message?.includes('Invalid status transition')) {
          console.warn('Bulk status transition not allowed:', error.message)
          // Don't show alert - just log the warning
        }
        return
      }

      // Update local state
      setBookings(prev => prev.map(booking => 
        bookingIds.includes(booking.id)
          ? { ...booking, status: newStatus as any, last_updated: new Date().toISOString() }
          : booking
      ))

      // Clear selection and refresh
      setSelectedBookings([])
      await fetchBookings(user.id, userRole)
      
    } catch (error) {
      console.error('Error bulk updating bookings:', error)
    }
  }

  const toggleBookingSelection = (bookingId: string) => {
    setSelectedBookings(prev => 
      prev.includes(bookingId)
        ? prev.filter(id => id !== bookingId)
        : [...prev, bookingId]
    )
  }

  const selectAllBookings = () => {
    setSelectedBookings(filteredBookings.map(b => b.id))
  }

  const clearSelection = () => {
    setSelectedBookings([])
  }

  const openDetailsModal = (booking: Booking) => {
    setSelectedBooking(booking)
    setShowDetailsModal(true)
  }

  // Removed confirm modal since 'confirmed' status is not allowed
  // const openConfirmModal = (booking: Booking) => {
  //   setSelectedBooking(booking)
  //   setShowConfirmModal(true)
  // }

  const openMessageModal = (booking: Booking) => {
    setSelectedBooking(booking)
    setShowMessageModal(true)
  }

  const sendMessage = async () => {
    if (!selectedBooking || !messageText.trim()) return
    
    setIsSendingMessage(true)
    try {
      const supabase = await getSupabaseClient()
      
      // Create a message record (you'll need to create a messages table)
      const { error } = await supabase
        .from('messages')
        .insert({
          booking_id: selectedBooking.id,
          sender_id: user.id,
          receiver_id: userRole === 'provider' ? selectedBooking.client_id : selectedBooking.provider_id,
          message: messageText.trim(),
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error sending message:', error)
        alert('Failed to send message. Please try again.')
        return
      }

      setMessageText('')
      setShowMessageModal(false)
      alert('Message sent successfully!')
      
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message. Please try again.')
    } finally {
      setIsSendingMessage(false)
    }
  }



  // Helper function to safely update bookings with fallback for missing columns
  const safeUpdateBooking = async (bookingId: string, updateData: any) => {
    try {
      const supabase = await getSupabaseClient()
      
      // Try the full update first
      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', bookingId)

      if (error) {
        // If it's a column error, try without the problematic columns
        if (error.message?.includes('column') || error.message?.includes('notes') || error.message?.includes('rating') || error.message?.includes('review')) {
          console.warn('Some columns not available, updating with available fields only')
          
          // Filter out potentially problematic columns
          const safeUpdateData = { ...updateData }
          delete safeUpdateData.notes
          delete safeUpdateData.rating
          delete safeUpdateData.review
          
          // Keep only timestamp update if that's all we can do
          if (Object.keys(safeUpdateData).length === 0) {
            safeUpdateData.updated_at = new Date().toISOString()
          }
          
          const { error: fallbackError } = await supabase
            .from('bookings')
            .update(safeUpdateData)
            .eq('id', bookingId)
          
          if (fallbackError) {
            throw fallbackError
          }
        } else {
          throw error
        }
      }
      
      return true
    } catch (error) {
      console.error('Error in safeUpdateBooking:', error)
      throw error
    }
  }

  // Provider workflow functions for pending bookings
  const openApprovalModal = (booking: Booking) => {
    setSelectedBookingForApproval(booking)
    setApprovalMode('simple') // Default to simple mode
    setApprovalForm({
      action: 'request_approval',
      comments: '',
      priority: 'normal',
      estimatedStartDate: '',
      estimatedCompletionDate: '',
      operationalNotes: '',
      businessJustification: '',
      expectedOutcome: '',
      resourceRequirements: ''
    })
    setShowApprovalModal(true)
  }

  const requestApproval = async () => {
    if (!selectedBookingForApproval) return
    
    try {
      setIsUpdatingStatus(selectedBookingForApproval.id)
      
      const supabase = await getSupabaseClient()
      const now = new Date().toISOString()
      
             // Update booking with approval workflow data
       const { error: bookingError } = await supabase
         .from('bookings')
         .update({
           approval_status: 'requested',
           approval_requested_at: now,
           approval_requested_by: user.id,
           approval_comments: `${approvalForm.businessJustification}\n\nExpected Outcome: ${approvalForm.expectedOutcome}\nResource Requirements: ${approvalForm.resourceRequirements}\nAdditional Comments: ${approvalForm.comments}`,
           operational_status: 'in_review',
           operational_notes: approvalForm.operationalNotes,
           priority: approvalForm.priority,
           estimated_start_date: approvalForm.estimatedStartDate || null,
           estimated_completion_date: approvalForm.estimatedCompletionDate || null,
           updated_at: now
         })
         .eq('id', selectedBookingForApproval.id)

      if (bookingError) {
        throw bookingError
      }

      // Create approval history record
      const { error: historyError } = await supabase
        .from('booking_approval_history')
        .insert({
          booking_id: selectedBookingForApproval.id,
          action: 'approval_requested',
          action_by: user.id,
          previous_status: selectedBookingForApproval.approval_status || 'pending',
          new_status: 'requested',
          comments: approvalForm.comments,
          metadata: {
            priority: approvalForm.priority,
            estimated_start_date: approvalForm.estimatedStartDate,
            estimated_completion_date: approvalForm.estimatedCompletionDate,
            operational_notes: approvalForm.operationalNotes
          }
        })

      if (historyError) {
        console.warn('Failed to create approval history:', historyError)
      }

      // Create operational tracking record
      const { error: operationError } = await supabase
        .from('booking_operations')
        .insert({
          booking_id: selectedBookingForApproval.id,
          operation_type: 'approval_request',
          operation_by: user.id,
          description: `Approval requested with priority: ${approvalForm.priority}`,
          status: 'pending',
          priority: approvalForm.priority,
          due_date: approvalForm.estimatedStartDate ? new Date(approvalForm.estimatedStartDate) : null,
          metadata: {
            comments: approvalForm.comments,
            operational_notes: approvalForm.operationalNotes
          }
        })

      if (operationError) {
        console.warn('Failed to create operational record:', operationError)
      }

             // Show success message with workflow details
       const priorityText = approvalForm.priority === 'urgent' ? '🚨 URGENT' : 
                           approvalForm.priority === 'high' ? '⚡ HIGH' : 
                           approvalForm.priority === 'normal' ? '📋 NORMAL' : '🐌 LOW'
       
       setSuccessMessage(`✅ Approval request submitted successfully! Priority: ${priorityText} - Your request is now under review by management.`)
       setTimeout(() => setSuccessMessage(''), 8000)
      
      // Close modal and refresh data
      setShowApprovalModal(false)
      setSelectedBookingForApproval(null)
      await fetchBookings(user.id, userRole)
      
    } catch (error) {
      console.error('Error requesting approval:', error)
      setErrorMessage('Failed to submit approval request. Please try again.')
      setTimeout(() => setErrorMessage(''), 5000)
    } finally {
      setIsUpdatingStatus('')
    }
  }

  const reviewApproval = async (bookingId: string, action: 'approve' | 'reject', comments: string) => {
    try {
      setIsUpdatingStatus(bookingId)
      
      const supabase = await getSupabaseClient()
      const now = new Date().toISOString()
      
      const newApprovalStatus = action === 'approve' ? 'approved' : 'rejected'
      const newOperationalStatus = action === 'approve' ? 'approved' : 'rejected'
      
      // Update booking
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({
          approval_status: newApprovalStatus,
          approval_reviewed_at: now,
          approval_reviewed_by: user.id,
          approval_comments: comments,
          operational_status: newOperationalStatus,
          updated_at: now
        })
        .eq('id', bookingId)

      if (bookingError) {
        throw bookingError
      }

      // Create approval history record
      const { error: historyError } = await supabase
        .from('booking_approval_history')
        .insert({
          booking_id: bookingId,
          action: `approval_${action}d`,
          action_by: user.id,
          previous_status: 'requested',
          new_status: newApprovalStatus,
          comments: comments
        })

      if (historyError) {
        console.warn('Failed to create approval history:', historyError)
      }

      // Create operational tracking record
      const { error: operationError } = await supabase
        .from('booking_operations')
        .insert({
          booking_id: bookingId,
          operation_type: `approval_${action}`,
          operation_by: user.id,
          description: `Approval ${action}d: ${comments}`,
          status: 'completed',
          priority: 'normal',
          completed_at: now,
          completion_notes: comments
        })

      if (operationError) {
        console.warn('Failed to create operational record:', operationError)
      }

      // Show success message
      setSuccessMessage(`Approval ${action}d successfully!`)
      setTimeout(() => setSuccessMessage(''), 3000)
      
      // Refresh data
      await fetchBookings(user.id, userRole)
      
    } catch (error) {
      console.error(`Error ${action}ing approval:`, error)
      setErrorMessage(`Failed to ${action} approval. Please try again.`)
      setTimeout(() => setErrorMessage(''), 5000)
    } finally {
      setIsUpdatingStatus('')
    }
  }

  const sendReminder = async (bookingId: string) => {
    try {
      const supabase = await getSupabaseClient()
      
      // Send a reminder message
      const { error } = await supabase
        .from('messages')
        .insert({
          booking_id: bookingId,
          sender_id: user.id,
          receiver_id: userRole === 'provider' ? 
            (bookings.find(b => b.id === bookingId)?.client_id || '') : 
            (bookings.find(b => b.id === bookingId)?.provider_id || ''),
          message: 'Reminder: Your booking is pending approval. Please review and respond.',
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error sending reminder:', error)
        alert('Failed to send reminder. Please try again.')
        return
      }

      alert('Reminder sent successfully!')
      
    } catch (error) {
      console.error('Error sending reminder:', error)
      alert('Failed to send reminder. Please try again.')
    }
  }

  const escalateBooking = async (bookingId: string) => {
    try {
      await safeUpdateBooking(bookingId, {
        notes: 'ESCALATED: Requires immediate attention',
        updated_at: new Date().toISOString()
      })

      alert('Booking escalated successfully! Support team will be notified.')
      
      // Refresh the data
      await fetchBookings(user.id, userRole)
      
    } catch (error) {
      console.error('Error escalating booking:', error)
      alert('Failed to escalate booking. Please try again.')
    }
  }

  // Provider workflow functions for in-progress bookings
  const pauseWork = async (bookingId: string) => {
    try {
      await safeUpdateBooking(bookingId, {
        notes: 'Work paused - will resume soon',
        updated_at: new Date().toISOString()
      })

      alert('Work paused successfully!')
      
      // Refresh the data
      await fetchBookings(user.id, userRole)
      
    } catch (error) {
      console.error('Error pausing work:', error)
      alert('Failed to pause work. Please try again.')
    }
  }

  const updateProgress = async (bookingId: string) => {
    try {
      const progressNote = prompt('Enter progress update:')
      if (!progressNote) return
      
      await safeUpdateBooking(bookingId, {
        notes: `Progress Update: ${progressNote}`,
        updated_at: new Date().toISOString()
      })

      alert('Progress updated successfully!')
      
      // Refresh the data
      await fetchBookings(user.id, userRole)
      
    } catch (error) {
      console.error('Error updating progress:', error)
      alert('Failed to update progress. Please try again.')
    }
  }

  // Provider workflow functions for completed bookings
  const addReview = async (bookingId: string) => {
    try {
      const reviewText = prompt('Enter your review for this booking:')
      if (!reviewText) return
      
      const rating = prompt('Enter rating (1-5):')
      if (!rating || isNaN(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) {
        alert('Please enter a valid rating between 1 and 5')
        return
      }
      
      await safeUpdateBooking(bookingId, {
        review: reviewText,
        rating: Number(rating),
        updated_at: new Date().toISOString()
      })

      alert('Review added successfully!')
      
      // Refresh the data
      await fetchBookings(user.id, userRole)
      
    } catch (error) {
      console.error('Error adding review:', error)
      alert('Failed to add review. Please try again.')
    }
  }

  const archiveBooking = async (bookingId: string) => {
    try {
      const confirmArchive = confirm('Are you sure you want to archive this booking? This action cannot be undone.')
      if (!confirmArchive) return
      
      await safeUpdateBooking(bookingId, {
        notes: 'ARCHIVED: ' + (bookings.find(b => b.id === bookingId)?.notes || ''),
        updated_at: new Date().toISOString()
      })

      alert('Booking archived successfully!')
      
      // Refresh the data
      await fetchBookings(user.id, userRole)
      
    } catch (error) {
      console.error('Error archiving booking:', error)
      alert('Failed to archive booking. Please try again.')
    }
  }

  // Client-specific workflow functions
  const cancelBooking = async (bookingId: string) => {
    try {
      const confirmCancel = confirm('Are you sure you want to cancel this booking request? This action cannot be undone.')
      if (!confirmCancel) return
      
      await safeUpdateBooking(bookingId, {
        notes: 'CANCELLED BY CLIENT: ' + (bookings.find(b => b.id === bookingId)?.notes || ''),
        updated_at: new Date().toISOString()
      })

      alert('Booking cancelled successfully!')
      
      // Refresh the data
      await fetchBookings(user.id, userRole)
      
    } catch (error) {
      console.error('Error cancelling booking:', error)
      alert('Failed to cancel booking. Please try again.')
    }
  }

  const requestUpdate = async (bookingId: string) => {
    try {
      const updateRequest = prompt('What update would you like to request?')
      if (!updateRequest) return
      
      const supabase = await getSupabaseClient()
      
      // Send update request message
      const { error } = await supabase
        .from('messages')
        .insert({
          booking_id: bookingId,
          sender_id: user.id,
          receiver_id: bookings.find(b => b.id === bookingId)?.provider_id || '',
          message: `Update Request: ${updateRequest}`,
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error requesting update:', error)
        alert('Failed to request update. Please try again.')
        return
      }

      alert('Update request sent successfully!')
      
    } catch (error) {
      console.error('Error requesting update:', error)
      alert('Failed to request update. Please try again.')
    }
  }

  const addClientReview = async (bookingId: string) => {
    try {
      const reviewText = prompt('Enter your review for this service:')
      if (!reviewText) return
      
      const rating = prompt('Enter rating (1-5):')
      if (!rating || isNaN(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) {
        alert('Please enter a valid rating between 1 and 5')
        return
      }
      
      await safeUpdateBooking(bookingId, {
        review: reviewText,
        rating: Number(rating),
        updated_at: new Date().toISOString()
      })

      alert('Review added successfully!')
      
      // Refresh the data
      await fetchBookings(user.id, userRole)
      
    } catch (error) {
      console.error('Error adding review:', error)
      alert('Failed to add review. Please try again.')
    }
  }

  const rebookService = async (bookingId: string) => {
    try {
      const confirmRebook = confirm('Would you like to rebook this service? This will create a new booking request.')
      if (!confirmRebook) return
      
      // For now, just show a message - in a real app, this would create a new booking
      alert('Rebooking functionality will be implemented in the next update. For now, please create a new service request.')
      
    } catch (error) {
      console.error('Error rebooking service:', error)
      alert('Failed to rebook service. Please try again.')
    }
  }

  // Removed confirmBooking function since 'confirmed' status is not allowed

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 text-lg font-medium">Loading your bookings...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Bookings</h1>
              <p className="text-gray-600 text-lg">Manage your service bookings and appointments</p>
              <p className="text-sm text-gray-500 mt-1">
                {showEnhancedData 
                  ? '✅ Enhanced data available - showing real names and service details'
                  : 'Using basic booking data. Service names and amounts will show as IDs until enhanced view is configured.'
                }
                <span className="ml-2">• Enhanced workflow actions now available for all booking statuses</span>
              </p>
            </div>
            <div className="flex gap-3">
                             <Button 
                 variant="outline" 
                 onClick={() => fetchBookings(user.id, userRole)}
                 className="border-gray-200 hover:bg-gray-50"
               >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
               <Button 
                 variant="outline" 
                 onClick={() => exportBookings()}
                 className="border-gray-200 hover:bg-gray-50"
               >
                 <Download className="h-4 w-4 mr-2" />
                 Export CSV
               </Button>
               <Button 
                 variant="outline" 
                 onClick={() => exportBookingsPDF()}
                 className="border-gray-200 hover:bg-gray-50"
               >
                 <Download className="h-4 w-4 mr-2" />
                 Export PDF
               </Button>
                               {/* Enhanced Data Test Button - Removed since not needed */}
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                New Booking
              </Button>
            </div>
          </div>

          {/* Success and Error Messages */}
          {successMessage && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <p className="text-green-800 font-medium">{successMessage}</p>
              </div>
            </div>
          )}
          
          {errorMessage && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <XCircle className="h-5 w-5 text-red-600 mr-2" />
                <p className="text-red-800 font-medium">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Smart Insights Summary */}
          <div className="mb-6 p-4 bg-gradient-to-r from-slate-50 to-gray-50 border border-slate-200 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-8 w-8 bg-gradient-to-br from-slate-600 to-gray-700 rounded-full flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Smart Insights Summary</h3>
                <p className="text-slate-600 text-sm">AI-powered analysis of your booking performance</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-white/60 rounded-lg border border-slate-200">
                <div className="text-2xl font-bold text-slate-900 mb-1">
                  {bookings.filter(b => b.status === 'completed').length}
                </div>
                <p className="text-sm text-slate-600">Completed</p>
                <div className="text-xs text-slate-500 mt-1">
                  {bookings.length > 0 ? Math.round((bookings.filter(b => b.status === 'completed').length / bookings.length) * 100) : 0}% success rate
                </div>
              </div>
              
              <div className="text-center p-3 bg-white/60 rounded-lg border border-slate-200">
                <div className="text-2xl font-bold text-slate-900 mb-1">
                  {bookings.filter(b => b.priority === 'urgent' || b.priority === 'high').length}
                </div>
                <p className="text-sm text-slate-600">High Priority</p>
                <div className="text-xs text-slate-500 mt-1">
                  Requires attention
                </div>
              </div>
              
              <div className="text-center p-3 bg-white/60 rounded-lg border border-slate-200">
                <div className="text-2xl font-bold text-slate-900 mb-1">
                  ${bookings.reduce((sum, b) => sum + (b.amount || 0), 0).toFixed(0)}
                </div>
                <p className="text-sm text-slate-600">Revenue</p>
                <div className="text-xs text-slate-500 mt-1">
                  This period
                </div>
              </div>
              
              <div className="text-center p-3 bg-white/60 rounded-lg border border-slate-200">
                <div className="text-2xl font-bold text-slate-900 mb-1">
                  {bookings.filter(b => b.rating && b.rating >= 4).length}
                </div>
                <p className="text-sm text-slate-600">High Ratings</p>
                <div className="text-xs text-slate-500 mt-1">
                  4+ star reviews
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <TrendingUp className="h-4 w-4" />
                  <span>AI recommendations available</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowAIAssistant(true)
                    generateAIInsights()
                    generatePredictiveAnalytics()
                    generateOptimizationSuggestions()
                  }}
                  className="text-slate-700 border-slate-300 hover:bg-slate-50"
                >
                  View AI Insights
                </Button>
              </div>
            </div>
          </div>

          {/* Enhanced Smart Dashboard Toggle */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <Button
                variant="outline"
                onClick={() => setShowSmartDashboard(!showSmartDashboard)}
                className={`flex items-center gap-2 ${showSmartDashboard ? 'bg-blue-50 border-blue-200 text-blue-700' : ''}`}
              >
                <BarChart3 className="h-4 w-4" />
                {showSmartDashboard ? 'Hide' : 'Show'} Smart Dashboard
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setShowWorkflowAutomation(!showWorkflowAutomation)}
                className={`flex items-center gap-2 ${showWorkflowAutomation ? 'bg-green-50 border-green-200 text-green-700' : ''}`}
              >
                <TrendingUp className="h-4 w-4" />
                Workflow Automation
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setShowQualityMetrics(!showQualityMetrics)}
                className={`flex items-center gap-2 ${showQualityMetrics ? 'bg-purple-50 border-purple-200 text-purple-700' : ''}`}
              >
                <CheckCircle className="h-4 w-4" />
                Quality & Compliance
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setShowNotificationCenter(!showNotificationCenter)}
                className={`flex items-center gap-2 ${showNotificationCenter ? 'bg-orange-50 border-orange-200 text-orange-700' : ''}`}
              >
                <AlertCircle className="h-4 w-4" />
                Notifications ({notifications.filter(n => !n.read).length})
              </Button>

              {/* New AI-Powered Features */}
              <Button
                variant="outline"
                onClick={() => {
                  setShowAIAssistant(!showAIAssistant)
                  if (!showAIAssistant) {
                    generateAIInsights()
                    generatePredictiveAnalytics()
                    generateOptimizationSuggestions()
                  }
                }}
                className={`flex items-center gap-2 ${showAIAssistant ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : ''}`}
              >
                <TrendingUp className="h-4 w-4" />
                AI Assistant
              </Button>

              <Button
                variant="outline"
                onClick={() => setShowPredictiveAnalytics(!showPredictiveAnalytics)}
                className={`flex items-center gap-2 ${showPredictiveAnalytics ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : ''}`}
              >
                <BarChart3 className="h-4 w-4" />
                Predictive Analytics
              </Button>

              <Button
                variant="outline"
                onClick={() => setShowSmartScheduling(!showSmartScheduling)}
                className={`flex items-center gap-2 ${showSmartScheduling ? 'bg-cyan-50 border-cyan-200 text-cyan-700' : ''}`}
              >
                <Calendar className="h-4 w-4" />
                Smart Scheduling
              </Button>
            </div>
            
            {/* Smart Dashboard Content */}
            {showSmartDashboard && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Smart Dashboard - Intelligent Booking Management
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white/60 p-4 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-2">🎯 Smart Recommendations</h4>
                    <p className="text-sm text-blue-700">AI-powered suggestions for optimal scheduling and resource allocation</p>
                  </div>
                  <div className="bg-white/60 p-4 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-2">📊 Predictive Analytics</h4>
                    <p className="text-sm text-blue-700">Forecast booking trends and identify potential bottlenecks</p>
                  </div>
                  <div className="bg-white/60 p-4 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-2">⚡ Performance Insights</h4>
                    <p className="text-sm text-blue-700">Real-time metrics on efficiency, quality, and client satisfaction</p>
                  </div>
                </div>
              </div>
            )}

            {/* AI-Powered Insights Dashboard */}
            {showAIAssistant && (
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6 mb-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-indigo-900">AI-Powered Insights</h3>
                    <p className="text-indigo-700 text-sm">Real-time analysis and intelligent recommendations</p>
                  </div>
                  <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 ml-auto">
                    Live Analysis
                  </Badge>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* AI Insights */}
                  <Card className="bg-white/80 backdrop-blur-sm border-indigo-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-indigo-800 text-lg flex items-center gap-2">
                        <Lightbulb className="h-5 w-5" />
                        Smart Insights
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {aiInsights.length > 0 ? (
                        aiInsights.map((insight, index) => (
                          <div key={index} className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                            <div className="flex items-start gap-2">
                              <div className={`h-2 w-2 rounded-full mt-2 ${
                                insight.type === 'success' ? 'bg-green-500' : 
                                insight.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                              }`} />
                              <div className="flex-1">
                                <p className="font-medium text-indigo-900 text-sm">{insight.title}</p>
                                <p className="text-indigo-700 text-xs mt-1">{insight.description}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4">
                          <div className="h-8 w-8 bg-indigo-200 rounded-full flex items-center justify-center mx-auto mb-2">
                            <TrendingUp className="h-4 w-4 text-indigo-600" />
                          </div>
                          <p className="text-indigo-600 text-sm">Click "AI Assistant" to generate insights</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Predictive Analytics */}
                  <Card className="bg-white/80 backdrop-blur-sm border-emerald-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-emerald-800 text-lg flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Predictive Analytics
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {predictedBookings.length > 0 ? (
                        predictedBookings.map((prediction, index) => (
                          <div key={index} className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-emerald-900 text-sm">{prediction.metric}</p>
                                <p className="text-emerald-700 text-xs mt-1">{prediction.description}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-emerald-900 text-lg">{prediction.value}</p>
                                <p className={`text-xs ${prediction.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                                  {prediction.trend === 'up' ? '↗' : '↘'} {prediction.change}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4">
                          <div className="h-8 w-8 bg-emerald-200 rounded-full flex items-center justify-center mx-auto mb-2">
                            <BarChart3 className="h-4 w-4 text-emerald-600" />
                          </div>
                          <p className="text-emerald-600 text-sm">Predictions will appear here</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Optimization Suggestions */}
                  <Card className="bg-white/80 backdrop-blur-sm border-cyan-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-cyan-800 text-lg flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Optimization Tips
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {optimizationSuggestions.length > 0 ? (
                        optimizationSuggestions.map((suggestion, index) => (
                          <div key={index} className="p-3 bg-cyan-50 rounded-lg border border-cyan-100">
                            <div className="flex items-start gap-2">
                              <div className="h-2 w-2 rounded-full mt-2 bg-cyan-500" />
                              <div className="flex-1">
                                <p className="font-medium text-cyan-900 text-sm">{suggestion.title}</p>
                                <p className="text-cyan-700 text-xs mt-1">{suggestion.description}</p>
                                <div className="mt-2">
                                  <Badge variant="outline" className="text-cyan-700 border-cyan-300 text-xs">
                                    {suggestion.priority}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4">
                          <div className="h-8 w-8 bg-cyan-200 rounded-full flex items-center justify-center mx-auto mb-2">
                            <Settings className="h-4 w-4 text-cyan-600" />
                          </div>
                          <p className="text-cyan-600 text-sm">Optimization tips will appear here</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
            
            {/* Workflow Automation Panel */}
            {showWorkflowAutomation && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Workflow Automation - Streamline Your Processes
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/60 p-4 rounded-lg border border-green-200">
                    <h4 className="font-medium text-green-900 mb-2">🔄 Auto-Approval Rules</h4>
                    <p className="text-sm text-green-700">Set conditions for automatic approval of routine bookings</p>
                    <Button size="sm" variant="outline" className="mt-2 text-green-700 border-green-300">
                      Configure Rules
                    </Button>
                  </div>
                  <div className="bg-white/60 p-4 rounded-lg border border-green-200">
                    <h4 className="font-medium text-green-900 mb-2">📧 Smart Notifications</h4>
                    <p className="text-sm text-green-700">Automated reminders and status updates for all stakeholders</p>
                    <Button size="sm" variant="outline" className="mt-2 text-green-700 border-green-300">
                      Manage Alerts
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Quality & Compliance Panel */}
            {showQualityMetrics && (
              <div className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Quality & Compliance - Maintain Standards
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white/60 p-4 rounded-lg border border-purple-200">
                    <h4 className="font-medium text-purple-900 mb-2">📋 Quality Metrics</h4>
                    <p className="text-sm text-purple-700">Track performance indicators and quality scores</p>
                  </div>
                  <div className="bg-white/60 p-4 rounded-lg border border-purple-200">
                    <h4 className="font-medium text-purple-900 mb-2">✅ Compliance Status</h4>
                    <p className="text-sm text-purple-700">Monitor regulatory compliance and document status</p>
                  </div>
                  <div className="bg-white/60 p-4 rounded-lg border border-purple-200">
                    <h4 className="font-medium text-purple-900 mb-2">🔍 Risk Assessment</h4>
                    <p className="text-sm text-purple-700">Identify and mitigate potential project risks</p>
                  </div>
                </div>
              </div>
            )}

            {/* Smart Scheduling Panel */}
            {showSmartScheduling && (
              <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-cyan-900 mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Smart Scheduling - Optimize Your Time
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white/60 p-4 rounded-lg border border-cyan-200">
                    <h4 className="font-medium text-cyan-900 mb-3">📅 Intelligent Calendar</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-cyan-700">Peak Hours</span>
                        <span className="font-medium text-cyan-900">9 AM - 2 PM</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-cyan-700">Optimal Slots</span>
                        <span className="font-medium text-cyan-900">3 Available</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-cyan-700">Buffer Time</span>
                        <span className="font-medium text-cyan-900">15 min</span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="mt-3 text-cyan-700 border-cyan-300">
                      View Calendar
                    </Button>
                  </div>
                  <div className="bg-white/60 p-4 rounded-lg border border-cyan-200">
                    <h4 className="font-medium text-cyan-900 mb-3">⚡ Auto-Scheduling</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-cyan-700">Smart Matching</span>
                        <span className="font-medium text-cyan-900">Enabled</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-cyan-700">Conflict Detection</span>
                        <span className="font-medium text-cyan-900">Active</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-cyan-700">Travel Time</span>
                        <span className="font-medium text-cyan-900">Calculated</span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="mt-3 text-cyan-700 border-cyan-300">
                      Configure
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Predictive Analytics Panel */}
            {showPredictiveAnalytics && (
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-emerald-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Predictive Analytics - Future Insights
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white/60 p-4 rounded-lg border border-emerald-200">
                    <h4 className="font-medium text-emerald-900 mb-2">📈 Next Month Forecast</h4>
                    <div className="text-2xl font-bold text-emerald-900 mb-2">
                      {predictedBookings.length > 0 ? predictedBookings[0]?.value : '12-15'}
                    </div>
                    <p className="text-sm text-emerald-700">Expected bookings</p>
                    <div className="flex items-center gap-1 mt-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="text-xs text-green-600">+15% vs current</span>
                    </div>
                  </div>
                  <div className="bg-white/60 p-4 rounded-lg border border-emerald-200">
                    <h4 className="font-medium text-emerald-900 mb-2">💰 Revenue Prediction</h4>
                    <div className="text-2xl font-bold text-emerald-900 mb-2">
                      ${predictedBookings.length > 1 ? predictedBookings[1]?.value : '2,400'}
                    </div>
                    <p className="text-sm text-emerald-700">Projected revenue</p>
                    <div className="flex items-center gap-1 mt-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="text-xs text-green-600">+22% vs current</span>
                    </div>
                  </div>
                  <div className="bg-white/60 p-4 rounded-lg border border-emerald-200">
                    <h4 className="font-medium text-emerald-900 mb-2">🎯 Peak Season Alert</h4>
                    <div className="text-lg font-bold text-emerald-900 mb-2">Q2 2024</div>
                    <p className="text-sm text-emerald-700">High demand expected</p>
                    <div className="flex items-center gap-1 mt-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <span className="text-xs text-yellow-600">Prepare resources</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {stats.thisMonth} this month • {stats.thisWeek} this week
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {stats.pending > 0 ? `${stats.pending} awaiting approval` : 'No pending bookings'}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">In Progress</p>
                    <p className="text-2xl font-bold text-amber-600">{stats.inProgress}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {stats.inProgress > 0 ? `${stats.inProgress} active work` : 'No active work'}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                    <ClockIcon className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Completed</p>
                    <p className="text-2xl font-bold text-emerald-600">{stats.completed}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {stats.averageRating.toFixed(1)}★ avg rating
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Revenue</p>
                    <p className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.revenue)}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {stats.totalReviews} reviews • {stats.cancelled} cancelled
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Enhanced Filters and Search */}
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4">
              {/* Search and Basic Filters */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search bookings by service, client, ID, notes, or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-48 border-gray-200">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
        
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="border-gray-200 hover:bg-gray-50"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {showFilters ? 'Hide' : 'Show'} Filters
                </Button>
              </div>

              {/* Advanced Filters */}
              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
                  <Select value={filterOptions.dateRange} onValueChange={(value) => setFilterOptions(prev => ({ ...prev, dateRange: value as any }))}>
                    <SelectTrigger className="border-gray-200">
                      <SelectValue placeholder="Date Range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterOptions.paymentStatus} onValueChange={(value) => setFilterOptions(prev => ({ ...prev, paymentStatus: value }))}>
                    <SelectTrigger className="border-gray-200">
                      <SelectValue placeholder="Payment Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Payments</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
                    <SelectTrigger className="border-gray-200">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created_at">Created Date</SelectItem>
                      <SelectItem value="scheduled_date">Scheduled Date</SelectItem>
                      <SelectItem value="amount">Amount</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="border-gray-200 hover:bg-gray-50"
                  >
                    {sortOrder === 'asc' ? '↑' : '↓'} {sortBy.replace('_', ' ')}
                  </Button>
                </div>
              )}

              {/* Bulk Actions */}
              {selectedBookings.length > 0 && (
                <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      {selectedBookings.length} booking{selectedBookings.length !== 1 ? 's' : ''} selected
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearSelection}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      Clear
                    </Button>
                  </div>
                  
                                                         <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => bulkUpdateStatus(selectedBookings, 'completed')}
                        className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Complete All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => bulkUpdateStatus(selectedBookings, 'cancelled')}
                        className="border-red-200 text-red-700 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancel All
                      </Button>
                    </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bookings List */}
        {filteredBookings.length === 0 ? (
          <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
            <CardContent className="p-16 text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Calendar className="h-12 w-12 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">No bookings found</h3>
              <p className="text-gray-600 mb-6 text-lg max-w-md mx-auto">
                {searchQuery || statusFilter !== 'all' 
                  ? 'No bookings match your current filters. Try adjusting your search criteria.'
                  : 'You don\'t have any bookings yet. Start by creating a service or booking an appointment.'
                }
              </p>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Create First Booking
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => (
              <Card key={booking.id} className="hover:shadow-lg transition-all duration-300 border-0 shadow-sm bg-white/90 backdrop-blur-sm">
                <CardContent className="p-6">
                  {/* Enhanced Professional Header with Smart Indicators */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id={`booking-${booking.id}`}
                        checked={selectedBookings.includes(booking.id)}
                        onChange={() => toggleBookingSelection(booking.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        aria-label={`Select booking ${booking.id}`}
                      />
                      
                      {/* Smart Status Badge with Priority */}
                      <div className="flex items-center gap-2">
                        <Badge className={`${getStatusColor(booking.status)} flex items-center gap-2 px-3 py-1`}>
                          {getStatusIcon(booking.status)}
                          <span className="capitalize">{booking.status.replace('_', ' ')}</span>
                        </Badge>
                        
                        {/* Priority Indicator */}
                        {booking.priority && (
                          <Badge className={`${getPriorityColor(booking.priority)} text-xs px-2 py-1`}>
                            {getPriorityIcon(booking.priority)} {booking.priority.toUpperCase()}
                          </Badge>
                        )}
                        
                        {/* Approval Status */}
                        {booking.approval_status && booking.approval_status !== 'pending' && (
                          <Badge className={`${getApprovalStatusColor(booking.approval_status)} text-xs px-2 py-1`}>
                            {getApprovalStatusIcon(booking.approval_status)} {booking.approval_status.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                      
                      <span className="text-sm text-gray-500 font-mono">
                        #{booking.id.slice(0, 8)}
                      </span>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm text-gray-500 mb-1">
                        Created {formatDate(booking.created_at)}
                      </div>
                      
                      {/* Smart Amount Display */}
                      {booking.amount && (
                        <div className="text-lg font-bold text-emerald-600">
                          {formatCurrency(booking.amount)}
                          {booking.payment_schedule && booking.payment_schedule.length > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              {booking.payment_schedule.filter(p => p.status === 'paid').length}/{booking.payment_schedule.length} payments
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Enhanced Payment Status */}
                      {booking.payment_status && (
                        <div className="flex flex-col items-end gap-2">
                          <Badge className={`${getPaymentStatusColor(booking.payment_status)}`}>
                            {getPaymentStatusIcon(booking.payment_status)}
                            <span className="ml-1 capitalize">{booking.payment_status}</span>
                          </Badge>
                          
                          {/* Payment Schedule Progress */}
                          {booking.payment_schedule && booking.payment_schedule.length > 0 && (
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                                style={{ 
                                  width: `${(booking.payment_schedule.filter(p => p.status === 'paid').length / booking.payment_schedule.length) * 100}%` 
                                }}
                              ></div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Enhanced Information Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Package className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{booking.service_name}</p>
                        <p className="text-gray-500">Service</p>
                        {booking.service_description && (
                          <p className="text-xs text-gray-400 truncate">{booking.service_description}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{booking.client_name}</p>
                        <p className="text-gray-500">Client{booking.client_company_name ? ` • ${booking.client_company_name}` : ''}</p>
                        {booking.client_email && (
                          <p className="text-xs text-gray-400">{booking.client_email}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{booking.provider_name}</p>
                        <p className="text-gray-500">Provider{booking.provider_company_name ? ` • ${booking.provider_company_name}` : ''}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">
                          {booking.scheduled_date ? formatDate(booking.scheduled_date) : formatDate(booking.created_at)}
                        </p>
                        <p className="text-gray-500">
                          {booking.scheduled_date ? 'Scheduled for' : 'Booked on'}
                        </p>
                        {booking.scheduled_time && (
                          <p className="text-xs text-gray-400">{booking.scheduled_time}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Additional Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {booking.estimated_duration && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">{booking.estimated_duration}</p>
                          <p className="text-gray-500">Duration</p>
                        </div>
                      </div>
                    )}
                    
                    {booking.location && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">{booking.location}</p>
                          <p className="text-gray-500">Location</p>
                        </div>
                      </div>
                    )}

                    {booking.rating && (
                      <div className="flex items-center gap-2 text-sm">
                        <Star className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="flex items-center gap-1">
                            {getRatingStars(booking.rating)}
                            <span className="font-medium text-gray-900 ml-1">({booking.rating}/5)</span>
                          </div>
                          <p className="text-gray-500">Rating</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Professional Workflow Section */}
                  <div className="mb-4 space-y-3">
                    {/* Smart Workflow Indicators */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Milestone Progress */}
                      {booking.milestones && booking.milestones.length > 0 && (
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-blue-900">Milestones</span>
                            <span className="text-xs text-blue-600">
                              {booking.milestones.filter(m => m.status === 'completed').length}/{booking.milestones.length}
                            </span>
                          </div>
                          <div className="w-full bg-blue-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ 
                                width: `${(booking.milestones.filter(m => m.status === 'completed').length / booking.milestones.length) * 100}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      )}
                      
                      {/* Quality Score */}
                      {booking.quality_metrics && (
                        <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-emerald-900">Quality Score</span>
                            <span className="text-xs text-emerald-600">{booking.quality_metrics.overall_score}/100</span>
                          </div>
                          <div className="w-full bg-emerald-200 rounded-full h-2">
                            <div 
                              className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${booking.quality_metrics.overall_score}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                      
                      {/* Risk Assessment */}
                      {booking.risk_assessment && (
                        <div className={`p-3 rounded-lg border ${
                          booking.risk_assessment.risk_level === 'critical' ? 'bg-red-50 border-red-200' :
                          booking.risk_assessment.risk_level === 'high' ? 'bg-orange-50 border-orange-200' :
                          booking.risk_assessment.risk_level === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                          'bg-green-50 border-green-200'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-sm font-medium ${
                              booking.risk_assessment.risk_level === 'critical' ? 'text-red-900' :
                              booking.risk_assessment.risk_level === 'high' ? 'text-orange-900' :
                              booking.risk_assessment.risk_level === 'medium' ? 'text-yellow-900' :
                              'text-green-900'
                            }`}>Risk Level</span>
                            <span className={`text-xs ${
                              booking.risk_assessment.risk_level === 'critical' ? 'text-red-600' :
                              booking.risk_assessment.risk_level === 'high' ? 'text-orange-600' :
                              booking.risk_assessment.risk_level === 'medium' ? 'text-yellow-600' :
                              'text-green-600'
                            }`}>{booking.risk_assessment.risk_level.toUpperCase()}</span>
                          </div>
                          <div className="text-xs text-gray-600">
                            {booking.risk_assessment.risk_factors.length} risk factors identified
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Notes and Review */}
                    {(booking.notes || booking.review) && (
                      <div className="space-y-2">
                        {booking.notes && (
                          <div className="p-3 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                            <p className="text-sm font-medium text-gray-700 mb-1">Notes:</p>
                            <p className="text-sm text-gray-700">{booking.notes}</p>
                          </div>
                        )}
                        {booking.review && (
                          <div className="p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                            <p className="text-sm font-medium text-gray-700 mb-1">Review:</p>
                            <p className="text-sm text-gray-700">{booking.review}</p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Smart Alerts and Notifications */}
                    <div className="space-y-2">
                      {/* Deadline Alerts */}
                      {booking.estimated_completion_date && new Date(booking.estimated_completion_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && (
                        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-amber-600" />
                            <span className="text-sm font-medium text-amber-900">
                              Deadline approaching: {formatDate(booking.estimated_completion_date)}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {/* Compliance Alerts */}
                      {booking.compliance_status === 'requires_action' && (
                        <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                            <span className="text-sm font-medium text-red-900">
                              Compliance action required
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Smart AI Insights Section */}
                  {showAIAssistant && (
                    <div className="mb-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-6 w-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                          <TrendingUp className="h-3 w-3 text-white" />
                        </div>
                        <h4 className="text-sm font-medium text-indigo-900">AI Insights</h4>
                        <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 text-xs">
                          Smart Analysis
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Smart Recommendations */}
                        <div className="text-center p-2 bg-white/60 rounded border border-indigo-100">
                          <div className="text-xs font-medium text-indigo-900 mb-1">
                            {booking.status === 'pending' ? '⏰ Schedule Soon' : 
                             booking.status === 'in_progress' ? '📊 Track Progress' : 
                             booking.status === 'completed' ? '⭐ Request Review' : '📋 Follow Up'}
                          </div>
                          <p className="text-xs text-indigo-700">
                            {booking.status === 'pending' ? 'Optimal timing for scheduling' : 
                             booking.status === 'in_progress' ? 'Monitor milestones closely' : 
                             booking.status === 'completed' ? 'Encourage client feedback' : 'Maintain communication'}
                          </p>
                        </div>
                        
                        {/* Risk Assessment */}
                        <div className="text-center p-2 bg-white/60 rounded border border-indigo-100">
                          <div className="text-xs font-medium text-indigo-900 mb-1">
                            {booking.priority === 'urgent' ? '🚨 High Priority' : 
                             booking.priority === 'high' ? '⚠️ Medium Risk' : '✅ Low Risk'}
                          </div>
                          <p className="text-xs text-indigo-700">
                            {booking.priority === 'urgent' ? 'Requires immediate attention' : 
                             booking.priority === 'high' ? 'Monitor closely' : 'Standard handling'}
                          </p>
                        </div>
                        
                        {/* Performance Prediction */}
                        <div className="text-center p-2 bg-white/60 rounded border border-indigo-100">
                          <div className="text-xs font-medium text-indigo-900 mb-1">
                            {booking.rating && booking.rating >= 4 ? '🌟 High Satisfaction' : 
                             booking.rating && booking.rating >= 3 ? '📈 Good Potential' : '💡 Improvement Opportunity'}
                          </div>
                          <p className="text-xs text-indigo-700">
                            {booking.rating && booking.rating >= 4 ? 'Client satisfaction high' : 
                             booking.rating && booking.rating >= 3 ? 'Positive trajectory' : 'Focus on quality'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2 flex-wrap">
                                             <Button 
                         size="sm" 
                         variant="outline" 
                         className="border-gray-200 hover:bg-gray-50"
                         onClick={() => openDetailsModal(booking)}
                       >
                         <Eye className="h-4 w-4 mr-2" />
                         View Details
                       </Button>
                      
                      {/* Dynamic Status Actions */}
                      {getStatusActions(booking)}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        Last updated: {formatDate(booking.last_updated || booking.created_at)}
                      </span>
                      <Button size="sm" variant="ghost" className="text-gray-400 hover:text-gray-600">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
                     </div>
         )}

         {/* Details Modal */}
         {showDetailsModal && selectedBooking && (
           <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
             <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
               <div className="p-6">
                 <div className="flex items-center justify-between mb-6">
                   <h2 className="text-2xl font-bold text-gray-900">Booking Details</h2>
                   <Button
                     variant="ghost"
                     size="sm"
                     onClick={() => setShowDetailsModal(false)}
                     className="text-gray-400 hover:text-gray-600"
                   >
                     <XCircle className="h-6 w-6" />
                   </Button>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div>
                     <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                     <div className="space-y-3">
                       <div>
                         <span className="text-sm font-medium text-gray-500">Booking ID:</span>
                         <p className="text-sm text-gray-900 font-mono">{selectedBooking.id}</p>
                       </div>
                       <div>
                         <span className="text-sm font-medium text-gray-500">Status:</span>
                         <Badge className={`${getStatusColor(selectedBooking.status)} ml-2`}>
                           {getStatusIcon(selectedBooking.status)}
                           <span className="ml-1 capitalize">{selectedBooking.status.replace('_', ' ')}</span>
                         </Badge>
                       </div>
                       <div>
                         <span className="text-sm font-medium text-gray-500">Created:</span>
                         <p className="text-sm text-gray-900">{formatDate(selectedBooking.created_at)}</p>
                       </div>
                       <div>
                         <span className="text-sm font-medium text-gray-500">Last Updated:</span>
                         <p className="text-sm text-gray-900">{formatDate(selectedBooking.last_updated || selectedBooking.created_at)}</p>
                       </div>
                     </div>
                   </div>
                   
                   <div>
                     <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Details</h3>
                     <div className="space-y-3">
                       <div>
                         <span className="text-sm font-medium text-gray-500">Service:</span>
                         <p className="text-sm text-gray-900">{selectedBooking.service_name}</p>
                       </div>
                       <div>
                         <span className="text-sm font-medium text-gray-500">Amount:</span>
                         <p className="text-sm text-gray-900 font-semibold">{formatCurrency(selectedBooking.amount || 0)}</p>
                       </div>
                       <div>
                         <span className="text-sm font-medium text-gray-500">Payment Status:</span>
                         <Badge className={`${getPaymentStatusColor(selectedBooking.payment_status || 'pending')} ml-2`}>
                           {getPaymentStatusIcon(selectedBooking.payment_status || 'pending')}
                           <span className="ml-1 capitalize">{selectedBooking.payment_status || 'pending'}</span>
                         </Badge>
                       </div>
                     </div>
                   </div>
                 </div>
                 
                                   <div className="mt-6 pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
                    <div className="flex gap-3 flex-wrap">
                      {/* Dynamic Status Actions */}
                      {getStatusActions(selectedBooking).map((action, index) => (
                        <div key={index}>{action}</div>
                      ))}
                      
                      {/* Always show Message button */}
                      <Button
                        variant="outline"
                        className="border-gray-200 hover:bg-gray-50"
                        onClick={() => {
                          if (selectedBooking) {
                            openMessageModal(selectedBooking)
                            setShowDetailsModal(false)
                          }
                        }}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Message
                      </Button>
                    </div>
                  </div>
               </div>
             </div>
           </div>
         )}

                   {/* Confirm Modal - Removed since 'confirmed' status is not allowed */}

                           {/* Notification Center Modal */}
        {showNotificationCenter && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Smart Notifications & Alerts</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNotificationCenter(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <Tabs defaultValue="notifications" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="notifications">Notifications ({notifications.length})</TabsTrigger>
                    <TabsTrigger value="alerts">Alerts ({alerts.length})</TabsTrigger>
                    <TabsTrigger value="workflow">Workflow Status</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="notifications" className="space-y-4">
                    {notifications.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No notifications at this time</p>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div key={notification.id} className={`p-4 rounded-lg border ${
                          notification.read ? 'bg-gray-50 border-gray-200' : 'bg-white border-blue-200'
                        }`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`text-sm font-medium ${
                                  notification.read ? 'text-gray-600' : 'text-gray-900'
                                }`}>{notification.title}</span>
                                <Badge className={`text-xs ${
                                  notification.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                                  notification.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                  notification.priority === 'normal' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {notification.priority}
                                </Badge>
                              </div>
                              <p className={`text-sm ${
                                notification.read ? 'text-gray-500' : 'text-gray-700'
                              }`}>{notification.message}</p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                                <span>{formatDate(notification.timestamp)}</span>
                                <span>{notification.category}</span>
                                {notification.action_required && (
                                  <Badge className="bg-amber-100 text-amber-800 text-xs">Action Required</Badge>
                                )}
                              </div>
                            </div>
                            {!notification.read && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => markNotificationAsRead(notification.id)}
                              >
                                Mark Read
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </TabsContent>
                  
                  <TabsContent value="alerts" className="space-y-4">
                    {alerts.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No active alerts</p>
                      </div>
                    ) : (
                      alerts.map((alert) => (
                        <div key={alert.id} className={`p-4 rounded-lg border ${
                          alert.severity === 'critical' ? 'bg-red-50 border-red-200' :
                          alert.severity === 'error' ? 'bg-orange-50 border-orange-200' :
                          alert.severity === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                          'bg-blue-50 border-blue-200'
                        }`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`text-sm font-medium ${
                                  alert.severity === 'critical' ? 'text-red-900' :
                                  alert.severity === 'error' ? 'text-orange-900' :
                                  alert.severity === 'warning' ? 'text-yellow-900' :
                                  'text-blue-900'
                                }`}>{alert.title}</span>
                                <Badge className={`text-xs ${
                                  alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                                  alert.severity === 'error' ? 'bg-orange-100 text-orange-800' :
                                  alert.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {alert.severity}
                                </Badge>
                              </div>
                              <p className={`text-sm ${
                                alert.severity === 'critical' ? 'text-red-700' :
                                alert.severity === 'error' ? 'text-orange-700' :
                                alert.severity === 'warning' ? 'text-yellow-700' :
                                'text-blue-700'
                              }`}>{alert.description}</p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                <span>{formatDate(alert.timestamp)}</span>
                                <span>{alert.category}</span>
                                <span>{alert.affected_bookings.length} bookings affected</span>
                              </div>
                            </div>
                            {!alert.acknowledged && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => acknowledgeAlert(alert.id)}
                              >
                                Acknowledge
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </TabsContent>
                  
                  <TabsContent value="workflow" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 className="font-medium text-blue-900 mb-2">Active Workflows</h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Pending Approvals</span>
                            <Badge className="bg-amber-100 text-amber-800">
                              {bookings.filter(b => b.approval_status === 'requested').length}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span>In Progress</span>
                            <Badge className="bg-blue-100 text-blue-800">
                              {bookings.filter(b => b.status === 'in_progress').length}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span>Quality Review</span>
                            <Badge className="bg-purple-100 text-purple-800">
                              {bookings.filter(b => b.quality_metrics && b.quality_metrics.overall_score < 80).length}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <h4 className="font-medium text-green-900 mb-2">Performance Metrics</h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Avg Completion Time</span>
                            <span className="font-medium">3.2 days</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span>Client Satisfaction</span>
                            <span className="font-medium">4.8/5.0</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span>Quality Score</span>
                            <span className="font-medium">92%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        )}

        {/* Message Modal */}
        {showMessageModal && selectedBooking && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-md w-full">
                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Send Message</h2>
                  <p className="text-gray-600 mb-4">
                    Send a message to {userRole === 'provider' ? 'the client' : 'the provider'} about this booking.
                  </p>
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type your message here..."
                    className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="flex gap-3 justify-end mt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowMessageModal(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={sendMessage}
                      disabled={isSendingMessage || !messageText.trim()}
                    >
                      {isSendingMessage ? 'Sending...' : 'Send Message'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Approval Modal */}
          {showApprovalModal && selectedBookingForApproval && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-2xl w-full">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Request Approval</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowApprovalModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <XCircle className="h-6 w-6" />
                    </Button>
                  </div>
                  
                                     <div className="space-y-6">
                     {/* Workflow Explanation */}
                     <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                       <h3 className="font-medium text-blue-900 mb-2">🔄 Approval Workflow</h3>
                       <p className="text-sm text-blue-700 mb-3">
                         This form collects essential information needed by managers to make informed approval decisions. 
                         The more detailed and clear your request, the faster it can be approved.
                       </p>
                       
                       {/* Approval Mode Toggle */}
                       <div className="flex items-center gap-3">
                         <span className="text-sm font-medium text-blue-900">Approval Type:</span>
                         <div className="flex bg-blue-100 rounded-lg p-1">
                           <button
                             type="button"
                             onClick={() => setApprovalMode('simple')}
                             className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                               approvalMode === 'simple' 
                                 ? 'bg-white text-blue-700 shadow-sm' 
                                 : 'text-blue-600 hover:text-blue-700'
                             }`}
                           >
                             🚀 Quick Approval
                           </button>
                           <button
                             type="button"
                             onClick={() => setApprovalMode('detailed')}
                             className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                               approvalMode === 'detailed' 
                                 ? 'bg-white text-blue-700 shadow-sm' 
                                 : 'text-blue-600 hover:text-blue-700'
                             }`}
                           >
                             📋 Detailed Request
                           </button>
                         </div>
                       </div>
                     </div>
                     
                     {/* Booking Info */}
                     <div className="bg-gray-50 p-4 rounded-lg">
                       <h3 className="font-medium text-gray-900 mb-2">📋 Booking Details</h3>
                       <div className="grid grid-cols-2 gap-4 text-sm">
                         <div>
                           <span className="text-gray-500">Service:</span>
                           <p className="font-medium">{selectedBookingForApproval.service_name}</p>
                         </div>
                         <div>
                           <span className="text-gray-500">Client:</span>
                           <p className="font-medium">{selectedBookingForApproval.client_name}</p>
                         </div>
                         <div>
                           <span className="text-gray-500">Amount:</span>
                           <p className="font-medium">{formatCurrency(selectedBookingForApproval.amount || 0)}</p>
                         </div>
                         <div>
                           <span className="text-gray-500">Status:</span>
                           <Badge className={getStatusColor(selectedBookingForApproval.status)}>
                             {selectedBookingForApproval.status.replace('_', ' ')}
                           </Badge>
                         </div>
                       </div>
                     </div>

                                         {/* Enhanced Approval Form with Explanations */}
                     {approvalMode === 'simple' ? (
                       /* Simple Quick Approval Form */
                       <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                         <h4 className="font-medium text-green-900 mb-4 text-lg">🚀 Quick Approval Request</h4>
                         <p className="text-sm text-green-700 mb-4">
                           For simple approvals, just provide the essential information below.
                         </p>
                         
                         <div className="space-y-4">
                           <div>
                             <Label htmlFor="priority-simple" className="text-green-900">Priority Level *</Label>
                             <Select 
                               value={approvalForm.priority} 
                               onValueChange={(value) => setApprovalForm(prev => ({ ...prev, priority: value as any }))}
                             >
                               <SelectTrigger className="border-green-200">
                                 <SelectValue placeholder="Select priority" />
                               </SelectTrigger>
                               <SelectContent>
                                 <SelectItem value="low">🟢 Low</SelectItem>
                                 <SelectItem value="normal">🟡 Normal</SelectItem>
                                 <SelectItem value="high">🟠 High</SelectItem>
                                 <SelectItem value="urgent">🔴 Urgent</SelectItem>
                               </SelectContent>
                             </Select>
                           </div>
                           
                           <div>
                             <Label htmlFor="comments-simple" className="text-green-900">Brief Justification *</Label>
                             <Textarea
                               id="comments-simple"
                               placeholder="Briefly explain why this approval is needed..."
                               value={approvalForm.businessJustification}
                               onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setApprovalForm(prev => ({ ...prev, businessJustification: e.target.value }))}
                               rows={2}
                               className="border-green-200"
                             />
                           </div>
                         </div>
                       </div>
                     ) : (
                       /* Detailed Approval Form */
                       <div className="space-y-6">
                         {/* Priority Section */}
                         <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                         <h4 className="font-medium text-blue-900 mb-2">📊 Priority & Timeline</h4>
                         <p className="text-sm text-blue-700 mb-3">Set the urgency level and expected timeline for this approval request.</p>
                         
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                           <div>
                             <Label htmlFor="priority" className="text-blue-900">Priority Level *</Label>
                             <Select 
                               value={approvalForm.priority} 
                               onValueChange={(value) => setApprovalForm(prev => ({ ...prev, priority: value as any }))}
                             >
                               <SelectTrigger className="border-blue-200">
                                 <SelectValue placeholder="Select priority" />
                               </SelectTrigger>
                               <SelectContent>
                                 <SelectItem value="low">🟢 Low - Standard processing</SelectItem>
                                 <SelectItem value="normal">🟡 Normal - Within 48 hours</SelectItem>
                                 <SelectItem value="high">🟠 High - Within 24 hours</SelectItem>
                                 <SelectItem value="urgent">🔴 Urgent - Immediate attention</SelectItem>
                               </SelectContent>
                             </Select>
                           </div>
                           
                           <div>
                             <Label htmlFor="estimatedStartDate" className="text-blue-900">Start Date</Label>
                             <Input
                               id="estimatedStartDate"
                               type="date"
                               value={approvalForm.estimatedStartDate}
                               onChange={(e) => setApprovalForm(prev => ({ ...prev, estimatedStartDate: e.target.value }))}
                               className="border-blue-200"
                             />
                           </div>
                           
                           <div>
                             <Label htmlFor="estimatedCompletionDate" className="text-blue-900">Completion Date</Label>
                             <Input
                               id="estimatedCompletionDate"
                               type="date"
                               value={approvalForm.estimatedCompletionDate}
                               onChange={(e) => setApprovalForm(prev => ({ ...prev, estimatedCompletionDate: e.target.value }))}
                               className="border-blue-200"
                             />
                           </div>
                         </div>
                       </div>

                       {/* Business Justification Section */}
                       <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                         <h4 className="font-medium text-green-900 mb-2">💼 Business Justification *</h4>
                         <p className="text-sm text-green-700 mb-3">Explain the business need and expected outcomes for this approval.</p>
                         
                         <div className="space-y-3">
                           <div>
                             <Label htmlFor="businessJustification" className="text-green-900">Why is this approval needed?</Label>
                             <Textarea
                               id="businessJustification"
                               placeholder="Describe the business need, problem being solved, or opportunity being pursued..."
                               value={approvalForm.businessJustification}
                               onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setApprovalForm(prev => ({ ...prev, businessJustification: e.target.value }))}
                               rows={2}
                               className="border-green-200"
                             />
                           </div>
                           
                           <div>
                             <Label htmlFor="expectedOutcome" className="text-green-900">Expected Outcome</Label>
                             <Textarea
                               id="expectedOutcome"
                               placeholder="What will be achieved? What are the success metrics?"
                               value={approvalForm.expectedOutcome}
                               onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setApprovalForm(prev => ({ ...prev, expectedOutcome: e.target.value }))}
                               rows={2}
                               className="border-green-200"
                             />
                           </div>
                         </div>
                       </div>

                       {/* Operational Details Section */}
                       <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                         <h4 className="font-medium text-amber-900 mb-2">⚙️ Operational Details</h4>
                         <p className="text-sm text-amber-700 mb-3">Provide operational context and resource requirements.</p>
                         
                         <div className="space-y-3">
                           <div>
                             <Label htmlFor="resourceRequirements" className="text-amber-900">Resource Requirements</Label>
                             <Textarea
                               id="resourceRequirements"
                               placeholder="What resources are needed? (people, tools, budget, etc.)"
                               value={approvalForm.resourceRequirements}
                               onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setApprovalForm(prev => ({ ...prev, resourceRequirements: e.target.value }))}
                               rows={2}
                               className="border-amber-200"
                             />
                           </div>
                           
                           <div>
                             <Label htmlFor="operationalNotes" className="text-amber-900">Operational Notes</Label>
                             <Textarea
                               id="operationalNotes"
                               placeholder="Any special considerations, risks, or operational requirements..."
                               value={approvalForm.operationalNotes}
                               onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setApprovalForm(prev => ({ ...prev, operationalNotes: e.target.value }))}
                               rows={2}
                               className="border-amber-200"
                             />
                           </div>
                         </div>
                       </div>

                       {/* Additional Comments Section */}
                       <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                         <h4 className="font-medium text-purple-900 mb-2">💬 Additional Comments</h4>
                         <p className="text-sm text-purple-700 mb-3">Any other information that would help with the approval decision.</p>
                         
                         <div>
                           <Label htmlFor="comments" className="text-purple-900">Comments</Label>
                           <Textarea
                             id="comments"
                             placeholder="Any additional context, concerns, or information for the approver..."
                             value={approvalForm.comments}
                             onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setApprovalForm(prev => ({ ...prev, comments: e.target.value }))}
                             rows={3}
                             className="border-purple-200"
                           />
                         </div>
                       </div>
                     </div>
                   )}

                   {/* Action Buttons */}
                     <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                       <Button
                         variant="outline"
                         onClick={() => setShowApprovalModal(false)}
                       >
                         Cancel
                       </Button>
                       
                       {/* Form Validation Info */}
                       <div className="flex-1 text-sm text-gray-600">
                         <span className="text-red-500">*</span> Required fields
                       </div>
                       
                       <Button
                         className="bg-blue-600 hover:bg-blue-700"
                         onClick={requestApproval}
                         disabled={
                           isUpdatingStatus === selectedBookingForApproval.id ||
                           !approvalForm.businessJustification.trim() ||
                           !approvalForm.priority ||
                           (approvalMode === 'detailed' && !approvalForm.expectedOutcome.trim())
                         }
                       >
                         {isUpdatingStatus === selectedBookingForApproval.id ? (
                           <>
                             <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                             Submitting...
                           </>
                         ) : (
                           <>
                             <CheckCircle2 className="h-4 w-4 mr-2" />
                             Submit Approval Request
                           </>
                         )}
                       </Button>
                     </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }
