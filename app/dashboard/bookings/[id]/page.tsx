'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { 
  Calendar, 
  Clock, 
  User, 
  Package, 
  DollarSign, 
  MapPin, 
  Phone, 
  Mail, 
  MessageSquare, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ArrowLeft,
  Edit,
  Send,
  Download,
  Share2,
  PhoneCall,
  Video,
  MapPin as LocationIcon
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { formatDate, formatCurrency } from '@/lib/utils'

interface BookingDetails {
  id: string
  service_title: string
  service_description: string
  service_category: string
  client_name: string
  client_email: string
  client_phone: string
  client_company: string
  provider_name: string
  provider_email: string
  provider_phone: string
  provider_company: string
  status: string
  priority: string
  amount: number
  currency: string
  scheduled_date: string
  scheduled_time: string
  location: string
  notes: string
  created_at: string
  updated_at: string
  package_name: string
  package_description: string
  package_price: number
  delivery_days: number
  revisions: number
}

interface StatusHistory {
  id: string
  status: string
  changed_by: string
  changed_at: string
  reason: string
  notes: string
}

interface Message {
  id: string
  content: string
  sender_name: string
  sender_role: string
  created_at: string
  is_read: boolean
}

export default function BookingDetailsPage({ params }: { params: { id: string } }) {
  const [booking, setBooking] = useState<BookingDetails | null>(null)
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<string>('')
  const router = useRouter()

  useEffect(() => {
    checkUserAndFetchData()
  }, [])

  const checkUserAndFetchData = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth/sign-in')
        return
      }

      setUser(user)
      
      // Get user role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      
      setUserRole(profile?.role || '')
      
      await Promise.all([
        fetchBookingDetails(params.id),
        fetchStatusHistory(params.id),
        fetchMessages(params.id)
      ])
    } catch (error) {
      console.error('Error checking user:', error)
      toast.error('Failed to load user data')
    } finally {
      setLoading(false)
    }
  }

  const fetchBookingDetails = async (bookingId: string) => {
    try {
      const supabase = await getSupabaseClient()
      
      // Try enhanced view first
      let { data: enhancedBooking, error: enhancedError } = await supabase
        .from('enhanced_bookings')
        .select('*')
        .eq('id', bookingId)
        .single()

      if (enhancedError || !enhancedBooking) {
        // Fallback to regular bookings table
        const { data: regularBooking, error: regularError } = await supabase
          .from('bookings')
          .select(`
            *,
            service:services (title, description, category, base_price),
            client:profiles!bookings_client_id_fkey (full_name, email, phone, company_name),
            provider:profiles!bookings_provider_id_fkey (full_name, email, phone, company_name),
            package:service_packages (name, description, price, delivery_days, revisions)
          `)
          .eq('id', bookingId)
          .single()

        if (regularError) {
          throw regularError
        }

        // Transform regular booking to match enhanced format
        enhancedBooking = {
          id: regularBooking.id,
          service_title: regularBooking.service?.title || 'Service',
          service_description: regularBooking.service?.description || '',
          service_category: regularBooking.service?.category || '',
          client_name: regularBooking.client?.full_name || 'Client',
          client_email: regularBooking.client?.email || '',
          client_phone: regularBooking.client?.phone || '',
          client_company: regularBooking.client?.company_name || '',
          provider_name: regularBooking.provider?.full_name || 'Provider',
          provider_email: regularBooking.provider?.email || '',
          provider_phone: regularBooking.provider?.phone || '',
          provider_company: regularBooking.provider?.company_name || '',
          status: regularBooking.status,
          priority: regularBooking.priority || 'medium',
          amount: regularBooking.amount || regularBooking.service?.base_price || 0,
          currency: regularBooking.currency || 'USD',
          scheduled_date: regularBooking.scheduled_date,
          scheduled_time: regularBooking.scheduled_time,
          location: regularBooking.location,
          notes: regularBooking.notes,
          created_at: regularBooking.created_at,
          updated_at: regularBooking.updated_at,
          package_name: regularBooking.package?.name || 'Base Package',
          package_description: regularBooking.package?.description || '',
          package_price: regularBooking.package?.price || regularBooking.service?.base_price || 0,
          delivery_days: regularBooking.package?.delivery_days || 0,
          revisions: regularBooking.package?.revisions || 0
        }
      }

      setBooking(enhancedBooking)
    } catch (error) {
      console.error('Error fetching booking details:', error)
      toast.error('Failed to load booking details')
    }
  }

  const fetchStatusHistory = async (bookingId: string) => {
    try {
      const supabase = await getSupabaseClient()
      
      // For now, create mock status history since we don't have a dedicated table
      // In a real implementation, you'd have a status_history table
      const mockHistory: StatusHistory[] = [
        {
          id: '1',
          status: 'pending',
          changed_by: 'System',
          changed_at: booking?.created_at || new Date().toISOString(),
          reason: 'Booking created',
          notes: 'Initial booking request submitted'
        }
      ]
      
      setStatusHistory(mockHistory)
    } catch (error) {
      console.error('Error fetching status history:', error)
    }
  }

  const fetchMessages = async (bookingId: string) => {
    try {
      const supabase = await getSupabaseClient()
      
      // Fetch messages related to this booking
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey (full_name, role)
        `)
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching messages:', error)
        return
      }

      const transformedMessages: Message[] = (messages || []).map(msg => ({
        id: msg.id,
        content: msg.content,
        sender_name: msg.sender?.full_name || 'Unknown',
        sender_role: msg.sender?.role || 'user',
        created_at: msg.created_at,
        is_read: msg.read || false
      }))

      setMessages(transformedMessages)
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const updateBookingStatus = async (newStatus: string, reason?: string) => {
    if (!booking) return

    setUpdatingStatus(true)
    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id)

      if (error) {
        throw error
      }

      // Update local state
      setBooking(prev => prev ? { ...prev, status: newStatus } : null)
      
      // Add to status history
      const newHistoryItem: StatusHistory = {
        id: Date.now().toString(),
        status: newStatus,
        changed_by: user?.full_name || 'User',
        changed_at: new Date().toISOString(),
        reason: reason || 'Status updated',
        notes: `Changed from ${booking.status} to ${newStatus}`
      }
      
      setStatusHistory(prev => [...prev, newHistoryItem])
      
      toast.success(`Booking status updated to ${newStatus}`)
    } catch (error) {
      console.error('Error updating booking status:', error)
      toast.error('Failed to update booking status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !booking) return

    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('messages')
        .insert({
          booking_id: booking.id,
          sender_id: user.id,
          content: newMessage,
          created_at: new Date().toISOString()
        })

      if (error) {
        throw error
      }

      // Add message to local state
      const newMsg: Message = {
        id: Date.now().toString(),
        content: newMessage,
        sender_name: user?.full_name || 'You',
        sender_role: userRole,
        created_at: new Date().toISOString(),
        is_read: false
      }
      
      setMessages(prev => [...prev, newMsg])
      setNewMessage('')
      
      toast.success('Message sent successfully')
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string, label: string }> = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      approved: { color: 'bg-blue-100 text-blue-800', label: 'Approved' },
      declined: { color: 'bg-red-100 text-red-800', label: 'Declined' },
      in_progress: { color: 'bg-purple-100 text-purple-800', label: 'In Progress' },
      completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
      cancelled: { color: 'bg-gray-100 text-gray-800', label: 'Cancelled' },
      on_hold: { color: 'bg-orange-100 text-orange-800', label: 'On Hold' }
    }
    
    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', label: status }
    return <Badge className={config.color}>{config.label}</Badge>
  }

  const getPriorityBadge = (priority: string) => {
    const priorityConfig: Record<string, { color: string, label: string }> = {
      low: { color: 'bg-green-100 text-green-800', label: 'Low' },
      medium: { color: 'bg-yellow-100 text-yellow-800', label: 'Medium' },
      high: { color: 'bg-red-100 text-red-800', label: 'High' },
      urgent: { color: 'bg-red-200 text-red-900', label: 'Urgent' }
    }
    
    const config = priorityConfig[priority] || { color: 'bg-gray-100 text-gray-800', label: priority }
    return <Badge className={config.color}>{config.label}</Badge>
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading booking details...</p>
        </div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Booking not found</h3>
          <p className="text-gray-600">The booking you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => router.back()} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Booking Details</h1>
            <p className="text-gray-600 mt-1">#{booking.id.slice(0, 8)}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {getStatusBadge(booking.status)}
          {booking.priority && getPriorityBadge(booking.priority)}
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="tracking">Tracking</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                  <h4 className="font-medium text-gray-900">{booking.service_title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{booking.service_description}</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Category:</span>
                    <span className="font-medium">{booking.service_category}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Package:</span>
                    <span className="font-medium">{booking.package_name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Rate:</span>
                    <span className="font-medium">{formatCurrency(booking.amount, booking.currency)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Delivery:</span>
                    <span className="font-medium">{booking.delivery_days} days</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Revisions:</span>
                    <span className="font-medium">{booking.revisions}</span>
                  </div>
                </div>
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
                  <h4 className="font-medium text-gray-900">{booking.client_name}</h4>
                  {booking.client_company && (
                    <p className="text-sm text-gray-600">{booking.client_company}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span>{booking.client_email}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span>{booking.client_phone}</span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <PhoneCall className="h-4 w-4 mr-2" />
                    Call
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Video className="h-4 w-4 mr-2" />
                    Video
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Booking Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Booking Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Status:</span>
                    {getStatusBadge(booking.status)}
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Priority:</span>
                    {booking.priority && getPriorityBadge(booking.priority)}
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Created:</span>
                    <span className="font-medium">{formatDate(booking.created_at)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Scheduled:</span>
                    <span className="font-medium">{formatDate(booking.scheduled_date)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Time:</span>
                    <span className="font-medium">{booking.scheduled_time || 'TBD'}</span>
                  </div>
                </div>

                {booking.location && (
                  <div className="flex items-center space-x-2 text-sm">
                    <LocationIcon className="h-4 w-4 text-gray-500" />
                    <span>{booking.location}</span>
                  </div>
                )}

                {booking.notes && (
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">Notes</h5>
                    <p className="text-sm text-gray-600">{booking.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {booking.status === 'pending' && (
                  <>
                    <Button 
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => updateBookingStatus('approved')}
                      disabled={updatingStatus}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={() => updateBookingStatus('declined')}
                      disabled={updatingStatus}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Decline
                    </Button>
                  </>
                )}
                
                {booking.status === 'approved' && (
                  <Button 
                    onClick={() => updateBookingStatus('in_progress')}
                    disabled={updatingStatus}
                  >
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Start Work
                  </Button>
                )}
                
                {booking.status === 'in_progress' && (
                  <Button 
                    onClick={() => updateBookingStatus('completed')}
                    disabled={updatingStatus}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark Complete
                  </Button>
                )}
                
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Booking
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chat Tab */}
        <TabsContent value="chat" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5" />
                <span>Messages</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Messages List */}
              <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                {messages.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No messages yet</p>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender_role === userRole ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.sender_role === userRole
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <div className="text-sm font-medium mb-1">
                          {message.sender_name}
                        </div>
                        <div className="text-sm">{message.content}</div>
                        <div className="text-xs opacity-75 mt-1">
                          {formatDate(message.created_at)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Send Message */}
              <div className="flex space-x-2">
                <Textarea
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1"
                  rows={3}
                />
                <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Status History</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {statusHistory.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No status changes yet</p>
                ) : (
                  statusHistory.map((item, index) => (
                    <div key={item.id} className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                        {index < statusHistory.length - 1 && (
                          <div className="w-0.5 h-8 bg-gray-300 mx-auto mt-1"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          {getStatusBadge(item.status)}
                          <span className="text-sm text-gray-600">by {item.changed_by}</span>
                        </div>
                        <p className="text-sm text-gray-900">{item.reason}</p>
                        {item.notes && (
                          <p className="text-sm text-gray-600 mt-1">{item.notes}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(item.changed_at)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tracking Tab */}
        <TabsContent value="tracking" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="h-5 w-5" />
                <span>Project Tracking</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Progress Timeline */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Project Progress</h4>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Booking Created</p>
                        <p className="text-sm text-gray-600">{formatDate(booking.created_at)}</p>
                      </div>
                    </div>
                    
                    {booking.status !== 'pending' && (
                      <div className="flex items-center space-x-4">
                        <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                          <CheckCircle className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">Booking Approved</p>
                          <p className="text-sm text-gray-600">Status changed to approved</p>
                        </div>
                      </div>
                    )}
                    
                    {['in_progress', 'completed'].includes(booking.status) && (
                      <div className="flex items-center space-x-4">
                        <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                          <CheckCircle className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">Work Started</p>
                          <p className="text-sm text-gray-600">Project is in progress</p>
                        </div>
                      </div>
                    )}
                    
                    {booking.status === 'completed' && (
                      <div className="flex items-center space-x-4">
                        <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                          <CheckCircle className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">Project Completed</p>
                          <p className="text-sm text-gray-600">All deliverables finished</p>
                        </div>
                      </div>
                    )}
                    
                    {['pending', 'approved'].includes(booking.status) && (
                      <div className="flex items-center space-x-4">
                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                          <Clock className="h-4 w-4 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-500">Work Not Started</p>
                          <p className="text-sm text-gray-500">Waiting for approval or start</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Milestones */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Key Milestones</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h5 className="font-medium text-gray-900">Project Start</h5>
                      <p className="text-sm text-gray-600">{formatDate(booking.scheduled_date)}</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h5 className="font-medium text-gray-900">Expected Delivery</h5>
                                             <p className="text-sm text-gray-600">
                         {booking.delivery_days ? 
                           formatDate(new Date(new Date(booking.scheduled_date).getTime() + (booking.delivery_days * 24 * 60 * 60 * 1000))) :
                           'TBD'
                         }
                       </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}


