import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
}

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders })
}

// Helper function to authenticate user
async function authenticateUser(request: NextRequest) {
  let user = null
  let authError = null
  
  try {
    const supabase = await getSupabaseAdminClient()
    const cookieHeader = request.headers.get('cookie')
    
    // Try to get user from Authorization header first
    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      try {
        const { data: { user: tokenUser }, error: tokenError } = await supabase.auth.getUser(token)
        if (tokenUser && !tokenError) {
          user = tokenUser
          return { user, authError }
        } else {
          authError = tokenError
        }
      } catch (tokenAuthError) {
        authError = tokenAuthError
      }
    }
    
    // If no Authorization header, try to extract session from cookies
    if (!user && cookieHeader) {
      try {
        const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=')
          acc[key] = value
          return acc
        }, {} as Record<string, string>)
        
        const possibleTokenKeys = [
          'sb-access-token',
          'supabase-auth-token', 
          'sb-access-token',
          'supabase.auth.token'
        ]
        
        let accessToken = null
        for (const key of possibleTokenKeys) {
          if (cookies[key]) {
            accessToken = cookies[key]
            break
          }
        }
        
        if (accessToken) {
          const { data: { user: cookieUser }, error: cookieError } = await supabase.auth.getUser(accessToken)
          if (cookieUser && !cookieError) {
            user = cookieUser
            return { user, authError }
          } else {
            authError = cookieError
          }
        }
      } catch (cookieError) {
        authError = cookieError
      }
    }
    
    if (!user) {
      authError = new Error('Auth session missing!')
    }
    
  } catch (error) {
    authError = error
  }
  
  return { user, authError }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔍 Booking details API called for ID:', params.id)
    
    const { user, authError } = await authenticateUser(request)
    
    if (authError || !user) {
      console.error('❌ Auth error:', authError)
      const response = NextResponse.json({ 
        error: 'Authentication failed' 
      }, { status: 401 })
      Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }
    
    const supabase = await getSupabaseAdminClient()
    console.log('✅ User authenticated:', user.id)

    // Get user profile to determine access rights
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_admin')
      .eq('id', user.id)
      .single()
    
    const userRole = profile?.is_admin ? 'admin' : (profile?.role || user.user_metadata?.role || 'client')

    // Load booking with comprehensive details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        title,
        status,
        approval_status,
        progress_percentage,
        priority,
        created_at,
        updated_at,
        scheduled_date,
        scheduled_time,
        estimated_completion,
        actual_completion,
        total_price,
        amount,
        currency,
        payment_status,
        payment_method,
        estimated_duration,
        actual_duration,
        location,
        location_type,
        rating,
        review,
        client_satisfaction,
        provider_rating,
        notes,
        tags,
        client_id,
        provider_id,
        service_id,
        services (
          id,
          title,
          description,
          category,
          base_price,
          currency,
          estimated_duration
        )
      `)
      .eq('id', params.id)
      .single()

    if (bookingError) {
      console.error('❌ Booking fetch error:', bookingError)
      const response = NextResponse.json({ 
        error: 'Booking not found',
        details: bookingError.message
      }, { status: 404 })
      Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }

    // Check if user has access to this booking
    const hasAccess = userRole === 'admin' || 
                     booking.client_id === user.id || 
                     booking.provider_id === user.id

    if (!hasAccess) {
      const response = NextResponse.json({ 
        error: 'Access denied' 
      }, { status: 403 })
      Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }

    // Load client profile
    let clientProfile = null
    if (booking.client_id) {
      const { data: clientData, error: clientError } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, company_name, avatar_url, timezone, preferred_contact_method, response_time')
        .eq('id', booking.client_id)
        .maybeSingle()
      
      if (!clientError && clientData) {
        clientProfile = clientData
      } else {
        console.warn('Could not load client profile:', clientError)
      }
    }

    // Load provider profile
    let providerProfile = null
    if (booking.provider_id) {
      const { data: providerData, error: providerError } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, company_name, avatar_url, specialization, rating, total_reviews, response_time, availability_status')
        .eq('id', booking.provider_id)
        .maybeSingle()
      
      if (!providerError && providerData) {
        providerProfile = providerData
      } else {
        console.warn('Could not load provider profile:', providerError)
      }
    }

    // Enrich booking with profile data
    const enrichedBooking = {
      ...booking,
      client_profile: clientProfile,
      provider_profile: providerProfile,
      // Also include client and provider data in the expected format
      client: clientProfile ? {
        id: clientProfile.id,
        full_name: clientProfile.full_name,
        email: clientProfile.email,
        phone: clientProfile.phone,
        company_name: clientProfile.company_name,
        avatar_url: clientProfile.avatar_url,
        timezone: clientProfile.timezone,
        preferred_contact: clientProfile.preferred_contact_method,
        response_time: clientProfile.response_time
      } : null,
      provider: providerProfile ? {
        id: providerProfile.id,
        full_name: providerProfile.full_name,
        email: providerProfile.email,
        phone: providerProfile.phone,
        company_name: providerProfile.company_name,
        avatar_url: providerProfile.avatar_url,
        specialization: providerProfile.specialization,
        rating: providerProfile.rating,
        total_reviews: providerProfile.total_reviews,
        response_time: providerProfile.response_time,
        availability_status: providerProfile.availability_status
      } : null
    }

    console.log(`✅ Booking details loaded with profiles:`, {
      id: booking.id,
      clientName: clientProfile?.full_name || 'Unknown',
      providerName: providerProfile?.full_name || 'Unknown'
    })

    const response = NextResponse.json({ booking: enrichedBooking })
    Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
    return response

  } catch (error) {
    console.error('❌ Error fetching booking details:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const response = NextResponse.json({ 
      error: 'Internal server error', 
      details: errorMessage 
    }, { status: 500 })
    Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
    return response
  }
}
