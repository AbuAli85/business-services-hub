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
  Building
} from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
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
  const [pendingPriorityChange, setPendingPriorityChange] = useState<string>('')
  const [showTimelineEdit, setShowTimelineEdit] = useState(false)
  const [customTimelineSteps, setCustomTimelineSteps] = useState<any[]>([])

  const bookingId = params.id as string

  useEffect(() => {
    if (bookingId) {
      loadBooking()
      loadBookingHistory()
      loadRelatedBookings()
    }
  }, [bookingId])

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
      
      // Load booking details
      const { data: bookingData, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .eq('provider_id', user.id)
        .single()

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
            .single()
          
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
            .single()
          
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
      {/* Enhanced Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/bookings')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Booking #{booking.id.slice(0, 8)}...</h1>
            <p className="text-muted-foreground">Created {formatDate(booking.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {getStatusBadge(booking.status)}
          {getPriorityBadge(booking.priority)}
          <Button
            variant="outline"
            onClick={() => setShowAdvancedActions(!showAdvancedActions)}
          >
            <Zap className="h-4 w-4 mr-2" />
            Actions
          </Button>
        </div>
      </div>

      {/* Booking Summary Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {getDaysSinceCreation()}
              </div>
              <div className="text-sm text-blue-700">Days Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {getStatusEfficiency()}
              </div>
              <div className="text-sm text-green-700">Response Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {getTimelineProgress() * 100}%
              </div>
              <div className="text-sm text-purple-700">Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {getNextMilestone()}
              </div>
              <div className="text-sm text-orange-700">Next Action</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Actions Panel */}
      {showAdvancedActions && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">Quick Actions</CardTitle>
            <CardDescription>Manage this booking efficiently</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="status-select" className="text-sm font-medium text-blue-900 mb-2 block">Change Status</label>
                <select
                  id="status-select"
                  aria-label="Change booking status"
                  className="w-full p-2 border border-blue-300 rounded-md bg-white"
                  value={booking.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={isUpdatingStatus}
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value} disabled={option.disabled}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="priority-select" className="text-sm font-medium text-blue-900 mb-2 block">Priority</label>
                <select
                  id="priority-select"
                  aria-label="Change booking priority"
                  className="w-full p-2 border border-blue-300 rounded-md bg-white"
                  value={booking.priority}
                  onChange={(e) => handlePriorityChange(e.target.value)}
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  className="w-full"
                  variant="default"
                  onClick={handleMarkComplete}
                  disabled={isUpdatingStatus || booking.status === 'completed'}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {isUpdatingStatus ? 'Updating...' : 'Mark Complete'}
                </Button>
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

      {/* Enhanced Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="related">Related</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Service Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5" />
                  <span>Service Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Service Name</label>
                  <p className="text-lg font-semibold">{booking.service.name}</p>
                </div>
                {booking.service.description && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                    <p className="text-sm">{booking.service.description}</p>
                  </div>
                )}
                {booking.service.category && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Category</label>
                    <p className="text-sm">{booking.service.category}</p>
                  </div>
                )}
                {booking.estimated_duration && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Estimated Duration</label>
                    <p className="text-sm">{booking.estimated_duration}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Client Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Client Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Client Name</label>
                  <p className="text-lg font-semibold">{booking.client.full_name}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{booking.client.email}</span>
                </div>
                {booking.client.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{booking.client.phone}</span>
                  </div>
                )}
                {booking.client.company_name && (
                  <div className="flex items-center space-x-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{booking.client.company_name}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

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

          {/* Enhanced Actions & Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Actions & Notes</CardTitle>
              <CardDescription>Manage this booking</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                className="w-full" 
                onClick={() => setActiveTab('messages')}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Send Message
              </Button>
              
              {booking.status === 'in_progress' && (
                <Button 
                  className="w-full" 
                  variant="default"
                  onClick={handleMarkComplete}
                  disabled={isUpdatingStatus}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {isUpdatingStatus ? 'Updating...' : 'Mark Complete'}
                </Button>
              )}

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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock3 className="h-5 w-5" />
                <span>Booking Timeline</span>
              </CardTitle>
              <CardDescription>Track the progress and milestones of this booking</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Overall Progress</span>
                    <span className="text-sm font-medium">
                      {Math.round((getTimelineProgress() * 100))}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${getTimelineProgress() * 100}%` }}
                    />
                  </div>
                </div>

                {/* Timeline Steps */}
                <div className="space-y-4">
                  {timelineSteps.map((step, index) => (
                    <div key={step.status} className="flex items-start space-x-4">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        step.completed 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-200 text-gray-500'
                      }`}>
                        {step.completed ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : (
                          step.icon
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className={`font-medium ${
                            step.completed ? 'text-green-700' : 'text-gray-700'
                          }`}>
                            {step.label}
                          </h4>
                          {step.completed && (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              Completed
                            </Badge>
                          )}
                        </div>
                        {step.description && (
                          <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                        )}
                        {step.date && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {formatDate(step.date)}
                          </p>
                        )}
                        {/* Estimated vs Actual Time */}
                        {step.status === 'in_progress' && (
                          <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                            <p className="text-xs text-blue-700">
                              <Clock className="h-3 w-3 inline mr-1" />
                              Estimated completion: {getEstimatedCompletion()}
                            </p>
                          </div>
                        )}
                      </div>
                      {index < timelineSteps.length - 1 && (
                        <div className="w-px h-12 bg-gray-200 ml-4" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Time Tracking */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-3">Time Tracking</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Created:</span>
                      <p className="font-medium">{formatDate(booking.created_at)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Last Updated:</span>
                      <p className="font-medium">{formatDate(booking.updated_at)}</p>
                    </div>
                    {booking.scheduled_date && (
                      <div>
                        <span className="text-muted-foreground">Scheduled:</span>
                        <p className="font-medium">{formatDate(booking.scheduled_date)}</p>
                      </div>
                    )}
                    {booking.estimated_duration && (
                      <div>
                        <span className="text-muted-foreground">Estimated Duration:</span>
                        <p className="font-medium">{booking.estimated_duration}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Timeline Actions */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium mb-3 text-blue-900">Timeline Actions</h4>
                  <div className="flex space-x-3">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setShowTimelineEdit(true)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Customize Timeline
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
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

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-6">
          <MessagesThread bookingId={booking.id} />
        </TabsContent>

        {/* Files & Documents Tab */}
        <TabsContent value="files" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Paperclip className="h-5 w-5" />
                <span>Files & Documents</span>
              </CardTitle>
              <CardDescription>Manage files, contracts, and documents related to this booking</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* File Upload Section */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Files</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Upload contracts, invoices, receipts, or any other documents related to this booking
                </p>
                <Button variant="outline" className="mb-2" onClick={() => setShowFileUpload(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Choose Files
                </Button>
                <p className="text-xs text-gray-400">
                  Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB per file)
                </p>
              </div>

              {/* File Categories */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg bg-blue-50">
                  <h4 className="font-medium text-blue-900 mb-2">Contracts</h4>
                  <p className="text-sm text-blue-700">Service agreements and terms</p>
                  <div className="mt-2 text-xs text-blue-600">{uploadedFiles.filter(f => f.category === 'contract').length} files</div>
                </div>
                <div className="p-4 border rounded-lg bg-green-50">
                  <h4 className="font-medium text-green-900 mb-2">Invoices</h4>
                  <p className="text-sm text-green-700">Billing and payment documents</p>
                  <div className="mt-2 text-xs text-green-600">{uploadedFiles.filter(f => f.category === 'invoice').length} files</div>
                </div>
                <div className="p-4 border rounded-lg bg-purple-50">
                  <h4 className="font-medium text-purple-900 mb-2">Deliverables</h4>
                  <p className="text-sm text-purple-700">Completed work and assets</p>
                  <div className="mt-2 text-xs text-purple-600">{uploadedFiles.filter(f => f.category === 'deliverable').length} files</div>
                </div>
              </div>

              {/* Recent Files */}
              <div>
                <h4 className="font-medium mb-3">Recent Files</h4>
                {uploadedFiles.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Paperclip className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No files uploaded yet</p>
                    <p className="text-sm">Upload your first document to get started</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                        <div className="flex items-center space-x-3">
                          <Paperclip className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <h4 className="font-medium">{file.name}</h4>
                            <p className="text-sm text-muted-foreground">{file.category} • {file.size}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{file.category}</Badge>
                          <Button size="sm" variant="outline">
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
              <CardDescription>Track all changes and activities for this booking</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bookingHistory.map((item) => (
                  <div key={item.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{item.action}</h4>
                        <span className="text-sm text-muted-foreground">{formatDate(item.timestamp)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                      <p className="text-xs text-muted-foreground mt-2">By: {item.user}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Related Bookings Tab */}
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
              {relatedBookings.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No related bookings found</p>
              ) : (
                <div className="space-y-3">
                  {relatedBookings.map((related) => (
                    <div key={related.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                      <div>
                        <h4 className="font-medium">{related.service_name}</h4>
                        <p className="text-sm text-muted-foreground">{formatDate(related.created_at)}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline">{related.status}</Badge>
                        {related.amount && (
                          <span className="text-sm font-medium">{formatCurrency(related.amount)}</span>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/dashboard/bookings/${related.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
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
                >
                  <option value="contract">Contract</option>
                  <option value="invoice">Invoice</option>
                  <option value="deliverable">Deliverable</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="file-input" className="text-sm font-medium mb-2 block">Choose Files</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Drag & drop files here or click to browse</p>
                  <input 
                    id="file-input"
                    type="file" 
                    multiple 
                    className="hidden"
                    aria-label="Choose files to upload"
                  />
                </div>
              </div>
              
              <div className="flex space-x-3">
                <Button 
                  className="flex-1" 
                  disabled={isUploading}
                  onClick={() => {
                    // Mock file upload
                    const mockFile = {
                      name: 'Sample Document.pdf',
                      category: 'contract',
                      size: '2.5 MB',
                      uploadedAt: new Date().toISOString()
                    }
                    setUploadedFiles(prev => [mockFile, ...prev])
                    setShowFileUpload(false)
                    toast.success('File uploaded successfully!')
                  }}
                >
                  {isUploading ? 'Uploading...' : 'Upload Files'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowFileUpload(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timeline Edit Modal */}
      {showTimelineEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Customize Timeline</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTimelineEdit(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Add custom milestones and steps to track your booking progress more accurately.
              </p>
              
              <div className="space-y-3">
                {customTimelineSteps.map((step, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <Input
                      placeholder="Step name"
                      value={step.name}
                      onChange={(e) => {
                        const newSteps = [...customTimelineSteps]
                        newSteps[index].name = e.target.value
                        setCustomTimelineSteps(newSteps)
                      }}
                    />
                    <Input
                      placeholder="Description"
                      value={step.description}
                      onChange={(e) => {
                        const newSteps = [...customTimelineSteps]
                        newSteps[index].description = e.target.value
                        setCustomTimelineSteps(newSteps)
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setCustomTimelineSteps(customTimelineSteps.filter((_, i) => i !== index))
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              
              <Button
                variant="outline"
                onClick={() => {
                  setCustomTimelineSteps([...customTimelineSteps, { name: '', description: '' }])
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Step
              </Button>
              
              <div className="flex space-x-3">
                <Button 
                  className="flex-1" 
                  onClick={() => {
                    setShowTimelineEdit(false)
                    toast.success('Timeline customized successfully!')
                  }}
                >
                  Save Changes
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowTimelineEdit(false)}
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
