import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'

import { triggerReviewReceived } from '@/lib/notification-triggers-comprehensive'
export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseClient()
    const body = await request.json()
    
    const { booking_id, client_id, provider_id, rating, comment } = body

    // Validate required fields
    if (!client_id || !provider_id || !rating) {
      return NextResponse.json(
        { error: 'Missing required fields: client_id, provider_id, rating' },
        { status: 400 }
      )
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    // Check if review already exists for this booking
    if (booking_id) {
      const { data: existingReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('booking_id', booking_id)
        .single()

      if (existingReview) {
        return NextResponse.json(
          { error: 'Review already exists for this booking' },
          { status: 409 }
        )
      }
    }

    // Insert the review
    const { data: review, error } = await supabase
      .from('reviews')
      .insert({
        booking_id,
        client_id,
        provider_id,
        rating,
        comment
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating review:', error)
      return NextResponse.json(
        { error: 'Failed to create review' },
        { status: 500 }
      )
    }

    return NextResponse.json({ review })
  } catch (error) {
    console.error('Error in reviews API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseClient()
    const { searchParams } = new URL(request.url)
    
    const provider_id = searchParams.get('provider_id')
    const service_id = searchParams.get('service_id')
    const client_id = searchParams.get('client_id')

    let query = supabase.from('reviews').select('*')

    if (provider_id) {
      query = query.eq('provider_id', provider_id)
    }

    if (service_id) {
      // Join with bookings to filter by service
      query = supabase
        .from('reviews')
        .select(`
          *,
          bookings!inner(service_id)
        `)
        .eq('bookings.service_id', service_id)
    }

    if (client_id) {
      query = query.eq('client_id', client_id)
    }

    const { data: reviews, error } = await query

    if (error) {
      console.error('Error fetching reviews:', error)
      return NextResponse.json(
        { error: 'Failed to fetch reviews' },
        { status: 500 }
      )
    }

    return NextResponse.json({ reviews })
  } catch (error) {
    console.error('Error in reviews API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
