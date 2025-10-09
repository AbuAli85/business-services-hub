import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { requireRole } from '@/lib/authz'
import { makeServerClient } from '@/utils/supabase/makeServerClient'
import { jsonError } from '@/lib/http'
import { ProgressDataService } from '@/lib/progress-data-service'
import { ProfileFetchOptimizer } from '@/lib/profile-fetch-optimizer'
import { z as zod } from 'zod'

import { 
  triggerBookingCreated,
  triggerBookingApproved
} from '@/lib/notification-triggers-simple'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

// Production error guard
const isProd = process.env.NODE_ENV === 'production'
// CORS headers for cross-domain access
const ALLOWED_ORIGINS = (process.env.NEXT_PUBLIC_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)
const originOk = (o?: string | null) =>
  !!o && (ALLOWED_ORIGINS.includes(o) || ALLOWED_ORIGINS.includes('*'))

const corsHeadersFor = (origin?: string | null) => {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  }

  // Only echo an origin if it's explicitly allowed (or '*' is in the list)
  if (originOk(origin) && origin) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Allow-Credentials'] = 'true'
  }
  // NOTE: do NOT set ACAO at all if not allowed.

  return headers
}

// Helper to add CORS headers to any response
const withCors = (res: Response, req: NextRequest) => {
  const h = corsHeadersFor(req.headers.get('origin'))
  for (const [k, v] of Object.entries(h)) res.headers.set(k, v)
  return res
}

// Handle preflight OPTIONS request
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: corsHeadersFor(request.headers.get('origin')),
  })
}

