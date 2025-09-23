import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase'

// CORS headers for cross-domain access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
}

// Handle preflight OPTIONS request
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  })
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
          'supabase.auth.token',
          'sb-' + (process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0] || 'default') + '-auth-token'
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

export async function GET(request: NextRequest) {
  try {
    const { user, authError } = await authenticateUser(request)
    
    if (authError || !user) {
      const errorMessage = authError && typeof authError === 'object' && 'message' in authError 
        ? authError.message 
        : 'Authentication failed'
      const response = NextResponse.json({ error: 'Authentication failed', details: errorMessage }, { status: 401 })
      Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }
    
    const supabase = await getSupabaseAdminClient()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    // Get user profile to determine role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_admin')
      .eq('id', user.id)
      .single()
    
    const userRole = profile?.is_admin ? 'admin' : (profile?.role || user.user_metadata?.role || 'client')

    // Build query based on user role
    let query = supabase
      .from('invoices')
      .select(`
        *,
        bookings(id, title, client_id, provider_id)
      `)
      .order('created_at', { ascending: false })

    // Filter by user role
    if (userRole === 'client') {
      query = query.eq('client_id', user.id)
    } else if (userRole === 'provider') {
      query = query.eq('provider_id', user.id)
    }
    // Admin can see all invoices - no additional filter

    // Filter by status if specified
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: invoices, error } = await query

    if (error) {
      console.error('Error fetching invoices:', error)
      const response = NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
      Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
      return response
    }

    const response = NextResponse.json({ invoices: invoices || [] })
    Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
    return response

  } catch (error) {
    console.error('Error fetching invoices:', error)
    const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
    return response
  }
}