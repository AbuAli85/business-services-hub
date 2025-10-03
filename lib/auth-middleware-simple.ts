import { NextRequest, NextResponse } from 'next/server'
import { createMiddlewareClient } from './supabase-middleware'

// Simplified auth middleware for production
export class SimpleAuthMiddleware {
  async checkAuth(req: NextRequest): Promise<{
    isAuthenticated: boolean
    user: any | null
    profile: any | null
    role: string | null
    accessToken?: string | null
    error?: string
  }> {
    try {
      // Get token from cookies or Authorization header
      let token = req.cookies.get('sb-access-token')?.value
      const authHeader = req.headers.get('authorization')
      const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null
      
      if (bearerToken && (!token || token !== bearerToken)) {
        token = bearerToken
      }

      if (!token) {
        return {
          isAuthenticated: false,
          user: null,
          profile: null,
          role: null,
          accessToken: null,
          error: 'No session token found'
        }
      }

      // Quick user verification
      const supabase = createMiddlewareClient()
      const { data, error: userError } = await supabase.auth.getUser(token)
      const user = data?.user

      if (userError || !user) {
        return {
          isAuthenticated: false,
          user: null,
          profile: null,
          role: null,
          accessToken: token,
          error: userError?.message || 'Invalid session'
        }
      }

      // Quick profile lookup (no creation, no heavy operations)
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, role, full_name, company_id')
        .eq('id', user.id)
        .single()

      const role = profile?.role || user.user_metadata?.role || null

      return {
        isAuthenticated: true,
        user,
        profile,
        role,
        accessToken: token
      }
    } catch (error) {
      return {
        isAuthenticated: false,
        user: null,
        profile: null,
        role: null,
        accessToken: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  isPublicRoute(pathname: string): boolean {
    const publicRoutes = [
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
    
    return publicRoutes.some(route => {
      if (route === '/') return pathname === '/'
      return pathname.startsWith(route)
    })
  }

  getRequiredRole(pathname: string): { roles: string[]; requireProfile?: boolean } | null {
    const protectedRoutes: Record<string, { roles: string[]; requireProfile?: boolean }> = {
      '/dashboard': { roles: ['client', 'provider', 'admin'] },
      '/dashboard/admin': { roles: ['admin'], requireProfile: true },
      '/dashboard/provider': { roles: ['provider'], requireProfile: true },
      '/dashboard/client': { roles: ['client'], requireProfile: true },
      '/dashboard/bookings': { roles: ['client', 'provider', 'admin'] },
      '/auth/onboarding': { roles: ['client', 'provider'] },
      '/api/bookings': { roles: ['client', 'provider', 'admin'] },
      '/api/milestones': { roles: ['client', 'provider', 'admin'] },
      '/api/tasks': { roles: ['client', 'provider', 'admin'] },
      '/api/invoices': { roles: ['client', 'provider', 'admin'] },
      '/api/auth/complete-profile': { roles: ['client', 'provider', 'admin'] },
      '/api/auth/profile-creation': { roles: ['client', 'provider', 'admin'] }
    }

    // Check exact matches first
    for (const [route, config] of Object.entries(protectedRoutes)) {
      if (pathname.startsWith(route)) {
        return config
      }
    }

    // Check dynamic routes
    if (pathname.match(/^\/dashboard\/bookings\/[^\/]+(\/.*)?$/)) {
      return { roles: ['client', 'provider', 'admin'] }
    }

    return null
  }

  hasRequiredRole(userRole: string | null, requiredRoles: string[]): boolean {
    if (!userRole) return false
    return requiredRoles.includes(userRole)
  }

  async handleRequest(req: NextRequest): Promise<NextResponse> {
    const { pathname } = req.nextUrl

    // Skip static files and public API routes
    if (pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon') ||
        pathname.startsWith('/api/webhooks') ||
        pathname.startsWith('/api/auth/sync-token') ||
        pathname.startsWith('/api/services')) {
      return NextResponse.next()
    }

    // Check if route is public
    if (this.isPublicRoute(pathname)) {
      return NextResponse.next()
    }

    // Check authentication
    const authResult = await this.checkAuth(req)

    if (!authResult.isAuthenticated) {
      return NextResponse.redirect(new URL('/auth/sign-in', req.url))
    }

    // Check if route requires specific role
    const requiredRoute = this.getRequiredRole(pathname)
    if (requiredRoute) {
      if (!this.hasRequiredRole(authResult.role, requiredRoute.roles)) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }

      // Check if profile is required but missing (skip for API routes)
      if (!pathname.startsWith('/api/') && requiredRoute.requireProfile && !authResult.profile) {
        const role = authResult.role || 'client'
        return NextResponse.redirect(new URL(`/auth/onboarding?role=${role}`, req.url))
      }
    }

    // Forward the access token
    const requestHeaders = new Headers(req.headers)
    if (authResult.accessToken) {
      requestHeaders.set('authorization', `Bearer ${authResult.accessToken}`)
    }

    const response = NextResponse.next({
      request: {
        headers: requestHeaders
      }
    })
    
    response.headers.set('x-user-id', authResult.user?.id || '')
    response.headers.set('x-user-role', authResult.role || '')
    response.headers.set('x-user-email', authResult.user?.email || '')

    return response
  }
}

// Singleton instance
export const simpleAuthMiddleware = new SimpleAuthMiddleware()
