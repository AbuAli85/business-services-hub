import { NextRequest, NextResponse } from 'next/server'
import { createMiddlewareClient } from './supabase-middleware'
import { getSupabaseAdminClient } from './supabase'
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
  { path: '/dashboard/bookings', roles: ['client', 'provider', 'admin'], requireAuth: true, requireProfile: false },
  { path: '/auth/onboarding', roles: ['client', 'provider'], requireAuth: true, requireProfile: false },
  { path: '/api/bookings', roles: ['client', 'provider', 'admin'], requireAuth: true, requireProfile: false },
  { path: '/api/milestones', roles: ['client', 'provider', 'admin'], requireAuth: true, requireProfile: false },
  { path: '/api/tasks', roles: ['client', 'provider', 'admin'], requireAuth: true, requireProfile: false },
  { path: '/api/invoices', roles: ['client', 'provider', 'admin'], requireAuth: true, requireProfile: false },
  { path: '/api/services', roles: ['client', 'provider', 'admin'], requireAuth: false, requireProfile: false },
  { path: '/api/auth/complete-profile', roles: ['client', 'provider', 'admin'], requireAuth: true, requireProfile: false },
  { path: '/api/auth/profile-creation', roles: ['client', 'provider', 'admin'], requireAuth: true, requireProfile: false },
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
    this.supabase = createMiddlewareClient()
  }

  async checkAuth(req: NextRequest): Promise<{
    isAuthenticated: boolean
    user: any | null
    profile: any | null
    role: string | null
    accessToken?: string | null
    error?: string
  }> {
    try {
      // Get session from cookies first
      let token = req.cookies.get('sb-access-token')?.value
      let refreshToken = req.cookies.get('sb-refresh-token')?.value

      // Also check Authorization header as fallback (always check, not just when no token)
      const authHeader = req.headers.get('authorization')
      let bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null

      // Use bearer token if available and no cookie token, or if bearer token is different (refreshed)
      if (bearerToken && (!token || token !== bearerToken)) {
        token = bearerToken
        console.log('🔍 Middleware: Using Bearer token from Authorization header')
      }

      // Debug logging for cookie and header inspection
      const allCookies = req.cookies.getAll()
      console.log('🔍 Middleware auth check:', {
        hasAccessToken: !!token,
        hasRefreshToken: !!refreshToken,
        hasBearerToken: !!bearerToken,
        allCookieNames: allCookies.map(c => c.name),
        pathname: req.nextUrl.pathname,
        tokenPreview: token ? `${token.substring(0, 20)}...` : 'N/A'
      })

      if (!token) {
        return {
          isAuthenticated: false,
          user: null,
          profile: null,
          role: null,
          accessToken: null,
          error: 'No session token found in cookies or Authorization header'
        }
      }

      // Verify session
      const { data: { user }, error: userError } = await this.supabase.auth.getUser(token)

      if (userError || !user) {
        console.log('❌ Middleware: Token validation failed:', {
          tokenPreview: token ? `${token.substring(0, 20)}...` : 'N/A',
          error: userError?.message,
          hasToken: !!token,
          tokenLength: token?.length
        })
        return {
          isAuthenticated: false,
          user: null,
          profile: null,
          role: null,
          accessToken: token || null,
          error: userError?.message || 'Invalid session'
        }
      }

      // Get user profile and role
      console.log('🔍 Middleware: Looking up profile for user:', user.id)
      const { data: profile, error: profileError } = await this.supabase
        .from('profiles')
        .select('id, role, full_name, company_id')
        .eq('id', user.id)
        .single()

      console.log('🔍 Middleware: Profile lookup result:', {
        hasProfile: !!profile,
        profileError: profileError?.message,
        errorCode: profileError?.code,
        userRole: user.user_metadata?.role
      })

      // If profile doesn't exist, try to create one
      if ((profileError && profileError.code === 'PGRST116') || (!profile && !profileError)) {
        console.log('🔍 Middleware: Profile not found, attempting to create one for user:', user.id)
        
        try {
          // Use admin client for profile creation
          console.log('🔍 Middleware: Getting admin client for profile creation...')
          let adminClient
          try {
            adminClient = await getSupabaseAdminClient()
            console.log('🔍 Middleware: Admin client obtained successfully')
          } catch (adminClientError) {
            console.error('❌ Middleware: Failed to get admin client:', adminClientError)
            throw new Error(`Admin client creation failed: ${adminClientError instanceof Error ? adminClientError.message : 'Unknown error'}`)
          }
          
          console.log('🔍 Middleware: Admin client obtained, checking insert method...')
          
          if (!adminClient || !adminClient.from || typeof adminClient.from !== 'function') {
            throw new Error('Admin client is not properly initialized')
          }
          
          const profilesTable = adminClient.from('profiles')
          if (!profilesTable || !profilesTable.insert || typeof profilesTable.insert !== 'function') {
            throw new Error('Admin client does not have insert method for profiles table')
          }
          
          console.log('🔍 Middleware: Admin client validated, attempting profile creation...')
          const { data: newProfile, error: createError } = await adminClient
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email || '',
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
              role: user.user_metadata?.role || 'client',
              avatar_url: user.user_metadata?.avatar_url || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select('id, role, full_name, company_id')
            .single()

          if (createError) {
            console.warn('⚠️ Middleware: Failed to create profile:', createError.message)
            // Continue with user metadata role if profile creation fails
            const role = user.user_metadata?.role || null
            return {
              isAuthenticated: true,
              user,
              profile: null,
              role,
              accessToken: token || null,
              error: 'Profile creation failed, using metadata role'
            }
          }

          console.log('✅ Middleware: Profile created successfully:', newProfile)
          const role = newProfile?.role || user.user_metadata?.role || null
          return {
            isAuthenticated: true,
            user,
            profile: newProfile,
            role,
            accessToken: token || null
          }
        } catch (createError) {
          console.warn('⚠️ Middleware: Profile creation exception:', createError)
          // Continue with user metadata role if profile creation fails
          const role = user.user_metadata?.role || null
          return {
            isAuthenticated: true,
            user,
            profile: null,
            role,
            accessToken: token || null,
            error: 'Profile creation failed, using metadata role'
          }
        }
      }

      if (profileError && profileError.code !== 'PGRST116' && !(!profile && !profileError)) {
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
        accessToken: token || null,
        error: undefined
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
        accessToken: null,
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
    // First try exact matches
    let route = protectedRoutes.find(route => pathname.startsWith(route.path))
    
    console.log('🔍 getRequiredRole: Exact match result:', { pathname, foundRoute: !!route })
    
    // If no exact match, try pattern matching for dynamic routes
    if (!route) {
      // Handle dynamic booking routes like /dashboard/bookings/[id]/milestones
      const isBookingRoute = pathname.match(/^\/dashboard\/bookings\/[^\/]+(\/.*)?$/)
      console.log('🔍 getRequiredRole: Dynamic route check:', { pathname, isBookingRoute: !!isBookingRoute })
      
      if (isBookingRoute) {
        route = protectedRoutes.find(route => route.path === '/dashboard/bookings')
        console.log('🔍 getRequiredRole: Found booking route:', { pathname, route: route?.path })
      }
      // Handle other dynamic routes as needed
    }
    
    return route || null
  }

  hasRequiredRole(userRole: string | null, requiredRoles: string[]): boolean {
    if (!userRole) return false
    return requiredRoles.includes(userRole)
  }

  async handleRequest(req: NextRequest): Promise<NextResponse> {
    const { pathname } = req.nextUrl

    console.log('🔍 Middleware: Processing request for:', pathname)

    // Enhanced debugging for authentication issues
    console.log('🔍 Middleware auth check:', {
      hasAccessToken: !!req.cookies.get('sb-access-token'),
      hasRefreshToken: !!req.cookies.get('sb-refresh-token'),
      hasBearerToken: !!req.headers.get('authorization'),
      allCookieNames: req.cookies.getAll().map(c => c.name),
      pathname,
      tokenPreview: req.headers.get('authorization')?.substring(0, 20) + '...' || 'N/A'
    })

    // Skip middleware for static files and API routes that don't need auth
    if (pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon') ||
        pathname.startsWith('/api/webhooks') ||
        pathname.startsWith('/api/auth/sync-token')) {
      console.log('🔍 Middleware: Skipping middleware for:', pathname)
      return NextResponse.next()
    }

    // For API routes, check if they need authentication
    if (pathname.startsWith('/api/')) {
      const requiredRoute = this.getRequiredRole(pathname)
      console.log('🔍 Middleware: API route check:', { pathname, requiredRoute: !!requiredRoute })
      if (!requiredRoute) {
        // API route doesn't need auth, skip middleware
        console.log('🔍 Middleware: API route does not need auth, skipping:', pathname)
        return NextResponse.next()
      }
      // API route needs auth, continue with middleware processing
      console.log('🔍 Middleware: API route needs auth, processing:', pathname)
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

      // Check if profile is required but missing (skip for API routes)
      if (!pathname.startsWith('/api/') && requiredRoute.requireProfile && !authResult.profile) {
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

    // Forward the access token to downstream by injecting Authorization into the request headers
    const requestHeaders = new Headers(req.headers)
    if (authResult.accessToken) {
      requestHeaders.set('authorization', `Bearer ${authResult.accessToken}`)
      console.log('🔍 Middleware: Forwarding access token to downstream:', {
        hasToken: !!authResult.accessToken,
        tokenPreview: authResult.accessToken ? `${authResult.accessToken.substring(0, 20)}...` : 'N/A',
        pathname: req.nextUrl.pathname
      })
    } else {
      console.log('⚠️ Middleware: No access token to forward')
    }

    // Add user info to response headers for debugging/observability
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
export const authMiddleware = new AuthMiddleware()

// Helper function for use in middleware.ts
export async function handleAuthMiddleware(req: NextRequest): Promise<NextResponse> {
  return authMiddleware.handleRequest(req)
}
