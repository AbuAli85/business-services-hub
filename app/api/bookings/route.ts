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
    const supabase = await getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
      metadata: { 
        booking_id: booking.id,
        service_title: service.title,
        client_name: clientProfile?.full_name || 'Client'
      },
      priority: 'high'
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
    const supabase = await getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
    const supabase = await getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .single()

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

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
      console.error('Booking update error:', updateError)
      return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 })
    }

    if (notification) {
      await supabase.from('notifications').insert({
        user_id: notification.user_id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: 'medium',
        metadata: { booking_id }
      })
    }

    return NextResponse.json({ success: true, booking: updated })
  } catch (error) {
    console.error('Booking update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
