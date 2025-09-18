import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authLogger } from '@/lib/auth-logger'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const token = requestUrl.searchParams.get('token')
  const type = requestUrl.searchParams.get('type')
  const next = requestUrl.searchParams.get('next') ?? '/auth/onboarding'

  // Handle missing parameters
  if (!token || !type) {
    authLogger.logAuthCallback({
      success: false,
      method: 'email_verification',
      error: 'Missing token or type parameter',
      redirectTo: '/auth/sign-in?error=missing_parameters'
    })
    
    return NextResponse.redirect(
      `${requestUrl.origin}/auth/sign-in?error=missing_parameters&message=${encodeURIComponent('Invalid verification link')}`
    )
  }

  // Only handle signup verification for now
  if (type !== 'signup') {
    authLogger.logAuthCallback({
      success: false,
      method: 'email_verification',
      error: `Unsupported verification type: ${type}`,
      redirectTo: '/auth/sign-in?error=unsupported_type'
    })
    
    return NextResponse.redirect(
      `${requestUrl.origin}/auth/sign-in?error=unsupported_type&message=${encodeURIComponent('Unsupported verification type')}`
    )
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  try {
    // Verify the email with the token
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'signup'
    })

    if (error) {
      console.error('Email verification error:', error)
      
      authLogger.logAuthCallback({
        success: false,
        method: 'email_verification',
        error: error.message,
        redirectTo: '/auth/sign-in?error=verification_failed'
      })
      
      // Handle specific error cases
      if (error.message.includes('expired') || error.message.includes('invalid')) {
        return NextResponse.redirect(
          `${requestUrl.origin}/auth/sign-in?error=verification_expired&message=${encodeURIComponent('Verification link has expired. Please request a new one.')}`
        )
      } else if (error.message.includes('already confirmed')) {
        return NextResponse.redirect(
          `${requestUrl.origin}/auth/sign-in?error=already_verified&message=${encodeURIComponent('Email already verified. Please sign in.')}`
        )
      } else {
        return NextResponse.redirect(
          `${requestUrl.origin}/auth/sign-in?error=verification_failed&message=${encodeURIComponent('Email verification failed. Please try again.')}`
        )
      }
    }

    if (!data.user) {
      authLogger.logAuthCallback({
        success: false,
        method: 'email_verification',
        error: 'No user data returned from verification',
        redirectTo: '/auth/sign-in?error=no_user_data'
      })
      
      return NextResponse.redirect(
        `${requestUrl.origin}/auth/sign-in?error=no_user_data&message=${encodeURIComponent('Verification completed but no user data found.')}`
      )
    }

    // Log successful verification
    authLogger.logAuthCallback({
      success: true,
      method: 'email_verification',
      userId: data.user.id,
      redirectTo: next
    })

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
        method: 'email_verification',
        userId: data.user.id,
        error: `Profile lookup failed: ${profileError.message}`,
        redirectTo: '/auth/sign-in?error=profile_lookup_failed'
      })
      
      console.error('Profile lookup error:', profileError)
      return NextResponse.redirect(`${requestUrl.origin}/auth/sign-in?error=profile_lookup_failed`)
    }

    if (!profile) {
      // User doesn't have a profile, redirect to onboarding
      const role = data.user.user_metadata?.role || 'client'
      
      authLogger.logAuthCallback({
        success: true,
        method: 'email_verification',
        userId: data.user.id,
        redirectTo: `/auth/onboarding?role=${role}`
      })
      
      return NextResponse.redirect(`${requestUrl.origin}/auth/onboarding?role=${role}`)
    }

    // User has profile, redirect to dashboard or specified next
    authLogger.logAuthCallback({
      success: true,
      method: 'email_verification',
      userId: data.user.id,
      redirectTo: next
    })
    
    return NextResponse.redirect(`${requestUrl.origin}${next}`)

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    authLogger.logAuthCallback({
      success: false,
      method: 'email_verification',
      error: errorMessage,
      redirectTo: '/auth/sign-in?error=verification_exception'
    })
    
    console.error('Email verification exception:', error)
    return NextResponse.redirect(
      `${requestUrl.origin}/auth/sign-in?error=verification_exception&message=${encodeURIComponent('An unexpected error occurred during verification.')}`
    )
  }
}
