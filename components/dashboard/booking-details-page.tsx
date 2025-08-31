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
  Lightbulb
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
    if (selectedFiles.length === 0) {
      toast.error('Please select files to upload')
      return
    }

    try {
      setIsUploading(true)
      
      // Process each selected file
      const newFiles = selectedFiles.map(file => ({
        id: Date.now() + Math.random(),
        name: file.name,
        category: fileCategory,
        size: formatFileSize(file.size),
        uploadedAt: new Date().toISOString(),
        type: file.type,
        file: file // Keep reference for actual upload
      }))

      // Use requestIdleCallback to prevent UI blocking during file processing
      const processFiles = async () => {
        try {
          // Simulate file upload to Supabase storage
          // In a real implementation, you would upload to Supabase storage
          for (const fileData of newFiles) {
            // Simulate upload delay
            await new Promise(resolve => setTimeout(resolve, 100)) // Reduced delay
            
            // Add to uploaded files list
            setUploadedFiles(prev => [fileData, ...prev])
          }

          toast.success(`${selectedFiles.length} file(s) uploaded successfully!`)
          setSelectedFiles([])
          setShowFileUpload(false)
          
          // Add to booking history
          const historyEntry: BookingHistory = {
            id: Date.now().toString(),
            action: 'Files Uploaded',
            description: `Uploaded ${selectedFiles.length} file(s) in category: ${fileCategory}`,
            timestamp: new Date().toISOString(),
            user: 'Provider'
          }
          setBookingHistory(prev => [historyEntry, ...prev])
          
        } catch (error) {
          console.error('Error uploading files:', error)
          toast.error('Failed to upload files')
        } finally {
          setIsUploading(false)
        }
      }

      // Defer heavy operations to prevent UI blocking
      if (window.requestIdleCallback) {
        window.requestIdleCallback(processFiles)
      } else {
        setTimeout(processFiles, 0)
      }
      
    } catch (error) {
      console.error('Error uploading files:', error)
      toast.error('Failed to upload files')
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
    // In a real implementation, this would download from Supabase storage
    toast.success(`Downloading ${file.name}...`)
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

      {/* Professional Booking Summary Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Key Metrics Card */}
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-blue-900 text-lg">Key Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-white rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">
                  {getDaysSinceCreation()}
                </div>
                <div className="text-sm text-blue-700 font-medium">Days Active</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-green-600">
                  {getStatusEfficiency()}
                </div>
                <div className="text-sm text-green-700 font-medium">Response Time</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-purple-600">
                  {getTimelineProgress() * 100}%
                </div>
                <div className="text-sm text-purple-700 font-medium">Progress</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-orange-600">
                  {getNextMilestone()}
                </div>
                <div className="text-sm text-orange-700 font-medium">Next Action</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Advanced Insights Card */}
        <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-blue-50 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-indigo-900">
              <BarChart3 className="h-5 w-5" />
              <span>Professional Analytics & Insights</span>
            </CardTitle>
            <CardDescription className="text-indigo-700">Comprehensive performance metrics and business intelligence</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-white rounded-lg border-2 border-indigo-200 shadow-sm">
                <div className="text-2xl font-bold text-indigo-600">
                  {getDaysSinceCreation()}
                </div>
                <div className="text-sm text-indigo-700 font-medium">Days Active</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg border-2 border-indigo-200 shadow-sm">
                <div className="text-2xl font-bold text-green-600">
                  {getStatusEfficiency()}
                </div>
                <div className="text-sm text-green-700 font-medium">Efficiency Score</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg border-2 border-indigo-200 shadow-sm">
                <div className="text-2xl font-bold text-purple-600">
                  {getClientSatisfaction()}
                </div>
                <div className="text-sm text-purple-700 font-medium">Client Satisfaction</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg border-2 border-indigo-200 shadow-sm">
                <div className="text-2xl font-bold text-orange-600">
                  {getRevenueImpact()}
                </div>
                <div className="text-sm text-orange-700 font-medium">Revenue Impact</div>
              </div>
            </div>
            
            {/* Advanced Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-white rounded-lg border-2 border-blue-200 shadow-sm">
                <div className="text-lg font-bold text-blue-700 mb-2">
                  {getBookingHealth()}
                </div>
                <div className="text-sm text-blue-600 font-medium">Booking Health</div>
                <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${getBookingHealth() === 'Excellent' ? 100 : getBookingHealth() === 'Good' ? 75 : getBookingHealth() === 'Fair' ? 50 : 25}%` }}
                  />
                </div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg border-2 border-green-200 shadow-sm">
                <div className="text-lg font-bold text-green-700 mb-2">
                  {getNextMilestone()}
                </div>
                <div className="text-sm text-green-600 font-medium">Next Milestone</div>
                <div className="mt-2 text-xs text-green-500">Action Required</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg border-2 border-purple-200 shadow-sm">
                <div className="text-lg font-bold text-purple-700 mb-2">
                  {getTimelineProgress() * 100}%
                </div>
                <div className="text-sm text-purple-600 font-medium">Progress</div>
                <div className="mt-2 w-full bg-purple-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${getTimelineProgress() * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Actions Panel */}
      {showAdvancedActions && (
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
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={isUpdatingStatus}
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
          <TabsTrigger value="progress">Progress</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Service Information */}
            <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-purple-900">
                  <Package className="h-5 w-5" />
                  <span>Service Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-purple-700 mb-2 block">Service Name</label>
                  <p className="text-lg font-bold text-purple-900">{booking.service.name}</p>
                </div>
                {booking.service.description && (
                  <div>
                    <label className="text-sm font-semibold text-purple-700 mb-2 block">Description</label>
                    <p className="text-sm text-purple-800 bg-white p-3 rounded border border-purple-200">{booking.service.description}</p>
                  </div>
                )}
                {booking.service.category && (
                  <div>
                    <label className="text-sm font-semibold text-purple-700 mb-2 block">Category</label>
                    <Badge variant="outline" className="text-purple-700 border-purple-300 bg-purple-50">
                      {booking.service.category}
                    </Badge>
                  </div>
                )}
                {booking.estimated_duration && (
                  <div>
                    <label className="text-sm font-semibold text-purple-700 mb-2 block">Estimated Duration</label>
                    <p className="text-sm text-purple-800 bg-white p-3 rounded border border-purple-200">{booking.estimated_duration}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Client Information */}
            <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-green-900">
                  <User className="h-5 w-5" />
                  <span>Client Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-green-700 mb-2 block">Client Name</label>
                  <p className="text-lg font-bold text-green-900">{booking.client.full_name}</p>
                </div>
                <div className="flex items-center space-x-2 bg-white p-3 rounded border border-green-200">
                  <Mail className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-800">{booking.client.email}</span>
                </div>
                {booking.client.phone && (
                  <div className="flex items-center space-x-2 bg-white p-3 rounded border border-green-200">
                    <Phone className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-800">{booking.client.phone}</span>
                  </div>
                )}
                {booking.client.company_name && (
                  <div className="flex items-center space-x-2 bg-white p-3 rounded border border-green-200">
                    <Building className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-800">{booking.client.company_name}</span>
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
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-blue-900">
                <Zap className="h-5 w-5" />
                <span>Smart Actions & AI Insights</span>
              </CardTitle>
              <CardDescription className="text-blue-700">
                Intelligent actions and recommendations powered by AI analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700" 
                  onClick={() => setActiveTab('messages')}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Smart Message
                </Button>
                
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => setActiveTab('progress')}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Update Progress
                </Button>
              </div>
              
              {booking.status === 'in_progress' && (
                <Button 
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  variant="default"
                  onClick={handleMarkComplete}
                  disabled={isUpdatingStatus}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {isUpdatingStatus ? 'Updating...' : 'Mark as Complete'}
                </Button>
              )}
              
              {/* AI-Powered Action Suggestions */}
              <div className="mt-4 p-3 bg-blue-100 rounded-lg border border-blue-200">
                <h5 className="font-medium text-blue-900 mb-2 flex items-center">
                  <Lightbulb className="h-4 w-4 mr-2" />
                  AI Action Suggestions
                </h5>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-800">Send progress update to client</span>
                    <Button size="sm" variant="outline" className="border-blue-300 text-blue-700">
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Do Now
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-800">Schedule follow-up meeting</span>
                    <Button size="sm" variant="outline" className="border-blue-300 text-blue-700">
                      <Calendar className="h-3 w-3 mr-1" />
                      Schedule
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-800">Prepare completion report</span>
                    <Button size="sm" variant="outline" className="border-blue-300 text-blue-700">
                      <FileText className="h-3 w-3 mr-1" />
                      Prepare
                    </Button>
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
                              <Button size="sm" variant="outline" className="border-blue-300 text-blue-700">
                                <Edit className="h-3 w-3 mr-1" />
                                Update Progress
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

        {/* Progress Tab */}
        <TabsContent value="progress" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Project Progress & Status</span>
              </CardTitle>
              <CardDescription>Detailed progress tracking with status updates, approvals, and project monitoring for both parties</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Progress Overview Dashboard */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-2xl font-bold text-blue-600">
                      {Math.round((getTimelineProgress() * 100))}%
                    </div>
                    <div className="text-sm text-blue-700 font-medium">Overall Progress</div>
                    <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${getTimelineProgress() * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-2xl font-bold text-green-600">
                      {getDaysSinceCreation()}
                    </div>
                    <div className="text-sm text-green-700 font-medium">Days Active</div>
                    <div className="mt-2 text-xs text-green-600">Project Duration</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="text-2xl font-bold text-purple-600">
                      {getTimeToDeadline()}
                    </div>
                    <div className="text-sm text-purple-700 font-medium">Time to Deadline</div>
                    <div className="mt-2 text-xs text-purple-600">Remaining Time</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="text-2xl font-bold text-orange-600">
                      {getNextMilestone()}
                    </div>
                    <div className="text-sm text-orange-700 font-medium">Next Action</div>
                    <div className="mt-2 text-xs text-orange-600">Action Required</div>
                  </div>
                </div>

                {/* Detailed Progress Tracking */}
                <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold mb-4 text-blue-900">Detailed Progress Tracking</h4>
                  <div className="space-y-4">
                    {timelineSteps.map((step, index) => (
                      <div key={step.status} className="flex items-center space-x-4 p-4 bg-white rounded-lg border border-blue-200">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                          step.completed 
                            ? 'bg-green-500 border-green-600 text-white' 
                            : step.status === 'in_progress'
                            ? 'bg-blue-500 border-blue-600 text-white'
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
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className={`font-semibold ${
                              step.completed ? 'text-green-700' : step.status === 'in_progress' ? 'text-blue-700' : 'text-gray-700'
                            }`}>
                              {step.label}
                            </h5>
                            <Badge 
                              variant="default" 
                              className={`${
                                step.completed ? 'bg-green-100 text-green-800 border-green-300' :
                                step.status === 'in_progress' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                'bg-gray-100 text-gray-800 border-gray-300'
                              }`}
                            >
                              {step.completed ? '✓ Completed' : step.status === 'in_progress' ? '🔄 In Progress' : '⏳ Pending'}
                            </Badge>
                          </div>
                          {step.description && (
                            <p className="text-sm text-gray-600 mb-2">{step.description}</p>
                          )}
                          {step.date && (
                            <p className="text-sm text-gray-500">
                              <Clock className="h-3 w-3 inline mr-1" />
                              {formatDate(step.date)}
                            </p>
                          )}
                        </div>
                        {step.status === 'in_progress' && (
                          <div className="flex space-x-2">
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                              <Edit className="h-3 w-3 mr-1" />
                              Update
                            </Button>
                            <Button size="sm" variant="outline" className="border-blue-300 text-blue-700">
                              <MessageSquare className="h-3 w-3 mr-1" />
                              Notify
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status Management & Approvals */}
                <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                  <h4 className="font-semibold mb-4 text-green-900">Status Management & Approvals</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h5 className="font-medium text-green-800">Current Status</h5>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-green-200">
                          <span className="text-sm font-medium text-green-700">Project Status</span>
                          {getStatusBadge(booking?.status || 'pending')}
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-green-200">
                          <span className="text-sm font-medium text-green-700">Priority Level</span>
                          {getPriorityBadge(booking?.priority || 'normal')}
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-green-200">
                          <span className="text-sm font-medium text-green-700">Payment Status</span>
                          <Badge variant="outline" className="border-green-300 text-green-700">
                            {booking?.payment_status || 'pending'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h5 className="font-medium text-green-800">Approval Actions</h5>
                      <div className="space-y-3">
                        <Button className="w-full bg-green-600 hover:bg-green-700" disabled={booking?.status === 'completed'}>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark as Complete
                        </Button>
                        <Button variant="outline" className="w-full border-green-300 text-green-700 hover:bg-green-50">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Request Client Approval
                        </Button>
                        <Button variant="outline" className="w-full border-green-300 text-green-700 hover:bg-green-50">
                          <Clock className="h-4 w-4 mr-2" />
                          Extend Timeline
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress Analytics */}
                <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                  <h4 className="font-semibold mb-4 text-purple-900">Progress Analytics</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-white rounded-lg border border-purple-200">
                      <div className="text-lg font-bold text-purple-600 mb-2">
                        {getBookingScore()}%
                      </div>
                      <div className="text-sm text-purple-700 font-medium">Project Score</div>
                      <div className="mt-2 w-full bg-purple-200 rounded-full h-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${getBookingScore()}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg border border-purple-200">
                      <div className="text-lg font-bold text-purple-600 mb-2">
                        {getClientEngagement()}
                      </div>
                      <div className="text-sm text-purple-700 font-medium">Client Engagement</div>
                      <div className="mt-2 text-xs text-purple-600">Communication Level</div>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg border border-purple-200">
                      <div className="text-lg font-bold text-purple-600 mb-2">
                        {getStatusEfficiency()}
                      </div>
                      <div className="text-sm text-purple-700 font-medium">Efficiency</div>
                      <div className="mt-2 text-xs text-purple-600">Response Time</div>
                    </div>
                  </div>
                </div>

                {/* Client Monitoring & Actions */}
                <div className="p-6 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
                  <h4 className="font-semibold mb-4 text-orange-900">Client Monitoring & Actions</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h5 className="font-medium text-orange-800">Client Actions</h5>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="client-view" className="rounded border-orange-300" defaultChecked />
                          <label htmlFor="client-view" className="text-sm text-orange-700">Client can view progress</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="client-approve" className="rounded border-orange-300" defaultChecked />
                          <label htmlFor="client-approve" className="text-sm text-orange-700">Client can approve milestones</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="client-comment" className="rounded border-orange-300" defaultChecked />
                          <label htmlFor="client-comment" className="text-sm text-orange-700">Client can add comments</label>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h5 className="font-medium text-orange-800">Notifications</h5>
                      <div className="space-y-2">
                        <Button size="sm" variant="outline" className="w-full border-orange-300 text-orange-700 hover:bg-orange-50">
                          <MessageSquare className="h-3 w-3 mr-2" />
                          Send Progress Update
                        </Button>
                        <Button size="sm" variant="outline" className="w-full border-orange-300 text-orange-700 hover:bg-orange-50">
                          <Clock className="h-3 w-3 mr-2" />
                          Schedule Review Meeting
                        </Button>
                        <Button size="sm" variant="outline" className="w-full border-orange-300 text-orange-700 hover:bg-orange-50">
                          <FileText className="h-3 w-3 mr-2" />
                          Share Progress Report
                        </Button>
                      </div>
                    </div>
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
                          <Button size="sm" variant="outline" onClick={() => handleFileDownload(file)}>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleFileDelete(file.id)}>
                            <X className="h-4 w-4 mr-2" />
                            Remove
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
                  value={fileCategory}
                  onChange={(e) => setFileCategory(e.target.value)}
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
                    onChange={handleFileSelect}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => document.getElementById('file-input')?.click()}
                  >
                    Browse Files
                  </Button>
                </div>
                
                {/* Show selected files */}
                {selectedFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm font-medium text-gray-700">Selected Files:</p>
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                        <div className="flex items-center space-x-2">
                          <Paperclip className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-700">{file.name}</span>
                          <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== index))}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex space-x-3">
                <Button 
                  className="flex-1" 
                  disabled={isUploading}
                  onClick={handleFileUpload}
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-red-700">Confirm Action</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirmation(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                <p className="text-sm text-red-700 text-center">
                  {['completed', 'cancelled'].includes(booking?.status || '') 
                    ? 'This will permanently delete the booking. This action cannot be undone.'
                    : 'This will cancel the active booking. The client will be notified.'
                  }
                </p>
              </div>
              
              <div>
                <label htmlFor="delete-reason" className="text-sm font-medium text-gray-700 mb-2 block">
                  Reason for {['completed', 'cancelled'].includes(booking?.status || '') ? 'deletion' : 'cancellation'} *
                </label>
                <Textarea
                  id="delete-reason"
                  placeholder="Please provide a reason..."
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="border-gray-300 focus:border-red-500 focus:ring-red-200"
                  rows={3}
                />
              </div>
              
              <div className="flex space-x-3">
                <Button 
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => {
                    if (deleteReason.trim()) {
                      // Use requestIdleCallback or setTimeout to prevent UI blocking
                      if (window.requestIdleCallback) {
                        window.requestIdleCallback(() => {
                          handleDeleteBooking()
                        })
                      } else {
                        setTimeout(() => {
                          handleDeleteBooking()
                        }, 0)
                      }
                    } else {
                      toast.error('Please provide a reason')
                    }
                  }}
                  disabled={!deleteReason.trim() || isUpdatingStatus}
                >
                  {isUpdatingStatus ? 'Processing...' : 
                    ['completed', 'cancelled'].includes(booking?.status || '') ? 'Delete Permanently' : 'Cancel Booking'
                  }
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowDeleteConfirmation(false)
                    setDeleteReason('')
                  }}
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
