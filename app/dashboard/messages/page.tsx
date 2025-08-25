'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { getSupabaseClient } from '@/lib/supabase'
import { MessageCircle, Send, User, Clock, Search } from 'lucide-react'

interface Message {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  subject: string
  created_at: string
  read: boolean
  booking_id: string  // Required field based on actual schema
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    checkUserAndFetchMessages()
  }, [])

  const checkUserAndFetchMessages = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        console.error('No authenticated user')
        return
      }

      // Check if user has a profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        console.error('User profile not found:', profileError)
        // User doesn't have a profile - this is the root cause of the messaging issue
        setUser(null)
        setLoading(false)
        return
      }

      setUser(user)
      await fetchMessages(user.id)
    } catch (error) {
      console.error('Error checking user:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (userId: string) => {
    try {
      const supabase = await getSupabaseClient()
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching messages:', error)
        return
      }

      setMessages(messagesData || [])
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user?.id) return

    try {
      const supabase = await getSupabaseClient()
      
      // First, we need to find or create a valid booking for this user
      // Let's try to find an existing booking first
      const { data: existingBookings, error: bookingError } = await supabase
        .from('bookings')
        .select('id, service_id, client_id, provider_id')
        .or(`client_id.eq.${user.id},provider_id.eq.${user.id}`)
        .limit(1)

      if (bookingError) {
        console.error('Error finding existing bookings:', bookingError)
        return
      }

      let bookingId = null

      if (existingBookings && existingBookings.length > 0) {
        // Use existing booking
        bookingId = existingBookings[0].id
        console.log('Using existing booking:', bookingId)
      } else {
        // No existing booking, we need to create one
        // First check if user has any services
        const { data: userServices, error: serviceError } = await supabase
          .from('services')
          .select('id')
          .eq('provider_id', user.id)
          .limit(1)

        if (serviceError) {
          console.error('Error finding user services:', serviceError)
          return
        }

        if (userServices && userServices.length > 0) {
          // Create a new booking using user's service
          const { data: newBooking, error: createBookingError } = await supabase
            .from('bookings')
            .insert({
              client_id: user.id,
              provider_id: user.id,
              service_id: userServices[0].id,
              status: 'draft',
              subtotal: 0.00,
              currency: 'OMR'
            })
            .select('id')
            .single()

          if (createBookingError) {
            console.error('Error creating booking:', createBookingError)
            return
          }

          bookingId = newBooking.id
          console.log('Created new booking:', bookingId)
        } else {
          // User has no services, check if there are any existing bookings they can join
          const { data: availableBookings, error: availableError } = await supabase
            .from('bookings')
            .select('id, service_id, client_id, provider_id')
            .limit(5)

          if (availableError) {
            console.error('Error finding available bookings:', availableError)
            return
          }

          if (availableBookings && availableBookings.length > 0) {
            // Use the first available booking (user can participate in it)
            bookingId = availableBookings[0].id
            console.log('Using available booking:', bookingId)
          } else {
            // No services and no available bookings
            console.error('User has no services and no available bookings - cannot send message')
            alert('You need to have a service or join an existing booking to send messages. Please create a service first.')
            return
          }
        }
      }

      if (!bookingId) {
        console.error('No booking ID available')
        return
      }

      // Now send the message
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: user.id, // Placeholder - implement actual receiver selection
          content: newMessage,
          subject: 'New Message',
          read: false,
          booking_id: bookingId,
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error sending message:', error)
        return
      }

      setNewMessage('')
      await fetchMessages(user.id)
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const filteredMessages = messages.filter((message) => {
    const content = (message?.content || '').toString()
    const subject = (message?.subject || '').toString()
    const haystack = `${subject} ${content}`.toLowerCase()
    const needle = (searchQuery || '').toString().toLowerCase()
    return haystack.includes(needle)
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 text-lg">Loading messages...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-red-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <MessageCircle className="h-12 w-12 text-red-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Profile Not Found</h3>
            <p className="text-gray-600 mb-6 text-lg">
              Your user account doesn't have a profile in the system yet. This usually happens when:
            </p>
            <div className="text-left max-w-md mx-auto mb-6">
              <ul className="text-gray-600 space-y-2">
                <li>• You haven't completed your profile setup</li>
                <li>• Your profile was created before you signed up</li>
                <li>• There was an issue during account creation</li>
              </ul>
            </div>
            <p className="text-gray-600 mb-6">
              Please contact support or try refreshing the page. If the issue persists, you may need to complete your profile setup first.
            </p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Refresh Page
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Messages</h1>
          <p className="text-gray-600 text-lg">Communicate with your clients and service providers</p>
        </div>

        {/* Search and New Message */}
        <Card className="mb-8 border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-4">
              <Input
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1"
              />
              <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                <Send className="h-4 w-4 mr-2" />
                Send
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Messages List */}
        {filteredMessages.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <MessageCircle className="h-12 w-12 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">No messages found</h3>
              <p className="text-gray-600 mb-6 text-lg">
                {searchQuery ? 'No messages match your search.' : 'You don\'t have any messages yet. Start a conversation!'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredMessages.map((message) => (
              <Card key={message.id} className="hover:shadow-lg transition-all duration-300 border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {message.sender_id === user?.id ? 'You' : 'Other User'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(message.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!message.read && (
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                          New
                        </Badge>
                      )}
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-500">
                        {new Date(message.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-gray-700 leading-relaxed">{message.content}</p>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      Reply
                    </Button>
                    <Button size="sm" variant="outline">
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
