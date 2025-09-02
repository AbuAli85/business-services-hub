'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { 
  Send,
  MessageSquare,
  Clock,
  Paperclip,
  Smile,
  Search,
  Filter,
  ThumbsUp,
  Heart,
  Star,
  MoreHorizontal,
  FileText,
  Eye,
  Plus,
  Lightbulb,
  Zap,
  Phone,
  Video,
  Settings,
  Download,
  Reply,
  Forward,
  Bookmark
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
  attachments?: MessageAttachment[]
  reactions?: MessageReaction[]
  message_type?: 'text' | 'file' | 'system' | 'template'
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  read_at?: string
  replied_to_id?: string
}

interface MessageAttachment {
  id: string
  file_name: string
  file_size: number
  file_type: string
  file_url: string
}

interface MessageReaction {
  id: string
  user_id: string
  reaction: string
  created_at: string
}

interface EnhancedMessagesThreadProps {
  bookingId: string
  userRole?: 'client' | 'provider'
  otherParty?: {
    id: string
    full_name: string
    avatar_url?: string
    status?: 'online' | 'offline' | 'away'
  }
}

export default function EnhancedMessagesThread({ 
  bookingId, 
  userRole = 'client',
  otherParty 
}: EnhancedMessagesThreadProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [selectedPriority, setSelectedPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal')
  const [isTyping, setIsTyping] = useState(false)
  const [lastSeen, setLastSeen] = useState<string>('')
  const messageInputRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Message templates for different scenarios
  const messageTemplates = {
    greetings: [
      "Hello! I'm excited to work with you on this project.",
      "Hi there! Looking forward to getting started.",
      "Good morning! Hope you're having a great day."
    ],
    updates: [
      "I wanted to give you a quick update on the project progress.",
      "Here's the latest status update on our work.",
      "Just completed a milestone and wanted to share the progress."
    ],
    questions: [
      "I have a few questions about the requirements.",
      "Could you clarify the scope for this deliverable?",
      "When would be a good time to review the current progress?"
    ],
    completion: [
      "The project has been completed successfully!",
      "All deliverables have been finished and are ready for review.",
      "Project completed! Please review and let me know if any revisions are needed."
    ]
  }

  const quickReplies = [
    "Thanks for the update!",
    "Looks great!",
    "I'll review this shortly",
    "Could you provide more details?",
    "Let's schedule a call",
    "Perfect, thank you!"
  ]

  useEffect(() => {
    if (bookingId) {
      loadMessages()
      setupRealtime()
    }
    return () => cleanupRealtime()
  }, [bookingId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadMessages = async () => {
    try {
      setLoadingMessages(true)
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      const { data, error } = await supabase
        .from('booking_messages')
        .select(`
          *,
          reactions:message_reactions(*),
          attachments:message_attachments(*)
        `)
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Get unique sender IDs to fetch sender details
      const senderIds = Array.from(new Set((data || []).map(msg => msg.sender_id)))
      
      // Fetch sender details from profiles table
      const { data: sendersData } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .in('id', senderIds)
      
      // Create a lookup map for sender details
      const sendersMap = (sendersData || []).reduce((acc, sender) => {
        acc[sender.id] = sender
        return acc
      }, {} as Record<string, any>)

      const transformedMessages = (data || []).map(msg => {
        const sender = sendersMap[msg.sender_id] || {}
        return {
          ...msg,
          sender_name: sender.full_name || 'Unknown User',
          sender_role: sender.role || msg.sender_role || userRole,
          is_own_message: msg.sender_id === user.id,
          message_type: msg.message_type || 'text',
          priority: msg.priority || 'normal'
        }
      })

      setMessages(transformedMessages)
      markMessagesAsRead()
      
    } catch (error) {
      console.error('Error loading messages:', error)
      toast.error('Failed to load messages')
    } finally {
      setLoadingMessages(false)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || loadingMessages) return

    try {
      setLoadingMessages(true)
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        toast.error('Please log in to send messages')
        return
      }

      const messageData = {
        booking_id: bookingId,
        content: newMessage.trim(),
        sender_id: user.id,
        sender_role: userRole,
        message_type: 'text',
        priority: selectedPriority,
        created_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('booking_messages')
        .insert(messageData)

      if (error) throw error

      setNewMessage('')
      setSelectedPriority('normal')
      toast.success('Message sent!')
      loadMessages()
      
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    } finally {
      setLoadingMessages(false)
    }
  }

  const sendQuickMessage = (message: string) => {
    setNewMessage(message)
    setTimeout(() => {
      sendMessage()
    }, 100)
  }

  const sendTemplateMessage = (template: string) => {
    setNewMessage(template)
    setShowTemplates(false)
    setTimeout(() => {
      sendMessage()
    }, 100)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const addReaction = async (messageId: string, reaction: string) => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      const { error } = await supabase
        .from('message_reactions')
        .insert({
          message_id: messageId,
          user_id: user.id,
          reaction,
          created_at: new Date().toISOString()
        })

      if (error) throw error
      loadMessages()
      
    } catch (error) {
      console.error('Error adding reaction:', error)
    }
  }

  const markMessagesAsRead = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      const unreadMessages = messages.filter(msg => 
        !msg.is_own_message && !msg.read_at
      )

      if (unreadMessages.length > 0) {
        const messageIds = unreadMessages.map(msg => msg.id)
        
        await supabase
          .from('booking_messages')
          .update({ read_at: new Date().toISOString() })
          .in('id', messageIds)
      }
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }

  const setupRealtime = () => {
    // TODO: Implement real-time subscriptions
  }

  const cleanupRealtime = () => {
    // TODO: Cleanup real-time subscriptions
  }

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
      return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const filteredMessages = messages.filter(msg =>
    (msg.content || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (msg.sender_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm h-[600px] flex flex-col">
      {/* Header with Search and Actions */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={otherParty?.avatar_url} />
              <AvatarFallback className="bg-blue-600 text-white">
                {otherParty?.full_name?.substring(0, 2).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-gray-900">
                {otherParty?.full_name || 'Project Chat'}
              </h3>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  otherParty?.status === 'online' ? 'bg-green-400' : 
                  otherParty?.status === 'away' ? 'bg-yellow-400' : 'bg-gray-400'
                }`}></div>
                <span className="text-sm text-gray-500 capitalize">
                  {otherParty?.status || 'offline'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-blue-600">
              <Phone className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-blue-600">
              <Video className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-blue-600">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 flex-1">
            <Search className="h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Search messages..." 
              className="text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowTemplates(!showTemplates)}
              className="text-gray-600 hover:text-blue-600"
            >
              <Lightbulb className="h-4 w-4 mr-2" />
              Templates
            </Button>
            <Button variant="outline" size="sm" className="text-gray-600 hover:text-blue-600">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {filteredMessages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Start the Conversation</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                Begin discussing your project details, timeline, and requirements.
              </p>
              <div className="flex justify-center space-x-3">
                <Button onClick={() => sendQuickMessage("Hi! I'd like to discuss the project details.")}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Say Hello
                </Button>
                <Button variant="outline" onClick={() => setShowTemplates(true)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Use Template
                </Button>
              </div>
            </div>
          ) : (
            filteredMessages.map((message, index) => (
              <div key={message.id} className={`flex ${message.is_own_message ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-md ${message.is_own_message ? 'order-2' : 'order-1'}`}>
                  {!message.is_own_message && (
                    <div className="flex items-center space-x-2 mb-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="bg-blue-600 text-white text-xs">
                          {message.sender_name?.substring(0, 2).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-gray-700">{message.sender_name}</span>
                      <Badge variant="outline" className="text-xs">
                        {message.sender_role === 'client' ? 'Client' : 'Provider'}
                      </Badge>
                      {message.priority !== 'normal' && (
                        <Badge className={`text-xs ${getPriorityColor(message.priority || 'normal')}`}>
                          {message.priority}
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  <div className={`relative p-4 rounded-2xl shadow-sm group ${
                    message.is_own_message 
                      ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white' 
                      : 'bg-gray-50 border border-gray-200 text-gray-900'
                  }`}>
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    
                    {/* Message Footer */}
                    <div className={`flex items-center justify-between mt-3 pt-2 border-t ${
                      message.is_own_message ? 'border-blue-500/20' : 'border-gray-200'
                    }`}>
                      <span className={`text-xs ${
                        message.is_own_message ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {formatMessageTime(message.created_at)}
                      </span>
                      
                      <div className="flex items-center space-x-2">
                        {message.is_own_message && (
                          <div className="flex items-center space-x-1 text-blue-200">
                            <Eye className="h-3 w-3" />
                            {message.read_at && <span className="text-xs">Read</span>}
                          </div>
                        )}
                        
                        {!message.is_own_message && (
                          <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 w-6 p-0 text-gray-400 hover:text-blue-600"
                              onClick={() => addReaction(message.id, '👍')}
                            >
                              <ThumbsUp className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                              onClick={() => addReaction(message.id, '❤️')}
                            >
                              <Heart className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                            >
                              <Reply className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Templates Panel */}
      {showTemplates && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="mb-3">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Message Templates</h4>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(messageTemplates).map(([category, templates]) => (
                <div key={category}>
                  <h5 className="text-xs font-medium text-gray-700 mb-1 capitalize">{category}</h5>
                  <div className="space-y-1">
                    {templates.slice(0, 2).map((template, index) => (
                      <button
                        key={index}
                        onClick={() => sendTemplateMessage(template)}
                        className="w-full text-left text-xs p-2 bg-white border border-gray-200 rounded hover:border-blue-300 hover:bg-blue-50 transition-colors"
                      >
                        {template.length > 60 ? `${template.substring(0, 60)}...` : template}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <div className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <textarea
              ref={messageInputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className="w-full px-4 py-3 pr-20 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
              rows={2}
              disabled={loadingMessages}
            />
            
            {/* Message Tools */}
            <div className="absolute bottom-3 right-3 flex items-center space-x-2">
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value as any)}
                className="text-xs border border-gray-300 rounded px-2 py-1"
                aria-label="Message priority"
                title="Select message priority level"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              >
                <Smile className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <Button 
            onClick={sendMessage}
            disabled={!newMessage.trim() || loadingMessages}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3"
          >
            {loadingMessages ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send
              </>
            )}
          </Button>
        </div>
        
        {/* Quick Reply Suggestions */}
        <div className="flex flex-wrap gap-2 mt-3">
          {quickReplies.map((reply, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              className="text-xs text-gray-600 hover:text-blue-600 hover:border-blue-300"
              onClick={() => sendQuickMessage(reply)}
            >
              {reply}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
