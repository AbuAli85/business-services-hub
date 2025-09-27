import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { requireRole } from '@/lib/authz'
import { makeServerClient } from '@/utils/supabase/makeServerClient'
import { jsonError } from '@/lib/http'
import { ProgressDataService } from '@/lib/progress-data-service'
import { z as zod } from 'zod'

import { 
  triggerBookingCreated,
  triggerBookingApproved
} from '@/lib/notification-triggers-simple'
import { createNotification } from '@/lib/notification-service'
// CORS headers for cross-domain access
const ALLOWED_ORIGINS = (process.env.NEXT_PUBLIC_ALLOWED_ORIGINS || '').split(',').map(s => s.trim())
const originOk = (o?: string | null) => !!o && (ALLOWED_ORIGINS.includes(o) || ALLOWED_ORIGINS.includes('*'))
const corsHeadersFor = (origin?: string | null) => ({
  'Access-Control-Allow-Origin': originOk(origin) ? origin! : 'null',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin',
})

// Handle preflight OPTIONS request
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: corsHeadersFor(request.headers.get('origin')),
  })
}

// Validation schema for booking creation
const CreateBookingSchema = zod.object({
  service_id: zod.string().uuid(),
  scheduled_date: zod.string().datetime(),
  notes: zod.string().max(500).optional(),
  service_package_id: zod.string().uuid().optional(),
  estimated_duration: zod.string().optional(),
  location: zod.string().optional()
})