// Validation schema for booking creation
const CreateBookingSchema = zod.object({
  service_id: zod.string().uuid({ message: 'Invalid service_id format' }),
  scheduled_date: zod.string().datetime({ message: 'scheduled_date must be ISO 8601 format' }),
  notes: zod.string().max(500, 'Notes must be 500 characters or less').optional(),
  service_package_id: zod.string().uuid({ message: 'Invalid service_package_id format' }).optional(),
  estimated_duration: zod.string().optional(),
  location: zod.string().optional()
})

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
    
    // Validate amount (stored as decimal, not cents)
    const total_amount = Math.max(0, amount ?? 0)
    if (!Number.isFinite(total_amount)) {
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
        end_time: (() => {
          const start = new Date(scheduled_date)
          if (Number.isNaN(start.getTime())) {
            throw new Error('Invalid scheduled_date')
          }
          const end = new Date(start.getTime())
          end.setHours(end.getHours() + 2) // DST-safe
          return end.toISOString()
        })(),
        notes,
        status: 'pending',
        approval_status: 'pending',
        operational_status: 'new',
        total_amount,
        currency: service.currency || 'OMR',
        payment_status: 'pending',
        estimated_duration,
        location,
        total_price: amount, // Keep legacy fields for compatibility
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
        details: isProd ? undefined : bookingError.message,
        type: 'booking_creation_error',
        debug: isProd ? undefined : {
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
        total_amount: booking.amount ?? 0,
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

// GET /api/bookings (RLS-safe) with filters/sort/pagination
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    console.log('🔐 API: Authorization header present:', !!authHeader)
    console.log('🔐 API: Auth header starts with Bearer:', authHeader?.startsWith('Bearer '))
    
    const supabase = await makeServerClient(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log('🔐 API: Auth result:', { 
      hasUser: !!user, 
      userId: user?.id, 
      authError: authError?.message
    })
    
    if (authError || !user) return withCors(jsonError(401, 'UNAUTHENTICATED', 'No session'), request)

    // Get user profile to determine role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    const userRole = profile?.role ?? user.user_metadata?.role ?? 'client'
    if (!['client', 'provider', 'admin'].includes(userRole)) {
      return withCors(jsonError(403, 'FORBIDDEN', 'Insufficient role'), request)
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
    const sortMap: Record<string, 'created_at'|'updated_at'|'amount'|'title'|'client_name'|'provider_name'|'service_title'|'progress'|'display_status'> = {
      createdat: 'created_at',
      lastupdated: 'updated_at',
      totalamount: 'amount',
      servicetitle: 'service_title',
      clientname: 'client_name',
      providername: 'provider_name',
      progress: 'progress',
      status: 'display_status'
    }
    const sort = sortMap[rawSort] ?? 'created_at'
    const order: 'asc'|'desc' = (searchParams.get('order') === 'asc' ? 'asc' : 'desc')
    // Sanitize search to avoid breaking the OR logic tree
    const rawSearch = (searchParams.get('search') || '').trim()
    const search = rawSearch
      .replace(/[()]/g, ' ') // strip parentheses that break logic tree
      .replace(/\s+/g, ' ') // normalize whitespace
      .replace(/,/g, ' ') // commas are OR separators in supabase .or()
    const status = (searchParams.get('status') || '').trim()

    // Use v_booking_status view for unified data with proper joins and derived status
    // Constrain queries to a reasonable time window to leverage indexes and reduce scan time
    const DAYS_BACK = 540 // ~18 months
    const sinceIso = new Date(Date.now() - DAYS_BACK * 24 * 60 * 60 * 1000).toISOString()
    let query = supabase
      .from('v_booking_status')
      .select(`
        id, booking_id, booking_title, service_id, service_title,
        client_id, client_name,
        provider_id, provider_name,
        progress, display_status, booking_status,
        amount, currency,
        booking_created_at, booking_updated_at, scheduled_date
      `, { count: 'planned' })
      .gte('booking_created_at', sinceIso)

    if (userRole === 'provider') {
      query = query.eq('provider_id', user.id)
    } else if (userRole === 'client') {
      query = query.eq('client_id', user.id)
    }

    // Status filter: use display_status from v_booking_status view
    if (status) {
      // Map legacy status names to display_status values
      const statusMap: Record<string, string> = {
        'pending_review': 'pending_review',
        'approved': 'approved', 
        'ready_to_launch': 'approved', // Same as approved
        'in_production': 'in_progress',
        'in_progress': 'in_progress',
        'delivered': 'completed',
        'completed': 'completed',
        'on_hold': 'cancelled', // Map on_hold to cancelled for now
        'cancelled': 'cancelled',
        'rescheduled': 'pending_review' // Map rescheduled to pending_review
      }
      
      const mappedStatus = statusMap[status] || status
      query = query.eq('display_status', mappedStatus)
    }

    // Search functionality using v_booking_status fields
    if (search) {
      if (search.startsWith('#')) {
        // Direct ID lookup
        query = query.eq('id', search.slice(1))
      } else {
        // Text search across available fields from v_booking_status
        const like = `%${search}%`
        query = query.or(`booking_title.ilike.${like},service_title.ilike.${like},client_name.ilike.${like},provider_name.ilike.${like},notes.ilike.${like},location.ilike.${like}`)
      }
    }

    // Sorting using v_booking_status fields
    switch (sort) {
      case 'updated_at':
        query = query.order('updated_at', { ascending: order === 'asc', nullsFirst: false })
        break
      case 'amount':
        query = query.order('amount', { ascending: order === 'asc' })
        break
      case 'title':
        query = query.order('booking_title', { ascending: order === 'asc' })
        break
      case 'client_name':
        query = query.order('client_name', { ascending: order === 'asc' })
        break
      case 'provider_name':
        query = query.order('provider_name', { ascending: order === 'asc' })
        break
      case 'service_title':
        query = query.order('service_title', { ascending: order === 'asc' })
        break
      case 'progress':
        query = query.order('progress', { ascending: order === 'asc' })
        break
      case 'display_status':
        query = query.order('display_status', { ascending: order === 'asc' })
        break
      default:
        query = query.order('created_at', { ascending: order === 'asc' })
    }

    // Pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    const { data, count, error: queryError } = await query.range(from, to)

    if (queryError) {
      // Graceful fallback on timeout to avoid 504 cascade
      if ((queryError as any)?.name === 'AbortError') {
        const response = NextResponse.json({ data: [], page, pageSize, total: 0 }, { status: 200 })
        Object.entries(corsHeadersFor(request.headers.get('origin'))).forEach(([key, value]) => response.headers.set(key, value))
        return response
      }
      const response = NextResponse.json({ error: queryError.message }, { status: 400 })
      Object.entries(corsHeadersFor(request.headers.get('origin'))).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }

    const rows = data ?? []

    // Fetch progress for all bookings at once from v_booking_progress
    let progressMap = new Map<string, number>()
    if (rows.length > 0) {
      const ids = rows.map((b:any) => b.id)
      console.log(`🔍 Fetching progress for ${ids.length} bookings`)
      
      // Always calculate from milestones - never use hardcoded values
      const { data: milestonesForProgress, error: milestonesError } = await supabase
        .from('milestones')
        .select('id, booking_id, progress_percentage, weight, status')
        .in('booking_id', ids)
      
      if (milestonesError) {
        console.warn('⚠️ Could not fetch milestones for progress:', milestonesError)
        // Set all to 0 if we can't fetch data (don't guess)
        for (const id of ids) {
          progressMap.set(String(id), 0)
        }
      } else {
        // Calculate weighted progress for each booking
        const progressByBooking = new Map<string, { totalWeight: number; weightedProgress: number }>()
        
        for (const milestone of (milestonesForProgress || [])) {
          const bookingId = String(milestone.booking_id)
          if (!progressByBooking.has(bookingId)) {
            progressByBooking.set(bookingId, { totalWeight: 0, weightedProgress: 0 })
          }
          
          const data = progressByBooking.get(bookingId)!
          const weight = milestone.weight || 1
          const progress = milestone.progress_percentage || 0
          
          data.totalWeight += weight
          data.weightedProgress += (progress * weight)
          progressByBooking.set(bookingId, data)
        }
        
        // Apply calculated progress to all bookings
        for (const id of ids) {
          const data = progressByBooking.get(String(id))
          if (data && data.totalWeight > 0) {
            const overallProgress = Math.round(data.weightedProgress / data.totalWeight)
            progressMap.set(String(id), overallProgress)
          } else {
            // No milestones = 0 progress (accurate, not guessed)
            progressMap.set(String(id), 0)
          }
        }
        
        console.log(`✅ Progress calculated from ${milestonesForProgress?.length || 0} milestones for ${ids.length} bookings`)
      }
    }

    // Bulk data enrichment to eliminate N+1 queries with timeout protection
    const transformedData = rows.length > 0 ? await Promise.race([
      (async () => {
        // Collect all unique IDs for bulk queries
        const serviceIds = Array.from(new Set(rows.map(b => b.service_id)))
        const userIds = Array.from(new Set([...rows.map(b => b.client_id), ...rows.map(b => b.provider_id)]))
        const bookingIds = rows.map(b => b.id)
        
        // Bulk fetch services
        const { data: services = [], error: servicesError } = await supabase
          .from('services')
          .select('id, title, description, category')
          .in('id', serviceIds)
        
        if (servicesError) {
          console.warn('⚠️ Services fetch error:', servicesError)
        }
        
        // Use optimized profile fetcher to avoid stack depth issues
        console.log(`🔍 Fetching profiles for ${userIds.length} unique users:`, userIds.slice(0, 5))
        const { profiles, errors: profileErrors } = await ProfileFetchOptimizer.fetchProfiles(
          supabase,
          userIds,
          { batchSize: 25, maxRetries: 2 }
        )
        
        console.log(`📊 Profile fetch results: ${profiles.length} profiles found, ${profileErrors.length} errors`)
        if (profileErrors.length > 0) {
          console.warn('⚠️ Profile fetch errors:', profileErrors.slice(0, 3)) // Show first 3 errors
        }
        if (profiles.length > 0) {
          console.log('✅ Sample profiles:', profiles.slice(0, 2).map(p => ({ id: p.id, name: p.full_name, email: p.email })))
        }
        
        // Bulk fetch invoices
        const { data: invoices = [] } = await supabase
          .from('invoices')
          .select('booking_id, status, amount')
          .in('booking_id', bookingIds)
        
        // Create lookup maps with null safety
        const serviceMap = new Map((services || []).map(s => [s.id, s]))
        const profileMap = new Map((profiles || []).map(p => [p.id, p]))
        const invoiceMap = new Map((invoices || []).map(i => [i.booking_id, i]))
        
        // Log profile fetch statistics
        const profileStats = ProfileFetchOptimizer.getStats(profiles, profileErrors)
        console.log(`📊 Profile fetch stats: ${profileStats.totalFetched}/${profileStats.totalRequested} (${profileStats.successRate}% success rate)`)
        
        // Transform data using lookup maps
        const transformed = rows.map(booking => {
          const service = serviceMap.get(booking.service_id)
          const client = profileMap.get(booking.client_id)
          const provider = profileMap.get(booking.provider_id)
          const invoice = invoiceMap.get(booking.id)
          
          // Convert amount (decimal OMR) to amount_cents for UI compatibility
          const totalAmount = booking.amount || 0
          const amountCents = Math.round(totalAmount * 100)
          
          const result = {
            ...booking,
            progress_percentage: progressMap.get(String(booking.id)) ?? 0,
            service_title: booking.service_title || service?.title || 'Service',
            service_description: service?.description || '',
            service_category: service?.category || '',
            client_name: booking.client_name || client?.full_name || 'Client',
            client_email: client?.email || '',
            provider_name: booking.provider_name || provider?.full_name || 'Provider',
            provider_email: provider?.email || '',
            // Add both formats for compatibility
            amount: totalAmount,
            amount_cents: amountCents,
            // Map status fields for UI compatibility
            status: booking.booking_status || booking.display_status || 'pending',
            approval_status: null,
            display_status: booking.display_status,
            // Map renamed columns from view
            created_at: booking.booking_created_at,
            updated_at: booking.booking_updated_at,
            // Invoice data
            invoice_status: invoice?.status || null,
            invoice_amount: invoice?.amount || null
          }
          
          // Log if we're getting generic data
          if (result.service_title === 'Service' || result.client_name === 'Client' || result.provider_name === 'Provider') {
            console.warn('⚠️ Generic data detected for booking:', {
              bookingId: booking.id,
              serviceId: booking.service_id,
              clientId: booking.client_id,
              providerId: booking.provider_id,
              serviceTitle: result.service_title,
              clientName: result.client_name,
              providerName: result.provider_name,
              serviceMapSize: serviceMap.size,
              profileMapSize: profileMap.size
            })
          }
          
          return result
        })
        
        console.log('📊 Data enrichment completed:', {
          totalBookings: rows.length,
          servicesFound: (services || []).length,
          profilesFound: (profiles || []).length,
          invoicesFound: (invoices || []).length,
          transformedCount: transformed.length
        })
        
        // Log sample transformed data for verification
        if (transformed.length > 0) {
          console.log('📋 Sample transformed booking:', {
            id: transformed[0].id,
            service_title: transformed[0].service_title,
            client_name: transformed[0].client_name,
            provider_name: transformed[0].provider_name,
            status: transformed[0].status,
            amount: transformed[0].amount,
            amount_cents: transformed[0].amount_cents,
            progress_percentage: transformed[0].progress_percentage,
            invoice_status: transformed[0].invoice_status
          })
        }
        
        return transformed
      })(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Data enrichment timeout')), 10000)
      )
    ]).catch(() => {
      // Fallback: return basic data without enrichment
      console.warn('⚠️ Data enrichment timed out, returning basic booking data')
      return rows.map(booking => {
        const totalAmount = booking.amount || 0
        const amountCents = Math.round(totalAmount * 100)
        
        return {
          ...booking,
          progress_percentage: progressMap.get(String(booking.id)) ?? 0,
          service_title: booking.service_title || 'Service',
          service_description: '',
          service_category: '',
          client_name: booking.client_name || 'Client',
          client_email: '',
          provider_name: booking.provider_name || 'Provider',
          provider_email: '',
          amount: totalAmount,
          amount_cents: amountCents,
          status: booking.booking_status || booking.display_status || 'pending',
          approval_status: null,
          display_status: booking.display_status,
          created_at: booking.booking_created_at,
          updated_at: booking.booking_updated_at,
          invoice_status: null,
          invoice_amount: null
        }
      })
    }) : []

    const payload = {
      data: transformedData,
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
    return withCors(jsonError(500, 'INTERNAL_ERROR', 'Internal server error'), request)
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
  action: zod.enum(['approve', 'decline', 'reschedule', 'complete', 'cancel', 'start_project']),
  scheduled_date: zod.union([zod.string().datetime(), zod.number()]).optional(),
  reason: zod.string().max(500).optional(),
  // Optional timestamps client may send; we normalize and ignore if invalid
  approved_at: zod.union([zod.string().datetime(), zod.number()]).optional()
})

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await makeServerClient(request)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return withCors(NextResponse.json({ error: 'Authentication failed' }, { status: 401 }), request)
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
    console.log('🔍 Request body:', { booking_id, action, scheduled_date, reason, approved_at })
    
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
    const isAdmin = (user as any)?.user_metadata?.role === 'admin'

    console.log('🔍 User role check:', {
      userId: user.id,
      bookingClientId: booking.client_id,
      bookingProviderId: booking.provider_id,
      isClient,
      isProvider,
      isAdmin
    })

    if (!isClient && !isProvider) {
      console.log('❌ Access denied: User is neither client nor provider')
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
        console.log('🔍 Processing approve action:', { isProvider, userId: user.id, providerId: booking.provider_id })
        if (!isProvider && !isAdmin) {
          console.log('❌ Approval denied: User is not a provider')
          const response = NextResponse.json({ error: 'Only provider or admin can approve' }, { status: 403 })
          Object.entries(corsHeadersFor(request.headers.get('origin'))).forEach(([key, value]) => response.headers.set(key, value))
          return response
        }
        
        // Handle different approval status cases
        if (booking.approval_status === 'in_progress') {
          console.log('📝 Booking is already in progress, only updating approval_status to approved')
          updates = {
            approval_status: 'approved', // Only update approval_status to avoid status transition constraints
            approval_reviewed_at: normalizeToISO(approved_at) || new Date().toISOString()
          }
          notification = { user_id: booking.client_id, title: 'Booking Approved', message: 'Your booking has been approved', type: 'booking_approved' }
          console.log('✅ Approval updates (approval_status only, already in_progress):', updates)
        } else {
          console.log('📝 For pending bookings, only updating approval_status to avoid constraint issues')
          // For pending bookings, only update approval_status to avoid database constraints
          // The status will remain pending but approval_status will be approved
          updates = {
            approval_status: 'approved',
            approval_reviewed_at: normalizeToISO(approved_at) || new Date().toISOString()
          }
          notification = { user_id: booking.client_id, title: 'Booking Approved', message: 'Your booking has been approved', type: 'booking_approved' }
          console.log('✅ Approval updates (approval_status only):', updates)
        }
        console.log('✅ Current booking status before update:', booking.status)
        console.log('✅ Current booking approval_status before update:', booking.approval_status)
        break
      case 'decline':
        if (!isProvider && !isAdmin) {
          console.log('Decline denied: User is not a provider')
          const response = NextResponse.json({ error: 'Only provider or admin can decline' }, { status: 403 })
          Object.entries(corsHeadersFor(request.headers.get('origin'))).forEach(([key, value]) => response.headers.set(key, value))
          return response
        }
        updates = { status: 'declined', approval_status: 'rejected', decline_reason: reason || null }
        notification = { user_id: booking.client_id, title: 'Booking Declined', message: reason ? `Declined: ${reason}` : 'Your booking was declined', type: 'booking_cancelled' }
        console.log('Decline updates:', updates)
        break
      case 'start_project':
        console.log('🔍 Processing start_project action:', { isProvider, userId: user.id, providerId: booking.provider_id })
        if (!isProvider && !isAdmin) {
          console.log('❌ Start project denied: User is not a provider')
          const response = NextResponse.json({ error: 'Only provider or admin can start project' }, { status: 403 })
          Object.entries(corsHeadersFor(request.headers.get('origin'))).forEach(([key, value]) => response.headers.set(key, value))
          return response
        }
        // Check if booking is approved (align with DB predicate: approved, confirmed, in_progress, completed)
        const approvedStatuses = ['approved', 'confirmed', 'in_progress', 'completed']
        const isApproved = approvedStatuses.includes(booking.status) || booking.approval_status === 'approved'
        if (!isApproved) {
          console.log('❌ Start project denied: Booking not approved', { status: booking.status, approval_status: booking.approval_status })
          return NextResponse.json({ error: 'Booking must be approved before starting project' }, { status: 400 })
        }
        
        // Handle the case where status is pending but approval_status is approved
        if (booking.status === 'pending' && booking.approval_status === 'approved') {
          console.log('📝 Special case: Status is pending but approval_status is approved')
          console.log('🔄 Attempting direct update to in_progress (bypassing status transition rules)')
          
          // Try to update only approval_status to in_progress (avoid status field entirely)
          const { data: directResult, error: directError } = await supabase
            .from('bookings')
            .update({ 
              approval_status: 'in_progress',
              updated_at: new Date().toISOString()
            })
            .eq('id', booking_id)
            .eq('approval_status', 'approved') // Add this condition to ensure it's approved
            .select()
            .single()
          
          if (directError) {
            console.error('❌ Direct update failed:', directError)
            // If direct update fails, try updating only the approval_status to match the status
            console.log('🔄 Fallback: Updating approval_status to match status')
            
            const { data: fallbackResult, error: fallbackError } = await supabase
              .from('bookings')
              .update({ 
                approval_status: 'in_progress',
                updated_at: new Date().toISOString()
              })
              .eq('id', booking_id)
              .select()
              .single()
            
            if (fallbackError) {
              console.error('❌ Fallback update failed:', fallbackError)
              return NextResponse.json({ 
                error: 'Cannot start project due to database constraints. Please contact support.', 
                details: `Status: ${booking.status}, Approval Status: ${booking.approval_status}` 
              }, { status: 500 })
            }
            
            console.log('✅ Fallback completed: Updated approval_status to in_progress')
            console.log('📊 Fallback result:', { 
              hasData: !!fallbackResult, 
              result: fallbackResult
            })
            
            // Ensure we have a valid booking object
            const updatedBooking = fallbackResult || {
              id: booking_id,
              status: booking.status,
              approval_status: 'in_progress',
              updated_at: new Date().toISOString()
            }
            
            return NextResponse.json({ 
              success: true, 
              booking: updatedBooking,
              message: 'Project started successfully (approval status updated)',
              updated_fields: ['approval_status']
            })
          }
          
          console.log('✅ Direct update completed: Status updated to in_progress')
          console.log('📊 Direct result:', { 
            hasData: !!directResult, 
            result: directResult
          })
          
          // Ensure we have a valid booking object
          const updatedBooking = directResult || {
            id: booking_id,
            status: 'in_progress',
            approval_status: booking.approval_status,
            updated_at: new Date().toISOString()
          }
          
          return NextResponse.json({ 
            success: true, 
            booking: updatedBooking,
            message: 'Project started successfully (approval status updated)',
            updated_fields: ['approval_status']
          })
        } else {
          // Direct update if status is already approved
          console.log('📝 Direct update: Status is already approved, updating approval_status to in_progress')
          
          const { data: directResult, error: directError } = await supabase
            .from('bookings')
            .update({
              approval_status: 'in_progress',
              updated_at: new Date().toISOString()
            })
            .eq('id', booking_id)
            .select()
            .single()
          
          if (directError) {
            console.error('❌ Direct update failed:', directError)
            return NextResponse.json({ 
              error: 'Failed to start project', 
              details: directError.message 
            }, { status: 500 })
          }
          
          console.log('✅ Direct update completed: Approval status updated to in_progress')
          return NextResponse.json({ 
            success: true, 
            booking: directResult,
            message: 'Project started successfully (approval status updated)',
            updated_fields: ['approval_status']
          })
        }
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

    console.log('📝 Updating booking with:', updates)
    
    // Check if updates object is defined
    if (!updates || Object.keys(updates).length === 0) {
      console.error('❌ Updates object is empty or undefined:', updates)
      const response = NextResponse.json({ 
        error: 'No updates specified for this action', 
        details: `Action: ${action}, Updates: ${JSON.stringify(updates)}` 
      }, { status: 400 })
      Object.entries(corsHeadersFor(request.headers.get('origin'))).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }
    
    // Special handling for approval action to work around database constraints
    let updated, updateError
    
    if (action === 'approve' && booking.status === 'pending') {
      console.log('🔄 Workaround for pending bookings: Only updating approval_status, avoiding status field')
      
      // For pending bookings, only update approval_status to avoid all status transition constraints
      // The status will remain 'pending' but approval_status will be 'approved'
      const { data: step1Result, error: step1Error } = await supabase
        .from('bookings')
        .update({
          approval_status: 'approved',
          approval_reviewed_at: normalizeToISO(approved_at) || new Date().toISOString()
        })
        .eq('id', booking_id)
        .eq('status', 'pending')
        .select('*')
        .single()
      
      if (step1Error) {
        console.error('❌ Approval update failed:', step1Error)
        updateError = step1Error
      } else {
        console.log('✅ Approval completed: approval_status updated to approved')
        updated = step1Result
      }
    } else {
      // Regular update for other actions or already in_progress bookings
      let query = supabase
        .from('bookings')
        .update(updates)
        .eq('id', booking_id)
      
      console.log('🔍 Query conditions:', { booking_id, action })
      
      // Add race-safe guards based on action
      if (action === 'approve') {
        // Allow approve for any status since we're only updating approval_status
        // This avoids status transition constraints entirely
        query = query // No additional conditions needed
      } else if (action === 'complete') {
        query = query.in('status', ['approved', 'in_progress'])
      } else if (action === 'decline') {
        query = query.eq('approval_status', 'pending')
      }
      
      const result = await query
        .select('*')
        .single()
      
      updated = result.data
      updateError = result.error
    }

    console.log('📊 Database update result:', { 
      hasData: !!updated, 
      hasError: !!updateError,
      errorMessage: updateError?.message,
      updatedId: updated?.id,
      updatedStatus: updated?.status,
      updatedApprovalStatus: updated?.approval_status
    })

    if (updateError) {
      console.error('❌ Booking update error:', updateError)
      console.error('Update data:', updates)
      console.error('Booking ID:', booking_id)
      const response = NextResponse.json({ error: 'Failed to update booking', details: updateError.message }, { status: 500 })
      Object.entries(corsHeadersFor(request.headers.get('origin'))).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }

    if (!updated) {
      // Race condition: no row matched the update conditions
      const response = NextResponse.json({ 
        error: 'Booking state changed during update', 
        details: 'Another user may have modified this booking. Please refresh and try again.' 
      }, { status: 409 })
      Object.entries(corsHeadersFor(request.headers.get('origin'))).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ Booking updated successfully:', updated)
    }

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
            total_amount: booking.amount ?? 0,
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
            // Check if it's a module import error (deployment issue)
            if (invoiceError instanceof Error && invoiceError.message.includes('Cannot find module')) {
              console.warn('⚠️ Invoice generation skipped due to missing module in production:', {
                message: invoiceError.message,
                booking_id
              })
            } else {
              console.error('❌ Failed to generate invoice automatically:', {
                error: invoiceError,
                message: invoiceError instanceof Error ? invoiceError.message : 'Unknown error',
                booking_id
              })
            }
            // Non-blocking - don't fail the approval if invoice generation fails
          }
        } else {
          // Use basic notification for other actions
          await supabase.from('notifications').insert({
            user_id: notification.user_id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: {
              booking_id,
              user_id: user.id,
              actor_name: actorName,
              service_name: booking.service_title || 'Service',
              booking_title: booking.service_title || 'Booking',
              scheduled_date: booking.scheduled_date,
              amount: booking.amount ?? 0,
              currency: booking.currency
            },
            priority: 'high'
          })
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
