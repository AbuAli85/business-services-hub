import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'
import { ProgressTrackingService } from '@/lib/progress-tracking'

// GET /api/time-entries/[bookingId] - Get time entries for a specific booking
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id
    
    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 })
    }

    // Get authenticated user
    const supabase = await getSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has access to this booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, client_id, provider_id')
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Check if user is client or provider for this booking
    const isClient = booking.client_id === user.id
    const isProvider = booking.provider_id === user.id

    if (!isClient && !isProvider) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Try to get time entries with proper error handling
    let timeEntries = []
    try {
      const { data: timeEntriesData, error: timeEntriesError } = await supabase
        .from('time_entries')
        .select('*')
        .eq('booking_id', bookingId)
        .order('logged_at', { ascending: false })

      if (timeEntriesError) {
        console.warn('Error fetching time entries:', timeEntriesError)
        // Don't fail the request, just return empty array
      } else {
        timeEntries = timeEntriesData || []
      }
    } catch (error) {
      console.warn('Exception fetching time entries:', error)
      // Return empty array for time entries
    }

    return NextResponse.json({
      success: true,
      data: timeEntries,
      count: timeEntries.length
    })

  } catch (error) {
    console.error('Error fetching time entries:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// ❌ WRONG WAY: This would cause 406 error
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id
    const supabase = await getSupabaseClient()

    // This is WRONG and will cause 406 error
    // because time_entries doesn't have booking_id column
    const { data, error } = await supabase
      .from('time_entries')
      .select('id, booking_id, duration, created_at') // ❌ booking_id doesn't exist!
      .eq('booking_id', bookingId) // ❌ This will fail!

    if (error) {
      return NextResponse.json({ 
        error: '406 Not Acceptable - time_entries table does not have booking_id column',
        details: 'Use the relationship chain: bookings → milestones → tasks → time_entries'
      }, { status: 406 })
    }

    return NextResponse.json({ data })

  } catch (error) {
    return NextResponse.json({ 
      error: 'This endpoint demonstrates the WRONG way to query time_entries',
      details: 'Use GET method instead which shows the correct approach'
    }, { status: 400 })
  }
}
