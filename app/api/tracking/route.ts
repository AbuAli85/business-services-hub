import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'
import { z } from 'zod'

// Validation schema for tracking updates
const TrackingUpdateSchema = z.object({
  booking_id: z.string().uuid(),
  status: z.enum(['in_progress', 'on_hold', 'completed', 'cancelled']),
  progress_percentage: z.number().min(0).max(100).optional(),
  notes: z.string().max(500).optional(),
  estimated_completion: z.string().datetime().optional(),
  milestone: z.string().max(100).optional()
})

// Validation schema for tracking queries
const TrackingQuerySchema = z.object({
  booking_id: z.string().uuid().optional(),
  provider_id: z.string().uuid().optional(),
  client_id: z.string().uuid().optional(),
  status: z.enum(['all', 'in_progress', 'on_hold', 'completed', 'cancelled']).default('all')
})

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseClient()
    const { searchParams } = new URL(request.url)
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Parse and validate query parameters
    const queryParams = {
      booking_id: searchParams.get('booking_id'),
      provider_id: searchParams.get('provider_id'),
      client_id: searchParams.get('client_id'),
      status: searchParams.get('status') || 'all'
    }
    
    const validationResult = TrackingQuerySchema.safeParse(queryParams)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Invalid query parameters', 
        details: validationResult.error.errors 
      }, { status: 400 })
    }
    
    const { booking_id, provider_id, client_id, status } = validationResult.data
    
    // Build query for tracking data
    let query = supabase
      .from('bookings')
      .select(`
        id,
        status,
        operational_status,
        scheduled_date,
        created_at,
        updated_at,
        client_id,
        provider_id,
        service_id,
        amount,
        payment_status,
        services(
          title,
          description,
          category
        ),
        tracking_updates(
          id,
          status,
          progress_percentage,
          notes,
          milestone,
          created_at
        )
      `)
      .order('created_at', { ascending: false })
    
    // Apply filters based on user role and permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (profile?.role === 'provider') {
      // Providers can only see their own bookings
      query = query.eq('provider_id', user.id)
    } else if (profile?.role === 'client') {
      // Clients can only see their own bookings
      query = query.eq('client_id', user.id)
    } else if (profile?.role !== 'admin') {
      // Non-admin users can only see their own bookings
      query = query.or(`client_id.eq.${user.id},provider_id.eq.${user.id}`)
    }
    
    // Apply additional filters
    if (booking_id) {
      query = query.eq('id', booking_id)
    }
    
    if (provider_id) {
      query = query.eq('provider_id', provider_id)
    }
    
    if (client_id) {
      query = query.eq('client_id', client_id)
    }
    
    if (status !== 'all') {
      query = query.eq('operational_status', status)
    }
    
    const { data: bookings, error } = await query
    
    if (error) {
      console.error('Error fetching tracking data:', error)
      return NextResponse.json({ error: 'Failed to fetch tracking data' }, { status: 500 })
    }
    
    // Fetch client and provider information separately to avoid complex joins
    const enrichedBookings = await Promise.all(
      (bookings || []).map(async (booking) => {
        try {
          // Get client information
          const { data: client } = await supabase
            .from('profiles')
            .select('id, full_name, email, phone')
            .eq('id', booking.client_id)
            .single()
          
          // Get provider information
          const { data: provider } = await supabase
            .from('profiles')
            .select('id, full_name, email, phone, company_name')
            .eq('id', booking.provider_id)
            .single()
          
          return {
            ...booking,
            client: client || { id: '', full_name: 'Unknown Client', email: '', phone: '' },
            provider: provider || { id: '', full_name: 'Unknown Provider', email: '', phone: '', company_name: '' }
          }
        } catch (error) {
          console.error('Error enriching booking:', error)
          return {
            ...booking,
            client: { id: '', full_name: 'Unknown Client', email: '', phone: '' },
            provider: { id: '', full_name: 'Unknown Provider', email: '', phone: '', company_name: '' }
          }
        }
      })
    )

    // Transform data for better frontend consumption
    const trackingData = enrichedBookings.map(booking => {
      const serviceObj: any = Array.isArray(booking.services)
        ? booking.services[0]
        : booking.services

      return ({
        booking_id: booking.id,
        service_title: serviceObj?.title,
        service_category: serviceObj?.category,
        status: booking.status,
        operational_status: booking.operational_status,
        scheduled_date: booking.scheduled_date,
        amount: booking.amount,
        payment_status: booking.payment_status,
        client: booking.client,
        provider: booking.provider,
        created_at: booking.created_at,
        updated_at: booking.updated_at,
        tracking_updates: booking.tracking_updates || [],
        progress: calculateProgress(booking.tracking_updates || [])
      })
    })
    
    return NextResponse.json({ 
      tracking_data: trackingData,
      total_bookings: trackingData.length
    })
    
  } catch (error) {
    console.error('Tracking API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    
    // Validate request body
    const validationResult = TrackingUpdateSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: validationResult.error.errors 
      }, { status: 400 })
    }
    
    const { booking_id, status, progress_percentage, notes, estimated_completion, milestone } = validationResult.data
    
    // Check if user has permission to update this booking
    const { data: booking } = await supabase
      .from('bookings')
      .select('client_id, provider_id, status')
      .eq('id', booking_id)
      .single()
    
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    // Check permissions
    const isClient = booking.client_id === user.id
    const isProvider = booking.provider_id === user.id
    const isAdmin = profile?.role === 'admin'
    
    if (!isClient && !isProvider && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Create tracking update
    const { data: trackingUpdate, error: createError } = await supabase
      .from('tracking_updates')
      .insert({
        booking_id,
        status,
        progress_percentage,
        notes,
        milestone,
        estimated_completion,
        updated_by: user.id,
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (createError) {
      console.error('Error creating tracking update:', createError)
      return NextResponse.json({ error: 'Failed to create tracking update' }, { status: 500 })
    }
    
    // Update booking operational status
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ 
        operational_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', booking_id)
    
    if (updateError) {
      console.error('Error updating booking status:', updateError)
      // Don't fail the entire request if this fails
    }
    
    // Create notification for the other party
    const notificationData = {
      user_id: isProvider ? booking.client_id : booking.provider_id,
      type: 'tracking_update',
      title: 'Booking Status Updated',
      message: `Your booking has been updated to: ${status}`,
      data: { 
        booking_id,
        status,
        progress_percentage,
        milestone 
      }
    }
    
    await supabase.from('notifications').insert(notificationData)

    // Send email notification (best-effort)
    try {
      const recipientEmail = isProvider ?
        (await supabase.from('profiles').select('email').eq('id', booking.client_id).single()).data?.email :
        (await supabase.from('profiles').select('email').eq('id', booking.provider_id).single()).data?.email

      if (recipientEmail) {
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/notifications/email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: recipientEmail,
            subject: `Milestone update for booking ${booking_id.slice(0,8)}`,
            text: `Your booking status is now ${status}. ${milestone ? 'Milestone: ' + milestone : ''}`,
            html: `<p>Your booking status is now <strong>${status}</strong>.</p>${milestone ? `<p>Milestone: <strong>${milestone}</strong></p>` : ''}`
          })
        })
      }
    } catch {}
    
    return NextResponse.json({ 
      success: true,
      tracking_update: trackingUpdate,
      message: 'Tracking update created successfully'
    }, { status: 201 })
    
  } catch (error) {
    console.error('Tracking update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to calculate overall progress
function calculateProgress(trackingUpdates: any[]): number {
  if (!trackingUpdates || trackingUpdates.length === 0) return 0
  
  const latestUpdate = trackingUpdates.reduce((latest, current) => 
    new Date(current.created_at) > new Date(latest.created_at) ? current : latest
  )
  
  return latestUpdate.progress_percentage || 0
}
