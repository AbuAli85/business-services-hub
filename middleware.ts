import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Create a simple Supabase client for middleware
function createMiddlewareSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables not configured in middleware')
  }
  
  // Import dynamically to avoid build issues
  const { createClient } = require('@supabase/supabase-js')
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false, // Disable in middleware
      persistSession: false,   // Disable in middleware
    }
  })
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  try {
    const supabase = createMiddlewareSupabaseClient()
    
    // Get the session from the request headers
    const authHeader = req.headers.get('authorization')
    let session = null
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token)
        if (!error && user) {
          // Create a mock session object for middleware
          session = { user }
        }
      } catch (tokenError) {
        console.warn('Token validation failed in middleware:', tokenError)
      }
    }
    
    // If no token in header, try to get session from cookies
    if (!session) {
      try {
        const { data: { session: cookieSession } } = await supabase.auth.getSession()
        session = cookieSession
      } catch (sessionError) {
        console.warn('Session retrieval failed in middleware:', sessionError)
      }
    }

    const url = req.nextUrl.pathname

    // Protect dashboard routes
    if (url.startsWith('/dashboard')) {
      if (!session) {
        console.log('🔒 Redirecting to sign-in: No session found')
        return NextResponse.redirect(new URL('/auth/sign-in', req.url))
      }

      const role = (session.user.user_metadata?.role ?? 'client') as string
      console.log('🔐 User role in middleware:', role, 'for URL:', url)
      
      // Admin routes - only admin can access
      if (url.startsWith('/dashboard/admin') && role !== 'admin') {
        console.log('🚫 Access denied to admin route for role:', role)
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
      
      // Provider routes - only provider and admin can access
      if (url.startsWith('/dashboard/provider') && !['provider', 'admin'].includes(role)) {
        console.log('🚫 Access denied to provider route for role:', role)
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
      
      // Client routes - only client and admin can access
      if (url.startsWith('/dashboard/client') && !['client', 'admin'].includes(role)) {
        console.log('🚫 Access denied to client route for role:', role)
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    // Protect API routes that require authentication
    if (url === '/api/bookings' || url.startsWith('/api/services')) {
      console.log('🔐 Middleware: Checking API route:', url)
      if (!session) {
        console.log('🚫 API access denied: No session')
        return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      console.log('✅ API access granted for user:', session.user.id)
    }

    // Protect admin API routes
    if (url.startsWith('/api/admin')) {
      if (!session) {
        console.log('🚫 Admin API access denied: No session')
        return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      
      const role = (session.user.user_metadata?.role ?? 'client') as string
      if (role !== 'admin') {
        console.log('🚫 Admin API access denied for role:', role)
        return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }

    return res
    
  } catch (error) {
    console.error('❌ Middleware error:', error)
    
    // If middleware fails, allow the request to proceed
    // This prevents the entire app from breaking due to middleware issues
    return res
  }
}

export const config = {
  matcher: [
    // Temporarily disabled for testing
    // '/dashboard/:path*',
    '/api/bookings', // Re-enabled to fix 404 issue
    '/api/services/:path*',
    '/api/admin/:path*',
  ],
}
