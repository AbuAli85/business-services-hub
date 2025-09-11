'use client'

import { useState, useEffect, useRef } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { realtimeManager } from '@/lib/realtime'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Send, 
  Paperclip, 
  Image as ImageIcon, 
  File, 
  Search, 
  Phone,
  Video,
  Mail,
  MessageSquare,
  User,
  Calendar,
  Clock,
  MapPin,
  Eye
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { formatDate, formatTime } from '@/lib/utils'

interface Message {
  id: string
  content: string
  sender_id: string
  receiver_id: string
  booking_id?: string
  message?: string
  subject?: string
  read?: boolean
  created_at: string
  read_at?: string
}

interface Conversation {
  id: string
  participant_id: string
  participant_name: string
  participant_avatar?: string
  participant_role: string
  last_message?: string
  last_message_time?: string
  unread_count: number
  booking_id?: string
  booking_title?: string
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [uploading, setUploading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    checkUserAndFetchData()
  }, [])

  // Real-time message updates
  useEffect(() => {
    if (!user?.id) return

    let subscriptionKeys: string[] = []

    ;(async () => {
      try {
        // Subscribe to real-time message updates
        const messageSubscription = await realtimeManager.subscribeToMessages(user.id, (update) => {
          if (update.eventType === 'INSERT') {
            // New message - refresh conversations and messages
            fetchConversations(user.id)
            if (selectedConversation) {
              fetchMessages(selectedConversation.id)
            }
          } else if (update.eventType === 'UPDATE') {
            // Message updated (e.g., read status) - refresh if needed
            if (selectedConversation) {
              fetchMessages(selectedConversation.id)
            }
          }
        })
        subscriptionKeys.push(`messages:${user.id}`)

      } catch (error) {
        console.error('Error setting up realtime subscriptions:', error)
      }
    })()

    return () => {
      // Unsubscribe from all channels
      subscriptionKeys.forEach(key => {
        realtimeManager.unsubscribe(key)
      })
    }
  }, [user?.id, selectedConversation])

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id)
    }
  }, [selectedConversation])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const checkUserAndFetchData = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth/sign-in')
        return
      }

      setUser(user)
      await fetchConversations(user.id)
    } catch (error) {
      console.error('Error loading messages:', error)
      toast.error('Failed to load messages')
    } finally {
      setLoading(false)
    }
  }

  const fetchConversations = async (userId: string) => {
    try {
      const supabase = await getSupabaseClient()
      
      // Get conversations where user is either sender or receiver
      const { data: conversationsData, error } = await supabase
        .from('messages')
        .select('id, sender_id, receiver_id, content, created_at, read_at, booking_id')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false })

      if (error) throw error

      console.log('Raw conversations data:', conversationsData)

      // Process conversations and fetch related data separately
      const conversationMap = new Map<string, Conversation>()
      
      // First, collect all unique participant IDs and booking IDs
      const participantIds = new Set<string>()
      const bookingIds = new Set<string>()
      
      conversationsData?.forEach((msg) => {
        const isSender = msg.sender_id === userId
        const participantId = isSender ? msg.receiver_id : msg.sender_id
        participantIds.add(participantId)
        if (msg.booking_id) bookingIds.add(msg.booking_id)
      })
      
      console.log('Participant IDs:', Array.from(participantIds))
      console.log('Booking IDs:', Array.from(bookingIds))
      
      // Fetch participant profiles
      const { data: participants, error: participantError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role')
        .in('id', Array.from(participantIds))

      if (participantError) {
        console.error('Error fetching participants:', participantError)
      }

      console.log('Fetched participants:', participants)
      
      // Fetch booking information
      const { data: bookings, error: bookingError } = await supabase
        .from('bookings')
        .select('id, service_id')
        .in('id', Array.from(bookingIds))

      if (bookingError) {
        console.error('Error fetching bookings:', bookingError)
      }

      console.log('Fetched bookings:', bookings)
      
      // Fetch service information for the bookings
      const serviceIds = Array.from(new Set(bookings?.map(b => b.service_id).filter(Boolean) || []))
      let services: any[] = []
      
      if (serviceIds.length > 0) {
        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select('id, title')
          .in('id', serviceIds)
        
        if (servicesError) {
          console.error('Error fetching services:', servicesError)
        } else {
          services = servicesData || []
        }
      }
      
      console.log('Fetched services:', services)
      
      // Process conversations
      conversationsData?.forEach((msg) => {
        const isSender = msg.sender_id === userId
        const participantId = isSender ? msg.receiver_id : msg.sender_id
        const participant = participants?.find(p => p.id === participantId)
        const booking = bookings?.find(b => b.id === msg.booking_id)
        const service = services?.find(s => s.id === booking?.service_id)
        
        console.log(`Processing message: sender=${msg.sender_id}, receiver=${msg.receiver_id}, participant=${participantId}`)
        console.log(`Found participant:`, participant)
        console.log(`Found booking:`, booking)
        console.log(`Found service:`, service)
        
        if (!conversationMap.has(participantId)) {
          conversationMap.set(participantId, {
            id: participantId,
            participant_id: participantId,
            participant_name: participant?.full_name || 'Unknown User',
            participant_avatar: participant?.avatar_url,
            participant_role: participant?.role || 'user',
            last_message: msg.content || 'No message content',
            last_message_time: msg.created_at,
            unread_count: isSender ? 0 : (msg.read_at ? 0 : 1),
            booking_id: msg.booking_id,
            booking_title: service?.title || 'General Conversation'
          })
        } else {
          const existing = conversationMap.get(participantId)!
          if (new Date(msg.created_at) > new Date(existing.last_message_time || '')) {
            existing.last_message = msg.content || 'No message content'
            existing.last_message_time = msg.created_at
            if (!isSender && !msg.read_at) {
              existing.unread_count += 1
            }
          }
        }
      })

      const finalConversations = Array.from(conversationMap.values())
      console.log('Final conversations:', finalConversations)
      setConversations(finalConversations)
    } catch (error) {
      console.error('Error fetching conversations:', error)
      toast.error('Failed to load conversations')
    }
  }

  const fetchMessages = async (conversationId: string) => {
    try {
      const supabase = await getSupabaseClient()
      
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${conversationId}),and(sender_id.eq.${conversationId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true })

      if (error) throw error

      console.log('Fetched messages:', messagesData)
      setMessages(messagesData || [])
      
      // Mark messages as read
      markMessagesAsRead(conversationId)
    } catch (error) {
      console.error('Error fetching messages:', error)
      toast.error('Failed to load messages')
    }
  }

  const markMessagesAsRead = async (conversationId: string) => {
    try {
      const supabase = await getSupabaseClient()
      
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('sender_id', conversationId)
        .eq('receiver_id', user.id)
        .is('read_at', null)
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return

    try {
      const supabase = await getSupabaseClient()
      
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          content: newMessage.trim(),
          sender_id: user.id,
          receiver_id: selectedConversation.participant_id,
          booking_id: selectedConversation.booking_id
        })
        .select('*')
        .single()

      if (error) throw error

      setMessages(prev => [...prev, message])
      setNewMessage('')
      
      // Update conversation last message
      setConversations(prev => 
        prev.map(conv => 
          conv.id === selectedConversation.participant_id
            ? { ...conv, last_message: newMessage.trim(), last_message_time: new Date().toISOString() }
            : conv
        )
      )
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedConversation) return

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB')
      return
    }

    try {
      setUploading(true)
      const supabase = await getSupabaseClient()
      
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `message-files/${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('message-files')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('message-files')
        .getPublicUrl(filePath)

      // Send file message
      const messageType = file.type.startsWith('image/') ? 'image' : 'file'
      
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          content: `Sent a file: ${file.name}`,
          sender_id: user.id,
          receiver_id: selectedConversation.participant_id,
          booking_id: selectedConversation.booking_id
        })
        .select('*')
        .single()

      if (error) throw error

      setMessages(prev => [...prev, message])
      toast.success('File sent successfully')
    } catch (error) {
      console.error('Error uploading file:', error)
      toast.error('Failed to upload file')
    } finally {
      setUploading(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = searchTerm === '' || 
      conv.participant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.booking_title?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = filterRole === 'all' || conv.participant_role === filterRole
    
    return matchesSearch && matchesRole
  })

  const getFileIcon = (messageType: string, fileName?: string) => {
    if (messageType === 'image') return <ImageIcon className="h-4 w-4" />
    if (fileName?.endsWith('.pdf')) return <File className="h-4 w-4" />
    return <File className="h-4 w-4" />
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading messages...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 h-[calc(100vh-120px)]">
      <div className="flex h-full gap-4 sm:gap-6 bg-white/60 backdrop-blur rounded-2xl shadow-xl border border-gray-100">
        {/* Conversations Sidebar */}
        <div className="w-72 sm:w-80 flex flex-col border-r border-gray-200 rounded-l-2xl overflow-hidden">
          {/* Enhanced Header */}
          <div className="bg-gradient-to-r from-violet-600 to-purple-600 p-6 text-white sticky top-0 z-10">
            <h1 className="text-2xl font-bold mb-1">Messages</h1>
            <p className="text-violet-100 text-sm mb-3">Stay connected with your clients and providers</p>
            <div className="flex items-center space-x-4 text-xs">
              <div className="flex items-center">
                <MessageSquare className="h-3 w-3 mr-1" />
                <span>{conversations.length} Total</span>
              </div>
              <div className="flex items-center">
                <Eye className="h-3 w-3 mr-1" />
                <span>{conversations.filter(c => c.unread_count > 0).length} Unread</span>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="p-4 space-y-3 border-b border-gray-200 bg-white sticky top-[96px] z-10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="client">Clients</SelectItem>
                <SelectItem value="provider">Providers</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-12 px-4">
                <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No conversations yet</p>
                <p className="text-gray-400 text-sm">Start a conversation to connect with others</p>
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`p-4 border-b border-gray-100 cursor-pointer transition-all hover:bg-gray-50/80 hover:shadow-inner ${
                    selectedConversation?.id === conversation.id
                      ? 'bg-blue-50/80 ring-1 ring-blue-200'
                      : ''
                  }`}
                  onClick={() => setSelectedConversation(conversation)}
                >
                  <div className="flex items-start space-x-3">
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarImage src={conversation.participant_avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                        {conversation.participant_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {conversation.participant_name}
                        </h3>
                        {conversation.unread_count > 0 && (
                          <Badge className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                            {conversation.unread_count}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2 text-xs text-gray-500 mb-2">
                        <Badge 
                          variant="outline" 
                          className={`text-xs px-2 py-1 rounded-full ${
                            conversation.participant_role === 'provider' 
                              ? 'border-blue-200 text-blue-700 bg-blue-50'
                              : conversation.participant_role === 'client'
                              ? 'border-green-200 text-green-700 bg-green-50'
                              : 'border-gray-200 text-gray-700 bg-gray-50'
                          }`}
                        >
                          {conversation.participant_role === 'provider' ? 'Provider' :
                           conversation.participant_role === 'client' ? 'Client' :
                           conversation.participant_role === 'admin' ? 'Admin' : 'User'}
                        </Badge>
                        {conversation.booking_title && (
                          <span className="truncate text-gray-400">• {conversation.booking_title}</span>
                        )}
                      </div>
                      
                      {conversation.last_message && (
                        <p className="text-sm text-gray-600 truncate leading-relaxed">
                          {conversation.last_message}
                        </p>
                      )}
                      
                      <div className="mt-2 text-xs text-gray-400">
                        {conversation.last_message_time ? formatDate(conversation.last_message_time) : 'No messages'}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col border border-gray-100 rounded-2xl bg-white overflow-hidden">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b bg-gradient-to-r from-gray-50 to-white sticky top-0 z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={selectedConversation.participant_avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                        {selectedConversation.participant_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">
                        {selectedConversation.participant_name}
                      </h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Badge 
                          variant="outline" 
                          className={`px-2 py-1 rounded-full ${
                            selectedConversation.participant_role === 'provider' 
                              ? 'border-blue-200 text-blue-700 bg-blue-50'
                              : selectedConversation.participant_role === 'client'
                              ? 'border-green-200 text-green-700 bg-green-50'
                              : 'border-gray-200 text-gray-700 bg-gray-50'
                          }`}
                        >
                          {selectedConversation.participant_role === 'provider' ? 'Provider' :
                           selectedConversation.participant_role === 'client' ? 'Client' :
                           selectedConversation.participant_role === 'admin' ? 'Admin' : 'User'}
                        </Badge>
                        {selectedConversation.booking_title && (
                          <span className="text-gray-400">• {selectedConversation.booking_title}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" className="hover:bg-blue-50 hover:border-blue-200">
                      <Phone className="h-4 w-4 mr-2" />
                      Call
                    </Button>
                    <Button variant="outline" size="sm" className="hover:bg-green-50 hover:border-green-200">
                      <Video className="h-4 w-4 mr-2" />
                      Video
                    </Button>
                    <Button variant="outline" size="sm" className="hover:bg-purple-50 hover:border-purple-200">
                      <Mail className="h-4 w-4 mr-2" />
                      Email
                    </Button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gray-50">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">No messages yet</p>
                    <p className="text-gray-400 text-sm">Start the conversation by sending a message!</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-sm md:max-w-md lg:max-w-xl ${
                        message.sender_id === user.id ? 'order-2' : 'order-1'
                      }`}>
                        <div className={`p-4 rounded-2xl shadow-sm ${
                          message.sender_id === user.id
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                            : 'bg-white text-gray-900 border border-gray-200'
                        }`}>
                          <p className="leading-relaxed">{message.content || message.message}</p>
                        </div>
                        <div className={`text-xs text-gray-400 mt-2 ${
                          message.sender_id === user.id ? 'text-right' : 'text-left'
                        }`}>
                          {formatTime(message.created_at)}
                          {message.sender_id === user.id && message.read_at && (
                            <span className="ml-2 text-blue-500">✓ Read</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 sm:p-5 border-t bg-white sticky bottom-0">
                <div className="flex items-end space-x-3">
                  <div className="flex-1">
                    <Textarea
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                      rows={1}
                      className="resize-none border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="file"
                      id="file-upload"
                      onChange={handleFileUpload}
                      className="hidden"
                      accept="image/*,.pdf,.doc,.docx,.txt"
                      aria-label="Upload file"
                    />
                    <label htmlFor="file-upload">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        disabled={uploading}
                        className="hover:bg-gray-50 hover:border-gray-300"
                        title="Attach file"
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                    </label>
                    
                    <Button 
                      onClick={sendMessage} 
                      disabled={!newMessage.trim() || uploading}
                      className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send
                    </Button>
                  </div>
                </div>
                
                {uploading && (
                  <div className="mt-2 text-sm text-gray-500 flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                    Uploading file...
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
                <p className="text-gray-600">Choose a conversation from the sidebar to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
