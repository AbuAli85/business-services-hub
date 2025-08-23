import { NextResponse } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  const url = req.nextUrl.pathname

  // Protect dashboard routes
  if (url.startsWith('/dashboard')) {
    if (!session) {
      return NextResponse.redirect(new URL('/auth/sign-in', req.url))
    }

    const role = (session.user.user_metadata?.role ?? 'client') as string
    
    // Admin routes - only admin can access
    if (url.startsWith('/dashboard/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    
    // Provider routes - only provider and admin can access
    if (url.startsWith('/dashboard/provider') && !['provider', 'admin'].includes(role)) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    
    // Client routes - only client and admin can access
    if (url.startsWith('/dashboard/client') && !['client', 'admin'].includes(role)) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  // Protect API routes that require authentication
  if (url.startsWith('/api/bookings') || url.startsWith('/api/services')) {
    if (!session) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }

  // Protect admin API routes
  if (url.startsWith('/api/admin')) {
    if (!session) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    const role = (session.user.user_metadata?.role ?? 'client') as string
    if (role !== 'admin') {
      return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }

  return res
}

export const config = {
  matcher: [
    // Temporarily disabled for testing
    // '/dashboard/:path*',
    '/api/bookings/:path*',
    '/api/services/:path*',
    '/api/admin/:path*',
  ],
}
