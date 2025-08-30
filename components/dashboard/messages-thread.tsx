'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Send,
  User,
  MessageSquare,
  Clock,
  AlertCircle
} from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface Message {
  id: string
  content: string
  sender_id: string
  sender_name: string
  sender_role: 'client' | 'provider'
  created_at: string
  is_own_message: boolean
}

interface MessagesThreadProps {
  bookingId: string
}

export function MessagesThread({ bookingId }: MessagesThreadProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [booking, setBooking] = useState<any>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadUserAndMessages()
  }, [bookingId])

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  const loadUserAndMessages = async () => {
    try {
      setLoading(true)
      const supabase = await getSupabaseClient()
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Please sign in to view messages')
        return
      }
      
      setUser(user)
      
      // Load booking details to get client and provider info
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          id,
          client_id,
          provider_id,
          client:profiles!bookings_client_id_fkey(full_name, email),
          provider:profiles!bookings_provider_id_fkey(full_name, email)
        `)
        .eq('id', bookingId)
        .single()

      if (bookingError) {
        console.error('Error loading booking:', bookingError)
        toast.error('Failed to load booking details')
        return
      }

      setBooking(bookingData)
      
      // Load messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          sender_id,
          created_at,
          profiles!messages_sender_id_fkey(full_name, role)
        `)
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true })

      if (messagesError) {
        console.error('Error loading messages:', messagesError)
        toast.error('Failed to load messages')
        return
      }

      // Transform messages
      const transformedMessages = messagesData?.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        sender_id: msg.sender_id,
        sender_name: Array.isArray(msg.profiles) ? msg.profiles[0]?.full_name || 'Unknown User' : msg.profiles?.full_name || 'Unknown User',
        sender_role: Array.isArray(msg.profiles) ? msg.profiles[0]?.role || 'client' : msg.profiles?.role || 'client',
        created_at: msg.created_at,
        is_own_message: msg.sender_id === user.id
      })) || []

      setMessages(transformedMessages)
      setLoading(false)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to load messages')
      setLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !booking) return
    
    try {
      setSending(true)
      const supabase = await getSupabaseClient()
      
      // Insert message
      const { data: messageData, error } = await supabase
        .from('messages')
        .insert({
          booking_id: bookingId,
          sender_id: user.id,
          content: newMessage.trim(),
          message_type: 'chat'
        })
        .select(`
          id,
          content,
          sender_id,
          created_at,
          profiles!messages_sender_id_fkey(full_name, role)
        `)
        .single()

      if (error) {
        console.error('Error sending message:', error)
        toast.error('Failed to send message')
        return
      }

      // Add message to local state
      const newMsg: Message = {
        id: messageData.id,
        content: messageData.content,
        sender_id: messageData.sender_id,
        sender_name: Array.isArray((messageData as any).profiles) ? (messageData as any).profiles[0]?.full_name || 'Unknown User' : (messageData as any).profiles?.full_name || 'Unknown User',
        sender_role: Array.isArray((messageData as any).profiles) ? (messageData as any).profiles[0]?.role || 'client' : (messageData as any).profiles?.role || 'client',
        created_at: messageData.created_at,
        is_own_message: true
      }

      setMessages(prev => [...prev, newMsg])
      setNewMessage('')
      
      // Update booking last_message_at
      await supabase
        .from('bookings')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', bookingId)

      toast.success('Message sent!')
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

  const getSenderInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MessageSquare className="h-5 w-5" />
          <span>Messages</span>
        </CardTitle>
        <CardDescription>
          Chat with {user?.id === booking?.client_id ? 'your provider' : 'your client'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Messages Area */}
        <div className="h-96 border rounded-lg">
          <ScrollArea ref={scrollAreaRef} className="h-full p-4">
            {messages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No messages yet</p>
                <p className="text-sm">Start the conversation by sending a message</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.is_own_message ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex items-start space-x-2 max-w-xs lg:max-w-md ${
                      message.is_own_message ? 'flex-row-reverse space-x-reverse' : ''
                    }`}>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src="" />
                        <AvatarFallback className="text-xs">
                          {getSenderInitials(message.sender_name)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className={`flex flex-col space-y-1 ${
                        message.is_own_message ? 'items-end' : 'items-start'
                      }`}>
                        <div className={`px-3 py-2 rounded-lg ${
                          message.is_own_message
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}>
                          <p className="text-sm">{message.content}</p>
                        </div>
                        
                        <div className={`flex items-center space-x-1 text-xs text-muted-foreground ${
                          message.is_own_message ? 'flex-row-reverse space-x-reverse' : ''
                        }`}>
                          <Clock className="h-3 w-3" />
                          <span>{formatMessageTime(message.created_at)}</span>
                          <span>•</span>
                          <span className="capitalize">{message.sender_role}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Message Input */}
        <div className="flex space-x-2">
          <Input
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            disabled={sending}
            className="flex-1"
          />
          <Button 
            onClick={sendMessage} 
            disabled={!newMessage.trim() || sending}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Message Guidelines */}
        <div className="text-xs text-muted-foreground bg-gray-50 p-3 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 mt-0.5" />
            <div>
              <p className="font-medium mb-1">Message Guidelines:</p>
              <ul className="space-y-1">
                <li>• Be professional and courteous</li>
                <li>• Include relevant details about your service</li>
                <li>• Respond promptly to maintain good communication</li>
                <li>• Use clear, concise language</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
