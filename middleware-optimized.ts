import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase-middleware'

// Optimized middleware for production - minimal processing
const ENV_ALLOWED_ORIGIN = process.env.NEXT_PUBLIC_APP_URL || ''
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Simple rate limiting (in-memory, per instance)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW = 15_000 // 15 seconds
const RATE_LIMIT_MAX = 60 // 60 requests per window

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const key = ip
  const entry = rateLimitMap.get(key)
  
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return false
  }
  
  if (entry.count >= RATE_LIMIT_MAX) {
    return true
  }
  
  entry.count++
  return false
}

// Public routes that don't need auth
const PUBLIC_ROUTES = [
  '/',
  '/auth/sign-in',
  '/auth/sign-up', 
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/callback',
  '/services',
  '/about',
  '/contact',
  '/terms',
  '/privacy'
]

// API routes that don't need auth
const PUBLIC_API_ROUTES = [
  '/api/webhooks',
  '/api/auth/sync-token',
  '/api/services' // Public service listings
]

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => {
    if (route === '/') return pathname === '/'
    return pathname.startsWith(route)
  })
}

function isPublicApiRoute(pathname: string): boolean {
  return PUBLIC_API_ROUTES.some(route => pathname.startsWith(route))
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  
  // Skip static files and favicon
  if (pathname.startsWith('/_next') || 
      pathname.startsWith('/favicon') ||
      pathname.startsWith('/api/_next')) {
    return NextResponse.next()
  }

  // Handle preflight requests quickly
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204 })
  }

  // Rate limiting for API routes
  if (pathname.startsWith('/api/')) {
    const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown'
    if (isRateLimited(ip)) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests' }), 
        { 
          status: 429, 
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }

  // Skip auth for public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // Skip auth for public API routes
  if (pathname.startsWith('/api/') && isPublicApiRoute(pathname)) {
    return NextResponse.next()
  }

  // For protected routes, do minimal auth check
  if (pathname.startsWith('/dashboard') || 
      pathname.startsWith('/auth/onboarding') ||
      pathname.startsWith('/auth/pending-approval') ||
      (pathname.startsWith('/api/') && !isPublicApiRoute(pathname))) {
    
    try {
      // Quick session check without heavy database operations
      const supabase = createMiddlewareClient()
      const { data, error } = await supabase.auth.getUser()
      const user = data?.user
      
      if (error || !user) {
        return NextResponse.redirect(new URL('/auth/sign-in', req.url))
      }

      // For dashboard routes, check if user has basic profile
      if (pathname.startsWith('/dashboard')) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('id', user.id)
          .single()
        
        // If no profile, redirect to onboarding
        if (!profile) {
          return NextResponse.redirect(new URL('/auth/onboarding', req.url))
        }
      }

      // Add minimal headers
      const response = NextResponse.next()
      response.headers.set('x-user-id', user.id)
      response.headers.set('x-user-email', user.email || '')
      
      return response
      
    } catch (error) {
      // If auth check fails, redirect to sign-in
      return NextResponse.redirect(new URL('/auth/sign-in', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/api/:path*',
    '/dashboard/:path*',
    '/auth/onboarding/:path*',
    '/auth/pending-approval/:path*'
  ]
}
