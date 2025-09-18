import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authLogger } from './auth-logger'

export interface RoleBasedRoute {
  path: string
  roles: string[]
  requireAuth: boolean
  requireProfile?: boolean
}

export const protectedRoutes: RoleBasedRoute[] = [
  { path: '/dashboard', roles: ['client', 'provider', 'admin'], requireAuth: true, requireProfile: false },
  { path: '/dashboard/admin', roles: ['admin'], requireAuth: true, requireProfile: true },
  { path: '/dashboard/provider', roles: ['provider'], requireAuth: true, requireProfile: true },
  { path: '/dashboard/client', roles: ['client'], requireAuth: true, requireProfile: true },
  { path: '/auth/onboarding', roles: ['client', 'provider'], requireAuth: true, requireProfile: false },
  { path: '/api/bookings', roles: ['client', 'provider', 'admin'], requireAuth: true, requireProfile: true },
  { path: '/api/invoices', roles: ['client', 'provider', 'admin'], requireAuth: true, requireProfile: true },
  { path: '/api/services', roles: ['provider', 'admin'], requireAuth: true, requireProfile: true },
]

export const publicRoutes = [
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

export class AuthMiddleware {
  private supabase: any

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  async checkAuth(req: NextRequest): Promise<{
    isAuthenticated: boolean
    user: any | null
    profile: any | null
    role: string | null
    error?: string
  }> {
    try {
      // Get session from cookies
      const token = req.cookies.get('sb-access-token')?.value
      const refreshToken = req.cookies.get('sb-refresh-token')?.value

      if (!token) {
        return {
          isAuthenticated: false,
          user: null,
          profile: null,
          role: null,
          error: 'No session token found'
        }
      }

      // Verify session
      const { data: { user }, error: userError } = await this.supabase.auth.getUser(token)

      if (userError || !user) {
        return {
          isAuthenticated: false,
          user: null,
          profile: null,
          role: null,
          error: userError?.message || 'Invalid session'
        }
      }

      // Get user profile and role
      const { data: profile, error: profileError } = await this.supabase
        .from('profiles')
        .select('id, role, full_name, company_id')
        .eq('id', user.id)
        .single()

      if (profileError && profileError.code !== 'PGRST116') {
        return {
          isAuthenticated: true,
          user,
          profile: null,
          role: user.user_metadata?.role || null,
          error: `Profile lookup failed: ${profileError.message}`
        }
      }

      const role = profile?.role || user.user_metadata?.role || null

      return {
        isAuthenticated: true,
        user,
        profile,
        role,
        error: profileError?.code === 'PGRST116' ? 'Profile not found' : undefined
      }
    } catch (error) {
      authLogger.logAuthCallback({
        success: false,
        method: 'oauth',
        error: error instanceof Error ? error.message : 'Unknown error',
        redirectTo: '/auth/sign-in'
      })

      return {
        isAuthenticated: false,
        user: null,
        profile: null,
        role: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  isPublicRoute(pathname: string): boolean {
    return publicRoutes.some(route => {
      if (route === '/') return pathname === '/'
      return pathname.startsWith(route)
    })
  }

  getRequiredRole(pathname: string): RoleBasedRoute | null {
    return protectedRoutes.find(route => pathname.startsWith(route.path)) || null
  }

  hasRequiredRole(userRole: string | null, requiredRoles: string[]): boolean {
    if (!userRole) return false
    return requiredRoles.includes(userRole)
  }

  async handleRequest(req: NextRequest): Promise<NextResponse> {
    const { pathname } = req.nextUrl

    // Skip middleware for static files and API routes that don't need auth
    if (pathname.startsWith('/_next') || 
        pathname.startsWith('/favicon') ||
        pathname.startsWith('/api/webhooks')) {
      return NextResponse.next()
    }

    // Check if route is public
    if (this.isPublicRoute(pathname)) {
      return NextResponse.next()
    }

    // Check authentication
    const authResult = await this.checkAuth(req)

    if (!authResult.isAuthenticated) {
      authLogger.logAuthCallback({
        success: false,
        method: 'oauth',
        error: authResult.error || 'Authentication required',
        redirectTo: '/auth/sign-in'
      })

      return NextResponse.redirect(new URL('/auth/sign-in', req.url))
    }

    // Check if route requires specific role
    const requiredRoute = this.getRequiredRole(pathname)
    if (requiredRoute) {
      if (!this.hasRequiredRole(authResult.role, requiredRoute.roles)) {
        authLogger.logAuthCallback({
          success: false,
          method: 'oauth',
          userId: authResult.user?.id,
          error: `Insufficient permissions. Required: ${requiredRoute.roles.join(', ')}, Got: ${authResult.role}`,
          redirectTo: '/dashboard'
        })

        return NextResponse.redirect(new URL('/dashboard', req.url))
      }

      // Check if profile is required but missing
      if (requiredRoute.requireProfile && !authResult.profile) {
        authLogger.logAuthCallback({
          success: false,
          method: 'oauth',
          userId: authResult.user?.id,
          error: 'Profile required but not found',
          redirectTo: '/auth/onboarding'
        })

        const role = authResult.role || 'client'
        return NextResponse.redirect(new URL(`/auth/onboarding?role=${role}`, req.url))
      }
    }

    // Add user info to headers for downstream use
    const response = NextResponse.next()
    response.headers.set('x-user-id', authResult.user?.id || '')
    response.headers.set('x-user-role', authResult.role || '')
    response.headers.set('x-user-email', authResult.user?.email || '')

    return response
  }
}

// Singleton instance
export const authMiddleware = new AuthMiddleware()

// Helper function for use in middleware.ts
export async function handleAuthMiddleware(req: NextRequest): Promise<NextResponse> {
  return authMiddleware.handleRequest(req)
}
