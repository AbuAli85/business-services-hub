import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Basic edge middleware for CORS + security headers + simple rate limiting bucket
const ALLOWED_ORIGIN = process.env.NEXT_PUBLIC_APP_URL || 'https://marketing.thedigitalmorph.com'

// naive in-memory bucket (per instance); for production, use Upstash or KV
const buckets = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 15_000
const LIMIT = 30

function rateLimit(key: string): boolean {
  const now = Date.now()
  const entry = buckets.get(key)
  if (!entry || entry.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (entry.count >= LIMIT) return false
  entry.count += 1
  return true
}

export function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // CORS: only allow your app origin
  const origin = req.headers.get('origin') || ''
  if (origin === ALLOWED_ORIGIN) {
    res.headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN)
  }
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.headers.set('Access-Control-Max-Age', '86400')

  // Security headers
  res.headers.set('Referrer-Policy', 'no-referrer')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  // CSP minimal: allow self + images/mailto; extend as needed
  res.headers.set('Content-Security-Policy', "default-src 'self'; img-src 'self' data: https:; connect-src 'self' https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; base-uri 'self'; form-action 'self'")

  // Simple rate limit for API routes
  const pathname = req.nextUrl.pathname
  if (pathname.startsWith('/api/')) {
    const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown'
    const key = `${pathname}:${ip}`
    if (!rateLimit(key)) {
      return new NextResponse(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }

  // Handle preflight quickly
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: res.headers })
  }

  return res
}

export const config = {
  matcher: ['/api/:path*']
}

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

    // API routes handle their own authentication
    // Let the API routes manage authentication instead of middleware
    if (url === '/api/bookings' || url.startsWith('/api/services')) {
      console.log('🔐 Middleware: API route detected, letting API handle authentication:', url)
      // Don't block API routes - let them handle their own auth
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
    // '/api/bookings', // Temporarily disabled to test auth issues
    '/api/services/:path*',
    '/api/admin/:path*',
  ],
}
