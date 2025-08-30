'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  RefreshCw
} from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { MessagesThread } from './messages-thread'

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

  const bookingId = params.id as string

  useEffect(() => {
    if (bookingId) {
      loadBooking()
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
      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .select('id, name, description, category')
        .eq('id', bookingData.service_id)
        .single()

      const { data: clientData, error: clientError } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, company_name')
        .eq('id', bookingData.client_id)
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
          name: serviceData?.name || 'Unknown Service',
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
      setLoading(false)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to load booking details')
      setLoading(false)
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

  const getTimelineSteps = (): TimelineStep[] => {
    if (!booking) return []
    
    const steps: TimelineStep[] = [
      {
        status: 'booked',
        label: 'Booked',
        date: booking.created_at,
        completed: true,
        icon: <Calendar className="h-4 w-4" />
      },
      {
        status: 'in_progress',
        label: 'In Progress',
        date: booking.status === 'in_progress' || booking.status === 'completed' ? booking.updated_at : undefined,
        completed: ['in_progress', 'completed'].includes(booking.status),
        icon: <RefreshCw className="h-4 w-4" />
      },
      {
        status: 'completed',
        label: 'Completed',
        date: booking.status === 'completed' ? booking.updated_at : undefined,
        completed: booking.status === 'completed',
        icon: <CheckCircle className="h-4 w-4" />
      }
    ]

    return steps
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">No booking found</h2>
        <p className="text-gray-600 mb-6">The booking you're looking for doesn't exist or you don't have access to it.</p>
        <Button onClick={() => router.push('/dashboard/bookings')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Bookings
        </Button>
      </div>
    )
  }

  const timelineSteps = getTimelineSteps()

  return (
    <div className="space-y-6">
      {/* Header */}
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
        </div>
      </div>

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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
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
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Company</label>
                    <p className="text-sm">{booking.client.company_name}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Booking Information */}
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
                      <span>{booking.amount} {booking.currency || 'OMR'}</span>
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
                {booking.notes && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Notes</label>
                    <p className="text-sm flex items-center space-x-1">
                      <FileText className="h-4 w-4" />
                      <span>{booking.notes}</span>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
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

                <div className="text-sm text-muted-foreground">
                  <p>Last updated: {formatDate(booking.updated_at)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Booking Timeline</CardTitle>
              <CardDescription>Track the progress of this booking</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {timelineSteps.map((step, index) => (
                  <div key={step.status} className="flex items-start space-x-4">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                      step.completed 
                        ? 'border-green-500 bg-green-100 text-green-600' 
                        : 'border-gray-300 bg-gray-100 text-gray-400'
                    }`}>
                      {step.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className={`font-medium ${step.completed ? 'text-green-700' : 'text-gray-500'}`}>
                          {step.label}
                        </h3>
                        {step.completed && <CheckCircle className="h-4 w-4 text-green-500" />}
                      </div>
                      {step.date && (
                        <p className="text-sm text-muted-foreground">
                          {formatDate(step.date)}
                        </p>
                      )}
                    </div>
                    {index < timelineSteps.length - 1 && (
                      <div className="w-px h-12 bg-gray-200 ml-4" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-6">
          <MessagesThread bookingId={booking.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
