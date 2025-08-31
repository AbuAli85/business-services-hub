'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { 
  Send,
  User,
  MessageSquare,
  Clock,
  AlertCircle,
  Paperclip,
  Smile,
  Search,
  Filter,
  Download,
  Eye,
  ThumbsUp,
  Heart,
  Star,
  MoreHorizontal,
  FileText,
  Image as ImageIcon,
  File,
  X,
  Plus,
  Lightbulb,
  Zap
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
}

interface MessageAttachment {
  id: string
  name: string
  type: 'image' | 'document' | 'other'
  size: number
  url?: string
}

interface MessageReaction {
  id: string
  emoji: string
  count: number
  users: string[]
}

interface MessagesThreadProps {
  bookingId: string
}

const MESSAGE_TEMPLATES = [
  "Thank you for your booking! We'll start working on it right away.",
  "I have a quick question about your requirements. Could you clarify?",
  "The service is now complete. Please let me know if you need any adjustments.",
  "I'm running a bit behind schedule. I'll keep you updated on the progress.",
  "Here's the updated timeline for your project.",
  "Payment has been received. Thank you!",
  "I've attached the final deliverables. Please review and let me know your thoughts.",
  "Would you like to schedule a follow-up consultation?"
]

export function MessagesThread({ bookingId }: MessagesThreadProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [booking, setBooking] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [showSearch, setShowSearch] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (bookingId && bookingId.trim() !== '') {
      loadUserAndMessages()
    } else {
      setLoading(false)
    }
  }, [bookingId])

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  const loadUserAndMessages = async () => {
    try {
      // Validate bookingId before proceeding
      if (!bookingId || bookingId.trim() === '') {
        console.log('Invalid bookingId, skipping data load')
        setLoading(false)
        return
      }

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
        .select('id, client_id, provider_id')
        .eq('id', bookingId)
        .maybeSingle() // Use maybeSingle instead of single to handle no rows

      if (bookingError) {
        console.error('Error loading booking:', bookingError)
        toast.error('Failed to load booking details')
        return
      }

      if (!bookingData) {
        console.error('Booking not found')
        toast.error('Booking not found')
        return
      }

      setBooking(bookingData)

      // Load client and provider profiles separately
      const { data: clientData, error: clientError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', bookingData.client_id)
        .maybeSingle() // Use maybeSingle instead of single to handle no rows

      const { data: providerData, error: providerError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', bookingData.provider_id)
        .maybeSingle() // Use maybeSingle instead of single to handle no rows

      // Load messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('id, content, sender_id, created_at')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true })

      if (messagesError) {
        console.error('Error loading messages:', messagesError)
        toast.error('Failed to load messages')
        return
      }

      // Load sender profiles separately
      const senderIds = Array.from(new Set(messagesData?.map(m => m.sender_id).filter(Boolean) || []))
      let senderProfiles: any[] = []

      if (senderIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .in('id', senderIds)
        
        if (!profilesError) {
          senderProfiles = profiles || []
        }
      }

      // Transform messages
      const transformedMessages = messagesData?.map((msg: any) => {
        const senderProfile = senderProfiles.find(p => p.id === msg.sender_id)
        return {
          id: msg.id,
          content: msg.content,
          sender_id: msg.sender_id,
          sender_name: senderProfile?.full_name || 'Unknown User',
          sender_role: senderProfile?.role || 'client',
          created_at: msg.created_at,
          is_own_message: msg.sender_id === user.id,
          attachments: [], // Mock attachments for now
          reactions: [] // Mock reactions for now
        }
      }) || []

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
        .select('id, content, sender_id, created_at')
        .maybeSingle() // Use maybeSingle instead of single to handle no rows

      if (error) {
        console.error('Error sending message:', error)
        toast.error('Failed to send message')
        return
      }

      if (!messageData) {
        console.error('Failed to create message')
        toast.error('Failed to create message')
        return
      }

      // Get sender profile for the new message
      const { data: senderProfile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .maybeSingle() // Use maybeSingle instead of single to handle no rows

      // Add message to local state
      const newMsg: Message = {
        id: messageData.id,
        content: messageData.content,
        sender_id: messageData.sender_id,
        sender_name: senderProfile?.full_name || 'Unknown User',
        sender_role: senderProfile?.role || 'client',
        created_at: messageData.created_at,
        is_own_message: true,
        attachments: [],
        reactions: []
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

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value)
    
    // Simulate typing indicator
    if (!isTyping) {
      setIsTyping(true)
    }
    
    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout)
    }
    
    // Set new timeout
    const timeout = setTimeout(() => {
      setIsTyping(false)
    }, 1000)
    
    setTypingTimeout(timeout)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setSelectedFiles(prev => [...prev, ...files])
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const useTemplate = (template: string) => {
    setNewMessage(template)
    setShowTemplates(false)
  }

  const addReaction = (messageId: string, emoji: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        const existingReaction = msg.reactions?.find(r => r.emoji === emoji)
        if (existingReaction) {
          return {
            ...msg,
            reactions: msg.reactions?.map(r => 
              r.emoji === emoji 
                ? { ...r, count: r.count + 1, users: [...r.users, user.id] }
                : r
            )
          }
        } else {
          return {
            ...msg,
            reactions: [...(msg.reactions || []), {
              id: Date.now().toString(),
              emoji,
              count: 1,
              users: [user.id]
            }]
          }
        }
      }
      return msg
    }))
  }

  const filteredMessages = messages.filter(msg =>
    msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    msg.sender_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>Messages</span>
            </CardTitle>
            <CardDescription>
              Chat with {user?.id === booking?.client_id ? 'your provider' : 'your client'}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSearch(!showSearch)}
            >
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTemplates(!showTemplates)}
            >
              <Lightbulb className="h-4 w-4 mr-2" />
              Templates
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div className="mt-4">
            <Input
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
        )}

        {/* Message Templates */}
        {showTemplates && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-3">Quick Message Templates</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {MESSAGE_TEMPLATES.map((template, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => useTemplate(template)}
                  className="justify-start text-left h-auto p-2"
                >
                  <Zap className="h-3 w-3 mr-2 flex-shrink-0" />
                  <span className="text-xs">{template}</span>
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Messages Area */}
        <div className="h-96 border rounded-lg relative">
          <ScrollArea ref={scrollAreaRef} className="h-full p-4">
            {filteredMessages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No messages found</p>
                <p className="text-sm">
                  {searchQuery ? 'Try adjusting your search terms' : 'Start the conversation by sending a message'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredMessages.map((message) => (
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
                          
                          {/* Attachments */}
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {message.attachments.map((attachment) => (
                                <div key={attachment.id} className="flex items-center space-x-2 p-2 bg-black/10 rounded">
                                  {attachment.type === 'image' ? (
                                    <ImageIcon className="h-4 w-4" />
                                  ) : attachment.type === 'document' ? (
                                    <FileText className="h-4 w-4" />
                                  ) : (
                                    <File className="h-4 w-4" />
                                  )}
                                  <span className="text-xs">{attachment.name}</span>
                                  <span className="text-xs opacity-75">({formatFileSize(attachment.size)})</span>
                                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                                    <Download className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {/* Message Info */}
                        <div className={`flex items-center space-x-1 text-xs text-muted-foreground ${
                          message.is_own_message ? 'flex-row-reverse space-x-reverse' : ''
                        }`}>
                          <Clock className="h-3 w-3" />
                          <span>{formatMessageTime(message.created_at)}</span>
                          <span>•</span>
                          <span className="capitalize">{message.sender_role}</span>
                        </div>

                        {/* Reactions */}
                        {message.reactions && message.reactions.length > 0 && (
                          <div className={`flex items-center space-x-1 ${
                            message.is_own_message ? 'justify-end' : 'justify-start'
                          }`}>
                            {message.reactions.map((reaction) => (
                              <Button
                                key={reaction.id}
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-xs"
                                onClick={() => addReaction(message.id, reaction.emoji)}
                              >
                                <span className="mr-1">{reaction.emoji}</span>
                                <span>{reaction.count}</span>
                              </Button>
                            ))}
                          </div>
                        )}

                        {/* Reaction Buttons */}
                        <div className={`flex items-center space-x-1 ${
                          message.is_own_message ? 'justify-end' : 'justify-start'
                        }`}>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => addReaction(message.id, '👍')}
                          >
                            <ThumbsUp className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => addReaction(message.id, '❤️')}
                          >
                            <Heart className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => addReaction(message.id, '⭐')}
                          >
                            <Star className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Typing Indicator */}
          {isTyping && (
            <div className="absolute bottom-4 left-4 bg-gray-100 px-3 py-2 rounded-lg">
              <div className="flex items-center space-x-1">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-xs text-gray-500 ml-2">Typing...</span>
              </div>
            </div>
          )}
        </div>

        {/* File Attachments Preview */}
        {selectedFiles.length > 0 && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Selected Files:</h4>
            <div className="space-y-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-background rounded border">
                  <div className="flex items-center space-x-2">
                    <File className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{file.name}</span>
                    <span className="text-xs text-muted-foreground">({formatFileSize(file.size)})</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message Input */}
        <div className="flex space-x-2">
          <div className="flex-1 relative">
            <Input
              placeholder="Type your message..."
              value={newMessage}
              onChange={handleTyping}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              disabled={sending}
              className="pr-20"
            />
            
            {/* File Upload Button */}
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              <input
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
                accept="image/*,.pdf,.doc,.docx,.txt"
              />
              <label htmlFor="file-upload">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
              </label>
            </div>
          </div>
          
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
                <li>• Attach files when needed (images, documents)</li>
                <li>• Use quick templates for common responses</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