// Helper function to authenticate user (legacy for PATCH flow)
async function authenticateUser(request: NextRequest) {
  let user: any = null
  let authError: any = null
  
  try {
    const supabase = await createClient()
    
    const cookieHeader = request.headers.get('cookie')
    console.log('🔍 Cookie header present:', !!cookieHeader)
    
    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      console.log('🔍 Bearer token found, length:', token.length)
      try {
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
    
    if (!user && cookieHeader) {
      try {
        const cookies = cookieHeader.split(';').reduce((acc: Record<string, string>, cookie: string) => {
          const [key, value] = cookie.trim().split('=')
          acc[key] = value
          return acc
        }, {} as Record<string, string>)
        
        console.log('🔍 Available cookies:', Object.keys(cookies))
        
        const possibleTokenKeys = [
          'sb-access-token',
          'supabase-auth-token', 
          'sb-access-token',
          'supabase.auth.token',
          'sb-' + (process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0] || 'default') + '-auth-token'
        ]
        
        let accessToken: string | null = null
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

// Helper function to get user from request (supports both cookies and Bearer token)
async function getUserFromRequest(request: NextRequest) {
  console.log('🔍 getUserFromRequest: Starting authentication check')
  
  // 1) Try Bearer token first (most reliable for API calls)
  const auth = request.headers.get('authorization')
  console.log('🔍 getUserFromRequest: Authorization header:', auth ? `${auth.substring(0, 20)}...` : 'null')
  
  if (auth?.startsWith('Bearer ')) {
    const jwt = auth.slice(7)
    console.log('🔍 Trying Bearer token authentication, length:', jwt.length)
    
    // Create a direct Supabase client for Bearer token validation
    const { createClient } = await import('@supabase/supabase-js')
    const directClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${jwt}` } },
        auth: { persistSession: false, detectSessionInUrl: false },
      }
    )
    
    const { data, error } = await directClient.auth.getUser()
    if (!error && data.user) {
      console.log('✅ User authenticated from Bearer token:', data.user.id)
      return data.user
    } else {
      console.log('❌ Bearer token auth failed:', error?.message)
    }
  } else {
    console.log('🔍 getUserFromRequest: No Bearer token found, trying cookies')
  }

  // 2) Fallback to cookie-based session
  const supabase = await makeServerClient(request)
  let { data: { user } } = await supabase.auth.getUser()
  if (user) {
    console.log('✅ User authenticated from cookies:', user.id)
    return user
  }
  
  console.log('❌ No valid authentication found')
  return null
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await makeServerClient(request)
    const gate = await requireRole(supabase, ['client', 'provider', 'admin'])
    if (!gate.ok) return jsonError(gate.status, gate.status === 401 ? 'UNAUTHENTICATED' : 'FORBIDDEN', gate.message)
    
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
      Object.entries(corsHeadersFor(request.headers.get('origin'))).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }
    console.log('✅ Database connection test passed')

    const user = gate.user

    const body = await request.json()
    
    // Validate request body
    const validationResult = CreateBookingSchema.safeParse(body)
    if (!validationResult.success) {
      const response = NextResponse.json({ 
        error: 'Invalid request data', 
        details: validationResult.error.errors 
      }, { status: 400 })
      Object.entries(corsHeadersFor(request.headers.get('origin'))).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }

    const { service_id, scheduled_date, notes, service_package_id, estimated_duration, location } = validationResult.data

    // Validate service exists and is active
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select(`
        id, title, status, provider_id, base_price, currency,
        service_packages(id, price),
        provider:profiles!services_provider_id_fkey(full_name, email)
      `)
      .eq('id', service_id)
      .eq('status', 'active')
      .single()

    if (serviceError || !service) {
      const response = NextResponse.json({ error: 'Service not found or inactive' }, { status: 404 })
      Object.entries(corsHeadersFor(request.headers.get('origin'))).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }

    // Check if user is trying to book their own service
    if (service.provider_id === user.id) {
      const response = NextResponse.json({ error: 'Cannot book your own service' }, { status: 400 })
      Object.entries(corsHeadersFor(request.headers.get('origin'))).forEach(([key, value]) => response.headers.set(key, value))
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
    
    // Convert to cents for consistent storage with validation
    const amount_cents = Math.max(0, Math.round((amount ?? 0) * 100))
    if (!Number.isFinite(amount_cents)) {
      const response = NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
      Object.entries(corsHeadersFor(request.headers.get('origin'))).forEach(([k,v]) => response.headers.set(k, v))
      return response
    }
    
    // Sanity check date is ISO-ish and not in 1970
    if (isNaN(new Date(scheduled_date).getTime())) {
      const response = NextResponse.json({ error: 'Invalid scheduled_date' }, { status: 400 })
      Object.entries(corsHeadersFor(request.headers.get('origin'))).forEach(([k,v]) => response.headers.set(k, v))
      return response
    }

    // Create booking with approval workflow
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        service_id,
        client_id: user.id,
        provider_id: service.provider_id,
        service_title: service.title || 'Service Booking',
        scheduled_date,
        start_time: scheduled_date, // Use scheduled_date as start_time
        end_time: new Date(new Date(scheduled_date).getTime() + 2 * 60 * 60 * 1000).toISOString(), // Add 2 hours for end_time
        notes,
        status: 'pending',
        approval_status: 'pending',
        operational_status: 'new',
        amount_cents,
        currency: service.currency || 'OMR',
        payment_status: 'pending',
        estimated_duration,
        location,
        total_price: amount, // Keep legacy fields for compatibility
        total_amount: amount,
        amount: amount // Keep legacy field for compatibility
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
      Object.entries(corsHeadersFor(request.headers.get('origin'))).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }

    // Get client profile data
    const { data: clientProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()

    // Create notification for provider
    const providerName = (service.provider as any)?.full_name || 'Service Provider'
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
        bookings_count: ((service as any).bookings_count || 0) + 1 
      })
      .eq('id', service_id)

    // Send notifications for booking creation
    try {
      // Notify both client and provider about the new booking
      await triggerBookingCreated(booking.id, {
        client_id: user.id,
        client_name: clientProfile?.full_name || 'Client',
        provider_id: service.provider_id,
        provider_name: providerName,
        service_name: service.title,
        booking_title: booking.service_title,
        scheduled_date: booking.scheduled_date,
        total_amount: (booking.amount_cents ?? 0) / 100,
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
    Object.entries(corsHeadersFor(request.headers.get('origin'))).forEach(([key, value]) => response.headers.set(key, value))
    return response

  } catch (error) {
    console.error('❌ Booking creation error:', error)
    console.error('❌ Error type:', typeof error)
    console.error('❌ Error message:', error instanceof Error ? error.message : 'Unknown error')
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    const errorType = error instanceof Error ? error.constructor.name : typeof error
    
    return jsonError(500, 'INTERNAL_ERROR', errorMessage)
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await makeServerClient(request)

    // 🔐 Accept cookie OR bearer token
    const user = await getUserFromRequest(request)
    if (!user) {
      const response = jsonError(401, 'UNAUTHENTICATED', 'No session')
      Object.entries(corsHeadersFor(request.headers.get('origin'))).forEach(([k,v]) => response.headers.set(k, v as string))
      return response
    }

    // Get user profile to determine role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    const userRole = profile?.role ?? user.user_metadata?.role ?? 'client'
    if (!['client', 'provider', 'admin'].includes(userRole)) {
      const response = jsonError(403, 'FORBIDDEN', 'Insufficient role')
      Object.entries(corsHeadersFor(request.headers.get('origin'))).forEach(([k,v]) => response.headers.set(k, v as string))
      return response
    }

    const { searchParams } = new URL(request.url)
    
    // Validate and normalize query params
    const toPosInt = (v: string | null, def: number, min = 1, max = 1000) => {
      const n = Number(v)
      if (!Number.isFinite(n)) return def
      return Math.min(max, Math.max(min, Math.trunc(n)))
    }
    const page = toPosInt(searchParams.get('page'), 1)
    const pageSize = toPosInt(searchParams.get('pageSize'), 25, 1, 100)
    const rawSort = (searchParams.get('sort') || 'createdAt').toLowerCase()
    const sortMap: Record<string, 'created_at'|'updated_at'|'amount'|'title'|'client_name'|'provider_name'> = {
      createdat: 'created_at',
      lastupdated: 'updated_at',
      totalamount: 'amount',
      servicetitle: 'title',
      clientname: 'client_name',
      providername: 'provider_name',
    }
    const sort = sortMap[rawSort] ?? 'created_at'
    const order: 'asc'|'desc' = (searchParams.get('order') === 'asc' ? 'asc' : 'desc')
    const search = (searchParams.get('search') || '').trim()
    const status = (searchParams.get('status') || '').trim()

    // Build base query by role with explicit columns
    let query = supabase
      .from('bookings')
      .select('id, service_id, client_id, provider_id, service_title, client_name, provider_name, status, approval_status, operational_status, amount_cents, currency, created_at, updated_at, scheduled_date, start_time, end_time, notes, location, estimated_duration, payment_status', { count: 'exact' })

    if (userRole === 'provider') {
      query = query.eq('provider_id', user.id)
    } else if (userRole === 'client') {
      query = query.eq('client_id', user.id)
    }

    // Status filter: handle derived statuses
    if (status) {
      switch (status) {
        case 'pending_review':
          query = query.eq('status', 'pending').neq('approval_status', 'approved')
          break
        case 'approved':
          query = query.eq('status', 'approved')
          break
        case 'ready_to_launch':
          query = query.eq('status', 'pending').eq('approval_status', 'approved')
          break
        case 'in_production':
          query = query.eq('status', 'in_progress')
          break
        case 'delivered':
          query = query.eq('status', 'completed')
          break
        case 'on_hold':
          query = query.eq('status', 'on_hold')
          break
        case 'cancelled':
          query = query.eq('status', 'cancelled')
          break
        case 'rescheduled':
          query = query.eq('status', 'rescheduled')
          break
        default:
          query = query.eq('status', status)
      }
    }

    // Search functionality - resilient to NULL/missing columns
    if (search) {
      if (search.startsWith('#')) {
        // Direct ID lookup
        query = query.eq('id', search.slice(1))
      } else {
        // Text search across multiple fields
        const like = (col: string) => `${col}.ilike.%${search.replace(/%/g,'').replace(/,/g,' ')}%`
        query = query.or([like('service_title'), like('client_name'), like('provider_name')].join(','))
      }
    }

    // Sorting
    switch (sort) {
      case 'updated_at':
        query = query.order('updated_at', { ascending: order === 'asc', nullsFirst: false })
        break
      case 'amount':
        query = query.order('amount_cents', { ascending: order === 'asc' })
        break
      case 'title':
        query = query.order('service_title', { ascending: order === 'asc' })
        break
      case 'client_name':
        query = query.order('client_name', { ascending: order === 'asc', nullsFirst: true })
        break
      case 'provider_name':
        query = query.order('provider_name', { ascending: order === 'asc', nullsFirst: true })
        break
      default:
        query = query.order('created_at', { ascending: order === 'asc' })
    }

    // Pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    const { data, count, error } = await query.range(from, to)

    if (error) {
      const response = NextResponse.json({ error: error.message }, { status: 400 })
      Object.entries(corsHeadersFor(request.headers.get('origin'))).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }

    const payload = {
      data: (data ?? []) as any[],
      page,
      pageSize,
      total: count ?? 0,
    }

    return NextResponse.json(payload, { 
      status: 200, 
      headers: corsHeadersFor(request.headers.get('origin')),
    })

  } catch (error) {
    console.error('Error fetching bookings:', error)
    const response = jsonError(500, 'INTERNAL_ERROR', 'Internal server error')
    Object.entries(corsHeadersFor(request.headers.get('origin'))).forEach(([key, value]) => response.headers.set(key, value))
    return response
  }
}

// Update booking status (approve, decline, reschedule, complete, cancel)
// Normalize numbers (epoch ms or s) and ISO strings to ISO string
function normalizeToISO(input?: string | number | null): string | undefined {
  if (input === undefined || input === null) return undefined
  if (typeof input === 'string') {
    const d = new Date(input)
    return isNaN(d.getTime()) ? undefined : d.toISOString()
  }
  // number: treat > 2147483647 as ms, else seconds
  const valueMs = input > 2147483647 ? input : input * 1000
  const d = new Date(valueMs)
  return isNaN(d.getTime()) ? undefined : d.toISOString()
}

// Validate PATCH payload and allow numeric/ISO datetime for scheduled_date
const patchSchema = zod.object({
  booking_id: zod.string().uuid(),
  action: zod.enum(['approve', 'decline', 'reschedule', 'complete', 'cancel']),
  scheduled_date: zod.union([zod.string().datetime(), zod.number()]).optional(),
  reason: zod.string().max(500).optional(),
  // Optional timestamps client may send; we normalize and ignore if invalid
  approved_at: zod.union([zod.string().datetime(), zod.number()]).optional()
})

export async function PATCH(request: NextRequest) {
  try {
    // 🔐 Use session-bound client for RLS consistency
    const supabase = await makeServerClient(request)
    
    // Authenticate user
    const { user, authError } = await authenticateUser(request)
    
    if (authError || !user) {
      console.error('❌ Auth error:', authError?.message || 'Authentication failed')
      const response = NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
      Object.entries(corsHeadersFor(request.headers.get('origin'))).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }

    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      const response = NextResponse.json({ error: 'Invalid request data', details: parsed.error.errors }, { status: 400 })
      Object.entries(corsHeadersFor(request.headers.get('origin'))).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }

    const { booking_id, action, scheduled_date, reason, approved_at } = parsed.data

    // Fetch booking to validate permissions
    console.log('🔍 PATCH', { booking_id, action, user_id: user.id })
    
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .single()

    if (fetchError || !booking) {
      console.error('❌ Failed to fetch booking:', fetchError?.message)
      const response = NextResponse.json({ 
        error: 'Booking not found or access denied',
        details: 'The booking does not exist or you do not have permission to access it'
      }, { status: 404 })
      Object.entries(corsHeadersFor(request.headers.get('origin'))).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }

    const isClient = booking.client_id === user.id
    const isProvider = booking.provider_id === user.id

    if (!isClient && !isProvider) {
      const response = NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      Object.entries(corsHeadersFor(request.headers.get('origin'))).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }

    // State transition guards for race safety
    if (action === 'approve' && booking.approval_status === 'approved') {
      const response = NextResponse.json({ success: true, booking }, { status: 200 })
      Object.entries(corsHeadersFor(request.headers.get('origin'))).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }
    if (action === 'complete' && booking.status !== 'in_progress' && booking.status !== 'approved') {
      const response = NextResponse.json({ error: 'Cannot complete from current state' }, { status: 409 })
      Object.entries(corsHeadersFor(request.headers.get('origin'))).forEach(([key, value]) => response.headers.set(key, value))
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
        // Respect DB workflow: only flip approval_status; do NOT change status here
        updates = {
          approval_status: 'approved',
          approval_reviewed_at: normalizeToISO(approved_at) || new Date().toISOString()
        }
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
        const normalized = normalizeToISO(scheduled_date)!
        updates = { scheduled_date: normalized, status: 'rescheduled' }
        notification = { user_id: isProvider ? booking.client_id : booking.provider_id, title: 'Reschedule Proposed', message: `New time proposed: ${new Date(normalized).toLocaleString()}`, type: 'booking_updated' }
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
      Object.entries(corsHeadersFor(request.headers.get('origin'))).forEach(([key, value]) => response.headers.set(key, value))
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
            service_name: booking.service_title || 'Service',
            booking_title: booking.service_title || 'Booking',
            scheduled_date: booking.scheduled_date,
            total_amount: (booking.amount_cents ?? 0) / 100,
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
              service_name: booking.service_title || 'Service',
              booking_title: booking.service_title || 'Booking',
              scheduled_date: booking.scheduled_date,
              amount: (booking.amount_cents ?? 0) / 100,
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
    Object.entries(corsHeadersFor(request.headers.get('origin'))).forEach(([key, value]) => response.headers.set(key, value))
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
    Object.entries(corsHeadersFor(request.headers.get('origin'))).forEach(([key, value]) => response.headers.set(key, value))
    return response
  }
}
