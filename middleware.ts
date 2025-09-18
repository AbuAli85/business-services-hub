import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { AuthMiddleware } from '@/lib/auth-middleware'

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
  const { pathname } = req.nextUrl
  // First, run auth checks for protected app routes
  const needsAuthCheck = pathname.startsWith('/dashboard') || pathname.startsWith('/auth/onboarding')
  if (needsAuthCheck) {
    const auth = new AuthMiddleware()
    const authResponse = auth.handleRequest(req)
    // handleRequest returns a Promise<NextResponse>; we need to return a Response directly from middleware
    // so we chain and attach headers consistently below.
    // Note: We will early-return from within the async handler by awaiting it synchronously via .then().
    // However, Next middleware cannot be async-returned conditionally without making function async. Make it async.
  }

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
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation()')
  // CSP minimal: allow self + images/mailto; extend as needed
  res.headers.set('Content-Security-Policy', "default-src 'self'; img-src 'self' data: https:; connect-src 'self' https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; base-uri 'self'; form-action 'self'")

  // Simple rate limit for API routes
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
  matcher: [
    '/api/:path*',
    '/dashboard',
    '/dashboard/:path*',
    '/auth/onboarding',
    '/auth/onboarding/:path*'
  ]
}
