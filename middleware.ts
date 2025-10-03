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
const RATE_LIMIT_MAX = 200 // allow higher burst for dashboard GETs

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
  '/api/auth/session',
  '/api/services', // Public service listings
  '/api/bookings/summary' // Dashboard summary endpoint should be public (handled via RLS)
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
  const res = NextResponse.next()
  
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

  // Handle stray POST requests to /auth/sign-in to prevent 405 errors
  if (pathname === '/auth/sign-in' && req.method === 'POST') {
    return NextResponse.json({ ok: true })
  }

  // Rate limiting for API routes
  // Rate limit only mutating API requests to avoid blocking dashboard GET bursts
  if (pathname.startsWith('/api/') && !['GET', 'OPTIONS', 'HEAD'].includes(req.method)) {
    const ip = (req.headers.get('x-real-ip')
      || req.headers.get('x-forwarded-for')?.split(',')[0]
      || (req as any).ip
      || 'unknown') as string
    if (isRateLimited(ip)) {
      console.warn(`[rate-limit] Too many requests from ${ip} to ${pathname}`)
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
      // Quick session check using access token from HttpOnly cookie
      const supabase = createMiddlewareClient(req)
      const { data, error } = await supabase.auth.getUser()
      const user = data?.user
      
      if (error || !user) {
        if (error) {
          console.error('[auth] getUser error:', { message: (error as any).message, pathname })
        }
        return NextResponse.redirect(new URL('/auth/sign-in', req.url))
      }

      // Add minimal headers
      res.headers.set('x-internal-user-id', user.id)
      res.headers.set('x-user-email', user.email || '')
      
      return res
      
    } catch (error) {
      console.error('[auth] unexpected error during middleware auth check:', { error, pathname })
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
    '/auth/:path*'
  ]
}
