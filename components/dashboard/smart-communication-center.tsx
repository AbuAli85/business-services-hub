'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
// import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { 
  MessageSquare,
  Phone,
  Video,
  Mail,
  Send,
  Paperclip,
  Image,
  Mic,
  Camera,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Star,
  ThumbsUp,
  Heart,
  Share2,
  Download,
  Copy,
  MoreHorizontal,
  Bell,
  BellOff,
  Settings,
  Search,
  Filter,
  Plus,
  Smile,
  FileText,
  MapPin,
  Globe,
  Zap,
  TrendingUp,
  Users,
  Activity,
  Eye,
  EyeOff,
  VolumeX,
  Volume2,
  Maximize,
  Minimize,
  RotateCcw,
  Archive,
  Trash2,
  Edit,
  Reply,
  Forward,
  Bookmark,
  Flag,
  Info,
  X
} from 'lucide-react'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { getSupabaseClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface Message {
  id: string
  content: string
  sender_id: string
  receiver_id: string
  message_type: 'text' | 'voice' | 'video' | 'file' | 'image'
  status: 'sent' | 'delivered' | 'read'
  created_at: string
  updated_at: string
  booking_id?: string
  attachments?: any[]
  priority: 'normal' | 'high' | 'urgent'
  tags?: string[]
  scheduled_send?: string
  sender: {
    id: string
    full_name: string
    avatar_url?: string
    role: string
    status: 'online' | 'away' | 'busy' | 'offline'
    last_seen?: string
  }
}

interface QuickTemplate {
  id: string
  title: string
  content: string
  category: 'greeting' | 'update' | 'question' | 'confirmation' | 'reminder'
  icon: React.ReactNode
}

interface CommunicationStats {
  total_messages: number
  response_rate: number
  avg_response_time: string
  satisfaction_score: number
  preferred_channel: string
  peak_activity_time: string
}

interface SmartCommunicationCenterProps {
  bookingId: string
  otherParty: {
    id: string
    full_name: string
    avatar_url?: string
    role: 'client' | 'provider'
    status: 'online' | 'away' | 'busy' | 'offline' | 'available'
    timezone?: string
    preferred_contact?: string
    response_time?: string
  }
  currentUser: {
    id: string
    full_name: string
    role: 'client' | 'provider'
  }
}

export default function SmartCommunicationCenter({
  bookingId,
  otherParty,
  currentUser
}: SmartCommunicationCenterProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [messageType, setMessageType] = useState<'text' | 'voice' | 'video'>('text')
  const [isTyping, setIsTyping] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeChannel, setActiveChannel] = useState<'message' | 'email' | 'phone' | 'video'>('message')
  const [showTemplates, setShowTemplates] = useState(false)
  const [showScheduler, setShowScheduler] = useState(false)
  const [selectedPriority, setSelectedPriority] = useState<'normal' | 'high' | 'urgent'>('normal')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAttachments, setShowAttachments] = useState(false)
  const [communicationStats, setCommunicationStats] = useState<CommunicationStats | null>(null)
  const [notifications, setNotifications] = useState(true)
  const [autoTranslate, setAutoTranslate] = useState(false)
  const [voiceToText, setVoiceToText] = useState(false)
  const [smartSuggestions, setSmartSuggestions] = useState<string[]>([])

  const quickTemplates: QuickTemplate[] = [
    {
      id: '1',
      title: 'Project Update',
      content: 'Hi! Here\'s a quick update on your project progress. We\'ve completed the initial phase and are moving forward as scheduled.',
      category: 'update',
      icon: <TrendingUp className="h-4 w-4" />
    },
    {
      id: '2',
      title: 'Schedule Meeting',
      content: 'I\'d like to schedule a meeting to discuss the next steps. When would be a good time for you?',
      category: 'question',
      icon: <Calendar className="h-4 w-4" />
    },
    {
      id: '3',
      title: 'Request Information',
      content: 'Could you please provide the additional details we discussed? This will help us move forward more efficiently.',
      category: 'question',
      icon: <Info className="h-4 w-4" />
    },
    {
      id: '4',
      title: 'Confirm Completion',
      content: 'The requested work has been completed successfully. Please review and let me know if you need any adjustments.',
      category: 'confirmation',
      icon: <CheckCircle className="h-4 w-4" />
    },
    {
      id: '5',
      title: 'Thank You',
      content: 'Thank you for your business! It was a pleasure working with you. Please don\'t hesitate to reach out for future projects.',
      category: 'greeting',
      icon: <Heart className="h-4 w-4" />
    }
  ]

  useEffect(() => {
    loadMessages()
    loadCommunicationStats()
    generateSmartSuggestions()
  }, [bookingId])

  const loadMessages = async () => {
    try {
      setLoading(true)
      const supabase = await getSupabaseClient()
      
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!sender_id(id, full_name, avatar_url, role)
        `)
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true })

      if (error) throw error

      const enhancedMessages: Message[] = data.map(msg => ({
        ...msg,
        priority: msg.priority || 'normal',
        status: msg.status || 'sent',
        message_type: msg.message_type || 'text',
        sender: {
          ...msg.sender,
          status: 'online' // This would come from real-time presence
        }
      }))

      setMessages(enhancedMessages)
    } catch (error) {
      console.error('Error loading messages:', error)
      toast.error('Failed to load messages')
    } finally {
      setLoading(false)
    }
  }

  const loadCommunicationStats = async () => {
    // This would typically come from analytics
    const mockStats: CommunicationStats = {
      total_messages: 42,
      response_rate: 95,
      avg_response_time: '< 2 hours',
      satisfaction_score: 4.8,
      preferred_channel: 'Message',
      peak_activity_time: '2:00 PM - 4:00 PM'
    }
    setCommunicationStats(mockStats)
  }

  const generateSmartSuggestions = () => {
    const suggestions = [
      "Schedule a follow-up meeting to review progress",
      "Ask for client feedback on the current deliverables",
      "Provide an estimated completion timeline",
      "Share project documentation and resources"
    ]
    setSmartSuggestions(suggestions)
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return

    try {
      const supabase = await getSupabaseClient()
      
      const messageData = {
        sender_id: currentUser.id,
        receiver_id: otherParty.id,
        content: newMessage,
        message_type: messageType,
        booking_id: bookingId,
        priority: selectedPriority,
        status: 'sent'
      }

      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select(`
          *,
          sender:profiles!sender_id(id, full_name, avatar_url, role)
        `)
        .single()

      if (error) throw error

      const newMsg: Message = {
        ...data,
        sender: {
          ...data.sender,
          status: 'online'
        }
      }

      setMessages(prev => [...prev, newMsg])
      setNewMessage('')
      toast.success('Message sent successfully')

    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    }
  }

  const handleTemplateSelect = (template: QuickTemplate) => {
    setNewMessage(template.content)
    setShowTemplates(false)
  }

  const getStatusColor = (status: string) => {
    const colors = {
      online: 'bg-green-400',
      available: 'bg-green-400',
      away: 'bg-yellow-400',
      busy: 'bg-red-400',
      offline: 'bg-gray-400'
    }
    return colors[status as keyof typeof colors] || colors.offline
  }

  const getPriorityIcon = (priority: string) => {
    const icons = {
      normal: null,
      high: <AlertCircle className="h-3 w-3 text-orange-500" />,
      urgent: <AlertCircle className="h-3 w-3 text-red-500" />
    }
    return icons[priority as keyof typeof icons]
  }

  const formatMessageTime = (timestamp: string) => {
    const date = parseISO(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return format(date, 'HH:mm')
    } else if (diffInHours < 168) { // 7 days
      return format(date, 'EEE HH:mm')
    } else {
      return format(date, 'MMM dd, HH:mm')
    }
  }

  return (
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded-lg shadow-lg">
      
      {/* Communication Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarImage src={otherParty.avatar_url} alt={otherParty.full_name} />
              <AvatarFallback>{otherParty.full_name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(otherParty.status)}`}></div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{otherParty.full_name}</h3>
            <p className="text-sm text-gray-600 capitalize">
              {otherParty.status === 'online' || otherParty.status === 'available' ? 'Online now' : 
               otherParty.status === 'away' ? 'Away' :
               otherParty.status === 'busy' ? 'Busy' : 'Offline'}
              {otherParty.response_time && ` • Responds in ${otherParty.response_time}`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" className="border-green-200 text-green-700 hover:bg-green-50">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="border-blue-200 text-blue-700 hover:bg-blue-50">
            <Video className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="border-gray-200">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Communication Stats (Collapsible) */}
      {communicationStats && (
        <div className="p-3 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-600">Messages</p>
              <p className="font-semibold text-blue-600">{communicationStats.total_messages}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Response Rate</p>
              <p className="font-semibold text-green-600">{communicationStats.response_rate}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Avg Response</p>
              <p className="font-semibold text-purple-600">{communicationStats.avg_response_time}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Satisfaction</p>
              <div className="flex items-center justify-center">
                <Star className="h-3 w-3 text-yellow-400 fill-current mr-1" />
                <p className="font-semibold text-yellow-600">{communicationStats.satisfaction_score}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex space-x-3 animate-pulse">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-16 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Start the conversation</h3>
            <p className="text-gray-600 mb-4">Send your first message to get things started.</p>
            <Button onClick={() => setShowTemplates(true)} variant="outline">
              <Zap className="h-4 w-4 mr-2" />
              Use Template
            </Button>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.sender_id === currentUser.id
            return (
              <div key={message.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex max-w-xs lg:max-w-md space-x-3 ${isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  {!isOwnMessage && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={message.sender.avatar_url} alt={message.sender.full_name} />
                      <AvatarFallback>{message.sender.full_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`relative px-4 py-2 rounded-2xl ${
                    isOwnMessage 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <div className="flex items-center space-x-2 mb-1">
                      {getPriorityIcon(message.priority)}
                      {message.message_type !== 'text' && (
                        <Badge variant="secondary" className="text-xs">
                          {message.message_type}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm">{message.content}</p>
                    <div className={`flex items-center justify-between mt-2 text-xs ${
                      isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      <span>{formatMessageTime(message.created_at)}</span>
                      {isOwnMessage && (
                        <div className="flex items-center space-x-1">
                          {message.status === 'read' && <CheckCircle className="h-3 w-3" />}
                          {message.status === 'delivered' && <CheckCircle className="h-3 w-3 opacity-60" />}
                          {message.status === 'sent' && <Clock className="h-3 w-3 opacity-60" />}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
        
        {isTyping && (
          <div className="flex items-center space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={otherParty.avatar_url} alt={otherParty.full_name} />
              <AvatarFallback>{otherParty.full_name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="bg-gray-100 rounded-2xl px-4 py-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Smart Suggestions */}
      {smartSuggestions.length > 0 && (
        <div className="p-3 border-t border-gray-100 bg-purple-50">
          <p className="text-xs font-medium text-purple-700 mb-2">Smart Suggestions:</p>
          <div className="flex flex-wrap gap-1">
            {smartSuggestions.slice(0, 2).map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => setNewMessage(suggestion)}
                className="text-xs border-purple-200 text-purple-700 hover:bg-purple-100"
              >
                <Zap className="h-3 w-3 mr-1" />
                {suggestion.length > 30 ? suggestion.slice(0, 30) + '...' : suggestion}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Message Input Area */}
      <div className="border-t border-gray-200 p-4 bg-white">
        {/* Message Type Selector */}
        <div className="flex items-center space-x-2 mb-3">
          <div className="flex space-x-1">
            {[
              { type: 'text', icon: <MessageSquare className="h-4 w-4" />, label: 'Text' },
              { type: 'voice', icon: <Mic className="h-4 w-4" />, label: 'Voice' },
              { type: 'video', icon: <Camera className="h-4 w-4" />, label: 'Video' }
            ].map(({ type, icon, label }) => (
              <Button
                key={type}
                variant={messageType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMessageType(type as any)}
                className="text-xs"
              >
                {icon}
                <span className="ml-1 hidden sm:inline">{label}</span>
              </Button>
            ))}
          </div>
          
          <div className="flex-1"></div>
          
          <Select value={selectedPriority} onValueChange={(value: any) => setSelectedPriority(value)}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Input Area */}
        <div className="flex items-end space-x-2">
          <div className="flex-1">
            <Textarea
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              rows={2}
              className="resize-none"
            />
          </div>
          
          <div className="flex flex-col space-y-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTemplates(true)}
              className="border-purple-200 text-purple-700 hover:bg-purple-50"
            >
              <Zap className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAttachments(true)}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </div>
          
          <Button onClick={handleSendMessage} className="bg-blue-600 hover:bg-blue-700">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Quick Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-96 overflow-y-auto">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Quick Templates</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowTemplates(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-gray-600">Choose a template to get started quickly</p>
            </div>
            <div className="p-4 space-y-2">
              {quickTemplates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-2 mb-2">
                    {template.icon}
                    <h4 className="font-medium text-gray-900">{template.title}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {template.category}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{template.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
