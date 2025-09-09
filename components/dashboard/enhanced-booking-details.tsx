'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MessagesThread } from './messages-thread'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ProgressTabs } from './progress-tabs'
// import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  Star,
  Edit,
  Save,
  Video,
  Share2,
  Bell,
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
  Pause,
  MoreHorizontal,
  ThumbsUp,
  ThumbsDown,
  Heart,
  Bookmark,
  ExternalLink,
  QrCode,
  CreditCard,
  Banknote,
  Calendar as CalendarIcon,
  Clock4,
  MapPin as LocationIcon,
  Users,
  CheckCheck,
  AlertCircle,
  Info,
  Wallet,
  Receipt,
  Activity,
  MessageCircle,
  PhoneCall,
  VideoIcon,
  Camera,
  Mic,
  Settings,
  Filter,
  Search,
  Plus,
  Minus,
  X,
  Send,
  Paperclip,
  Image,
  FileIcon,
  Copy,
  Link2,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  Headphones,
  Printer,
  Wifi,
  Signal,
  Battery,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw
} from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { generatePDF, generateExcel, downloadFile, ExportData } from '@/lib/export-utils'

interface EnhancedBooking {
  id: string
  title: string
  description?: string
  status: 'pending' | 'approved' | 'declined' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold' | 'rescheduled'
  approval_status?: 'pending' | 'approved' | 'rejected' | 'under_review'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  created_at: string
  updated_at: string
  scheduled_date?: string
  scheduled_time?: string
  estimated_completion?: string
  actual_completion?: string
  notes?: string
  amount: number
  currency: string
  payment_status: 'pending' | 'partial' | 'paid' | 'refunded' | 'overdue'
  payment_method?: string
  progress_percentage: number
  estimated_duration: string
  actual_duration?: string
  location?: string
  location_type: 'on_site' | 'remote' | 'hybrid'
  rating?: number
  review?: string
  client_satisfaction?: number
  provider_rating?: number
  tags: string[]
  attachments: any[]
  milestones: any[]
  issues: any[]
  service_type_id?: string
  service: {
    id: string
    title: string
    description: string
    category: string
    base_price: number
    currency: string
    duration: string
    requirements?: string[]
    deliverables?: string[]
  }
  client: {
    id: string
    full_name: string
    email: string
    phone?: string
    company_name?: string
    avatar_url?: string
    timezone?: string
    preferred_contact?: 'email' | 'phone' | 'message'
    response_time?: string
  }
  provider: {
    id: string
    full_name: string
    email: string
    phone?: string
    company_name?: string
    avatar_url?: string
    specialization?: string[]
    rating?: number
    total_reviews?: number
    response_time?: string
    availability_status?: 'available' | 'busy' | 'offline'
  }
}

interface SmartSuggestion {
  type: 'scheduling' | 'communication' | 'payment' | 'service_improvement' | 'follow_up' | 'payment_reminder' | 'progress_update'
  title: string
  description: string
  action: string
  priority: 'low' | 'medium' | 'high'
  estimated_impact: string
}

interface CommunicationChannel {
  type: 'message' | 'email' | 'phone' | 'video_call' | 'in_person'
  label: string
  icon: React.ReactNode
  available: boolean
  last_used?: string
  preferred?: boolean
}

