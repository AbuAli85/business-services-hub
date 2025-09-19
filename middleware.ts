import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { AuthMiddleware } from '@/lib/auth-middleware'

// Basic edge middleware for CORS + security headers + simple rate limiting bucket
const ENV_ALLOWED_ORIGIN = process.env.NEXT_PUBLIC_APP_URL || ''
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
let SUPABASE_HOST = ''
try { if (SUPABASE_URL) SUPABASE_HOST = new URL(SUPABASE_URL).host } catch {}

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

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const requestOrigin = req.headers.get('origin') || req.nextUrl.origin
  const ALLOWED_ORIGIN = ENV_ALLOWED_ORIGIN || requestOrigin

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

  // For protected app routes, enforce auth using AuthMiddleware
  const needsAuthCheck = pathname.startsWith('/dashboard') || pathname.startsWith('/auth/onboarding') || pathname.startsWith('/auth/pending-approval')
  let res = NextResponse.next()
  if (needsAuthCheck) {
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
    'https://*.hcaptcha.com'
  ].join(' ')
  res.headers.set('Content-Security-Policy', `default-src 'self'; img-src 'self' data: https: blob:; connect-src ${connectSrc}; script-src ${scriptSrc}; style-src 'self' 'unsafe-inline'; font-src 'self' data:; frame-src ${frameSrc}; base-uri 'self'; form-action 'self'`)

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
    '/auth/onboarding/:path*',
    '/auth/pending-approval',
    '/auth/pending-approval/:path*'
  ]
}
