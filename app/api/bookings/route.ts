import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, getSupabaseAdminClient } from '@/lib/supabase'
import { ProgressDataService } from '@/lib/progress-data-service'
import { z } from 'zod'

import { 
  triggerBookingCreated,
  triggerBookingApproved
} from '@/lib/notification-triggers-simple'
import { createNotification } from '@/lib/notification-service'
// CORS headers for cross-domain access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Allow all origins in production, or use process.env.NEXT_PUBLIC_ALLOWED_ORIGINS
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
}

// Handle preflight OPTIONS request
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  })
}

// Validation schema for booking creation
const CreateBookingSchema = z.object({
  service_id: z.string().uuid(),
  scheduled_date: z.string().datetime(),
  notes: z.string().max(500).optional(),
  service_package_id: z.string().uuid().optional(),
  estimated_duration: z.string().optional(),
  location: z.string().optional()
})

// Helper function to authenticate user
async function authenticateUser(request: NextRequest) {
  let user = null
  let authError = null
  
  try {
    // Use admin client for server-side authentication
    const supabase = await getSupabaseAdminClient()
    
    // Get cookies from the request
    const cookieHeader = request.headers.get('cookie')
    console.log('🔍 Cookie header present:', !!cookieHeader)
    
    // Try to get user from Authorization header first
    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      console.log('🔍 Bearer token found, length:', token.length)
      try {
        // Verify the JWT token
        const { data: { user: tokenUser }, error: tokenError } = await supabase.auth.getUser(token)
        if (tokenUser && !tokenError) {
          user = tokenUser
          console.log('✅ User authenticated from token:', user.id)
          return { user, authError }
        } else {
          console.log('❌ Token auth failed:', tokenError)
          authError = tokenError
        }
      } catch (tokenAuthError) {
        console.log('❌ Token auth exception:', tokenAuthError)
        authError = tokenAuthError
      }
    }
    
    // If no Authorization header, try to extract session from cookies
    if (!user && cookieHeader) {
      try {
        // Extract access token from cookies
        const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=')
          acc[key] = value
          return acc
        }, {} as Record<string, string>)
        
        console.log('🔍 Available cookies:', Object.keys(cookies))
        
        // Try multiple possible cookie names for Supabase auth tokens
        const possibleTokenKeys = [
          'sb-access-token',
          'supabase-auth-token', 
          'sb-access-token',
          'supabase.auth.token',
          'sb-' + (process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0] || 'default') + '-auth-token'
        ]
        
        let accessToken = null
        for (const key of possibleTokenKeys) {
          if (cookies[key]) {
            accessToken = cookies[key]
            console.log('🔍 Found token in cookie:', key)
            break
          }
        }
        
        if (accessToken) {
          console.log('🔍 Access token found in cookies, length:', accessToken.length)
          const { data: { user: cookieUser }, error: cookieError } = await supabase.auth.getUser(accessToken)
          if (cookieUser && !cookieError) {
            user = cookieUser
            console.log('✅ User authenticated from cookies:', user.id)
            return { user, authError }
          } else {
            console.log('❌ Cookie auth failed:', cookieError)
            authError = cookieError
          }
        } else {
          console.log('❌ No access token found in any expected cookie')
        }
      } catch (cookieError) {
        console.log('❌ Cookie parsing error:', cookieError)
        authError = cookieError
      }
    }
    
    if (!user) {
      console.log('⚠️ No valid authentication found')
      authError = new Error('Auth session missing!')
    }
    
  } catch (error) {
    console.log('❌ Authentication error:', error)
    authError = error
  }
  
  return { user, authError }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Bookings API POST called')
    console.log('🔍 Environment check:', {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      nodeEnv: process.env.NODE_ENV
    })
    
    const { user, authError } = await authenticateUser(request)
    
    if (authError || !user) {
      console.error('❌ Auth error:', authError)
      const errorMessage = authError && typeof authError === 'object' && 'message' in authError 
        ? authError.message 
        : 'Authentication failed'
      const response = NextResponse.json({ error: 'Authentication failed', details: errorMessage }, { status: 401 })
      Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }
    
    console.log('🔍 Attempting to get Supabase admin client...')
    const supabase = await getSupabaseAdminClient()
    console.log('✅ Supabase admin client obtained')
    
    // Test database connection
    console.log('🔍 Testing database connection...')
    const { data: testData, error: testError } = await supabase
      .from('services')
      .select('id')
      .limit(1)
    
    if (testError) {
      console.error('❌ Database connection test failed:', testError)
      const response = NextResponse.json({ 
        error: 'Database connection failed', 
        details: testError.message,
        type: 'database_connection_error'
      }, { status: 500 })
      Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }
    console.log('✅ Database connection test passed')

    console.log('✅ User authenticated:', user.id)

    const body = await request.json()
    
    // Validate request body
    const validationResult = CreateBookingSchema.safeParse(body)
    if (!validationResult.success) {
      const response = NextResponse.json({ 
        error: 'Invalid request data', 
        details: validationResult.error.errors 
      }, { status: 400 })
      Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
      return response
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
      const response = NextResponse.json({ error: 'Service not found or inactive' }, { status: 404 })
      Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }

    // Check if user is trying to book their own service
    if (service.provider_id === user.id) {
      const response = NextResponse.json({ error: 'Cannot book your own service' }, { status: 400 })
      Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
      return response
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
        title: service.title || 'Service Booking',
        scheduled_date,
        start_time: scheduled_date, // Use scheduled_date as start_time
        end_time: new Date(new Date(scheduled_date).getTime() + 2 * 60 * 60 * 1000).toISOString(), // Add 2 hours for end_time
        notes,
        status: 'pending',
        approval_status: 'pending',
        operational_status: 'new',
        amount,
        currency: service.currency || 'OMR',
        payment_status: 'pending',
        estimated_duration,
        location,
        total_price: amount, // Add required total_price field (matches existing schema)
        total_amount: amount // Add required total_amount field (for webhook trigger)
      })
      .select(`
        *,
        services(title, description)
      `)
      .single()

    if (bookingError) {
      console.error('❌ Booking creation error:', bookingError)
      console.error('❌ Booking data being inserted:', {
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
      console.error('❌ Service data:', {
        id: service.id,
        title: service.title,
        provider_id: service.provider_id,
        base_price: service.base_price,
        currency: service.currency
      })
      
      const response = NextResponse.json({ 
        error: 'Failed to create booking', 
        details: bookingError.message,
        type: 'booking_creation_error',
        debug: {
          bookingError: bookingError,
          serviceId: service_id,
          userId: user.id,
          providerId: service.provider_id
        }
      }, { status: 500 })
      Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
      return response
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
      type: 'booking_created',
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

    // Send notifications for booking creation
    try {
      // Notify both client and provider about the new booking
      await triggerBookingCreated(booking.id, {
        client_id: user.id,
        client_name: clientProfile?.full_name || 'Client',
        provider_id: service.provider_id,
        provider_name: service.provider?.full_name || 'Service Provider',
        service_name: service.title,
        booking_title: booking.title,
        scheduled_date: booking.scheduled_date,
        total_amount: booking.amount,
        currency: booking.currency
      })
    } catch (notificationError) {
      console.warn('Failed to send booking notifications:', notificationError)
      // Non-blocking - don't fail the booking if notifications fail
    }

    // Generate monthly milestones from service templates via application logic
    try {
      await ProgressDataService.generateMonthlyMilestonesForBooking(booking.id)
      console.log('✅ Monthly milestones generated for booking:', booking.id)
    } catch (milestoneError) {
      console.warn('⚠️ Error generating monthly milestones:', milestoneError)
      // Non-blocking
    }

    const response = NextResponse.json({ 
      success: true,
      booking,
      message: 'Booking created successfully and sent for approval'
    })
    Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
    return response

  } catch (error) {
    console.error('❌ Booking creation error:', error)
    console.error('❌ Error type:', typeof error)
    console.error('❌ Error message:', error instanceof Error ? error.message : 'Unknown error')
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    const errorType = error instanceof Error ? error.constructor.name : typeof error
    
    const response = NextResponse.json({ 
      error: 'Internal server error', 
      details: errorMessage,
      type: errorType,
      timestamp: new Date().toISOString()
    }, { status: 500 })
    Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
    return response
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Bookings API GET called')
    
    const { user, authError } = await authenticateUser(request)
    
    if (authError || !user) {
      console.error('❌ Auth error:', authError)
      const errorMessage = authError && typeof authError === 'object' && 'message' in authError 
        ? authError.message 
        : 'Authentication failed'
      const response = NextResponse.json({ error: 'Authentication failed', details: errorMessage }, { status: 401 })
      Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }
    
    const supabase = await getSupabaseAdminClient()
    console.log('✅ Supabase admin client obtained')

    console.log('✅ User authenticated:', user.id)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const role = searchParams.get('role') || 'all'
    const bookingId = searchParams.get('bookingId')

    // First get the basic bookings data
    let query = supabase
      .from('bookings')
      .select(`
        *,
        services(title, description, category)
      `)
      .order('created_at', { ascending: false })

    // If specific booking ID is requested, filter by it
    if (bookingId) {
      query = query.eq('id', bookingId)
    }

    // Get user profile to determine role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_admin')
      .eq('id', user.id)
      .single()
    
    const userRole = profile?.is_admin ? 'admin' : (profile?.role || user.user_metadata?.role || 'client')
    
    // Filter by user role - but if specific booking is requested, check access differently
    if (bookingId) {
      // For specific booking requests, check if user has access to this booking
      if (userRole === 'client') {
        query = query.eq('client_id', user.id)
      } else if (userRole === 'provider') {
        query = query.eq('provider_id', user.id)
      } else if (userRole !== 'admin') {
        // Check if user has access to this specific booking
        query = query.or(`client_id.eq.${user.id},provider_id.eq.${user.id}`)
      }
      // Admin can access any booking
    } else {
      // Regular role-based filtering for listing bookings
      if (role === 'client' || (role === 'all' && userRole === 'client')) {
        query = query.eq('client_id', user.id)
      } else if (role === 'provider' || (role === 'all' && userRole === 'provider')) {
        query = query.eq('provider_id', user.id)
      } else if (role === 'admin' || (role === 'all' && userRole === 'admin')) {
        // Admin can see all bookings - no additional filter needed
        if (userRole !== 'admin') {
          const response = NextResponse.json({ error: 'Access denied' }, { status: 403 })
          Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
          return response
        }
      } else {
        // Default to user's own bookings based on their role
        if (userRole === 'client') {
          query = query.eq('client_id', user.id)
        } else if (userRole === 'provider') {
          query = query.eq('provider_id', user.id)
        } else if (userRole !== 'admin') {
          const response = NextResponse.json({ error: 'Access denied' }, { status: 403 })
          Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
          return response
        }
      }
    }

    // Filter by status if specified
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: bookings, error } = await query

    if (error) {
      console.error('Error fetching bookings:', error)
      const response = NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
      Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
      return response
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

    const response = NextResponse.json({ bookings: enrichedBookings })
    Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
    return response

  } catch (error) {
    console.error('Error fetching bookings:', error)
    const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
    return response
  }
}

// Update booking status (approve, decline, reschedule, complete, cancel)
export async function PATCH(request: NextRequest) {
  try {
    console.log('🔍 Bookings API PATCH called')
    console.log('🔍 API: Request URL:', request.url)
    console.log('🔍 API: Request method:', request.method)
    console.log('🔍 API: Request headers:', Object.fromEntries(request.headers.entries()))
    
    const { user, authError } = await authenticateUser(request)
    
    if (authError || !user) {
      console.error('❌ Auth error:', authError)
      const errorMessage = authError && typeof authError === 'object' && 'message' in authError 
        ? authError.message 
        : 'Authentication failed'
      const response = NextResponse.json({ error: 'Authentication failed', details: errorMessage }, { status: 401 })
      Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }
    
    const supabase = await getSupabaseAdminClient()
    console.log('✅ Supabase admin client obtained')

    console.log('✅ User authenticated:', user.id)
    console.log('🔍 API: Full user object:', JSON.stringify(user, null, 2))
    console.log('🔍 API: User metadata:', user.user_metadata)
    console.log('🔍 API: User role:', user.user_metadata?.role)
    console.log('🔍 API: User email:', user.email)

    const body = await request.json()
    const schema = z.object({
      booking_id: z.string().uuid(),
      action: z.enum(['approve', 'decline', 'reschedule', 'complete', 'cancel']),
      scheduled_date: z.string().datetime().optional(),
      reason: z.string().max(500).optional()
    })
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      const response = NextResponse.json({ error: 'Invalid request data', details: parsed.error.errors }, { status: 400 })
      Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }

    const { booking_id, action, scheduled_date, reason } = parsed.data

    // Fetch booking to validate permissions
    console.log('🔍 API: Fetching booking with ID:', booking_id)
    console.log('🔍 API: User ID:', user.id)
    console.log('🔍 API: User Role:', user.user_metadata?.role || 'unknown')
    console.log('🔍 API: Request body:', body)
    
    // First, let's check what bookings exist for this user
    console.log('🔍 API: Checking user bookings with user ID:', user.id)
    
    // Try different query approaches to debug the issue
    const { data: userBookings, error: userBookingsError } = await supabase
      .from('bookings')
      .select('id, client_id, provider_id, status, title')
      .or(`client_id.eq.${user.id},provider_id.eq.${user.id}`)
    
    console.log('🔍 API: User bookings found:', userBookings)
    console.log('🔍 API: User bookings error:', userBookingsError)
    
    // Also try a simple count query to see if there are any bookings at all
    const { count: totalBookingsCount, error: countError } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
    
    console.log('🔍 API: Total bookings in database:', totalBookingsCount)
    console.log('🔍 API: Count error:', countError)
    
    // Try to get any booking to see if the table is accessible
    const { data: anyBooking, error: anyError } = await supabase
      .from('bookings')
      .select('id, client_id, provider_id, status')
      .limit(1)
    
    console.log('🔍 API: Any booking found:', anyBooking)
    console.log('🔍 API: Any booking error:', anyError)
   
    // Now try to fetch the specific booking
    console.log('🔍 API: Attempting to fetch specific booking:', booking_id)
    
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .single()
    
    console.log('🔍 API: Supabase response:', { data: booking, error: fetchError })
    console.log('🔍 API: Booking data:', booking)
    console.log('🔍 API: Fetch error:', fetchError)
    
    // Also try without .single() to see if the booking exists at all
    const { data: bookingMaybe, error: fetchMaybeError } = await supabase
      .from('bookings')
      .select('id, client_id, provider_id, status')
      .eq('id', booking_id)
    
    console.log('🔍 API: Maybe booking response:', { data: bookingMaybe, error: fetchMaybeError })

    if (fetchError || !booking) {
      console.error('❌ API: Failed to fetch booking:', fetchError)
      console.error('❌ API: Booking ID requested:', booking_id)
      console.error('❌ API: User ID:', user.id)
      
      // Try to check if the booking exists at all
      const { data: allBookings, error: listError } = await supabase
        .from('bookings')
        .select('id, client_id, provider_id, status, created_at, title')
        .limit(10)
      
      console.log('🔍 API: Sample bookings in database:', allBookings)
      console.log('🔍 API: List error:', listError)
      
      // Also check if there are any bookings at all
      const { count: totalBookings, error: countError } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
      
      console.log('🔍 API: Total bookings in database:', totalBookings)
      console.log('🔍 API: Count error:', countError)
      
      // Check if the booking ID exists but belongs to a different user
      const { data: anyBooking, error: anyBookingError } = await supabase
        .from('bookings')
        .select('id, client_id, provider_id')
        .eq('id', booking_id)
        .maybeSingle()
      
      if (anyBooking) {
        console.log('🔍 API: Booking exists but belongs to different user:', anyBooking)
        const response = NextResponse.json({ 
          error: 'Booking not found or access denied',
          details: 'The booking exists but you do not have permission to access it',
          debug: {
            requested_booking_id: booking_id,
            user_id: user.id,
            user_role: user.user_metadata?.role,
            existing_booking: anyBooking
          }
        }, { status: 404 })
        Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
        return response
      }
      
      console.log('🔍 API: No booking found with ID:', booking_id)
      console.log('🔍 API: Available user bookings:', userBookings?.map(b => ({ id: b.id, title: b.title, status: b.status })))
      
      const response = NextResponse.json({ 
        error: 'Booking not found', 
        details: 'The specified booking ID does not exist in the database',
        debug: {
          requested_booking_id: booking_id,
          user_id: user.id,
          user_role: user.user_metadata?.role,
          available_bookings: userBookings?.map(b => ({ id: b.id, title: b.title, status: b.status })),
          total_user_bookings: userBookings?.length || 0,
          database_sample: allBookings?.slice(0, 3).map(b => ({ id: b.id, title: b.title || 'No title', status: b.status, created_at: b.created_at })),
          user_context: {
            user_id: user.id,
            user_email: user.email,
            user_role: user.user_metadata?.role,
            user_metadata: user.user_metadata
          },
          database_connection: {
            total_bookings: totalBookings,
            any_booking: anyBooking,
            user_bookings_error: userBookingsError
          }
        }
      }, { status: 404 })
      Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }

    console.log('✅ API: Booking found:', booking)

    const isClient = booking.client_id === user.id
    const isProvider = booking.provider_id === user.id

    if (!isClient && !isProvider) {
      const response = NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }

    let updates: Record<string, any> = {}
    let notification: { user_id: string; title: string; message: string; type: string; priority?: string } | null = null

    console.log(`Processing ${action} action for booking ${booking_id}`)
    console.log('User role check:', { isProvider, isClient })
    console.log('Current booking status:', booking.status)

    switch (action) {
      case 'approve':
        if (!isProvider) {
          console.log('Approval denied: User is not a provider')
          return NextResponse.json({ error: 'Only provider can approve' }, { status: 403 })
        }
        updates = { status: 'approved', approval_status: 'approved' }
        notification = { user_id: booking.client_id, title: 'Booking Approved', message: 'Your booking has been approved', type: 'booking_approved' }
        console.log('Approval updates:', updates)
        break
      case 'decline':
        if (!isProvider) {
          console.log('Decline denied: User is not a provider')
          return NextResponse.json({ error: 'Only provider can decline' }, { status: 403 })
        }
        updates = { status: 'declined', approval_status: 'rejected', decline_reason: reason || null }
        notification = { user_id: booking.client_id, title: 'Booking Declined', message: reason ? `Declined: ${reason}` : 'Your booking was declined', type: 'booking_cancelled' }
        console.log('Decline updates:', updates)
        break
      case 'reschedule':
        if (!scheduled_date) return NextResponse.json({ error: 'scheduled_date required' }, { status: 400 })
        if (!isProvider && !isClient) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        updates = { scheduled_date, status: 'rescheduled' }
        notification = { user_id: isProvider ? booking.client_id : booking.provider_id, title: 'Reschedule Proposed', message: `New time proposed: ${new Date(scheduled_date).toLocaleString()}`, type: 'booking_updated' }
        break
      case 'complete':
        if (!isProvider) return NextResponse.json({ error: 'Only provider can complete' }, { status: 403 })
        updates = { status: 'completed', operational_status: 'approved' }
        notification = { user_id: booking.client_id, title: 'Service Completed', message: 'Your booking was marked completed', type: 'booking_completed' }
        break
      case 'cancel':
        if (!isClient) return NextResponse.json({ error: 'Only client can cancel' }, { status: 403 })
        updates = { status: 'cancelled', operational_status: 'rejected', cancel_reason: reason || null }
        notification = { user_id: booking.provider_id, title: 'Booking Cancelled', message: reason ? `Cancelled: ${reason}` : 'Client cancelled booking', type: 'booking_cancelled' }
        break
    }

    console.log('Updating booking with:', updates)
    
    const { data: updated, error: updateError } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', booking_id)
      .select('*')
      .single()

    if (updateError) {
      console.error('❌ Booking update error:', updateError)
      console.error('Update data:', updates)
      console.error('Booking ID:', booking_id)
      const response = NextResponse.json({ error: 'Failed to update booking', details: updateError.message }, { status: 500 })
      Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }

    console.log('✅ Booking updated successfully:', updated)

    if (notification) {
      console.log('🔔 Creating comprehensive notification with email:', notification)
      try {
        // Get user details for better notification content
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', user.id)
          .single()
        
        const actorName = userProfile?.full_name || user.email || 'User'
        
        // Use comprehensive trigger for approval
        if (action === 'approve') {
          // Get client details
          const { data: clientProfile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', booking.client_id)
            .single()
          
          const clientName = clientProfile?.full_name || 'Client'
          
          await triggerBookingApproved(booking_id, {
            client_id: booking.client_id,
            client_name: clientName,
            provider_id: user.id,
            provider_name: actorName,
            service_name: booking.service?.title || 'Service',
            booking_title: booking.title,
            scheduled_date: booking.scheduled_date,
            total_amount: booking.amount,
            currency: booking.currency
          })

          // Automatically generate invoice when booking is approved
          try {
            console.log('🔧 Starting automatic invoice generation for booking:', booking_id)
            const { SmartInvoiceService } = await import('@/lib/smart-invoice-service')
            const invoiceService = new SmartInvoiceService()
            const invoice = await invoiceService.generateInvoiceOnApproval(booking_id)
            
            if (invoice) {
              console.log('✅ Invoice automatically generated successfully:', {
                id: invoice.id,
                invoice_number: invoice.invoice_number,
                status: invoice.status,
                amount: invoice.amount,
                currency: invoice.currency
              })
            } else {
              console.log('ℹ️ Invoice generation skipped (may already exist or failed)')
            }
          } catch (invoiceError) {
            console.error('❌ Failed to generate invoice automatically:', {
              error: invoiceError,
              message: invoiceError instanceof Error ? invoiceError.message : 'Unknown error',
              booking_id
            })
            // Non-blocking - don't fail the approval if invoice generation fails
          }
        } else {
          // Use basic notification for other actions
          await createNotification(
            notification.user_id,
            notification.type as any,
            notification.title,
            notification.message,
            {
              booking_id,
              actor_id: user.id,
              actor_name: actorName,
              service_name: booking.service?.title || 'Service',
              booking_title: booking.title,
              scheduled_date: booking.scheduled_date,
              amount: booking.amount,
              currency: booking.currency
            },
            'high'
          )
        }
        
        console.log('✅ Comprehensive notification created successfully with email')
      } catch (notificationError) {
        console.error('⚠️ Comprehensive notification creation failed (non-critical):', notificationError)
        // Don't fail the entire request if notification fails
      }
    }

    console.log('✅ PATCH method completed successfully')
    const response = NextResponse.json({ success: true, booking: updated })
    Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
    return response
  } catch (error) {
    console.error('❌ Unexpected error in PATCH method:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    const errorStack = error instanceof Error ? error.stack : 'No stack trace available'
    
    console.error('❌ Error details:', { message: errorMessage, stack: errorStack })
    
    const response = NextResponse.json({ 
      error: 'Internal server error', 
      details: errorMessage,
      type: 'patch_method_error'
    }, { status: 500 })
    Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
    return response
  }
}
