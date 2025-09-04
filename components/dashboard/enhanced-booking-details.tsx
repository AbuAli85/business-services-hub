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
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import SmartCommunicationCenter from './smart-communication-center'
import SmartFileManager from './smart-file-manager'
import { EnhancedProgressTimeline } from './enhanced-progress-timeline'
import { NotificationBell } from '@/components/ui/notification-bell'
import { generatePDF, generateExcel, downloadFile, ExportData } from '@/lib/export-utils'
import { ProgressTabs } from './progress-tabs'
import { SmartFeatures } from './smart-features'

interface EnhancedBooking {
  id: string
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold' | 'rescheduled'
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
  type: 'scheduling' | 'communication' | 'payment' | 'service_improvement'
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

export default function EnhancedBookingDetails() {
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

  useEffect(() => {
    if (bookingId) {
      loadBookingData()
      initializeCommunicationChannels()
      generateSmartSuggestions()
      loadOverdueCount()
    }
  }, [bookingId])

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
        amount: bookingData.amount || bookingData.total_amount || bookingData.subtotal || 0,
        currency: bookingData.currency || 'OMR',
        payment_status: bookingData.payment_status || 'pending',
        payment_method: bookingData.payment_method || '',
        
        // Progress tracking
        progress_percentage: bookingData.progress_percentage || 0,
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
        type: 'communication',
        title: 'Send Progress Update',
        description: 'Client hasn\'t received an update in 2 days',
        action: 'Send update now',
        priority: 'medium',
        estimated_impact: 'Improved satisfaction'
      },
      {
        type: 'scheduling',
        title: 'Schedule Follow-up',
        description: 'Book next milestone review meeting',
        action: 'Schedule meeting',
        priority: 'high',
        estimated_impact: 'Better project tracking'
      },
      {
        type: 'payment',
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
      
      // Update overdue status first
      await supabase.rpc('update_overdue_tasks')
      
      // Get overdue count for this booking
      const { data, error } = await supabase
        .from('booking_tasks')
        .select('id')
        .eq('booking_id', bookingId)
        .eq('is_overdue', true)

      if (error) throw error
      setOverdueCount(data?.length || 0)
    } catch (error) {
      console.error('Error loading overdue count:', error)
    }
  }

  const handleExport = async (format: 'pdf' | 'excel') => {
    if (!booking) return

    try {
      const supabase = await getSupabaseClient()
      
      // Load tasks and milestones
      const [tasksResult, milestonesResult] = await Promise.all([
        supabase.from('booking_tasks').select('*').eq('booking_id', bookingId),
        supabase.from('booking_milestones').select('*').eq('booking_id', bookingId)
      ])

      if (tasksResult.error) throw tasksResult.error
      if (milestonesResult.error) throw milestonesResult.error

      const tasks = tasksResult.data || []
      const milestones = milestonesResult.data || []

      // Calculate stats
      const totalTasks = tasks.length
      const completedTasks = tasks.filter(t => t.status === 'completed').length
      const overdueTasks = tasks.filter(t => t.is_overdue).length
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
        tasks: tasks.map(task => ({
          id: task.id,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          due_date: task.due_date,
          completed_at: task.completed_at,
          is_overdue: task.is_overdue,
          weight: task.weight
        })),
        milestones: milestones.map(milestone => ({
          id: milestone.id,
          title: milestone.title,
          description: milestone.description,
          status: milestone.status,
          due_date: milestone.due_date,
          created_at: milestone.created_at
        })),
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
      confirmed: <CheckCircle className="h-4 w-4" />,
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
      confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
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
      const emailTo = user.id === booking.client.id ? booking.provider.email : booking.client.email
      if (emailTo) {
        fetch('/api/notifications/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: emailTo,
            subject: `Booking ${booking.id.slice(0,8)} status: ${newStatus.replace('_',' ')}`,
            text: `Hello,\n\nThe booking ${booking.id} is now ${newStatus}.\n\nThanks,\nBusiness Services Hub`,
            html: `<p>Hello,</p><p>The booking <strong>${booking.id}</strong> is now <strong>${newStatus.replace('_',' ')}</strong>.</p><p>Thanks,<br/>Business Services Hub</p>`
          })
        }).catch(() => {})
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

  const formatCurrency = (amount: number, currency: string = 'OMR') => {
    return new Intl.NumberFormat('en-OM', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return format(parseISO(date), 'PPP')
  }

  const formatTime = (date: string) => {
    return format(parseISO(date), 'p')
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

  const isClient = user?.id === booking.client.id
  const isProvider = user?.id === booking.provider.id
  const canEdit = isProvider && booking.status !== 'completed'

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Enhanced Professional Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
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
                    Booking #{booking.id.slice(0, 8)}
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
                </div>
                <p className="text-gray-600">
                  Created {formatDate(booking.created_at)} • Last updated {formatDistanceToNow(parseISO(booking.updated_at))} ago
                </p>
              </div>
            </div>
            
            {/* Smart Action Buttons */}
            <div className="flex items-center space-x-3">
              {/* Notification Bell */}
              {user && (
                <NotificationBell userId={user.id} />
              )}
              
              {/* Overdue Count Badge */}
              {overdueCount > 0 && (
                <Badge variant="destructive" className="px-3 py-1">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {overdueCount} Overdue
                </Badge>
              )}
              
              <Button
                variant="outline"
                onClick={() => canEdit && setShowQuickActions(!showQuickActions)}
                className="border-blue-200 text-blue-700 hover:bg-blue-50"
                disabled={!canEdit}
                title={!canEdit ? 'Only providers can perform quick actions' : undefined}
              >
                <Zap className="h-4 w-4 mr-2" />
                Quick Actions
              </Button>
              
              <Button 
                onClick={() => setShowMessageModal(!showMessageModal)}
                className="bg-green-600 hover:bg-green-700"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Message {isClient ? 'Provider' : 'Client'}
              </Button>
              
              <Button variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-50">
                <Video className="h-4 w-4 mr-2" />
                Video Call
              </Button>
            </div>
          </div>

          {/* Smart Progress Indicator */}
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
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          
          {/* Left Sidebar - Key Information */}
          <div className="xl:col-span-1 space-y-6">
            
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
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Mail className="h-3 w-3 mr-1" />
                      Email
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      <Phone className="h-3 w-3 mr-1" />
                      Call
                    </Button>
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
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Message
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      <Video className="h-3 w-3 mr-1" />
                      Video
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Smart Suggestions */}
            <Card className="border-0 shadow-lg border-l-4 border-l-purple-500">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2">
                  <Lightbulb className="h-5 w-5 text-purple-600" />
                  <span>Smart Suggestions</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {smartSuggestions.map((suggestion, index) => (
                  <div key={index} className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-purple-900 text-sm">{suggestion.title}</h4>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${
                          suggestion.priority === 'high' ? 'bg-red-100 text-red-700' :
                          suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}
                      >
                        {suggestion.priority}
                      </Badge>
                    </div>
                    <p className="text-purple-700 text-xs mb-2">{suggestion.description}</p>
                    <Button size="sm" variant="outline" className="w-full text-xs border-purple-200 text-purple-700 hover:bg-purple-50">
                      {suggestion.action}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="xl:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-6 lg:grid-cols-7">
                <TabsTrigger value="overview" className="text-xs sm:text-sm">
                  <Eye className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Overview</span>
                </TabsTrigger>
                <TabsTrigger value="progress" className="text-xs sm:text-sm">
                  <BarChart3 className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Progress</span>
                  {overdueCount > 0 && (
                    <Badge variant="destructive" className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-xs">
                      {overdueCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="timeline" className="text-xs sm:text-sm">
                  <Activity className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Timeline</span>
                </TabsTrigger>
                <TabsTrigger value="messages" className="text-xs sm:text-sm">
                  <MessageCircle className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Messages</span>
                </TabsTrigger>
                <TabsTrigger value="files" className="text-xs sm:text-sm">
                  <FileIcon className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Files</span>
                </TabsTrigger>
                <TabsTrigger value="payment" className="text-xs sm:text-sm">
                  <CreditCard className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Payment</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" className="text-xs sm:text-sm hidden lg:flex">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Analytics
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                
                {/* Key Metrics Dashboard */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-blue-700 text-sm font-medium">Days Active</p>
                          <p className="text-2xl font-bold text-blue-900">
                            {Math.ceil((new Date().getTime() - new Date(booking.created_at).getTime()) / (1000 * 60 * 60 * 24))}
                          </p>
                        </div>
                        <Calendar className="h-8 w-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-green-700 text-sm font-medium">Response Time</p>
                          <p className="text-2xl font-bold text-green-900">
                            {booking.provider.response_time || '< 1h'}
                          </p>
                        </div>
                        <Clock className="h-8 w-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-purple-100">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-purple-700 text-sm font-medium">Satisfaction</p>
                          <p className="text-2xl font-bold text-purple-900">
                            {booking.client_satisfaction || 'N/A'}
                            {booking.client_satisfaction && '/5'}
                          </p>
                        </div>
                        <Star className="h-8 w-8 text-purple-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-md bg-gradient-to-br from-orange-50 to-orange-100">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-orange-700 text-sm font-medium">Revenue Impact</p>
                          <p className="text-2xl font-bold text-orange-900">
                            {formatCurrency(booking.amount)}
                          </p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-orange-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Booking Details */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Project Information */}
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Package className="h-5 w-5 text-blue-600" />
                        <span>Project Information</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
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

                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" className="flex-1" disabled={!canEdit} title={!canEdit ? 'Only providers can edit details' : undefined}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Details
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1" disabled={!canEdit} title={!canEdit ? 'Only providers can reschedule' : undefined}>
                          <Calendar className="h-4 w-4 mr-2" />
                          Reschedule
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quick Actions */}
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Zap className="h-5 w-5 text-purple-600" />
                        <span>Quick Actions</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Status Update */}
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Update Status</label>
                        <Select defaultValue={booking.status} onValueChange={handleStatusUpdate} disabled={!canEdit}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="on_hold">On Hold</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Communication Actions */}
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" size="sm" className="border-green-200 text-green-700 hover:bg-green-50" disabled={!canEdit} title={!canEdit ? 'Only providers can call from dashboard' : undefined}>
                          <Phone className="h-4 w-4 mr-2" />
                          Call
                        </Button>
                        <Button variant="outline" size="sm" className="border-blue-200 text-blue-700 hover:bg-blue-50" disabled={!canEdit} title={!canEdit ? 'Only providers can start video from dashboard' : undefined}>
                          <Video className="h-4 w-4 mr-2" />
                          Video
                        </Button>
                        <Button variant="outline" size="sm" className="border-purple-200 text-purple-700 hover:bg-purple-50" disabled={!canEdit} title={!canEdit ? 'Only providers can share from dashboard' : undefined}>
                          <Share2 className="h-4 w-4 mr-2" />
                          Share
                        </Button>
                        <Button variant="outline" size="sm" className="border-orange-200 text-orange-700 hover:bg-orange-50" disabled={!canEdit} title={!canEdit ? 'Only providers can send notifications' : undefined}>
                          <Bell className="h-4 w-4 mr-2" />
                          Notify
                        </Button>
                      </div>

                      {/* Progress Update */}
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <label className="text-sm font-medium text-blue-700 mb-2 block">Progress Update</label>
                        <div className="flex items-center space-x-2">
                          <Progress value={booking.progress_percentage} className="flex-1" />
                          <span className="text-sm font-medium text-blue-700">{booking.progress_percentage}%</span>
                        </div>
                        <Button size="sm" variant="outline" className="w-full mt-2 border-blue-200 text-blue-700 hover:bg-blue-50" disabled={!canEdit} title={!canEdit ? 'Only providers can update progress' : undefined}>
                          <TrendingUp className="h-4 w-4 mr-2" />
                          Update Progress
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Progress Tab */}
              <TabsContent value="progress" className="space-y-6">
                <ProgressTabs
                  bookingId={bookingId}
                  userRole={isClient ? 'client' : 'provider'}
                />
              </TabsContent>

              {/* Timeline Tab */}
              <TabsContent value="timeline" className="space-y-6">
                <SmartFeatures
                  bookingId={bookingId}
                  userRole={isClient ? 'client' : 'provider'}
                />
              </TabsContent>

              {/* Messages Tab */}
              <TabsContent value="messages">
                <div className="h-[600px]">
                  <SmartCommunicationCenter
                    bookingId={booking.id}
                    otherParty={{
                      id: isClient ? booking.provider.id : booking.client.id,
                      full_name: isClient ? booking.provider.full_name : booking.client.full_name,
                      avatar_url: isClient ? booking.provider.avatar_url : booking.client.avatar_url,
                      role: isClient ? 'provider' : 'client',
                      status: isClient ? (booking.provider.availability_status === 'available' ? 'online' : booking.provider.availability_status || 'offline') : 'online',
                      timezone: isClient ? undefined : booking.client.timezone,
                      preferred_contact: isClient ? undefined : booking.client.preferred_contact,
                      response_time: isClient ? booking.provider.response_time : undefined
                    }}
                    currentUser={{
                      id: user.id,
                      full_name: isClient ? booking.client.full_name : booking.provider.full_name,
                      role: isClient ? 'client' : 'provider'
                    }}
                  />
                </div>
              </TabsContent>

              {/* Files Tab */}
              <TabsContent value="files">
                <div className="h-[600px] bg-white rounded-lg border border-gray-200 shadow-sm">
                  <SmartFileManager
                    bookingId={booking.id}
                    userRole={isClient ? 'client' : 'provider'}
                    recipientEmail={isClient ? booking.provider.email : booking.client.email}
                    allowedTypes={['image/*', 'application/pdf', '.doc', '.docx', '.txt', '.zip']}
                    maxFileSize={25} // 25MB
                    maxFiles={50}
                  />
                </div>
              </TabsContent>

              {/* Payment Tab */}
              <TabsContent value="payment">
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <CreditCard className="h-5 w-5 text-purple-600" />
                      <span>Payment Management</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-green-700 text-sm font-medium">Total Amount</p>
                              <p className="text-2xl font-bold text-green-900">{formatCurrency(booking.amount)}</p>
                            </div>
                            <DollarSign className="h-8 w-8 text-green-600" />
                          </div>
                        </div>

                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-blue-700 text-sm font-medium">Payment Status</p>
                              <p className="text-lg font-bold text-blue-900 capitalize">{booking.payment_status}</p>
                            </div>
                            <CreditCard className="h-8 w-8 text-blue-600" />
                          </div>
                        </div>

                        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-purple-700 text-sm font-medium">Method</p>
                              <p className="text-lg font-bold text-purple-900">{booking.payment_method || 'N/A'}</p>
                            </div>
                            <Wallet className="h-8 w-8 text-purple-600" />
                          </div>
                        </div>
                      </div>

                      <div className="flex space-x-3">
                        <Button className="bg-green-600 hover:bg-green-700 flex-1">
                          <CreditCard className="h-4 w-4 mr-2" />
                          Process Payment
                        </Button>
                        <Button variant="outline" className="flex-1">
                          <Receipt className="h-4 w-4 mr-2" />
                          Generate Invoice
                        </Button>
                        <Button variant="outline" className="flex-1">
                          <Download className="h-4 w-4 mr-2" />
                          Receipt
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics">
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <BarChart3 className="h-5 w-5 text-blue-600" />
                      <span>Project Analytics</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-gray-500">
                      <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p>Analytics dashboard coming soon</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}
