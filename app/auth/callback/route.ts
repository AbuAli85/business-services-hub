import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { authLogger } from '@/lib/auth-logger'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const state = requestUrl.searchParams.get('state')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  console.log('🔍 Auth callback received:', {
    hasCode: !!code,
    hasState: !!state,
    hasError: !!error,
    errorDescription,
    next,
    url: request.url,
    userAgent: request.headers.get('user-agent'),
    referer: request.headers.get('referer')
  })

  // Handle OAuth errors
  if (error) {
    console.error('❌ OAuth error received:', { error, errorDescription })
    authLogger.logAuthCallback({
      success: false,
      method: 'oauth',
      error: `${error}: ${errorDescription}`,
      redirectTo: '/auth/sign-in'
    })
    
    return NextResponse.redirect(
      `${requestUrl.origin}/auth/sign-in?error=oauth_${error}&description=${encodeURIComponent(errorDescription || '')}`
    )
  }

  if (!code) {
    console.error('❌ No authorization code provided')
    authLogger.logAuthCallback({
      success: false,
      method: 'oauth',
      error: 'No authorization code provided',
      redirectTo: '/auth/sign-in'
    })
    
    return NextResponse.redirect(`${requestUrl.origin}/auth/sign-in?error=no_code`)
  }

  // Validate environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('❌ Missing Supabase environment variables')
    authLogger.logAuthCallback({
      success: false,
      method: 'oauth',
      error: 'Missing Supabase environment variables',
      redirectTo: '/auth/sign-in'
    })
    
    return NextResponse.redirect(`${requestUrl.origin}/auth/sign-in?error=config_error`)
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  try {
    console.log('🔄 Attempting to exchange code for session...')
    let data: any = null
    let exchangeError: any = null

    // Try with the regular client first
    try {
      const result = await supabase.auth.exchangeCodeForSession(code)
      data = result.data
      exchangeError = result.error
    } catch (clientError) {
      console.log('⚠️ Regular client failed, trying SSR client...', clientError)
      
      // Fallback to SSR client
      const response = NextResponse.next()
      const ssrSupabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return request.cookies.get(name)?.value
            },
            set(name: string, value: string, options: any) {
              response.cookies.set({ name, value, ...options })
            },
            remove(name: string, options: any) {
              response.cookies.set({ name, value: '', ...options })
            },
          },
        }
      )
      
      const ssrResult = await ssrSupabase.auth.exchangeCodeForSession(code)
      data = ssrResult.data
      exchangeError = ssrResult.error
    }
    
    if (exchangeError) {
      console.error('❌ Session exchange failed:', {
        error: exchangeError,
        message: exchangeError.message,
        status: exchangeError.status,
        code: exchangeError.code
      })
      
      authLogger.logAuthCallback({
        success: false,
        method: 'oauth',
        error: `Session exchange failed: ${exchangeError.message}`,
        redirectTo: '/auth/sign-in'
      })
      
      return NextResponse.redirect(
        `${requestUrl.origin}/auth/sign-in?error=auth_callback_failed&message=${encodeURIComponent(exchangeError.message)}`
      )
    }

    console.log('✅ Session exchange successful:', {
      hasUser: !!data.user,
      hasSession: !!data.session,
      userId: data.user?.id,
      email: data.user?.email,
      hasAccessToken: !!data.session?.access_token,
      hasRefreshToken: !!data.session?.refresh_token
    })

    if (!data.user) {
      console.error('❌ No user data returned from session exchange')
      authLogger.logAuthCallback({
        success: false,
        method: 'oauth',
        error: 'No user data returned from session exchange',
        redirectTo: '/auth/sign-in'
      })
      
      return NextResponse.redirect(`${requestUrl.origin}/auth/sign-in?error=no_user_data`)
    }

    if (!data.session) {
      console.error('❌ No session data returned from session exchange')
      authLogger.logAuthCallback({
        success: false,
        method: 'oauth',
        userId: data.user.id,
        error: 'No session data returned from session exchange',
        redirectTo: '/auth/sign-in'
      })
      
      return NextResponse.redirect(`${requestUrl.origin}/auth/sign-in?error=no_session_data`)
    }

    // Check if user has a profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, full_name')
      .eq('id', data.user.id)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      // Database error (not "not found")
      authLogger.logAuthCallback({
        success: false,
        method: 'oauth',
        userId: data.user.id,
        error: `Profile lookup failed: ${profileError.message}`,
        redirectTo: '/auth/sign-in'
      })
      
      console.error('Profile lookup error:', profileError)
      return NextResponse.redirect(`${requestUrl.origin}/auth/sign-in?error=profile_lookup_failed`)
    }

    // Prepare session cookies for middleware
    const sessionCookies = data.session?.access_token && data.session?.refresh_token && data.session?.expires_at ? {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at
    } : null

    console.log('🔍 Session data validation:', {
      hasAccessToken: !!data.session?.access_token,
      hasRefreshToken: !!data.session?.refresh_token,
      hasExpiresAt: !!data.session?.expires_at,
      expiresAtValue: data.session?.expires_at,
      tokenLength: data.session?.access_token?.length,
      refreshTokenLength: data.session?.refresh_token?.length
    })

    if (!sessionCookies) {
      console.error('❌ Missing session data for cookie sync:', {
        hasAccessToken: !!data.session?.access_token,
        hasRefreshToken: !!data.session?.refresh_token,
        hasExpiresAt: !!data.session?.expires_at,
        sessionData: data.session
      })
      
      // Even without session cookies, we can still proceed with the redirect
      // The user will be prompted to sign in again if needed
      console.log('⚠️ Proceeding without session cookies - user may need to sign in again')
    } else {
      console.log('✅ Session data available for cookie sync')
    }

    if (!profile) {
      // User doesn't have a profile, redirect to onboarding
      const role = data.user.user_metadata?.role || 'client'
      
      authLogger.logAuthCallback({
        success: true,
        method: 'oauth',
        userId: data.user.id,
        redirectTo: `/auth/onboarding?role=${role}`
      })
      
      const redirectResponse = NextResponse.redirect(`${requestUrl.origin}/auth/onboarding?role=${role}`)
      
      // Set session cookies for middleware
      if (sessionCookies) {
        try {
          const expires = new Date((Number(sessionCookies.expiresAt) || 0) * 1000)
          const refreshExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          
          redirectResponse.cookies.set('sb-access-token', sessionCookies.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            expires
          })
          redirectResponse.cookies.set('sb-refresh-token', sessionCookies.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            expires: refreshExpires
          })
          console.log('✅ Session cookies set for onboarding redirect:', {
            accessTokenExpires: expires.toISOString(),
            refreshTokenExpires: refreshExpires.toISOString(),
            isProduction: process.env.NODE_ENV === 'production'
          })
        } catch (cookieError) {
          console.error('❌ Failed to set session cookies:', cookieError)
        }
      }
      
      return redirectResponse
    }

    // User has profile, redirect to dashboard
    authLogger.logAuthCallback({
      success: true,
      method: 'oauth',
      userId: data.user.id,
      redirectTo: next
    })
    
    const redirectResponse = NextResponse.redirect(`${requestUrl.origin}${next}`)
    
    // Set session cookies for middleware
    if (sessionCookies) {
      try {
        const expires = new Date((Number(sessionCookies.expiresAt) || 0) * 1000)
        const refreshExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        
        redirectResponse.cookies.set('sb-access-token', sessionCookies.accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          expires
        })
        redirectResponse.cookies.set('sb-refresh-token', sessionCookies.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          expires: refreshExpires
        })
        console.log('✅ Session cookies set for dashboard redirect:', {
          accessTokenExpires: expires.toISOString(),
          refreshTokenExpires: refreshExpires.toISOString(),
          isProduction: process.env.NODE_ENV === 'production'
        })
      } catch (cookieError) {
        console.error('❌ Failed to set session cookies:', cookieError)
      }
    }
    
    return redirectResponse

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    authLogger.logAuthCallback({
      success: false,
      method: 'oauth',
      error: errorMessage,
      redirectTo: '/auth/sign-in'
    })
    
    console.error('Auth callback exception:', error)
    return NextResponse.redirect(
      `${requestUrl.origin}/auth/sign-in?error=auth_callback_exception&message=${encodeURIComponent(errorMessage)}`
    )
  }
}
