import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'
import { z } from 'zod'

// Validation schema for message creation
const CreateMessageSchema = z.object({
  receiver_id: z.string().uuid(),
  content: z.string().min(1).max(1000),
  subject: z.string().min(1).max(100),
  booking_id: z.string().uuid().optional()
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate request body
    const validationResult = CreateMessageSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: validationResult.error.errors 
      }, { status: 400 })
    }

    const { receiver_id, content, subject, booking_id } = validationResult.data

    // Validate receiver exists
    const { data: receiver, error: receiverError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', receiver_id)
      .single()

    if (receiverError || !receiver) {
      return NextResponse.json({ error: 'Receiver not found' }, { status: 404 })
    }

    // Validate booking if specified
    if (booking_id) {
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('client_id, provider_id')
        .eq('id', booking_id)
        .single()

      if (bookingError || !booking) {
        return NextResponse.json({ error: 'Invalid booking' }, { status: 400 })
      }

      // Check if user is participant in the booking
      if (user.id !== booking.client_id && user.id !== booking.provider_id) {
        return NextResponse.json({ error: 'Access denied to this booking' }, { status: 403 })
      }
    }

    // Create message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        receiver_id,
        content,
        subject,
        booking_id,
        read: false,
        created_at: new Date().toISOString()
      })
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(full_name, email),
        receiver:profiles!messages_receiver_id_fkey(full_name, email)
      `)
      .single()

    if (messageError) {
      console.error('Message creation error:', messageError)
      return NextResponse.json({ error: 'Failed to create message' }, { status: 500 })
    }

    // Create notification for receiver
    await supabase.from('notifications').insert({
      user_id: receiver_id,
      type: 'message',
      title: 'New Message',
      message: `New message from ${message.sender.full_name}: ${subject}`,
      metadata: { 
        message_id: message.id, 
        booking_id,
        sender_name: message.sender.full_name
      },
      priority: 'medium'
    })

    return NextResponse.json({ 
      success: true,
      message,
      status: 'Message sent successfully'
    })

  } catch (error) {
    console.error('Message creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const booking_id = searchParams.get('booking_id')
    const conversation_with = searchParams.get('conversation_with')

    let query = supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(full_name, email),
        receiver:profiles!messages_receiver_id_fkey(full_name, email),
        bookings(services(title))
      `)
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: true })

    // Filter by booking if specified
    if (booking_id) {
      query = query.eq('booking_id', booking_id)
    }

    // Filter by conversation partner if specified
    if (conversation_with) {
      query = query.or(`sender_id.eq.${conversation_with},receiver_id.eq.${conversation_with}`)
    }

    const { data: messages, error } = await query

    if (error) {
      console.error('Error fetching messages:', error)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    return NextResponse.json({ messages: messages || [] })

  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Mark message as read
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message_id } = await request.json()

    if (!message_id) {
      return NextResponse.json({ error: 'Message ID required' }, { status: 400 })
    }

    // Update message as read
    const { error } = await supabase
      .from('messages')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', message_id)
      .eq('receiver_id', user.id)

    if (error) {
      console.error('Error marking message as read:', error)
      return NextResponse.json({ error: 'Failed to update message' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error marking message as read:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
