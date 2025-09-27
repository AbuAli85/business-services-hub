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
    console.log('🔍 Request URL:', request.url)
    console.log('🔍 Request method:', request.method)
    
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
    console.log('🔍 Searching for booking with ID:', params.id)
    console.log('🔍 User ID:', user.id)
    console.log('🔍 User role:', userRole)
    
    // First try a simple query to get basic booking data
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', params.id)
      .single()
    
    console.log('🔍 Booking query result:', { 
      hasData: !!booking, 
      hasError: !!bookingError,
      errorMessage: bookingError?.message,
      bookingId: booking?.id 
    })

    if (bookingError) {
      console.error('❌ Booking fetch error:', bookingError)
      console.error('❌ Booking ID being searched:', params.id)
      console.error('❌ User ID:', user.id)
      const response = NextResponse.json({ 
        error: 'Booking not found',
        details: bookingError.message
      }, { status: 404 })
      Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }

    if (!booking) {
      console.error('❌ No booking found for ID:', params.id)
      const response = NextResponse.json({ 
        error: 'Booking not found',
        details: 'No booking with this ID exists'
      }, { status: 404 })
      Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }

    // Check if user has access to this booking
    const hasAccess = userRole === 'admin' || 
                     booking.client_id === user.id || 
                     booking.provider_id === user.id

    console.log('🔍 Access check:', {
      userRole,
      userId: user.id,
      bookingClientId: booking.client_id,
      bookingProviderId: booking.provider_id,
      hasAccess
    })

    if (!hasAccess) {
      console.error('❌ Access denied for booking:', params.id)
      const response = NextResponse.json({ 
        error: 'Access denied' 
      }, { status: 403 })
      Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }

    // Load client profile
    let clientProfile = null
    if (booking.client_id) {
      console.log('🔍 Loading client profile for ID:', booking.client_id)
      const { data: clientData, error: clientError } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, company_name, avatar_url')
        .eq('id', booking.client_id)
        .maybeSingle()
      
      console.log('🔍 Client profile query result:', {
        hasData: !!clientData,
        hasError: !!clientError,
        errorMessage: clientError?.message,
        clientName: clientData?.full_name
      })
      
      if (!clientError && clientData) {
        clientProfile = clientData
        console.log('✅ Client profile loaded:', clientData.full_name)
      } else {
        console.warn('❌ Could not load client profile:', clientError)
      }
    } else {
      console.warn('❌ No client_id found in booking')
    }

    // Load provider profile
    let providerProfile = null
    if (booking.provider_id) {
      const { data: providerData, error: providerError } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, company_name, avatar_url')
        .eq('id', booking.provider_id)
        .maybeSingle()
      
      if (!providerError && providerData) {
        providerProfile = providerData
        console.log('✅ Provider profile loaded:', providerData.full_name)
      } else {
        console.warn('❌ Could not load provider profile:', providerError)
      }
    } else {
      console.warn('❌ No provider_id found in booking')
    }

    // Load service data separately
    let serviceData = null
    if (booking.service_id) {
      const { data: service, error: serviceError } = await supabase
        .from('services')
        .select('id, title, description, category, base_price, currency, estimated_duration')
        .eq('id', booking.service_id)
        .maybeSingle()
      
      if (!serviceError && service) {
        serviceData = service
        console.log('✅ Service data loaded:', service.title)
      } else {
        console.warn('Could not load service data:', serviceError)
      }
    }

    // Enrich booking with profile data
    const enrichedBooking = {
      ...booking,
      client_profile: clientProfile,
      provider_profile: providerProfile,
      service: serviceData,
      // Also include client and provider data in the expected format
      client: clientProfile ? {
        id: clientProfile.id,
        full_name: clientProfile.full_name,
        email: clientProfile.email,
        phone: clientProfile.phone,
        company_name: clientProfile.company_name,
        avatar_url: clientProfile.avatar_url,
        timezone: 'Asia/Muscat', // Default timezone
        preferred_contact: 'message', // Default contact method
        response_time: '< 1 hour' // Default response time
      } : null,
      provider: providerProfile ? {
        id: providerProfile.id,
        full_name: providerProfile.full_name,
        email: providerProfile.email,
        phone: providerProfile.phone,
        company_name: providerProfile.company_name,
        avatar_url: providerProfile.avatar_url,
        specialization: [], // Default empty array
        rating: 5.0, // Default rating
        total_reviews: 0, // Default value since column doesn't exist
        response_time: '< 1 hour', // Default response time
        availability_status: 'available' // Default availability
      } : null
    }

    console.log(`✅ Booking details loaded with profiles:`, {
      id: booking.id,
      clientName: clientProfile?.full_name || 'Unknown',
      providerName: providerProfile?.full_name || 'Unknown',
      serviceName: serviceData?.title || 'Unknown'
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