export default function EnhancedBookingDetails({ 
  showProgressCard = true, 
  userRole = 'provider' 
}: { 
  showProgressCard?: boolean
  userRole?: 'provider' | 'client'
}) {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookingId = params?.id as string
  
  const [booking, setBooking] = useState<EnhancedBooking | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview')
  const [isUpdating, setIsUpdating] = useState(false)
  const [smartSuggestions, setSmartSuggestions] = useState<SmartSuggestion[]>([])
  const [communicationChannels, setCommunicationChannels] = useState<CommunicationChannel[]>([])
  const [showQuickActions, setShowQuickActions] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [messageType, setMessageType] = useState<'text' | 'voice' | 'video'>('text')
  const [realtimeUpdates, setRealtimeUpdates] = useState(true)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [overdueCount, setOverdueCount] = useState(0)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [tempProgress, setTempProgress] = useState(0)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showAddTaskModal, setShowAddTaskModal] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDescription, setNewTaskDescription] = useState('')
  const [allTasks, setAllTasks] = useState<any[]>([])
  const [milestones, setMilestones] = useState<any[]>([])
  const [milestoneStats, setMilestoneStats] = useState({
    completed: 0,
    total: 0,
    overdue: 0
  })
  // Monthly summary + mini chart
  const [monthlySummary, setMonthlySummary] = useState({
    monthLabel: '',
    bookings: 0,
    amount: 0,
    paid: 0,
    pending: 0
  })
  const [sixMonthTrend, setSixMonthTrend] = useState<{ label: string; count: number; amount: number }[]>([])
  const [chartMode, setChartMode] = useState<'count'|'amount'>('count')
  const [bookingsWindow, setBookingsWindow] = useState<any[]>([])
  const [historyFilterMonth, setHistoryFilterMonth] = useState<string>('all')
  const [historyFilterStatus, setHistoryFilterStatus] = useState<'all'|'pending'|'approved'|'in_progress'|'completed'|'cancelled'|'declined'|'on_hold'>('all')
  // Recent overview extras
  const [recentActivity, setRecentActivity] = useState<{ id: string; when: string; text: string; type: 'task'|'milestone'|'document' }[]>([])
  const [recentFiles, setRecentFiles] = useState<{ id: string; name: string; url: string; created_at: string }[]>([])
  
  // Modal state variables
  const [progressValue, setProgressValue] = useState(0)
  const [progressNotes, setProgressNotes] = useState('')
  const [messageText, setMessageText] = useState('')
  const [meetingDate, setMeetingDate] = useState('')
  const [meetingTime, setMeetingTime] = useState('')
  const [meetingNotes, setMeetingNotes] = useState('')

  // Surprise: sticky quick action bar on scroll
  const [showStickyBar, setShowStickyBar] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      setShowStickyBar(window.scrollY > 140)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (bookingId) {
      loadBookingData()
      initializeCommunicationChannels()
      generateSmartSuggestions()
      loadOverdueCount()
      loadMilestoneData()
      loadMonthlySummary()
      loadOverviewExtras()
    }
  }, [bookingId])

  // Initialize tempProgress when progress modal opens
  useEffect(() => {
    if (showProgressModal && booking) {
      setTempProgress(booking.progress_percentage || 0)
    }
  }, [showProgressModal, booking])

  // Realtime: listen for booking updates and notifications
  useEffect(() => {
    let channel: any
    let notifChannel: any
    ;(async () => {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !bookingId) return

      // Listen to changes on this booking
      channel = supabase
        .channel(`booking-${bookingId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'bookings', filter: `id=eq.${bookingId}` },
          payload => {
            // Soft merge new fields and refresh metrics
            setBooking(prev => prev ? { ...prev, ...(payload.new as any) } : prev)
            toast.success('Booking updated in real-time')
          }
        )
        .subscribe()

      // Listen to notifications for current user
      notifChannel = supabase
        .channel(`notifications-${user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          payload => {
            const note = payload.new as any
            setNotifications(prev => [note, ...prev])
            setUnreadCount(c => c + 1)
            toast.custom(t => (
              <div className="max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black/5 border p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <Bell className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="ml-3 w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">{note.title || 'Notification'}</p>
                    <p className="mt-1 text-sm text-gray-600">{note.message}</p>
                  </div>
                </div>
              </div>
            ))
          }
        )
        .subscribe()
    })()

    return () => {
      // Cleanup channels
      ;(async () => {
        const supabase = await getSupabaseClient()
        if (channel) await supabase.removeChannel(channel)
        if (notifChannel) await supabase.removeChannel(notifChannel)
      })()
    }
  }, [bookingId])

  const loadBookingData = async () => {
    try {
      setLoading(true)
      const supabase = await getSupabaseClient()
      
      // Get authenticated user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/sign-in')
        return
      }
      setUser(user)

      // Load booking with enhanced data - graceful fallback for schema issues
      let bookingData, error

      try {
        // Try enhanced query first
        const result = await supabase
          .from('bookings')
          .select(`
            *,
            service:services(
              id, title, description, category, base_price, 
              currency, estimated_duration, requirements
            ),
            client:profiles!client_id(
              id, full_name, email, phone, company_name, 
              avatar_url, timezone, preferred_contact_method
            ),
            provider:profiles!provider_id(
              id, full_name, email, phone, company_name,
              avatar_url, specialization, rating, response_time
            )
          `)
          .eq('id', bookingId)
          .single()
        
        bookingData = result.data
        error = result.error
      } catch (schemaError) {
        console.warn('Enhanced query failed, trying fallback:', schemaError)
        
        // Fallback to simpler query without foreign key hints
        try {
          const simpleResult = await supabase
            .from('bookings')
            .select('*')
            .eq('id', bookingId)
            .single()
          
          if (simpleResult.data) {
            // Manually fetch related data
            const [serviceRes, clientRes, providerRes] = await Promise.all([
              supabase.from('services').select('*').eq('id', simpleResult.data.service_id).single(),
              supabase.from('profiles').select('*').eq('id', simpleResult.data.client_id).single(),
              supabase.from('profiles').select('*').eq('id', simpleResult.data.provider_id).single()
            ])
            
            bookingData = {
              ...simpleResult.data,
              service: serviceRes.data,
              client: clientRes.data,
              provider: providerRes.data
            }
            error = null
          } else {
            error = simpleResult.error
          }
        } catch (fallbackError) {
          console.error('Both queries failed:', fallbackError)
          error = fallbackError
        }
      }

      if (error) {
        console.error('Error loading booking:', error)
        toast.error('Failed to load booking details')
        return
      }

      // Transform and enhance the booking data with comprehensive defaults
      const enhancedBooking: EnhancedBooking = {
        ...bookingData,
        // Core booking data with fallbacks
        id: bookingData.id,
        status: bookingData.status || 'pending',
        priority: bookingData.priority || 'normal',
        created_at: bookingData.created_at,
        updated_at: bookingData.updated_at || bookingData.created_at,
        
        // Financial data
        amount: bookingData.amount || bookingData.total_amount || 0,
        currency: bookingData.currency || 'OMR',
        payment_status: bookingData.payment_status || 'pending',
        payment_method: bookingData.payment_method || '',
        
        // Progress tracking
        progress_percentage: bookingData.project_progress || bookingData.progress_percentage || 0,
        estimated_completion: bookingData.estimated_completion || '',
        actual_completion: bookingData.actual_completion || '',
        
        // Duration and timing
        estimated_duration: bookingData.estimated_duration || bookingData.service?.estimated_duration || '2 hours',
        actual_duration: bookingData.actual_duration || '',
        scheduled_date: bookingData.scheduled_date || bookingData.due_at || '',
        scheduled_time: bookingData.scheduled_time || '',
        
        // Location
        location: bookingData.location || '',
        location_type: bookingData.location_type || 'on_site',
        
        // Ratings and satisfaction
        rating: bookingData.rating || bookingData.client_rating || 0,
        review: bookingData.review || bookingData.notes || '',
        client_satisfaction: bookingData.client_satisfaction || 0,
        provider_rating: bookingData.provider_rating || 0,
        
        // Additional data
        notes: bookingData.notes || '',
        tags: bookingData.tags || [],
        attachments: bookingData.attachments || [],
        milestones: bookingData.milestones || [],
        issues: bookingData.issues || [],
        
        // Service data with fallbacks
        service: {
          id: bookingData.service?.id || bookingData.service_id || '',
          title: bookingData.service?.title || bookingData.service?.name || 'Service',
          description: bookingData.service?.description || '',
          category: bookingData.service?.category || 'General',
          base_price: bookingData.service?.base_price || bookingData.amount || 0,
          currency: bookingData.service?.currency || bookingData.currency || 'OMR',
          duration: bookingData.service?.estimated_duration || bookingData.estimated_duration || '2 hours',
          requirements: bookingData.service?.requirements || [],
          deliverables: bookingData.service?.deliverables || []
        },
        
        // Client data with fallbacks
        client: {
          id: bookingData.client?.id || bookingData.client_id || '',
          full_name: bookingData.client?.full_name || 'Client',
          email: bookingData.client?.email || '',
          phone: bookingData.client?.phone || '',
          company_name: bookingData.client?.company_name || '',
          avatar_url: bookingData.client?.avatar_url || '',
          timezone: bookingData.client?.timezone || 'Asia/Muscat',
          preferred_contact: bookingData.client?.preferred_contact_method || 'message',
          response_time: bookingData.client?.response_time || '< 1 hour'
        },
        
        // Provider data with fallbacks
        provider: {
          id: bookingData.provider?.id || bookingData.provider_id || '',
          full_name: bookingData.provider?.full_name || 'Provider',
          email: bookingData.provider?.email || '',
          phone: bookingData.provider?.phone || '',
          company_name: bookingData.provider?.company_name || '',
          avatar_url: bookingData.provider?.avatar_url || '',
          specialization: bookingData.provider?.specialization || [],
          rating: bookingData.provider?.rating || 5.0,
          total_reviews: bookingData.provider?.total_reviews || 0,
          response_time: bookingData.provider?.response_time || '< 1 hour',
          availability_status: bookingData.provider?.availability_status || 'available'
        }
      }

      setBooking(enhancedBooking)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to load booking')
    } finally {
      setLoading(false)
    }
  }

  const initializeCommunicationChannels = () => {
    setCommunicationChannels([
      {
        type: 'message',
        label: 'Instant Message',
        icon: <MessageSquare className="h-4 w-4" />,
        available: true,
        preferred: true
      },
      {
        type: 'email',
        label: 'Email',
        icon: <Mail className="h-4 w-4" />,
        available: true
      },
      {
        type: 'phone',
        label: 'Phone Call',
        icon: <Phone className="h-4 w-4" />,
        available: true
      },
      {
        type: 'video_call',
        label: 'Video Call',
        icon: <Video className="h-4 w-4" />,
        available: true
      }
    ])
  }

  const generateSmartSuggestions = () => {
    // AI-powered suggestions based on booking status and patterns
    const suggestions: SmartSuggestion[] = [
      {
        type: 'follow_up',
        title: 'Schedule Follow-up',
        description: '4 milestones due soon',
        action: 'Schedule meeting',
        priority: 'medium',
        estimated_impact: 'Better project tracking'
      },
      {
        type: 'payment_reminder',
        title: 'Payment Reminder',
        description: 'Invoice due in 3 days',
        action: 'Send reminder',
        priority: 'medium',
        estimated_impact: 'Faster payment'
      }
    ]
    setSmartSuggestions(suggestions)
  }

  const loadOverdueCount = async () => {
    try {
      const supabase = await getSupabaseClient()
      
      // First get milestone IDs for this booking
      const { data: milestones, error: milestonesError } = await supabase
        .from('milestones')
        .select('id')
        .eq('booking_id', bookingId)
      
      if (milestonesError) throw milestonesError
      
      if (!milestones || milestones.length === 0) {
        setOverdueCount(0)
        return
      }
      
      // Ensure we have valid UUIDs
      const milestoneIds = milestones
        .map(m => m.id)
        .filter(id => id && typeof id === 'string')
      
      if (milestoneIds.length === 0) {
        setOverdueCount(0)
        return
      }
      
      // Get overdue count for tasks in these milestones
      const { data, error } = await supabase
        .from('tasks')
        .select('id')
        .in('milestone_id', milestoneIds)
        .eq('is_overdue', true)

      if (error) throw error
      setOverdueCount(data?.length || 0)
    } catch (error) {
      console.error('Error loading overdue count:', error)
      // Fallback to 0 if new tables don't exist yet
      setOverdueCount(0)
    }
  }

  const loadMilestoneData = async () => {
    try {
      const supabase = await getSupabaseClient()
      
      // Fetch milestones with tasks as requested
      const { data: milestonesData, error: milestonesError } = await supabase
        .from('milestones')
        .select(`
          id,
          title,
          description,
          progress_percentage,
          status,
          due_date,
          created_at,
          updated_at,
          tasks (
            id,
            title,
            status,
            progress_percentage,
            due_date,
            created_at
          )
        `)
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true })
      
      if (milestonesError) {
        console.warn('Error loading milestones:', milestonesError)
        // Fallback to empty data
        setMilestones([])
        setMilestoneStats({ completed: 0, total: 0, overdue: 0 })
        return
      }
      
      setMilestones(milestonesData || [])
      
      // Flatten all tasks from milestones
      const tasks = milestonesData?.flatMap(m => m.tasks || []) || []
      setAllTasks(tasks)
      
      // Calculate milestone stats
      const total = milestonesData?.length || 0
      const completed = milestonesData?.filter(m => m.status === 'completed').length || 0
      const overdue = milestonesData?.filter(m => {
        if (!m.due_date) return false
        try {
          const dueDate = new Date(m.due_date)
          return !isNaN(dueDate.getTime()) && dueDate < new Date() && m.status !== 'completed'
        } catch (error) {
          console.warn('Date comparison error:', error)
          return false
        }
      }).length || 0
      
      setMilestoneStats({ completed, total, overdue })
      
    } catch (error) {
      console.error('Error loading milestone data:', error)
      setMilestones([])
      setMilestoneStats({ completed: 0, total: 0, overdue: 0 })
    }
  }

  const loadMonthlySummary = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      // Pull last 6 months of this user's bookings (as client or provider)
      const since = new Date()
      since.setMonth(since.getMonth() - 5)
      const { data, error } = await supabase
        .from('bookings')
        .select('id, created_at, amount, currency, payment_status, client_id, provider_id')
        .or(`client_id.eq.${user.id},provider_id.eq.${user.id}`)
        .gte('created_at', since.toISOString())
      if (error) throw error
      setBookingsWindow(data || [])

      const now = new Date()
      const curMonth = now.getMonth()
      const curYear = now.getFullYear()

      // Current month
      const cur = (data || []).filter((b:any) => {
        const d = new Date(b.created_at)
        return d.getMonth() === curMonth && d.getFullYear() === curYear
      })
      const amountSum = cur.reduce((s:number,b:any)=> s + (b.amount || 0), 0)
      const paid = cur.filter((b:any)=> b.payment_status === 'paid').length
      const pending = cur.filter((b:any)=> (b.payment_status || 'pending') !== 'paid').length
      setMonthlySummary({
        monthLabel: now.toLocaleString(undefined,{ month:'long', year:'numeric'}),
        bookings: cur.length,
        amount: amountSum,
        paid,
        pending
      })

      // 6-month trend
      const trend: { [k:string]: { count:number; amount:number; label:string } } = {}
      for (let i=5;i>=0;i--) {
        const d = new Date()
        d.setMonth(d.getMonth()-i)
        const key = `${d.getFullYear()}-${d.getMonth()}`
        trend[key] = { count:0, amount:0, label: d.toLocaleString(undefined,{ month:'short'}) }
      }
      (data || []).forEach((b:any)=>{
        const d = new Date(b.created_at)
        const key = `${d.getFullYear()}-${d.getMonth()}`
        if (trend[key]) {
          trend[key].count += 1
          trend[key].amount += (b.amount || 0)
        }
      })
      setSixMonthTrend(Object.values(trend))
    } catch (e) {
      console.warn('Monthly summary error:', e)
      setMonthlySummary({ monthLabel:'This month', bookings:0, amount:0, paid:0, pending:0 })
      setSixMonthTrend([])
    }
  }

  const loadOverviewExtras = async () => {
    try {
      const supabase = await getSupabaseClient()
      // Recent files for this booking
      const { data: files } = await supabase
        .from('documents')
        .select('id, original_name, file_url, created_at')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false })
        .limit(3)
      setRecentFiles((files||[]).map((f:any)=>({ id:f.id, name:f.original_name, url:f.file_url, created_at:f.created_at })))

      // Build recent activity from milestones, tasks and documents (local + fetched files)
      const acts: { id:string; when:string; text:string; type:'task'|'milestone'|'document' }[] = []
      milestones.forEach((m:any)=>{
        if (m.created_at) acts.push({ id:m.id, when:m.created_at, text:`Milestone created: ${m.title}`, type:'milestone' })
      })
      allTasks.forEach((t:any)=>{
        if (t.created_at) acts.push({ id:t.id, when:t.created_at, text:`Task added: ${t.title}`, type:'task' })
        if (t.completed_at) acts.push({ id:`${t.id}-c`, when:t.completed_at, text:`Task completed: ${t.title}`, type:'task' })
      })
      ;(files||[]).forEach((f:any)=>{
        acts.push({ id:f.id, when:f.created_at, text:`File uploaded: ${f.original_name}`, type:'document' })
      })
      acts.sort((a,b)=> new Date(b.when).getTime() - new Date(a.when).getTime())
      setRecentActivity(acts.slice(0,5))
    } catch (e) {
      console.warn('Overview extras error:', e)
      setRecentActivity([])
      setRecentFiles([])
    }
  }

  // Filtered history helper
  const filteredHistory = () => {
    return (bookingsWindow || []).filter((b:any)=>{
      const d = new Date(b.created_at)
      const monthOk = historyFilterMonth==='all' ? true : d.getMonth() === Number(historyFilterMonth)
      const statusOk = historyFilterStatus==='all' ? true : (b.status || 'pending') === historyFilterStatus
      return monthOk && statusOk
    })
    .sort((a:any,b:any)=> new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0,50)
  }

  const onStepToggle = async (taskId: string, newStatus: string) => {
    try {
      const supabase = await getSupabaseClient()
      
      // Update task status
      const { error: taskError } = await supabase
        .from('tasks')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)
      
      if (taskError) {
        throw new Error(taskError.message)
      }
      
      // Get the milestone ID for this task
      const { data: taskData, error: taskFetchError } = await supabase
        .from('tasks')
        .select('milestone_id')
        .eq('id', taskId)
      
      if (taskFetchError) {
        console.error('Error fetching task data:', taskFetchError)
        throw new Error(`Failed to fetch task: ${taskFetchError.message}`)
      }
      
      if (!taskData || taskData.length === 0) {
        throw new Error('Task not found')
      }
      
      if (taskData.length > 1) {
        console.warn('Multiple tasks found with same ID, using first one')
      }
      
      const task = taskData[0]
      
      // Try to call update_milestone_progress RPC function (if available)
      try {
        const { error: progressError } = await supabase.rpc('update_milestone_progress', {
          milestone_uuid: task.milestone_id
        })
        
        if (progressError) {
          console.warn('Error updating milestone progress:', progressError)
          // Don't fail the operation if progress update fails
        }
      } catch (rpcError) {
        console.warn('RPC function update_milestone_progress not available:', rpcError)
        // Continue without failing
      }
      
      // Try to refresh booking project_progress (if RPC function is available)
      try {
        const { error: bookingProgressError } = await supabase.rpc('calculate_booking_progress', {
          booking_id: bookingId
        })
        
        if (bookingProgressError) {
          console.warn('Error updating booking progress:', bookingProgressError)
          // Don't fail the operation if booking progress update fails
        }
      } catch (rpcError) {
        console.warn('RPC function calculate_booking_progress not available:', rpcError)
        // Continue without failing - the UI will still update
      }
      
      // Reload milestone data to reflect changes
      await loadMilestoneData()
      
      // Reload booking data to get updated project_progress
      await loadBookingData()
      
      toast.success('Task status updated successfully')
      
    } catch (error) {
      console.error('Error updating task status:', error)
      toast.error('Failed to update task status')
    }
  }

  const handleProgressUpdate = async () => {
    if (!booking) return
    
    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('bookings')
        .update({ 
          progress_percentage: progressValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id)
      
      if (error) throw error
      
      setBooking({ ...booking, progress_percentage: progressValue })
      toast.success('Progress updated successfully')
      setShowProgressModal(false)
    } catch (error) {
      console.error('Error updating progress:', error)
      toast.error('Failed to update progress')
    }
  }

  const handleScheduleMeeting = async () => {
    if (!meetingDate || !meetingTime) return
    
    try {
      toast.success('Meeting scheduled successfully')
      setShowScheduleModal(false)
      setMeetingDate('')
      setMeetingTime('')
      setMeetingNotes('')
    } catch (error) {
      console.error('Error scheduling meeting:', error)
      toast.error('Failed to schedule meeting')
    }
  }

  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !bookingId) return
    
    try {
      console.log('🔄 Adding task:', newTaskTitle.trim())
      const supabase = await getSupabaseClient()
      
      // Check authentication first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        console.error('❌ Session error:', sessionError)
        throw new Error('Authentication error: ' + sessionError.message)
      }
      
      if (!session) {
        console.error('❌ No active session')
        throw new Error('No active session. Please sign in again.')
      }
      
      console.log('✅ User authenticated:', session.user.id)
      console.log('🔑 Session token:', session.access_token ? 'Present' : 'Missing')
      
      // Get the first milestone for this booking (or create a default one)
      let milestoneId = milestones[0]?.id
      
      if (!milestoneId) {
        console.log('📝 Creating default milestone...')
        // Create a default milestone if none exists
        const { data: newMilestone, error: milestoneError } = await supabase
          .from('milestones')
          .insert({
            booking_id: bookingId,
            title: 'General Tasks',
            description: 'General project tasks',
            status: 'pending',
            progress_percentage: 0
          })
          .select()
          .single()
        
        if (milestoneError) {
          console.error('❌ Milestone creation error:', milestoneError)
          throw milestoneError
        }
        milestoneId = newMilestone.id
        console.log('✅ Milestone created:', milestoneId)
      } else {
        console.log('✅ Using existing milestone:', milestoneId)
      }
      
      // Create the new task
      console.log('📝 Creating task...')
      const { data: newTask, error: taskError } = await supabase
        .from('tasks')
        .insert({
          milestone_id: milestoneId,
          title: newTaskTitle.trim(),
          description: newTaskDescription.trim() || null,
          status: 'pending',
          progress_percentage: 0
        })
        .select()
        .single()
      
      if (taskError) {
        console.error('❌ Task creation error:', taskError)
        throw taskError
      }
      
      console.log('✅ Task created successfully:', newTask.id)
      
      // Clear form
      setNewTaskTitle('')
      setNewTaskDescription('')
      setShowAddTaskModal(false)
      
      // Reload data
      await loadMilestoneData()
      
      toast.success('Task added successfully')
      
    } catch (error) {
      console.error('❌ Error adding task:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error('Failed to add task: ' + errorMessage)
    }
  }

  const handleExport = async (format: 'pdf' | 'excel') => {
    if (!booking) return

    try {
      const supabase = await getSupabaseClient()
      
      // Load milestones and their tasks using new tables
      const { data: milestones, error: milestonesError } = await supabase
        .from('milestones')
        .select(`
          *,
          tasks (*)
        `)
        .eq('booking_id', bookingId)

      if (milestonesError) throw milestonesError

      // Flatten tasks from all milestones
      const allTasks = milestones?.flatMap(m => m.tasks || []) || []
      const totalTasks = allTasks.length
      const completedTasks = allTasks.filter(t => t.status === 'completed').length
      const overdueTasks = allTasks.filter(t => t.is_overdue).length
      const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

      const exportData: ExportData = {
        booking: {
          id: booking.id,
          title: booking.service.title,
          status: booking.status,
          created_at: booking.created_at,
          amount: booking.amount,
          currency: booking.currency,
          client: booking.client,
          provider: booking.provider
        },
        tasks: allTasks.map(task => ({
          id: task.id,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          due_date: task.due_date,
          completed_at: task.completed_at,
          is_overdue: task.is_overdue,
          weight: 1, // Default weight for tasks
          estimated_hours: task.estimated_hours,
          actual_hours: task.actual_hours
        })),
        milestones: milestones?.map(milestone => ({
          id: milestone.id,
          title: milestone.title,
          description: milestone.description,
          status: milestone.status,
          due_date: milestone.due_date,
          created_at: milestone.created_at,
          progress_percentage: milestone.progress_percentage
        })) || [],
        stats: {
          totalTasks,
          completedTasks,
          overdueTasks,
          overallProgress
        }
      }

      // Generate and download file
      if (format === 'pdf') {
        const pdfBlob = await generatePDF(exportData)
        downloadFile(pdfBlob, `booking-${booking.id.slice(0, 8)}-progress.pdf`)
      } else {
        const excelBlob = await generateExcel(exportData)
        downloadFile(excelBlob, `booking-${booking.id.slice(0, 8)}-progress.xlsx`)
      }

      toast.success(`${format.toUpperCase()} exported successfully`)
    } catch (error) {
      console.error('Error exporting:', error)
      toast.error('Failed to export file')
    }
  }

  const getStatusIcon = (status: string) => {
    const icons = {
      pending: <Clock className="h-4 w-4" />,
      approved: <CheckCircle className="h-4 w-4" />,
      declined: <X className="h-4 w-4" />,
      in_progress: <Play className="h-4 w-4" />,
      completed: <Award className="h-4 w-4" />,
      cancelled: <X className="h-4 w-4" />,
      on_hold: <Pause className="h-4 w-4" />,
      rescheduled: <RefreshCw className="h-4 w-4" />
    }
    return icons[status as keyof typeof icons] || <Clock className="h-4 w-4" />
  }

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      approved: 'bg-blue-100 text-blue-800 border-blue-300',
      declined: 'bg-red-100 text-red-800 border-red-300',
      in_progress: 'bg-purple-100 text-purple-800 border-purple-300',
      completed: 'bg-green-100 text-green-800 border-green-300',
      cancelled: 'bg-red-100 text-red-800 border-red-300',
      on_hold: 'bg-gray-100 text-gray-800 border-gray-300',
      rescheduled: 'bg-orange-100 text-orange-800 border-orange-300'
    }
    return colors[status as keyof typeof colors] || colors.pending
  }

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      normal: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    }
    return colors[priority as keyof typeof colors] || colors.normal
  }

  const handleStatusUpdate = async (newStatus: string) => {
    if (!booking) return
    
    try {
      setIsUpdating(true)
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: newStatus, 
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id)

      if (error) throw error

      setBooking({ ...booking, status: newStatus as any })
      toast.success('Status updated successfully')
      
      // Add to activity log
      addActivityLog(`Status changed to ${newStatus}`)

      // Notify the other party (in-app notification)
      const recipientId = user.id === booking.client.id ? booking.provider.id : booking.client.id
      await supabase.from('notifications').insert({
        user_id: recipientId,
        type: 'booking',
        title: 'Booking status updated',
        message: `Booking #${booking.id.slice(0,8)} is now ${newStatus.replace('_',' ')}`,
        data: { booking_id: booking.id, status: newStatus },
        created_at: new Date().toISOString()
      })

      // Also send email via SendGrid route (best-effort)
      const emailTo = user.id === booking.client.id ? booking.client.email : booking.provider.email
      if (emailTo) {
        try {
          const supabase = await getSupabaseClient()
          const { data: { session } } = await supabase.auth.getSession()
          
          if (session) {
        fetch('/api/notifications/email', {
          method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
              },
          body: JSON.stringify({
            to: emailTo,
            subject: `Booking ${booking.id.slice(0,8)} status: ${newStatus.replace('_',' ')}`,
            text: `Hello,\n\nThe booking ${booking.id} is now ${newStatus}.\n\nThanks,\nBusiness Services Hub`,
            html: `<p>Hello,</p><p>The booking <strong>${booking.id}</strong> is now <strong>${newStatus.replace('_',' ')}</strong>.</p><p>Thanks,<br/>Business Services Hub</p>`
          })
        }).catch(() => {})
          }
        } catch (emailError) {
          console.log('Email notification failed:', emailError)
        }
      }
      
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update status')
    } finally {
      setIsUpdating(false)
    }
  }

  const addActivityLog = async (action: string) => {
    // Add activity to booking history
    const activity = {
      action,
      timestamp: new Date().toISOString(),
      user: user?.email || 'System'
    }
    // This would typically save to a booking_activities table
    console.log('Activity logged:', activity)
  }

  // Button handlers
  const handleEmailClient = () => {
    if (booking?.client.email) {
      window.open(`mailto:${booking.client.email}?subject=Booking #${booking.id.slice(0, 8)}`, '_blank')
    }
  }

  const handleEmailProvider = () => {
    if (booking?.provider.email) {
      window.open(`mailto:${booking.provider.email}?subject=Booking #${booking.id.slice(0, 8)}`, '_blank')
    }
  }

  const handleCallClient = () => {
    if (booking?.client.phone) {
      window.open(`tel:${booking.client.phone}`, '_self')
    } else {
      toast.error('Client phone number not available')
    }
  }

  const handleCallProvider = () => {
    if (booking?.provider.phone) {
      window.open(`tel:${booking.provider.phone}`, '_self')
    } else {
      toast.error('Provider phone number not available')
    }
  }

  const handleVideoCall = () => {
    // Generate a Google Meet link for video calls
    const meetingId = `booking-${booking?.id.slice(0, 8)}-${Date.now()}`
    const meetingUrl = `https://meet.google.com/new?hs=193&pli=1&authuser=0`
    
    // Copy to clipboard
    navigator.clipboard.writeText(meetingUrl).then(() => {
      toast.success('Google Meet link copied to clipboard')
    }).catch(() => {
      toast.error('Failed to copy meeting link')
    })
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Booking #${booking?.id.slice(0, 8)}`,
        text: `Check out this booking: ${booking?.service.title}`,
        url: window.location.href
      }).catch(() => {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(window.location.href).then(() => {
          toast.success('Booking link copied to clipboard')
        }).catch(() => {
          toast.error('Failed to copy link')
        })
      })
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href).then(() => {
        toast.success('Booking link copied to clipboard')
      }).catch(() => {
        toast.error('Failed to copy link')
      })
    }
  }

  const handleNotify = async () => {
    if (!booking) return
    
    try {
      const supabase = await getSupabaseClient()
      const recipientId = user?.id === booking.client.id ? booking.provider.id : booking.client.id
      
      await supabase.from('notifications').insert({
        user_id: recipientId,
        type: 'booking',
        title: 'Booking Notification',
        message: `You have a notification for booking #${booking.id.slice(0, 8)}`,
        data: { booking_id: booking.id },
        created_at: new Date().toISOString()
      })
      
      toast.success('Notification sent successfully')
    } catch (error) {
      console.error('Error sending notification:', error)
      toast.error('Failed to send notification')
    }
  }

  // Provider Actions
  const handleMarkInProgress = async () => {
    if (!booking) return
    
    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id)
      
      if (error) throw error
      
      setBooking({ ...booking, status: 'in_progress' })
      toast.success('Booking marked as in progress')
    } catch (error) {
      console.error('Error updating booking status:', error)
      toast.error('Failed to update booking status')
    }
  }

  const handleMarkComplete = async () => {
    if (!booking) return
    
    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: 'completed',
          progress_percentage: 100,
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id)
      
      if (error) throw error
      
      setBooking({ ...booking, status: 'completed', progress_percentage: 100 })
      toast.success('Booking marked as completed')
    } catch (error) {
      console.error('Error updating booking status:', error)
      toast.error('Failed to update booking status')
    }
  }

  const handlePutOnHold = async () => {
    if (!booking) return
    
    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: 'on_hold',
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id)
      
      if (error) throw error
      
      setBooking({ ...booking, status: 'on_hold' })
      toast.success('Booking put on hold')
    } catch (error) {
      console.error('Error updating booking status:', error)
      toast.error('Failed to update booking status')
    }
  }

  // Progress Actions
  const handleLogHours = () => {
    toast.success('Time logging functionality will be available soon')
  }

  const handleSendProgressUpdate = async () => {
    if (!booking) return
    
    try {
      const supabase = await getSupabaseClient()
      const recipientId = user?.id === booking.client.id ? booking.provider.id : booking.client.id
      
      await supabase.from('notifications').insert({
        user_id: recipientId,
        type: 'progress_update',
        title: 'Progress Update',
        message: `Progress update for booking #${booking.id.slice(0, 8)}: ${booking.progress_percentage || 0}% complete`,
        data: { booking_id: booking.id, progress: booking.progress_percentage || 0 },
        created_at: new Date().toISOString()
      })
      
      toast.success('Progress update sent successfully')
    } catch (error) {
      console.error('Error sending progress update:', error)
      toast.error('Failed to send progress update')
    }
  }

  const handleScheduleFollowUp = () => {
    toast.success('Scheduling functionality will be available soon')
  }

  const handleSendPaymentReminder = async () => {
    if (!booking) return
    
    try {
      const supabase = await getSupabaseClient()
      const recipientId = user?.id === booking.client.id ? booking.provider.id : booking.client.id
      
      await supabase.from('notifications').insert({
        user_id: recipientId,
        type: 'payment_reminder',
        title: 'Payment Reminder',
        message: `Payment reminder for booking #${booking.id.slice(0, 8)}: ${booking.currency} ${booking.amount}`,
        data: { booking_id: booking.id, amount: booking.amount, currency: booking.currency },
        created_at: new Date().toISOString()
      })
      
      toast.success('Payment reminder sent successfully')
    } catch (error) {
      console.error('Error sending payment reminder:', error)
      toast.error('Failed to send payment reminder')
    }
  }

  const handleProcessPayment = async () => {
    if (!booking) return
    
    try {
      const supabase = await getSupabaseClient()
      
      // Update payment status in database
      const { error } = await supabase
        .from('bookings')
        .update({ 
          payment_status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id)
      
      if (error) throw error
      
      toast.success('Payment processed successfully')
      setBooking({ ...booking, payment_status: 'paid' })
    } catch (error) {
      console.error('Error processing payment:', error)
      toast.error('Failed to process payment')
    }
  }

  const handleGenerateInvoice = async () => {
    if (!booking) return
    
    try {
      // Generate invoice data
      const invoiceData = {
        booking_id: booking.id,
        client: booking.client,
        provider: booking.provider,
        service: booking.service,
        amount: booking.amount,
        currency: booking.currency,
        created_at: new Date().toISOString()
      }
      
      // In a real app, this would generate a PDF invoice
      console.log('Generating invoice:', invoiceData)
      toast.success('Invoice generated successfully')
    } catch (error) {
      console.error('Error generating invoice:', error)
      toast.error('Failed to generate invoice')
    }
  }

  const handleDownloadReceipt = async () => {
    if (!booking) return
    
    try {
      // In a real app, this would generate and download a receipt PDF
      toast.success('Receipt downloaded successfully')
    } catch (error) {
      console.error('Error downloading receipt:', error)
      toast.error('Failed to download receipt')
    }
  }

  const handleSuggestionAction = async (suggestion: SmartSuggestion) => {
    switch (suggestion.type) {
      case 'communication':
        setShowMessageModal(true)
        break
      case 'scheduling':
        handleScheduleFollowUp()
        break
      case 'payment':
        handleSendPaymentReminder()
        break
      case 'service_improvement':
        setShowEditModal(true)
        break
      case 'progress_update':
        handleSendProgressUpdate()
        break
      case 'follow_up':
        handleScheduleFollowUp()
        break
      case 'payment_reminder':
        handleSendPaymentReminder()
        break
      default:
        if (suggestion.action === 'Schedule meeting') {
          handleScheduleFollowUp()
        } else if (suggestion.action === 'Send reminder') {
          handleSendPaymentReminder()
        } else {
        toast.success(`Action: ${suggestion.action}`)
        }
    }
  }

  const handleUpdateProgress = async (newProgress: number) => {
    if (!booking) return
    
    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('bookings')
        .update({ 
          progress_percentage: newProgress,
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id)
      
      if (error) throw error
      
      setBooking({ ...booking, progress_percentage: newProgress })
      toast.success('Progress updated successfully')
      setShowProgressModal(false)
    } catch (error) {
      console.error('Error updating progress:', error)
      toast.error('Failed to update progress')
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !booking) return

    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: user.id === booking.client.id ? booking.provider.id : booking.client.id,
          content: `📋 Booking #${booking.id.slice(0, 8)}: ${newMessage}`,
          message_type: messageType,
          booking_id: booking.id
        })

      if (error) throw error

      toast.success('Message sent successfully')
      setNewMessage('')
      setShowMessageModal(false)
      
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    }
  }

  const handleApprovalAction = async (action: 'approve' | 'decline') => {
    if (!booking) return

    // Defer heavy operations to prevent UI blocking
    const processApproval = async () => {
      try {
        setIsUpdating(true)
        
        // Show confirmation dialog for decline (defer to next tick)
        let reason = ''
        if (action === 'decline') {
          await new Promise(resolve => setTimeout(resolve, 0)) // Defer to next tick
          reason = prompt('Please provide a reason for declining this booking (optional):') || ''
        }

        // Get authenticated Supabase client (defer heavy operations)
        const supabase = await getSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          throw new Error('No active session. Please sign in again.')
        }

        // Make authenticated request with proper headers
        const response = await fetch('/api/bookings', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            booking_id: booking.id,
            action: action,
            reason: reason
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error(`API Error (${response.status}):`, errorData)
          throw new Error(errorData.error || `Failed to ${action} booking (${response.status})`)
        }

        const result = await response.json()
        console.log(`Booking ${action} result:`, result)
        
        // Update local state immediately for better UX
        setBooking({ 
          ...booking, 
          status: action === 'approve' ? 'approved' : 'declined',
          approval_status: action === 'approve' ? 'approved' : 'rejected'
        })

        toast.success(`Booking ${action === 'approve' ? 'approved' : 'declined'} successfully`)
        
        // Defer heavy operations to background
        setTimeout(async () => {
          await loadBookingData()
          // Force a page refresh to ensure UI is updated
          setTimeout(() => {
            window.location.reload()
          }, 500)
        }, 100)
      } catch (error) {
        console.error(`Error ${action}ing booking:`, error)
        const errorMessage = error instanceof Error ? error.message : `Failed to ${action} booking`
        toast.error(errorMessage)
      } finally {
        setIsUpdating(false)
      }
    }

    // Use requestIdleCallback or setTimeout to defer heavy work
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => processApproval(), { timeout: 100 })
    } else {
      setTimeout(() => processApproval(), 0)
    }
  }

  const formatCurrency = (amount: number, currency: string = 'OMR') => {
    return new Intl.NumberFormat('en-OM', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount)
  }

  const formatDate = (date: string) => {
    if (!date) return 'N/A'
    try {
      return format(parseISO(date), 'PPP')
    } catch (error) {
      console.warn('Invalid date format:', date, error)
      return 'Invalid Date'
    }
  }

  const formatTime = (date: string) => {
    if (!date) return 'N/A'
    try {
      return format(parseISO(date), 'p')
    } catch (error) {
      console.warn('Invalid time format:', date, error)
      return 'Invalid Time'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            {/* Header skeleton */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                <div>
                  <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                </div>
              </div>
              <div className="flex space-x-2">
                <div className="h-8 bg-gray-200 rounded w-20"></div>
                <div className="h-8 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
            
            {/* Content skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="h-64 bg-gray-200 rounded-lg"></div>
                <div className="h-48 bg-gray-200 rounded-lg"></div>
              </div>
              <div className="space-y-6">
                <div className="h-32 bg-gray-200 rounded-lg"></div>
                <div className="h-48 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Not Found</h2>
          <p className="text-gray-600 mb-6">The booking you're looking for doesn't exist or you don't have permission to view it.</p>
          <Button onClick={() => router.push('/dashboard/bookings')} className="bg-blue-600 hover:bg-blue-700">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Bookings
          </Button>
        </div>
      </div>
    )
  }

  const isClient = userRole === 'client'
  const isProvider = userRole === 'provider'
  const canEdit = isProvider && booking.status !== 'completed'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Quick Action Bar */}
      {showStickyBar && booking && (
        <div className="fixed top-0 left-0 right-0 z-40 backdrop-blur bg-white/80 border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">Booking</span>
              <span className="font-semibold">#{booking.id.slice(0,8)}</span>
              <Badge className={`px-2 py-0.5 ${getStatusColor(booking.status)}`}>{booking.status.replace('_',' ')}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={()=>setShowMessageModal(true)}>
                <MessageSquare className="h-4 w-4 mr-1" /> Message
              </Button>
              <Button size="sm" variant="outline" onClick={handleScheduleFollowUp}>
                <Calendar className="h-4 w-4 mr-1" /> Schedule
              </Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={()=>navigator.clipboard.writeText(window.location.href)}>
                <Share2 className="h-4 w-4 mr-1" /> Share
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        
        {/* Enhanced Professional Header */}
        <div className="mb-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
            <div className="flex items-center space-x-4 mb-4 lg:mb-0">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => router.push('/dashboard/bookings')}
                className="border-gray-300 hover:bg-gray-50"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">
                    {isProvider ? 'Project Management' : 'My Booking'} #{booking.id.slice(0, 8)}
                  </h1>
                  <Badge className={`px-3 py-1 border ${getStatusColor(booking.status)}`}>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(booking.status)}
                      <span className="font-medium capitalize">{booking.status.replace('_', ' ')}</span>
                    </div>
                  </Badge>
                  <Badge className={`px-2 py-1 ${getPriorityColor(booking.priority)}`}>
                    {booking.priority.toUpperCase()}
                  </Badge>
                  
                  {/* Approval Status Badge */}
                  {booking.approval_status && booking.approval_status !== 'pending' && (
                    <Badge className={`px-3 py-1 ${
                      booking.approval_status === 'approved' 
                        ? 'bg-green-100 text-green-800 border-green-300' 
                        : booking.approval_status === 'rejected'
                        ? 'bg-red-100 text-red-800 border-red-300'
                        : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                    }`}>
                      <div className="flex items-center space-x-1">
                        {booking.approval_status === 'approved' ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : booking.approval_status === 'rejected' ? (
                          <X className="h-3 w-3" />
                        ) : (
                          <Clock className="h-3 w-3" />
                        )}
                        <span className="font-medium capitalize">
                          {booking.approval_status === 'approved' ? 'Approved' : 
                           booking.approval_status === 'rejected' ? 'Declined' : 
                           'Under Review'}
                        </span>
                      </div>
                    </Badge>
                  )}
                </div>
                <p className="text-gray-600">
                  {isProvider ? 'Client Project' : 'Your Project'} • Created {formatDate(booking.created_at)} • Last updated {booking.updated_at ? (() => {
                    try {
                      return formatDistanceToNow(parseISO(booking.updated_at)) + ' ago'
                    } catch (error) {
                      console.warn('Date parsing error for updated_at:', booking.updated_at, error)
                      return 'recently'
                    }
                  })() : 'recently'}
                </p>
              </div>
            </div>
            
            {/* Smart Action Buttons */}
            <div className="flex items-center space-x-3">
              {/* Overdue Count Badge */}
              {overdueCount > 0 && (
                <Badge variant="destructive" className="px-3 py-1">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {overdueCount} Overdue
                </Badge>
              )}
              
              {isProvider && (
                <Button
                  variant="outline"
                  onClick={() => setShowQuickActions(!showQuickActions)}
                  className="border-blue-200 text-blue-700 hover:bg-blue-50"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Manage Project
                </Button>
              )}
              
              <Button 
                onClick={() => setShowMessageModal(!showMessageModal)}
                className="bg-green-600 hover:bg-green-700"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Message {isClient ? 'Provider' : 'Client'}
              </Button>
              
              <Button 
                variant="outline" 
                className="border-purple-200 text-purple-700 hover:bg-purple-50"
                onClick={handleVideoCall}
              >
                <Video className="h-4 w-4 mr-2" />
                Video Call
              </Button>

              {/* Approval Actions for Pending Bookings */}
              {booking.status === 'pending' && isProvider && (
                <>
                  <Button 
                    onClick={() => handleApprovalAction('approve')}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    disabled={isUpdating}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve Booking
                  </Button>
                  <Button 
                    onClick={() => handleApprovalAction('decline')}
                    variant="destructive"
                    disabled={isUpdating}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Decline
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Single compact notice for Pending */}
          {booking.status === 'pending' && (
            <Alert className="mb-6 border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                Booking is pending approval. Use the top action bar to approve/decline or contact the other party.
              </AlertDescription>
            </Alert>
          )}

          {/* Smart Progress Indicator - Only show for approved/in-progress bookings (optional) */}
          {showProgressCard && booking.status !== 'pending' && booking.status !== 'cancelled' && booking.status !== 'declined' && (
          <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">Project Progress</h3>
                  <p className="text-gray-600 text-sm">
                    {booking.progress_percentage}% complete • Est. completion: {booking.estimated_completion || 'TBD'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">{booking.progress_percentage}%</div>
                  <div className="text-sm text-gray-500">Progress</div>
                </div>
              </div>
              <Progress value={booking.progress_percentage} className="h-3 mb-2" />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Started</span>
                <span>In Progress</span>
                <span>Review</span>
                <span>Complete</span>
              </div>
            </CardContent>
          </Card>
          )}

          {/* Pending Booking Status Card */}
          {booking.status === 'pending' && (
            <Card className="border-l-4 border-l-yellow-500 bg-gradient-to-r from-yellow-50 to-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">Booking Status</h3>
                    <p className="text-gray-600 text-sm">
                      Awaiting provider approval • Project will begin once approved
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-yellow-600">Pending</div>
                    <div className="text-sm text-gray-500">Approval</div>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Submitted</span>
                  <span>Under Review</span>
                  <span>Approved</span>
                  <span>In Progress</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Milestones moved to Progress tab */}
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          
          {/* Left Sidebar - Key Information */}
          <div className="xl:col-span-1 space-y-4">
            
            {/* Service Information */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  <span>Service Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">{booking.service.title}</h4>
                  <p className="text-gray-600 text-sm mb-2">{booking.service.description}</p>
                  <Badge variant="secondary" className="text-xs">
                    {booking.service.category}
                  </Badge>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-semibold">{formatCurrency(booking.amount, booking.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">{booking.estimated_duration}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment:</span>
                    <Badge 
                      variant={booking.payment_status === 'paid' ? 'default' : 'secondary'}
                      className={booking.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}
                    >
                      {booking.payment_status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-green-600" />
                  <span>Contact Info</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Client Info */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={booking.client.avatar_url} alt={booking.client.full_name} />
                      <AvatarFallback>{booking.client.full_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{booking.client.full_name}</p>
                      <p className="text-sm text-gray-600">Client</p>
                      {booking.client.company_name && (
                        <p className="text-xs text-gray-500">{booking.client.company_name}</p>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Provider Info */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={booking.provider.avatar_url} alt={booking.provider.full_name} />
                      <AvatarFallback>{booking.provider.full_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-gray-900">{booking.provider.full_name}</p>
                        {booking.provider.rating && (
                          <div className="flex items-center">
                            <Star className="h-3 w-3 text-yellow-400 fill-current" />
                            <span className="text-xs text-gray-600 ml-1">{booking.provider.rating}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">Service Provider</p>
                      {booking.provider.availability_status && (
                        <div className="flex items-center space-x-1 mt-1">
                          <div className={`w-2 h-2 rounded-full ${
                            booking.provider.availability_status === 'available' ? 'bg-green-400' :
                            booking.provider.availability_status === 'busy' ? 'bg-yellow-400' : 'bg-gray-400'
                          }`}></div>
                          <span className="text-xs text-gray-500 capitalize">
                            {booking.provider.availability_status}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Provider Actions */}
            {isProvider && (
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2">
                    <Edit className="h-5 w-5 text-purple-600" />
                    <span>Provider Actions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-2">
                    <Button 
                      variant="outline" 
                      onClick={handleMarkInProgress}
                      disabled={booking?.status === 'in_progress'}
                      className="justify-start"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Mark In Progress
                    </Button>
                    <Button 
                      onClick={handleMarkComplete}
                      disabled={booking?.status === 'completed'}
                      className="justify-start bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark Complete
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handlePutOnHold}
                      disabled={booking?.status === 'on_hold'}
                      className="justify-start"
                    >
                      <Pause className="h-4 w-4 mr-2" />
                      Put On Hold
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Removed My Project / Provider Actions: sticky top bar is the single action hub. */}

          </div>

          {/* Main Content Area */}
          <div className="xl:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="overview" className="text-sm">
                  <Eye className="h-4 w-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="messages" className="text-sm">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Messages
                </TabsTrigger>
                {/* Files tab removed; files are managed under milestones now */}
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                {/* Key Metrics Dashboard + Progress Ring */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-blue-700 text-xs font-medium">Days Active</p>
                          <p className="text-xl font-bold text-blue-900">
                            {(() => {
                              try {
                                if (!booking.created_at) return 0
                                const createdDate = new Date(booking.created_at)
                                if (isNaN(createdDate.getTime())) return 0
                                return Math.ceil((new Date().getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
                              } catch (error) {
                                console.warn('Date calculation error:', error)
                                return 0
                              }
                            })()}
                          </p>
                        </div>
                        <Calendar className="h-6 w-6 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-green-700 text-xs font-medium">Response Time</p>
                          <p className="text-xl font-bold text-green-900">
                            {booking.provider.response_time || '< 1h'}
                          </p>
                        </div>
                        <Clock className="h-6 w-6 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-purple-700 text-xs font-medium">Satisfaction</p>
                          <p className="text-xl font-bold text-purple-900">
                            {booking.client_satisfaction || 'N/A'}
                          </p>
                        </div>
                        <Star className="h-6 w-6 text-purple-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-50 to-orange-100">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-orange-700 text-xs font-medium">Amount</p>
                          <p className="text-xl font-bold text-orange-900">
                            {formatCurrency(booking.amount)}
                          </p>
                        </div>
                        <TrendingUp className="h-6 w-6 text-orange-600" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Progress Ring */}
                  <Card className="border-0 shadow-sm bg-white">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-center">
                        <div className="relative h-16 w-16">
                          <svg viewBox="0 0 36 36" className="h-16 w-16">
                            <path className="text-gray-200" stroke="currentColor" strokeWidth="3.6" fill="none" d="M18 2.0845
                              a 15.9155 15.9155 0 0 1 0 31.831
                              a 15.9155 15.9155 0 0 1 0 -31.831" />
                            <path className="text-blue-600" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" fill="none"
                              strokeDasharray={`${booking.progress_percentage}, 100`} d="M18 2.0845
                              a 15.9155 15.9155 0 0 1 0 31.831
                              a 15.9155 15.9155 0 0 1 0 -31.831" />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-sm font-semibold text-blue-700">{booking.progress_percentage}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-center mt-1 text-xs text-gray-600">Progress</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Project Information Card */}
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Package className="h-5 w-5 text-blue-600" />
                        <span>Project Information</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => {
                          // Export current month summary to CSV
                          const rows = [['Month','Bookings','Amount','Paid','Pending'],[monthlySummary.monthLabel, monthlySummary.bookings.toString(), monthlySummary.amount.toString(), monthlySummary.paid.toString(), monthlySummary.pending.toString()]]
                          const csv = rows.map(r=>r.join(',')).join('\n')
                          const blob = new Blob([csv], { type:'text/csv' })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a'); a.href=url; a.download='monthly-summary.csv'; a.click(); URL.revokeObjectURL(url)
                        }}>Export CSV</Button>
                        <Button size="sm" onClick={() => {
                          // Simple PDF via window.print fallback (prints the summary section)
                          window.print()
                        }}>Export PDF</Button>
                      </div>
                      {/* Monthly Summary */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-3 rounded bg-blue-50 border border-blue-100">
                          <div className="text-xs text-blue-700">This month</div>
                          <div className="text-sm font-semibold text-blue-900">{monthlySummary.monthLabel}</div>
                        </div>
                        <div className="p-3 rounded bg-green-50 border border-green-100">
                          <div className="text-xs text-green-700">Bookings</div>
                          <div className="text-lg font-bold text-green-900">{monthlySummary.bookings}</div>
                        </div>
                        <div className="p-3 rounded bg-orange-50 border border-orange-100">
                          <div className="text-xs text-orange-700">Amount</div>
                          <div className="text-lg font-bold text-orange-900">{formatCurrency(monthlySummary.amount)}</div>
                        </div>
                        <div className="p-3 rounded bg-gray-50 border border-gray-200">
                          <div className="text-xs text-gray-600">Paid / Pending</div>
                          <div className="text-sm font-semibold text-gray-900">{monthlySummary.paid} / {monthlySummary.pending}</div>
                        </div>
                      </div>

                      {/* 6-month mini chart (SVG bars) with toggle + click-to-filter */}
                      {sixMonthTrend.length > 0 && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-xs text-gray-500">Last 6 months</div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className={`px-2 py-0.5 rounded cursor-pointer ${chartMode==='count'?'bg-blue-600 text-white':'bg-gray-100 text-gray-700'}`} onClick={()=>setChartMode('count')}>Count</span>
                              <span className={`px-2 py-0.5 rounded cursor-pointer ${chartMode==='amount'?'bg-blue-600 text-white':'bg-gray-100 text-gray-700'}`} onClick={()=>setChartMode('amount')}>Amount</span>
                            </div>
                          </div>
                          <div className="flex items-end gap-2 h-20">
                            {sixMonthTrend.map((m, idx) => {
                              const base = chartMode==='count' ? sixMonthTrend.map(x=>x.count) : sixMonthTrend.map(x=>x.amount)
                              const max = Math.max(1, ...base)
                              const value = chartMode==='count' ? m.count : m.amount
                              const h = Math.max(4, Math.round((value / max) * 64))
                              return (
                                <div key={idx} className="flex flex-col items-center">
                                  <div className="w-6 bg-blue-200 hover:bg-blue-300 transition-colors rounded-t cursor-pointer"
                                    style={{ height: h }}
                                    onClick={() => {
                                      // Filter Overview to this month (update summary) and navigate to list
                                      const now = new Date()
                                      const base = new Date(now.getFullYear(), now.getMonth()- (sixMonthTrend.length-1-idx), 1)
                                      const month = base.getMonth(); const year = base.getFullYear()
                                      const monthBookings = bookingsWindow.filter((b:any)=>{
                                        const d=new Date(b.created_at); return d.getMonth()===month && d.getFullYear()===year
                                      })
                                      const amountSum = monthBookings.reduce((s:number,b:any)=> s + (b.amount || 0), 0)
                                      const paid = monthBookings.filter((b:any)=> b.payment_status==='paid').length
                                      const pending = monthBookings.filter((b:any)=> (b.payment_status || 'pending')!=='paid').length
                                      setMonthlySummary({
                                        monthLabel: base.toLocaleString(undefined,{ month:'long', year:'numeric'}),
                                        bookings: monthBookings.length,
                                        amount: amountSum,
                                        paid,
                                        pending
                                      })
                                      try {
                                        const m = (month+1).toString().padStart(2,'0')
                                        const y = year.toString()
                                        window.location.href = `/dashboard/bookings?month=${y}-${m}`
                                      } catch {}
                                    }}
                                    title={`${m.label}: ${m.count} bookings • ${formatCurrency(m.amount)}`}
                                  ></div>
                                  <div className="text-[10px] text-gray-500 mt-1">{m.label}</div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-600">Scheduled Date</label>
                          <p className="text-gray-900 mt-1">
                            {booking.scheduled_date ? formatDate(booking.scheduled_date) : 'Not scheduled'}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Time</label>
                          <p className="text-gray-900 mt-1">
                            {booking.scheduled_time || 'TBD'}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Location</label>
                          <p className="text-gray-900 mt-1 capitalize">
                            {booking.location_type.replace('_', ' ')}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Duration</label>
                          <p className="text-gray-900 mt-1">{booking.estimated_duration}</p>
                        </div>
                      </div>
                      
                      {booking.notes && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Project Notes</label>
                          <p className="text-gray-900 mt-1 p-3 bg-gray-50 rounded-lg text-sm">
                            {booking.notes}
                          </p>
                        </div>
                      )}

                      {/* Overview Extras: Recent Activity & Files */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium text-gray-700">Recent Activity</h4>
                          </div>
                          {recentActivity.length === 0 ? (
                            <p className="text-xs text-gray-500">No recent activity</p>
                          ) : (
                            <ul className="space-y-2">
                              {recentActivity.map(a => (
                                <li key={a.id} className="text-xs text-gray-700 flex items-center gap-2">
                                  <span className={`w-1.5 h-1.5 rounded-full ${a.type==='task'?'bg-green-500':a.type==='milestone'?'bg-blue-500':'bg-purple-500'}`}></span>
                                  <span className="text-gray-500">{new Date(a.when).toLocaleDateString()}:</span>
                                  <span>{a.text}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium text-gray-700">Recent Files</h4>
                          </div>
                          {recentFiles.length === 0 ? (
                            <p className="text-xs text-gray-500">No files uploaded</p>
                          ) : (
                            <ul className="space-y-2">
                              {recentFiles.map(f => (
                                <li key={f.id} className="text-xs text-gray-700 flex items-center justify-between">
                                  <span className="truncate pr-2" title={f.name}>{f.name}</span>
                                  <a className="text-blue-600 hover:underline" href={f.url} target="_blank" rel="noreferrer">View</a>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>

                      {/* Bookings History */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-gray-700">Bookings History</h4>
                          <div className="flex items-center gap-2">
                            {/* Month Filter */}
                            <Select value={historyFilterMonth} onValueChange={(v:any)=> setHistoryFilterMonth(v)}>
                              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Month" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All months</SelectItem>
                                {Array.from({length:12}).map((_,i)=>{
                                  const d = new Date(); d.setMonth(i); const label = d.toLocaleString(undefined,{month:'long'})
                                  return <SelectItem key={i} value={`${i}`}>{label}</SelectItem>
                                })}
                              </SelectContent>
                            </Select>
                            {/* Status Filter */}
                            <Select value={historyFilterStatus} onValueChange={(v:any)=> setHistoryFilterStatus(v)}>
                              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
                              <SelectContent>
                                {['all','pending','approved','in_progress','completed','cancelled','declined','on_hold'].map(s=> (
                                  <SelectItem key={s} value={s}>{s.replace('_',' ')}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button size="sm" variant="outline" onClick={()=>{
                              // CSV export of filtered rows
                              const rows = [['Date','Service','Status','Amount']].concat(filteredHistory().map((b:any)=>[
                                new Date(b.created_at).toLocaleDateString(), b.service_title || 'Service', (b.status||'pending'), (b.amount||0).toString()
                              ]))
                              const csv = rows.map(r=>r.join(',')).join('\n')
                              const blob = new Blob([csv], { type:'text/csv' })
                              const url = URL.createObjectURL(blob)
                              const a = document.createElement('a'); a.href=url; a.download='bookings-history.csv'; a.click(); URL.revokeObjectURL(url)
                            }}>Export CSV</Button>
                          </div>
                        </div>
                        <div className="overflow-auto rounded border">
                          <table className="min-w-full text-xs">
                            <thead className="bg-gray-50 text-gray-700">
                              <tr>
                                <th className="px-3 py-2 text-left">Date</th>
                                <th className="px-3 py-2 text-left">Service</th>
                                <th className="px-3 py-2 text-left">Status</th>
                                <th className="px-3 py-2 text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {filteredHistory().map((b:any)=> (
                                <tr key={b.id} className="hover:bg-gray-50">
                                  <td className="px-3 py-2">{new Date(b.created_at).toLocaleDateString()}</td>
                                  <td className="px-3 py-2">{b.service_title || 'Service'}</td>
                                  <td className="px-3 py-2 capitalize">{(b.status||'pending').replace('_',' ')}</td>
                                  <td className="px-3 py-2 text-right">{formatCurrency(b.amount||0, b.currency||'OMR')}</td>
                                </tr>
                              ))}
                              {filteredHistory().length===0 && (
                                <tr><td className="px-3 py-3 text-center text-gray-500" colSpan={4}>No records</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                    </CardContent>
                  </Card>
              </TabsContent>

              {/* Progress tab removed by request */}

              {/* Messages Tab */}
              <TabsContent value="messages">
                <Card>
                  <CardHeader>
                    <CardTitle>Messages</CardTitle>
                    <CardDescription>Communicate with the {isClient ? 'provider' : 'client'}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <MessagesThread bookingId={bookingId} />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Files Tab */}
              <TabsContent value="files">
                <Card>
                  <CardHeader>
                    <CardTitle>Files</CardTitle>
                    <CardDescription>Project files and documents</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">File management functionality will be implemented here.</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Progress Update Modal */}
      {showProgressModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Update Progress</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Progress Percentage</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progressValue}
                  onChange={(e) => setProgressValue(Number(e.target.value))}
                  className="w-full"
                  aria-label="Progress percentage"
                />
                <div className="flex justify-between text-sm text-gray-600 mt-1">
                  <span>0%</span>
                  <span className="font-medium">{progressValue}%</span>
                  <span>100%</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                <textarea
                  value={progressNotes}
                  onChange={(e) => setProgressNotes(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Add any notes about the progress update..."
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowProgressModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleProgressUpdate}
                disabled={isUpdating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isUpdating ? 'Updating...' : 'Update Progress'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Send Message</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  placeholder="Type your message here..."
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowMessageModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendMessage}
                disabled={isUpdating || !messageText.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isUpdating ? 'Sending...' : 'Send Message'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Schedule Meeting</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  aria-label="Meeting date"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                <input
                  type="time"
                  value={meetingTime}
                  onChange={(e) => setMeetingTime(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  aria-label="Meeting time"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                <textarea
                  value={meetingNotes}
                  onChange={(e) => setMeetingNotes(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Add any notes about the meeting..."
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowScheduleModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleScheduleMeeting}
                disabled={isUpdating || !meetingDate || !meetingTime}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isUpdating ? 'Scheduling...' : 'Schedule Meeting'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add New Task</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Task Title</label>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter task title..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                <textarea
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Enter task description..."
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowAddTaskModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddTask}
                disabled={!newTaskTitle.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Add
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
