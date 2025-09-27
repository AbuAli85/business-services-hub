import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const userRole = searchParams.get('userRole')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Missing required parameters: userId, userRole' },
        { status: 400 }
      )
    }

    // Use the new RPC function for role-based filtering
    const { data: bookings, error } = await supabase
      .rpc('get_bookings_for_user', {
        user_uuid: userId,
        user_role: userRole,
        limit_count: limit,
        offset_count: offset
      })

    if (error) {
      console.error('Error fetching enriched bookings:', error)
      return NextResponse.json(
        { error: 'Failed to fetch bookings', details: error.message },
        { status: 500 }
      )
    }

    // Apply additional filtering if needed
    let filteredBookings = bookings
    if (status) {
      filteredBookings = bookings.filter((booking: any) => booking.status === status)
    }

    return NextResponse.json({
      bookings: filteredBookings,
      total: filteredBookings.length,
      limit,
      offset
    })

  } catch (error) {
    console.error('Error in enriched bookings API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
