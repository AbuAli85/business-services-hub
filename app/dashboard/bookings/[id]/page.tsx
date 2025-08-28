'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getSupabaseClient } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Building2, 
  MessageCircle, 
  FileText, 
  Star, 
  Send, 
  Upload, 
  Download, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Edit3,
  Trash2,
  Eye,
  Plus
} from 'lucide-react'

interface Message {
  id: string
  content: string
  subject: string
  sender_id: string
  receiver_id: string
  created_at: string
  read: boolean
  sender: { full_name: string; email: string }
  receiver: { full_name: string; email: string }
}

interface File {
  id: string
  name: string
  url: string
  size: number
  type: string
  uploaded_by: string
  created_at: string
}

interface Review {
  id: string
  rating: number
  comment: string
  reviewer_id: string
  created_at: string
  reviewer: { full_name: string }
}

interface Booking {
  id: string
  service_id: string
  client_id: string
  provider_id: string
  scheduled_date: string
  status: string
  approval_status: string
  operational_status: string
  amount: number
  currency: string
  payment_status: string
  notes?: string
  estimated_duration?: string
  location?: string
  created_at: string
  services: { title: string; description: string }
  client_profile?: { full_name: string; email: string }
  provider_profile?: { full_name: string; email: string }
}

export default function BookingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [newMessage, setNewMessage] = useState('')
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' })
  const [uploadingFile, setUploadingFile] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<'client' | 'provider' | 'admin'>('client')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const bookingId = params.id as string

  useEffect(() => {
    if (userId) {
      fetchBookingDetails()
      fetchMessages()
      fetchFiles()
      fetchReviews()
    }
  }, [userId, bookingId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Get user authentication
  useEffect(() => {
    const getUser = async () => {
      try {
        const supabase = await getSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          router.push('/auth/sign-in')
          return
        }
        
        setUserId(user.id)
        
        // Determine user role from metadata or profile
        const role = user.user_metadata?.role || 'client'
        setUserRole(role as 'client' | 'provider' | 'admin')
        
      } catch (error) {
        console.error('Error getting user:', error)
        router.push('/auth/sign-in')
      }
    }
    
    getUser()
  }, [router])

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  const fetchBookingDetails = useCallback(async () => {
    try {
      console.log('🔍 Fetching booking details for ID:', bookingId)
      
      if (!bookingId) {
        console.error('❌ No booking ID provided')
        toast.error('No booking ID provided')
        return
      }
      
      const supabase = await getSupabaseClient()
      
      // First get the basic booking data
      const { data: b, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          *,
          services(title, description)
        `) 
        .eq('id', bookingId)
        .single()
      
      if (bookingError) {
        console.error('❌ Error fetching booking:', bookingError)
        toast.error('Failed to load booking details')
        return
      }
      
      console.log('✅ Booking found:', b)
      
      // Then get the client and provider profiles separately
      let clientProfile = null
      let providerProfile = null
      
      if (b.client_id) {
        const { data: clientData } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', b.client_id)
          .single()
        clientProfile = clientData
      }
      
      if (b.provider_id) {
        const { data: providerData } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', b.provider_id)
          .single()
        providerProfile = providerData
      }
      
      // Combine the data
      const bookingWithProfiles = {
        ...b,
        client_profile: clientProfile,
        provider_profile: providerProfile
      }
      
      console.log('✅ Final booking with profiles:', bookingWithProfiles)
      setBooking(bookingWithProfiles)
      setLoading(false)
    } catch (error) {
      console.error('❌ Error in fetchBookingDetails:', error)
      toast.error('Failed to load booking details')
      setLoading(false)
    }
  }, [bookingId])

  const fetchMessages = useCallback(async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      const headers: HeadersInit = {
        credentials: 'include'
      }
      
      // Add authorization header if we have a session
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
      
      const response = await fetch(`/api/messages?booking_id=${bookingId}`, {
        headers
      })
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    }
  }, [bookingId])

  const fetchFiles = useCallback(async () => {
    // Mock files for now - replace with actual API call
    setFiles([
      {
        id: '1',
        name: 'Service Agreement.pdf',
        url: '#',
        size: 245760,
        type: 'application/pdf',
        uploaded_by: 'Provider',
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        name: 'Requirements.docx',
        url: '#',
        size: 15360,
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        uploaded_by: 'Client',
        created_at: new Date().toISOString()
      }
    ])
  }, [])

  const fetchReviews = useCallback(async () => {
    // Mock reviews for now - replace with actual API call
    setReviews([
      {
        id: '1',
        rating: 5,
        comment: 'Excellent service! Very professional and delivered on time.',
        reviewer_id: 'client-1',
        created_at: new Date().toISOString(),
        reviewer: { full_name: 'Client Name' }
      }
    ])
  }, [])

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !booking) return

    try {
      const supabase = await getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      const receiverId = userRole === 'client' ? booking.provider_id : booking.client_id
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        credentials: 'include'
      }
      
      // Add authorization header if we have a session
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
      
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          receiver_id: receiverId,
          content: newMessage,
          subject: `Re: ${booking.services.title}`,
          booking_id: bookingId
        })
      })

      if (response.ok) {
        setNewMessage('')
        await fetchMessages()
        toast.success('Message sent successfully')
      } else {
        toast.error('Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    }
  }, [newMessage, booking, userRole, bookingId])

  const submitReview = useCallback(async () => {
    if (!newReview.comment.trim()) return

    try {
      // Mock review submission - replace with actual API call
      const review = {
        id: Date.now().toString(),
        rating: newReview.rating,
        comment: newReview.comment,
        reviewer_id: userId!,
        created_at: new Date().toISOString(),
        reviewer: { full_name: userRole === 'client' ? 'Client' : 'Provider' }
      }

      setReviews(prev => [...prev, review])
      setNewReview({ rating: 5, comment: '' })
      toast.success('Review submitted successfully')
    } catch (error) {
      console.error('Error submitting review:', error)
      toast.error('Failed to submit review')
    }
  }, [newReview.comment, newReview.rating, userId, userRole])

  const updateBookingStatus = useCallback(async (action: string) => {
    console.log('🔍 updateBookingStatus called with action:', action)
    console.log('🔍 Current booking state:', booking)
    console.log('🔍 Current bookingId:', bookingId)
    
    if (!booking) {
      console.error('❌ No booking data available')
      toast.error('No booking data available')
      return
    }

    try {
      const supabase = await getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        credentials: 'include'
      }
      
      // Add authorization header if we have a session
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
      
      const requestBody = {
        booking_id: booking.id,
        action
      }
      
      console.log('🔍 Sending request body:', requestBody)
      
      const response = await fetch('/api/bookings', {
        method: 'PATCH',
        headers,
        body: JSON.stringify(requestBody)
      })

      if (response.ok) {
        await fetchBookingDetails()
        toast.success(`Booking ${action}d successfully`)
      } else {
        const errorData = await response.json()
        console.error('❌ Booking update failed:', errorData)
        toast.error(`Failed to ${action} booking: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('❌ Error updating booking:', error)
      toast.error(`Failed to ${action} booking`)
    }
  }, [booking, bookingId])

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'declined': return 'bg-red-100 text-red-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'cancelled': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }, [])

  const getOperationalStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800'
      case 'in_progress': return 'bg-yellow-100 text-yellow-800'
      case 'done': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }, [])

  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }, [])

  const renderStars = useCallback((rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ))
  }, [])

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value)
  }, [])

  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value)
  }, [])

  const handleReviewChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewReview(prev => ({ ...prev, comment: e.target.value }))
  }, [])

  const handleRatingChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewReview(prev => ({ ...prev, rating: parseInt(e.target.value) }))
  }, [])

  // Memoized status colors to prevent unnecessary re-computations
  const statusColor = useMemo(() => 
    getStatusColor(booking?.status || ''), [booking?.status, getStatusColor]
  )

  const operationalStatusColor = useMemo(() => 
    getOperationalStatusColor(booking?.operational_status || ''), [booking?.operational_status, getOperationalStatusColor]
  )

  // Memoized payment status color
  const paymentStatusColor = useMemo(() => {
    if (!booking) return ''
    switch (booking.payment_status) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-red-100 text-red-800'
    }
  }, [booking?.payment_status])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Booking Not Found</h2>
        <p className="text-gray-600 mb-6">The booking you're looking for doesn't exist or you don't have access to it.</p>
        <Button onClick={() => router.push('/dashboard/bookings')}>
          Back to Bookings
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{booking.services.title}</h1>
          <p className="text-gray-600 mt-2">Booking ID: {booking.id}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={statusColor}>
            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </Badge>
          <Badge className={operationalStatusColor}>
            {booking.operational_status.replace('_', ' ').charAt(0).toUpperCase() + 
             booking.operational_status.replace('_', ' ').slice(1)}
          </Badge>
        </div>
      </div>

      {/* Status Alert */}
      {booking.status === 'pending' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Pending Approval</h3>
              <p className="text-sm text-yellow-700">
                This booking is waiting for provider approval. You'll be notified once it's reviewed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="qa">Q&A</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="review">Review</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Booking Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Booking Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Scheduled Date</label>
                    <p className="text-sm text-gray-900">
                      {new Date(booking.scheduled_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Time</label>
                    <p className="text-sm text-gray-900">
                      {new Date(booking.scheduled_date).toLocaleTimeString()}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Duration</label>
                    <p className="text-sm text-gray-900">
                      {booking.estimated_duration || 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Location</label>
                    <p className="text-sm text-gray-900">
                      {booking.location || 'Not specified'}
                    </p>
                  </div>
                </div>
                {booking.notes && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Notes</label>
                    <p className="text-sm text-gray-900">{booking.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Financial Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Financial Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Amount</label>
                    <p className="text-2xl font-bold text-green-600">
                      {booking.currency} {booking.amount.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Payment Status</label>
                    <Badge className={paymentStatusColor}>
                      {booking.payment_status.charAt(0).toUpperCase() + booking.payment_status.slice(1)}
                    </Badge>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <Button className="w-full" disabled={booking.payment_status === 'paid'}>
                    {booking.payment_status === 'paid' ? 'Payment Complete' : 'Make Payment'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
              <CardDescription>Manage this booking</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {userRole === 'provider' && booking.status === 'pending' && (
                  <>
                    <Button onClick={() => updateBookingStatus('approve')} className="bg-green-600 hover:bg-green-700">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button onClick={() => updateBookingStatus('decline')} variant="destructive">
                      <XCircle className="h-4 w-4 mr-2" />
                      Decline
                    </Button>
                  </>
                )}
                {userRole === 'provider' && booking.status === 'approved' && (
                  <Button onClick={() => updateBookingStatus('complete')} className="bg-blue-600 hover:bg-blue-700">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark Complete
                  </Button>
                )}
                {userRole === 'client' && ['pending', 'approved'].includes(booking.status) && (
                  <Button onClick={() => updateBookingStatus('cancel')} variant="outline">
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel Booking
                  </Button>
                )}
                <Button variant="outline">
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Details
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chat Tab */}
        <TabsContent value="chat" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Chat with {userRole === 'client' ? 'Provider' : 'Client'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Messages Display */}
              <div className="h-96 overflow-y-auto border rounded-lg p-4 mb-4 bg-gray-50">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender_id === userId ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.sender_id === userId
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-900 border'
                          }`}
                        >
                          <div className="text-xs opacity-75 mb-1">
                            {message.sender.full_name} • {new Date(message.created_at).toLocaleTimeString()}
                          </div>
                          <p>{message.content}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="flex gap-2">
                <Textarea
                  value={newMessage}
                  onChange={handleMessageChange}
                  placeholder="Type your message..."
                  className="flex-1"
                  rows={3}
                />
                <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Q&A Tab */}
        <TabsContent value="qa" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Questions & Answers
              </CardTitle>
              <CardDescription>Ask questions and get answers about this service</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">How to ask a question:</h4>
                  <p className="text-sm text-blue-700">
                    Use the chat feature to ask questions about this service. The provider will respond 
                    with detailed answers and clarifications.
                  </p>
                </div>
                
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Questions and answers appear in the chat tab</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => handleTabChange('chat')}
                  >
                    Go to Chat
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Files & Documents
              </CardTitle>
              <CardDescription>Share and manage files related to this booking</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Upload Section */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mb-6">
                <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-sm text-gray-600 mb-2">
                  Drop files here or click to upload
                </p>
                <Button variant="outline" disabled={uploadingFile}>
                  <Upload className="h-4 w-4 mr-2" />
                  Choose Files
                </Button>
              </div>

              {/* Files List */}
              <div className="space-y-3">
                {files.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-gray-900">{file.name}</p>
                        <p className="text-sm text-gray-500">
                          {formatFileSize(file.size)} • {file.uploaded_by} • {new Date(file.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Review Tab */}
        <TabsContent value="review" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Reviews & Feedback
              </CardTitle>
              <CardDescription>Share your experience and read reviews</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Submit Review */}
              {booking.status === 'completed' && (
                <div className="border rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">Write a Review</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Rating</label>
                      <div className="flex items-center gap-1 mt-1">
                        {renderStars(newReview.rating)}
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={newReview.rating}
                        onChange={handleRatingChange}
                        className="w-full mt-2"
                        aria-label="Rating from 1 to 5"
                        title={`Rating: ${newReview.rating} out of 5`}
                      />
                      <div className="text-xs text-gray-500 mt-1 text-center">
                        {newReview.rating} out of 5 stars
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Comment</label>
                      <Textarea
                        value={newReview.comment}
                        onChange={handleReviewChange}
                        placeholder="Share your experience..."
                        rows={3}
                      />
                    </div>
                    <Button onClick={submitReview} disabled={!newReview.comment.trim()}>
                      <Star className="h-4 w-4 mr-2" />
                      Submit Review
                    </Button>
                  </div>
                </div>
              )}

              {/* Reviews Display */}
              <div className="space-y-4">
                {reviews.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Star className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No reviews yet. Be the first to share your experience!</p>
                  </div>
                ) : (
                  reviews.map((review) => (
                    <div key={review.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            {renderStars(review.rating)}
                          </div>
                          <span className="text-sm text-gray-500">by {review.reviewer.full_name}</span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-900">{review.comment}</p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}


