import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create Supabase client only when needed (not at build time)
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables not configured')
  }
  
  return createClient(supabaseUrl, supabaseKey)
}

// Basic UUID validator to guard against Postgres 22P02 errors
function isValidUuid(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
  return uuidRegex.test(trimmed)
}

function badRequest(message: string, details?: Record<string, any>) {
  return NextResponse.json({ error: message, ...(details ? { details } : {}) }, { status: 400 })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { event, data, webhook_id } = body

    // Enhanced logging to debug the "create" issue
    console.log('🔍 Webhook received:', {
      event,
      webhook_id,
      data,
      raw_body: body,
      timestamp: new Date().toISOString()
    })

    // Validate webhook request
    if (!event || !webhook_id) {
      return NextResponse.json(
        { error: 'Missing required fields: event and webhook_id' },
        { status: 400 }
      )
    }

    // Additional validation for new-service-created event
    if (event === 'new-service-created' && data) {
      console.log('🔍 New service created data validation:', {
        service_id: data.service_id,
        provider_id: data.provider_id,
        service_name: data.service_name,
        service_id_type: typeof data.service_id,
        provider_id_type: typeof data.provider_id,
        service_id_length: data.service_id?.length,
        provider_id_length: data.provider_id?.length
      })
      
      if (data.service_id === 'create' || data.provider_id === 'create') {
        console.error('❌ Invalid webhook data detected:', {
          service_id: data.service_id,
          provider_id: data.provider_id,
          message: 'Received "create" instead of UUID'
        })
        return NextResponse.json(
          { 
            error: 'Invalid webhook data: service_id and provider_id must be valid UUIDs',
            details: {
              received: {
                service_id: data.service_id,
                provider_id: data.provider_id
              },
              expected: 'Valid UUID format'
            }
          },
          { status: 400 }
        )
      }
    }

    // Log webhook for debugging
    console.log(`Webhook received: ${event}`, { webhook_id, data })

    // Handle different webhook events
    switch (event) {
      case 'tracking-updated':
        return await handleTrackingUpdated(data)
      
      case 'booking-created':
        return await handleBookingCreated(data)
      
      case 'new-service-created':
        return await handleNewServiceCreated(data)
      
      case 'payment-succeeded':
        return await handlePaymentSucceeded(data)
      
      case 'weekly-report':
        return await handleWeeklyReport()
      
      default:
        return NextResponse.json(
          { error: `Unknown event type: ${event}` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleTrackingUpdated(data: any) {
  try {
    const { booking_id, status, tracking_info } = data
    const supabase = await getSupabaseClient()
    
    // Update booking status
    const { error } = await supabase
      .from('bookings')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', booking_id)

    if (error) throw error

    // Log the tracking update
    await supabase
      .from('audit_logs')
      .insert({
        action: 'tracking_updated',
        table_name: 'bookings',
        record_id: booking_id,
        new_values: { status, tracking_info }
      })

    return NextResponse.json({ 
      success: true, 
      message: 'Tracking updated successfully' 
    })
  } catch (error) {
    console.error('Tracking update error:', error)
    return NextResponse.json(
      { error: 'Failed to update tracking' },
      { status: 500 }
    )
  }
}

async function handleBookingCreated(data: any) {
  try {
    const { 
      client_id, 
      service_id, 
      resource_id, 
      start_time, 
      end_time, 
      total_cost 
    } = data

    // Validate required UUIDs early
    if (!isValidUuid(client_id)) return badRequest('Invalid client_id (UUID expected)')
    if (!isValidUuid(service_id)) return badRequest('Invalid service_id (UUID expected)')
    if (data.provider_id && !isValidUuid(data.provider_id)) return badRequest('Invalid provider_id (UUID expected)')

    const supabase = await getSupabaseClient()

    // Create new booking with all required fields
    const { data: booking, error } = await supabase
      .from('bookings')
      .insert({
        client_id,
        provider_id: data.provider_id,
        service_id,
        start_time,
        end_time,
        total_cost,
        status: 'draft',
        user_id: client_id,
        title: `Booking for Service ${data.service_id}`,
        currency: 'OMR',
        booking_number: `BK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`
      })
      .select()
      .single()

    if (error) throw error

    // Log the booking creation
    await supabase
      .from('audit_logs')
      .insert({
        action: 'booking_created',
        table_name: 'bookings',
        record_id: booking.id,
        new_values: { status: 'pending' }
      })

    return NextResponse.json({ 
      success: true, 
      booking_id: booking.id,
      message: 'Booking created successfully' 
    })
  } catch (error) {
    console.error('Booking creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    )
  }
}

async function handleNewServiceCreated(data: any) {
  try {
    const { service_id, provider_id, service_name } = data
    if (!isValidUuid(service_id)) return badRequest('Invalid service_id (UUID expected)', { received: service_id })
    if (provider_id && !isValidUuid(provider_id)) return badRequest('Invalid provider_id (UUID expected)', { received: provider_id })
    const supabase = await getSupabaseClient()

    // Update service status to pending approval
    const { error } = await supabase
      .from('services')
      .update({ 
        approval_status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', service_id)

    if (error) throw error

    // Log the service creation
    await supabase
      .from('audit_logs')
      .insert({
        action: 'set_pending_approval',
        table_name: 'services',
        record_id: service_id,
        new_values: { approval_status: 'pending' }
      })

    return NextResponse.json({ 
      success: true, 
      message: 'Service marked for approval' 
    })
  } catch (error) {
    console.error('Service creation error:', error)
    return NextResponse.json(
      { error: 'Failed to process service creation' },
      { status: 500 }
    )
  }
}

async function handlePaymentSucceeded(data: any) {
  try {
    const { booking_id, amount, payment_method } = data
    if (!isValidUuid(booking_id)) return badRequest('Invalid booking_id (UUID expected)')
    const supabase = await getSupabaseClient()

    // Update booking status to paid
    const { error } = await supabase
      .from('bookings')
      .update({ 
        status: 'paid',
        updated_at: new Date().toISOString()
      })
      .eq('id', booking_id)

    if (error) throw error

    // Log the payment
    await supabase
      .from('audit_logs')
      .insert({
        action: 'payment_succeeded',
        table_name: 'bookings',
        record_id: booking_id,
        new_values: { 
          status: 'paid',
          payment_amount: amount,
          payment_method
        }
      })

    return NextResponse.json({ 
      success: true, 
      message: 'Payment processed successfully' 
    })
  } catch (error) {
    console.error('Payment processing error:', error)
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    )
  }
}

async function handleWeeklyReport() {
  try {
    // Get weekly booking data
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const supabase = await getSupabaseClient()

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .gte('created_at', oneWeekAgo.toISOString())

    if (error) throw error

    // Log the weekly report generation
    await supabase
      .from('audit_logs')
      .insert({
        action: 'weekly_report_generated',
        table_name: 'bookings',
        record_id: 'weekly_report',
        new_values: { 
          report_date: new Date().toISOString(),
          total_bookings: bookings?.length || 0
        }
      })

    return NextResponse.json({ 
      success: true, 
      total_bookings: bookings?.length || 0,
      message: 'Weekly report generated successfully' 
    })
  } catch (error) {
    console.error('Weekly report error:', error)
    return NextResponse.json(
      { error: 'Failed to generate weekly report' },
      { status: 500 }
    )
  }
}

// GET method for testing webhook endpoints
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const event = searchParams.get('event')

  if (!event) {
    return NextResponse.json({
      message: 'Webhook endpoint ready. Use POST with event parameter.',
      available_events: [
        'tracking-updated',
        'booking-created', 
        'new-service-created',
        'payment-succeeded',
        'weekly-report'
      ]
    })
  }

  // Test the webhook endpoint
  const testData = {
    event,
    webhook_id: 'test',
    data: { test: true, timestamp: new Date().toISOString() }
  }

  return NextResponse.json({
    message: `Test webhook for event: ${event}`,
    test_data: testData,
    endpoint: '/api/webhooks'
  })
}
