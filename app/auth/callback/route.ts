import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authLogger } from '@/lib/auth-logger'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const state = requestUrl.searchParams.get('state')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  // Handle OAuth errors
  if (error) {
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
    authLogger.logAuthCallback({
      success: false,
      method: 'oauth',
      error: 'No authorization code provided',
      redirectTo: '/auth/sign-in'
    })
    
    return NextResponse.redirect(`${requestUrl.origin}/auth/sign-in?error=no_code`)
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  try {
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      authLogger.logAuthCallback({
        success: false,
        method: 'oauth',
        error: exchangeError.message,
        redirectTo: '/auth/sign-in'
      })
      
      console.error('Auth callback error:', exchangeError)
      return NextResponse.redirect(
        `${requestUrl.origin}/auth/sign-in?error=auth_callback_failed&message=${encodeURIComponent(exchangeError.message)}`
      )
    }

    if (!data.user) {
      authLogger.logAuthCallback({
        success: false,
        method: 'oauth',
        error: 'No user data returned from session exchange',
        redirectTo: '/auth/sign-in'
      })
      
      return NextResponse.redirect(`${requestUrl.origin}/auth/sign-in?error=no_user_data`)
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

    if (!sessionCookies) {
      console.error('❌ Missing session data for cookie sync:', {
        hasAccessToken: !!data.session?.access_token,
        hasRefreshToken: !!data.session?.refresh_token,
        hasExpiresAt: !!data.session?.expires_at
      })
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
        const expires = new Date((Number(sessionCookies.expiresAt) || 0) * 1000)
        redirectResponse.cookies.set('sb-access-token', sessionCookies.accessToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          path: '/',
          expires
        })
        redirectResponse.cookies.set('sb-refresh-token', sessionCookies.refreshToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          path: '/',
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        })
        console.log('✅ Session cookies set for onboarding redirect')
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
      const expires = new Date((Number(sessionCookies.expiresAt) || 0) * 1000)
      redirectResponse.cookies.set('sb-access-token', sessionCookies.accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        expires
      })
      redirectResponse.cookies.set('sb-refresh-token', sessionCookies.refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      })
      console.log('✅ Session cookies set for dashboard redirect')
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
