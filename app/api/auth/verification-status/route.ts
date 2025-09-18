import { NextRequest, NextResponse } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase-middleware'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const supabase = createMiddlewareClient()

    // Check if user exists in auth.users
    const { data: authUser, error: authError } = await supabase
      .from('auth.users')
      .select('id, email, email_confirmed_at, created_at')
      .eq('email', email.toLowerCase())
      .single()

    if (authError && authError.code !== 'PGRST116') {
      console.error('Error checking auth user:', authError)
      return NextResponse.json(
        { error: 'Failed to check user status' },
        { status: 500 }
      )
    }

    if (!authUser) {
      return NextResponse.json({
        exists: false,
        verified: false,
        message: 'No account found with this email'
      })
    }

    // Check if user has a profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, created_at')
      .eq('id', authUser.id)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error checking profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to check profile status' },
        { status: 500 }
      )
    }

    const isVerified = !!authUser.email_confirmed_at
    const hasProfile = !!profile

    return NextResponse.json({
      exists: true,
      verified: isVerified,
      hasProfile,
      userId: authUser.id,
      email: authUser.email,
      createdAt: authUser.created_at,
      verifiedAt: authUser.email_confirmed_at,
      profile: profile ? {
        fullName: profile.full_name,
        role: profile.role,
        createdAt: profile.created_at
      } : null,
      message: isVerified 
        ? 'Account is verified and ready to use'
        : 'Account exists but email is not verified'
    })

  } catch (error) {
    console.error('Error in verification-status API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
