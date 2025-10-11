import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the first service to create a test booking for
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, title, provider_id')
      .limit(1)
      .single()

    if (servicesError || !services) {
      return NextResponse.json({ error: 'No services found to test with' }, { status: 404 })
    }

    // Create a test booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        service_id: services.id,
        client_id: user.id,
        provider_id: services.provider_id,
        title: `Test Booking for ${services.title}`,
        service_title: services.title,
        status: 'pending',
        amount: 100,
        currency: 'OMR',
        scheduled_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single()

    if (bookingError) {
      console.error('Error creating test booking:', bookingError)
      return NextResponse.json({ error: 'Failed to create test booking', details: bookingError }, { status: 500 })
    }

    console.log('✅ Test booking created:', booking)

    return NextResponse.json({
      success: true,
      message: 'Test booking created successfully',
      booking: {
        id: booking.id,
        service_id: booking.service_id,
        title: booking.title,
        status: booking.status
      }
    })

  } catch (error) {
    console.error('Test booking error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get all bookings to see what's in the database
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        service_id,
        title,
        status,
        amount,
        created_at,
        services(title, provider_id)
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError)
      return NextResponse.json({ error: 'Failed to fetch bookings', details: bookingsError }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      total_bookings: bookings?.length || 0,
      bookings: bookings || []
    })

  } catch (error) {
    console.error('Test booking GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
