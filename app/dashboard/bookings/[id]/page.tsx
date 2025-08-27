'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { getSupabaseClient } from '@/lib/supabase'
import { realtimeManager } from '@/lib/realtime'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/lib/utils'
import { Calendar, MessageSquare, HelpCircle, FileText, Star, ArrowLeft } from 'lucide-react'

export default function BookingTicketPage() {
  const params = useParams()
  const router = useRouter()
  const bookingId = params.id as string
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [qaQuestion, setQaQuestion] = useState('')
  const [userId, setUserId] = useState<string>('')
  const [rating, setRating] = useState<number>(5)
  const [reviewText, setReviewText] = useState('')

  useEffect(() => {
    if (!bookingId) return
    ;(async () => {
      try {
        const supabase = await getSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/auth/sign-in'); return }
        setUserId(user.id)

        const { data: b, error: bookingError } = await supabase
          .from('bookings')
          .select(`
            *,
            services(title),
            client_profile:profiles!client_id(full_name, email),
            provider_profile:profiles!provider_id(full_name, email)
          `) 
          .eq('id', bookingId)
          .single()
        
        if (bookingError) {
          console.error('Error fetching booking:', bookingError)
          toast.error('Failed to load booking details')
          return
        }
        
        setBooking(b)

        // Fetch messages from our API instead of external API
        try {
          const res = await fetch(`/api/messages?booking_id=${bookingId}`)
          if (res.ok) {
            const json = await res.json()
            setMessages(json.messages || [])
          } else {
            console.error('Failed to fetch messages:', res.status)
          }
        } catch (error) {
          console.error('Error fetching messages:', error)
        }
        
        setLoading(false)

        // Realtime: new messages for this booking
        try {
          await realtimeManager.subscribeToMessages(user.id, (msg: any) => {
            setMessages(prev => [...prev, msg])
            toast.success('New message')
          })
        } catch (error) {
          console.error('Failed to subscribe to messages:', error)
        }
      } catch (error) {
        console.error('Error in useEffect:', error)
        setLoading(false)
      }
    })()
  }, [bookingId])

  const sendChat = async () => {
    if (!newMessage.trim() || !booking) return
    const receiver = userId === booking.client_id ? booking.provider_id : booking.client_id
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        receiver_id: receiver,
        content: newMessage.trim(),
        subject: `Chat about booking ${bookingId}`,
        booking_id: bookingId,
      })
    })
    const json = await res.json()
    if (res.ok) {
      setMessages(prev => [...prev, json.message])
      setNewMessage('')
      toast.success('Message sent')
    }
  }

  const askQuestion = async () => {
    if (!qaQuestion.trim()) return
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        receiver_id: booking.provider_id,
        content: `[Q&A] ${qaQuestion.trim()}`,
        subject: `Question on booking ${bookingId}`,
        booking_id: bookingId,
      })
    })
    const json = await res.json()
    if (res.ok) {
      setMessages(prev => [...prev, json.message])
      setQaQuestion('')
      toast.success('Question sent')
    }
  }

  const submitReview = async () => {
    if (!reviewText.trim() || !booking) return
    try {
      const supabase = await getSupabaseClient()
      const { error } = await supabase
        .from('reviews')
        .insert({
          booking_id: bookingId,
          service_id: booking.service_id,
          reviewer_id: userId,
          rating,
          comment: reviewText.trim(),
        })
      if (error) throw error
      toast.success('Review submitted')
      setReviewText('')
    } catch (e) {
      console.error(e)
      toast.error('Failed to submit review')
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="p-6">
        <Button variant="outline" onClick={() => router.back()} className="mb-4"><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
        <Card>
          <CardHeader><CardTitle>Booking not found</CardTitle></CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="h-4 w-4 mr-2" />Back to Bookings</Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Ticket • {booking.services?.title || 'Service'}</span>
            <Badge>{booking.status}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Client</div>
              <div className="font-medium">{booking.client_profile?.full_name || 'Client'}</div>
            </div>
            <div>
              <div className="text-gray-500">Provider</div>
              <div className="font-medium">{booking.provider_profile?.full_name || 'Provider'}</div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <div>{new Date(booking.scheduled_date).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-gray-500">Amount</div>
              <div className="font-medium">{formatCurrency(booking.amount || 0, booking.currency || 'OMR')}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="qa">Q&A</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="review">Review</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardContent className="p-4">
              <div className="text-gray-700 whitespace-pre-line">{booking.notes || 'No additional notes provided.'}</div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chat">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="space-y-2 max-h-80 overflow-auto">
                {messages.map((m) => (
                  <div key={m.id} className="p-2 rounded border">
                    <div className="text-sm text-gray-500">{m.sender?.full_name} • {new Date(m.created_at).toLocaleString()}</div>
                    <div>{m.content}</div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message" />
                <Button onClick={sendChat}><MessageSquare className="h-4 w-4 mr-2" />Send</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qa">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex gap-2">
                <Input value={qaQuestion} onChange={(e) => setQaQuestion(e.target.value)} placeholder="Ask a question" />
                <Button onClick={askQuestion}><HelpCircle className="h-4 w-4 mr-2" />Ask</Button>
              </div>
              <div className="space-y-2 max-h-80 overflow-auto">
                {messages.filter(m => (m.content || '').startsWith('[Q&A]')).map(m => (
                  <div key={m.id} className="p-2 rounded border">
                    <div className="text-sm text-gray-500">{m.sender?.full_name} • {new Date(m.created_at).toLocaleString()}</div>
                    <div>{m.content.replace('[Q&A] ', '')}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files">
          <Card>
            <CardContent className="p-4 text-gray-500">
              File sharing coming soon.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="review">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="text-gray-600 text-sm">Leave a review after completion</div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Rating:</span>
                <Input type="number" min={1} max={5} value={rating} onChange={(e) => setRating(Number(e.target.value))} className="w-20" />
                <Star className="h-4 w-4 text-amber-500" />
              </div>
              <Textarea placeholder="Write your review..." value={reviewText} onChange={(e) => setReviewText(e.target.value)} />
              <div className="flex justify-end">
                <Button onClick={submitReview}><Star className="h-4 w-4 mr-2" />Submit Review</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}


