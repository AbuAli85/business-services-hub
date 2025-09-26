import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { AuthMiddleware } from '@/lib/auth-middleware'
import { updateSession } from '@/utils/supabase/middleware'

// Basic edge middleware for CORS + security headers + simple rate limiting bucket
const ENV_ALLOWED_ORIGIN = process.env.NEXT_PUBLIC_APP_URL || ''
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
let SUPABASE_HOST = ''
try { if (SUPABASE_URL) SUPABASE_HOST = new URL(SUPABASE_URL).host } catch {}

// naive in-memory bucket (per instance); for production, use Upstash or KV
const buckets = new Map<string, { count: number; resetAt: number }>()
// Increase window and limit slightly to reduce false positives on bursts
const WINDOW_MS = 15_000
const LIMIT = 60

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

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const requestOrigin = req.headers.get('origin') || req.nextUrl.origin
  const ALLOWED_ORIGIN = ENV_ALLOWED_ORIGIN || requestOrigin

  // Simple rate limit for API routes
  if (pathname.startsWith('/api/')) {
    const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown'
    // Special-case bookings GET: key by bookingId to avoid cross-entity throttling
    let key = `${pathname}:${ip}`
    if (pathname === '/api/bookings' && req.method === 'GET') {
      const bookingId = req.nextUrl.searchParams.get('bookingId') || 'all'
      key = `${pathname}:${bookingId}:${ip}`
    }
    if (!rateLimit(key)) {
      return new NextResponse(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }

  // Determine if route needs auth checks
  const needsAuthCheck = pathname.startsWith('/dashboard') || pathname.startsWith('/auth/onboarding') || pathname.startsWith('/auth/pending-approval')
  
  // Determine if API route needs auth checks
  const needsApiAuthCheck = pathname.startsWith('/api/') && !pathname.startsWith('/api/webhooks') && !pathname.startsWith('/api/auth/sync-token')
  
  // Determine if route needs session cookie normalization (includes API routes)
  const needsSessionUpdate = needsAuthCheck || pathname.startsWith('/api/')

  // Only normalize Supabase session cookies for protected routes and when env is present
  let res = NextResponse.next()
  if (needsSessionUpdate && SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      res = await updateSession(req)
    } catch {}
  }
  if (needsAuthCheck || needsApiAuthCheck) {
    const auth = new AuthMiddleware()
    res = await auth.handleRequest(req)
  }

  // CORS: only allow your app origin
  const origin = req.headers.get('origin') || ''
  if (!origin || origin === ALLOWED_ORIGIN) {
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
  
  // CSP: allow Supabase REST/Realtime and hCaptcha
  const connectSrc = [
    "'self'",
    'https:',
    'wss:',
    SUPABASE_HOST ? `https://${SUPABASE_HOST}` : '',
    SUPABASE_HOST ? `wss://${SUPABASE_HOST}` : ''
  ].filter(Boolean).join(' ')
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    'https://js.hcaptcha.com',
    'https://challenges.hcaptcha.com',
    'https://vercel.live'
  ].join(' ')
  const frameSrc = [
    "'self'",
    'https://hcaptcha.com',
    'https://*.hcaptcha.com',
    'https://vercel.live',
    'https://*.vercel.live'
  ].join(' ')
  res.headers.set('Content-Security-Policy', `default-src 'self'; img-src 'self' data: https: blob:; connect-src ${connectSrc}; script-src ${scriptSrc}; style-src 'self' 'unsafe-inline'; font-src 'self' data:; frame-src ${frameSrc}; base-uri 'self'; form-action 'self'`)

  // Handle preflight quickly
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: res.headers })
  }

  // For protected routes, preserve potential redirects from auth middleware
  if (needsAuthCheck || needsApiAuthCheck) {
    return res
  }

  // For non-protected routes, optionally forward a minimal allow-listed header set upstream
  const forwarded = new Headers()
  req.headers.forEach((v, k) => {
    const n = k.toLowerCase()
    if (!n.startsWith('x-') && n !== 'authorization' && n !== 'cookie') {
      forwarded.set(k, v)
    }
  })
  return NextResponse.next({ request: { headers: forwarded }, headers: res.headers })
}

export const config = {
  matcher: [
    '/api/:path*',
    '/dashboard',
    '/dashboard/:path*',
    '/auth/onboarding',
    '/auth/onboarding/:path*',
    '/auth/pending-approval',
    '/auth/pending-approval/:path*'
  ]
}
