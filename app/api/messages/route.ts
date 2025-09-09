import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, getSupabaseAdminClient } from '@/lib/supabase'
import { z } from 'zod'

import { triggerMessageReceived } from '@/lib/notification-triggers-comprehensive'
// Force fresh deployment - Updated: 2024-12-27 15:30 UTC
// Validation schema for message creation
const CreateMessageSchema = z.object({
  receiver_id: z.string().uuid(),
  content: z.string().min(1).max(1000),
  subject: z.string().min(1).max(100),
  booking_id: z.string().uuid().optional()
})

export async function POST(request: NextRequest) {
  try {
    // Use admin client on the server to avoid RLS issues when creating profiles/messages
    const supabase = await getSupabaseAdminClient()

    // Support Authorization: Bearer <token> like the GET handler
    let user: any = null
    let authError: any = null
    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const { data: { user: tokenUser }, error } = await supabase.auth.getUser(token)
      if (tokenUser && !error) {
        user = tokenUser
      } else {
        authError = error
      }
    }
    if (!user) {
      const { data: { user: cookieUser }, error } = await supabase.auth.getUser()
      if (cookieUser && !error) {
        user = cookieUser
      } else {
        authError = error
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', details: authError?.message || 'No user' }, { status: 401 })
    }

    // Ensure sender has a profile
    let { data: senderProfile, error: senderError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', user.id)
      .single()

    if (senderError || !senderProfile) {
      // Create profile for sender if they don't exist
      console.log(`Creating profile for sender: ${user.id}`)
      
      const { data: newSender, error: createSenderError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email || `user-${user.id}@temp.com`,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || `User ${user.id.slice(0, 8)}`,
          role: user.user_metadata?.role || 'client',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' })
        .select('id, full_name')
        .single()

      if (createSenderError) {
        console.error('Error creating sender profile (continuing with fallback):', createSenderError)
      }
      
      senderProfile = newSender
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

    // Validate receiver exists, create profile if needed
    let { data: receiver, error: receiverError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', receiver_id)
      .single()

    if (receiverError || !receiver) {
      // Try to create a profile for the receiver if they don't exist
      console.log(`Creating profile for receiver: ${receiver_id}`)
      
      const { data: newReceiver, error: createError } = await supabase
        .from('profiles')
        .upsert({
          id: receiver_id,
          email: `user-${receiver_id}@temp.com`, // Temporary email
          full_name: `User ${receiver_id.slice(0, 8)}`,
          role: 'client', // Default role
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' })
        .select('id, full_name')
        .single()

      if (createError) {
        console.error('Error creating receiver profile (continuing with fallback):', createError)
      }
      
      receiver = newReceiver
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
      .select('*')
      .single()

    if (messageError) {
      console.error('Message creation error:', messageError)
      return NextResponse.json({ error: 'Failed to create message' }, { status: 500 })
    }

    // Fetch sender and receiver profiles manually
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', [message.sender_id, message.receiver_id])

    if (profilesError) {
      console.error('❌ Profiles fetch error:', profilesError)
      // Instead of returning 500, we'll use fallback data
      console.log('⚠️ Using fallback profile data due to profiles fetch error')
    }

    // Create profile map, with fallback data
    const profileMap = new Map()
    if (profiles) {
      profiles.forEach(profile => {
        profileMap.set(profile.id, profile)
      })
    }

    // Combine message with profile data, using fallbacks when profiles don't exist
    const messageWithProfiles = {
      ...message,
      sender: profileMap.get(message.sender_id) || { 
        full_name: `User ${message.sender_id.slice(0, 8)}`, 
        email: 'unknown@example.com' 
      },
      receiver: profileMap.get(message.receiver_id) || { 
        full_name: `User ${message.receiver_id.slice(0, 8)}`, 
        email: 'unknown@example.com' 
      }
    }

    // Send notification to receiver about new message
    try {
      await triggerMessageReceived(message.id, {
        receiver_id: receiver_id,
        sender_id: user.id,
        sender_name: messageWithProfiles.sender.full_name,
        subject: subject,
        content: content,
        booking_id: booking_id
      })
    } catch (notificationError) {
      console.warn('Failed to send message notification:', notificationError)
      // Non-blocking - don't fail the message creation if notifications fail
    }

    return NextResponse.json({ 
      success: true,
      message: messageWithProfiles,
      status: 'Message sent successfully'
    })

  } catch (error) {
    console.error('Message creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Messages API GET called')
    
    // Extract cookies from the request
    const cookieHeader = request.headers.get('cookie')
    console.log('🔍 Cookie header:', cookieHeader ? 'Present' : 'Missing')
    
    const supabase = await getSupabaseClient()
    console.log('✅ Supabase client obtained')
    
    // Try to get user from cookies first
    let user = null
    let authError = null
    
    if (cookieHeader) {
      // Create a cookies object from the header
      const cookies = Object.fromEntries(
        cookieHeader.split(';').map(cookie => {
          const [name, value] = cookie.trim().split('=')
          return [name, value]
        })
      )
      
      // Try to get the session from cookies
      try {
        const { data: { user: cookieUser }, error: cookieError } = await supabase.auth.getUser()
        if (cookieUser && !cookieError) {
          user = cookieUser
          console.log('✅ User authenticated from cookies:', user.id)
        } else {
          console.log('⚠️ No user found in cookies, trying alternative auth method')
        }
      } catch (cookieAuthError) {
        console.log('⚠️ Cookie auth failed, trying alternative method')
      }
    }
    
    // If no user from cookies, try alternative method
    if (!user) {
      console.log('🔍 Trying alternative authentication method...')
      
      // Try to get user from the request headers (Authorization header)
      const authHeader = request.headers.get('authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        try {
          const { data: { user: tokenUser }, error: tokenError } = await supabase.auth.getUser(token)
          if (tokenUser && !tokenError) {
            user = tokenUser
            console.log('✅ User authenticated from token:', user.id)
          } else {
            authError = tokenError
          }
        } catch (tokenAuthError) {
          authError = tokenAuthError
        }
      } else {
        // Try the standard method as fallback
        const { data: { user: standardUser }, error: standardError } = await supabase.auth.getUser()
        if (standardUser && !standardError) {
          user = standardUser
          console.log('✅ User authenticated from standard method:', user.id)
        } else {
          authError = standardError
        }
      }
    }
    
    if (authError) {
      console.error('❌ Auth error:', authError)
      const errorMessage = authError && typeof authError === 'object' && 'message' in authError 
        ? authError.message 
        : 'Authentication failed'
      return NextResponse.json({ error: 'Authentication failed', details: errorMessage }, { status: 401 })
    }
    
    if (!user) {
      console.log('❌ No user found from any authentication method')
      return NextResponse.json({ error: 'Unauthorized - No valid session found' }, { status: 401 })
    }

    console.log('✅ User authenticated:', user.id)

    // Ensure user has a profile
    let { data: userProfile, error: userProfileError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', user.id)
      .single()

    if (userProfileError || !userProfile) {
      // Create profile for user if they don't exist
      console.log(`Creating profile for user: ${user.id}`)
      
      const { data: newUserProfile, error: createUserError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email || `user-${user.id}@temp.com`,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || `User ${user.id.slice(0, 8)}`,
          role: user.user_metadata?.role || 'client',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id, full_name')
        .single()

      if (createUserError) {
        console.error('Error creating user profile:', createUserError)
        return NextResponse.json({ error: 'Could not create user profile' }, { status: 500 })
      }
      
      userProfile = newUserProfile
    }

    const { searchParams } = new URL(request.url)
    const booking_id = searchParams.get('booking_id')
    const conversation_with = searchParams.get('conversation_with')

    console.log('🔍 Query params:', { booking_id, conversation_with })

    // First get the basic messages
    let query = supabase
      .from('messages')
      .select('*')
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

    console.log('🔍 Executing Supabase query...')
    const { data: messages, error } = await query

    if (error) {
      console.error('❌ Supabase query error:', error)
      return NextResponse.json({ error: 'Failed to fetch messages', details: error.message }, { status: 500 })
    }

    console.log('✅ Messages fetched successfully, count:', messages?.length || 0)

    if (!messages || messages.length === 0) {
      console.log('ℹ️ No messages found, returning empty array')
      return NextResponse.json({ messages: [] })
    }

    // Get unique user IDs from messages
    const userIds = new Set<string>()
    messages.forEach(message => {
      userIds.add(message.sender_id)
      userIds.add(message.receiver_id)
    })

    console.log('🔍 Fetching profiles for user IDs:', Array.from(userIds))

    // Fetch profiles for all users in one query
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', Array.from(userIds))

    if (profilesError) {
      console.error('❌ Profiles fetch error:', profilesError)
      // Instead of returning 500, we'll use fallback data
      console.log('⚠️ Using fallback profile data due to profiles fetch error')
    }

    // Create a map for quick profile lookup, with fallback data
    const profileMap = new Map()
    if (profiles) {
      profiles.forEach(profile => {
        profileMap.set(profile.id, profile)
      })
    }

    // Combine messages with profile data, using fallbacks when profiles don't exist
    const messagesWithProfiles = messages.map(message => {
      const senderProfile = profileMap.get(message.sender_id)
      const receiverProfile = profileMap.get(message.receiver_id)
      
      return {
        ...message,
        sender: senderProfile || { 
          full_name: `User ${message.sender_id.slice(0, 8)}`, 
          email: 'unknown@example.com' 
        },
        receiver: receiverProfile || { 
          full_name: `User ${message.receiver_id.slice(0, 8)}`, 
          email: 'unknown@example.com' 
        }
      }
    })

    console.log('✅ Returning messages with profiles, count:', messagesWithProfiles.length)
    return NextResponse.json({ messages: messagesWithProfiles })

  } catch (error) {
    console.error('❌ Unexpected error in GET method:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
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

// Diagnostic endpoint to test database connectivity
export async function HEAD(request: NextRequest) {
  try {
    console.log('🔍 Messages API HEAD (diagnostic) called')
    
    const supabase = await getSupabaseClient()
    console.log('✅ Supabase client obtained')
    
    // Test basic database connectivity
    const { data: tableInfo, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'messages')
      .limit(1)
    
    if (tableError) {
      console.error('❌ Database connectivity error:', tableError)
      return NextResponse.json({ 
        error: 'Database connectivity failed', 
        details: tableError.message 
      }, { status: 500 })
    }
    
    if (!tableInfo || tableInfo.length === 0) {
      console.error('❌ Messages table not found')
      return NextResponse.json({ 
        error: 'Messages table does not exist',
        available_tables: 'Check database schema'
      }, { status: 404 })
    }
    
    console.log('✅ Messages table exists')
    
    // Test basic query
    const { data: messageCount, error: countError } = await supabase
      .from('messages')
      .select('id', { count: 'exact' })
      .limit(1)
    
    if (countError) {
      console.error('❌ Messages table query error:', countError)
      return NextResponse.json({ 
        error: 'Messages table query failed', 
        details: countError.message 
      }, { status: 500 })
    }
    
    console.log('✅ Messages table is queryable')
    
    return NextResponse.json({ 
      status: 'healthy',
      message: 'Messages API is working correctly',
      database: 'connected',
      messages_table: 'exists and queryable'
    })
    
  } catch (error) {
    console.error('❌ Diagnostic error:', error)
    return NextResponse.json({ 
      error: 'Diagnostic failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
