import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'
import { z } from 'zod'

// Validation schema for booking creation
const CreateBookingSchema = z.object({
  service_id: z.string().uuid(),
  scheduled_date: z.string().datetime(),
  notes: z.string().max(500).optional(),
  service_package_id: z.string().uuid().optional(),
  estimated_duration: z.string().optional(),
  location: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Bookings API POST called')
    
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

    const body = await request.json()
    
    // Validate request body
    const validationResult = CreateBookingSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: validationResult.error.errors 
      }, { status: 400 })
    }

    const { service_id, scheduled_date, notes, service_package_id, estimated_duration, location } = validationResult.data

    // Validate service exists and is active
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select(`
        *,
        provider_id,
        base_price,
        service_packages(*)
      `)
      .eq('id', service_id)
      .eq('status', 'active')
      .single()

    if (serviceError || !service) {
      return NextResponse.json({ error: 'Service not found or inactive' }, { status: 404 })
    }

    // Check if user is trying to book their own service
    if (service.provider_id === user.id) {
      return NextResponse.json({ error: 'Cannot book your own service' }, { status: 400 })
    }

    // Calculate amount based on service package if specified
    let amount = service.base_price
    if (service_package_id) {
      const selectedPackage = service.service_packages?.find((p: { id: string; price: number }) => p.id === service_package_id)
      if (selectedPackage) {
        amount = selectedPackage.price
      }
    }

    // Create booking with approval workflow
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        service_id,
        client_id: user.id,
        provider_id: service.provider_id,
        scheduled_date,
        notes,
        status: 'pending',
        approval_status: 'pending',
        operational_status: 'new',
        amount,
        currency: service.currency || 'OMR',
        payment_status: 'pending',
        estimated_duration,
        location,
        service_package_id
      })
      .select(`
        *,
        services(title, description)
      `)
      .single()

    if (bookingError) {
      console.error('Booking creation error:', bookingError)
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
    }

    // Get client profile data
    const { data: clientProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()

    // Create notification for provider
    await supabase.from('notifications').insert({
      user_id: service.provider_id,
      type: 'booking',
      title: 'New Booking Request',
      message: `New booking request for ${service.title} from ${clientProfile?.full_name || 'Client'}`,
      data: { 
        booking_id: booking.id,
        service_title: service.title,
        client_name: clientProfile?.full_name || 'Client'
      }
    })

    // Update service booking count
    await supabase
      .from('services')
      .update({ 
        bookings_count: (service.bookings_count || 0) + 1 
      })
      .eq('id', service_id)

    return NextResponse.json({ 
      success: true,
      booking,
      message: 'Booking created successfully and sent for approval'
    })

  } catch (error) {
    console.error('Booking creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Bookings API GET called')
    
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

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const role = searchParams.get('role') || 'all'

    // First get the basic bookings data
    let query = supabase
      .from('bookings')
      .select(`
        *,
        services(title, description, category)
      `)
      .order('created_at', { ascending: false })

    // Filter by user role
    if (role === 'client') {
      query = query.eq('client_id', user.id)
    } else if (role === 'provider') {
      query = query.eq('provider_id', user.id)
    } else {
      // Admin or all - check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      
      if (profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    // Filter by status if specified
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: bookings, error } = await query

    if (error) {
      console.error('Error fetching bookings:', error)
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
    }

    // Now enrich the bookings with profile data
    const enrichedBookings = await Promise.all(
      (bookings || []).map(async (booking) => {
        let clientProfile = null
        let providerProfile = null
        
        if (booking.client_id) {
          const { data: clientData } = await supabase
            .from('profiles')
            .select('full_name, email, phone')
            .eq('id', booking.client_id)
            .single()
          clientProfile = clientData
        }
        
        if (booking.provider_id) {
          const { data: providerData } = await supabase
            .from('profiles')
            .select('full_name, email, phone')
            .eq('id', booking.provider_id)
            .single()
          providerProfile = providerData
        }
        
        return {
          ...booking,
          client_profile: clientProfile,
          provider_profile: providerProfile
        }
      })
    )

    return NextResponse.json({ bookings: enrichedBookings })

  } catch (error) {
    console.error('Error fetching bookings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Update booking status (approve, decline, reschedule, complete, cancel)
export async function PATCH(request: NextRequest) {
  try {
    console.log('🔍 Bookings API PATCH called')
    
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

    const body = await request.json()
    const schema = z.object({
      booking_id: z.string().uuid(),
      action: z.enum(['approve', 'decline', 'reschedule', 'complete', 'cancel']),
      scheduled_date: z.string().datetime().optional(),
      reason: z.string().max(500).optional()
    })
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request data', details: parsed.error.errors }, { status: 400 })
    }

    const { booking_id, action, scheduled_date, reason } = parsed.data

    // Fetch booking to validate permissions
    console.log('🔍 API: Fetching booking with ID:', booking_id)
    
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .single()

    console.log('🔍 API: Supabase response:', { data: booking, error: fetchError })

    if (fetchError || !booking) {
      console.error('❌ API: Failed to fetch booking:', fetchError)
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    console.log('✅ API: Booking found:', booking)

    const isClient = booking.client_id === user.id
    const isProvider = booking.provider_id === user.id

    if (!isClient && !isProvider) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let updates: Record<string, any> = {}
    let notification: { user_id: string; title: string; message: string; type: string; priority?: string } | null = null

    switch (action) {
      case 'approve':
        if (!isProvider) return NextResponse.json({ error: 'Only provider can approve' }, { status: 403 })
        updates = { status: 'approved', approval_status: 'approved' }
        notification = { user_id: booking.client_id, title: 'Booking Approved', message: 'Your booking has been approved', type: 'booking' }
        break
      case 'decline':
        if (!isProvider) return NextResponse.json({ error: 'Only provider can decline' }, { status: 403 })
        updates = { status: 'declined', approval_status: 'declined', decline_reason: reason || null }
        notification = { user_id: booking.client_id, title: 'Booking Declined', message: reason ? `Declined: ${reason}` : 'Your booking was declined', type: 'booking' }
        break
      case 'reschedule':
        if (!scheduled_date) return NextResponse.json({ error: 'scheduled_date required' }, { status: 400 })
        if (!isProvider && !isClient) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        updates = { scheduled_date, status: 'rescheduled' }
        notification = { user_id: isProvider ? booking.client_id : booking.provider_id, title: 'Reschedule Proposed', message: `New time proposed: ${new Date(scheduled_date).toLocaleString()}`, type: 'booking' }
        break
      case 'complete':
        if (!isProvider) return NextResponse.json({ error: 'Only provider can complete' }, { status: 403 })
        updates = { status: 'completed', operational_status: 'done' }
        notification = { user_id: booking.client_id, title: 'Service Completed', message: 'Your booking was marked completed', type: 'booking' }
        break
      case 'cancel':
        if (!isClient) return NextResponse.json({ error: 'Only client can cancel' }, { status: 403 })
        updates = { status: 'cancelled', operational_status: 'cancelled', cancel_reason: reason || null }
        notification = { user_id: booking.provider_id, title: 'Booking Cancelled', message: reason ? `Cancelled: ${reason}` : 'Client cancelled booking', type: 'booking' }
        break
    }

    const { data: updated, error: updateError } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', booking_id)
      .select('*')
      .single()

    if (updateError) {
      console.error('❌ Booking update error:', updateError)
      return NextResponse.json({ error: 'Failed to update booking', details: updateError.message }, { status: 500 })
    }

    console.log('✅ Booking updated successfully')

    if (notification) {
      console.log('🔔 Creating notification:', notification)
      try {
        const { error: notificationError } = await supabase.from('notifications').insert({
          user_id: notification.user_id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: { booking_id }
        })
        
        if (notificationError) {
          console.error('⚠️ Notification creation failed (non-critical):', notificationError)
          // Don't fail the entire request if notification fails
        } else {
          console.log('✅ Notification created successfully')
        }
      } catch (notificationInsertError) {
        console.error('⚠️ Notification insert error (non-critical):', notificationInsertError)
        // Don't fail the entire request if notification fails
      }
    }

    console.log('✅ PATCH method completed successfully')
    return NextResponse.json({ success: true, booking: updated })
  } catch (error) {
    console.error('❌ Unexpected error in PATCH method:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    const errorStack = error instanceof Error ? error.stack : 'No stack trace available'
    
    console.error('❌ Error details:', { message: errorMessage, stack: errorStack })
    
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: errorMessage,
      type: 'patch_method_error'
    }, { status: 500 })
  }
}
