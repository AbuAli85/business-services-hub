'use client'

import { useState, useEffect, useRef } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  Filter,
  MoreHorizontal,
  Phone,
  Video,
  Mail,
  User,
  Calendar,
  Clock,
  MessageSquare,
  Trash2,
  Archive,
  Star,
  CheckCircle,
  AlertCircle
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
  message_type: 'text' | 'file' | 'image'
  file_url?: string
  file_name?: string
  file_size?: number
  created_at: string
  read_at?: string
  sender: {
    full_name: string
    avatar_url?: string
    role: string
  }
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

interface Booking {
  id: string
  title: string
  status: string
  scheduled_date: string
  amount: number
  currency: string
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
        .select(`
          id,
          sender_id,
          receiver_id,
          content,
          created_at,
          read_at,
          booking_id,
          sender:profiles!messages_sender_id_fkey (
            full_name,
            avatar_url,
            role
          ),
          receiver:profiles!messages_receiver_id_fkey (
            full_name,
            avatar_url,
            role
          ),
          booking:bookings (
            title,
            status,
            scheduled_date,
            amount,
            currency
          )
        `)
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Process conversations
      const conversationMap = new Map<string, Conversation>()
      
      conversationsData?.forEach((msg) => {
        const isSender = msg.sender_id === userId
        const participantId = isSender ? msg.receiver_id : msg.sender_id
        const participant = isSender ? msg.receiver : msg.sender
        
        if (!conversationMap.has(participantId)) {
          conversationMap.set(participantId, {
            id: participantId,
            participant_id: participantId,
            participant_name: (participant as any)?.full_name || 'Unknown User',
            participant_avatar: (participant as any)?.avatar_url,
            participant_role: (participant as any)?.role || 'user',
            last_message: msg.content,
            last_message_time: msg.created_at,
            unread_count: isSender ? 0 : (msg.read_at ? 0 : 1),
            booking_id: msg.booking_id,
            booking_title: (msg.booking as any)?.title
          })
        } else {
          const existing = conversationMap.get(participantId)!
          if (new Date(msg.created_at) > new Date(existing.last_message_time || '')) {
            existing.last_message = msg.content
            existing.last_message_time = msg.created_at
            if (!isSender && !msg.read_at) {
              existing.unread_count += 1
            }
          }
        }
      })

      setConversations(Array.from(conversationMap.values()))
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
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey (
            full_name,
            avatar_url,
            role
          )
        `)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${conversationId}),and(sender_id.eq.${conversationId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true })

      if (error) throw error

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
          booking_id: selectedConversation.booking_id,
          message_type: 'text'
        })
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey (
            full_name,
            avatar_url,
            role
          )
        `)
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
          content: `Sent a ${messageType}`,
          sender_id: user.id,
          receiver_id: selectedConversation.participant_id,
          booking_id: selectedConversation.booking_id,
          message_type: messageType,
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size
        })
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey (
            full_name,
            avatar_url,
            role
          )
        `)
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

  const getMessageTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return formatTime(timestamp)
    } else {
      return formatDate(timestamp)
    }
  }

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
    <div className="container mx-auto p-6 h-[calc(100vh-120px)]">
      <div className="flex h-full space-x-6">
        {/* Conversations Sidebar */}
        <div className="w-80 flex flex-col">
          {/* Header */}
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
            <p className="text-gray-600">Stay connected with your clients and providers</p>
          </div>

          {/* Search and Filters */}
          <div className="space-y-3 mb-4">
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
              <SelectTrigger>
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
          <div className="flex-1 overflow-y-auto space-y-2">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No conversations yet</p>
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-all ${
                    selectedConversation?.id === conversation.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedConversation(conversation)}
                >
                  <div className="flex items-start space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={conversation.participant_avatar} />
                      <AvatarFallback>
                        {conversation.participant_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium text-gray-900 truncate">
                          {conversation.participant_name}
                        </h3>
                        {conversation.unread_count > 0 && (
                          <Badge className="bg-blue-500 text-white text-xs">
                            {conversation.unread_count}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2 text-xs text-gray-500 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {conversation.participant_role}
                        </Badge>
                        {conversation.booking_title && (
                          <span className="truncate">• {conversation.booking_title}</span>
                        )}
                      </div>
                      
                      {conversation.last_message && (
                        <p className="text-sm text-gray-600 truncate">
                          {conversation.last_message}
                        </p>
                      )}
                      
                      {conversation.last_message_time && (
                        <p className="text-xs text-gray-400 mt-1">
                          {getMessageTime(conversation.last_message_time)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col border rounded-lg">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedConversation.participant_avatar} />
                      <AvatarFallback>
                        {selectedConversation.participant_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {selectedConversation.participant_name}
                      </h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Badge variant="outline">
                          {selectedConversation.participant_role}
                        </Badge>
                        {selectedConversation.booking_title && (
                          <span>• {selectedConversation.booking_title}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Phone className="h-4 w-4 mr-2" />
                      Call
                    </Button>
                    <Button variant="outline" size="sm">
                      <Video className="h-4 w-4 mr-2" />
                      Video
                    </Button>
                    <Button variant="outline" size="sm">
                      <Mail className="h-4 w-4 mr-2" />
                      Email
                    </Button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No messages yet</p>
                    <p className="text-sm text-gray-500">Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs lg:max-w-md ${
                        message.sender_id === user.id ? 'order-2' : 'order-1'
                      }`}>
                        <div className={`p-3 rounded-lg ${
                          message.sender_id === user.id
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}>
                          {message.message_type === 'text' ? (
                            <p>{message.content}</p>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                {getFileIcon(message.message_type, message.file_name)}
                                <span className="font-medium">{message.file_name}</span>
                              </div>
                              <p className="text-sm opacity-80">
                                {(message.file_size || 0) / 1024 / 1024 > 1
                                  ? `${((message.file_size || 0) / 1024 / 1024).toFixed(2)} MB`
                                  : `${Math.round((message.file_size || 0) / 1024)} KB`
                                }
                              </p>
                              {message.file_url && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(message.file_url, '_blank')}
                                  className="w-full"
                                >
                                  Download File
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className={`text-xs text-gray-500 mt-1 ${
                          message.sender_id === user.id ? 'text-right' : 'text-left'
                        }`}>
                          {getMessageTime(message.created_at)}
                          {message.read_at && (
                            <CheckCircle className="h-3 w-3 inline ml-1 text-blue-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t">
                <div className="flex items-end space-x-2">
                  <div className="flex-1">
                    <Textarea
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                      rows={1}
                      className="resize-none"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="file"
                      id="file-upload"
                      onChange={handleFileUpload}
                      className="hidden"
                      accept="image/*,.pdf,.doc,.docx,.txt"
                    />
                    <label htmlFor="file-upload">
                      <Button variant="outline" size="sm" disabled={uploading}>
                        <Paperclip className="h-4 w-4" />
                      </Button>
                    </label>
                    
                    <Button onClick={sendMessage} disabled={!newMessage.trim() || uploading}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
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
