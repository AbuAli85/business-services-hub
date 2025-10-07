import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check if user has a profile (this is our main user table)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, created_at, is_verified')
      .eq('email', email.toLowerCase())
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error checking profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to check profile status' },
        { status: 500 }
      )
    }

    if (!profile) {
      return NextResponse.json({
        exists: false,
        verified: false,
        message: 'No account found with this email'
      })
    }

    const isVerified = !!profile.is_verified
    const hasProfile = true

    return NextResponse.json({
      exists: true,
      verified: isVerified,
      hasProfile,
      userId: profile.id,
      email: profile.email,
      createdAt: profile.created_at,
      verifiedAt: isVerified ? profile.created_at : null,
      profile: {
        fullName: profile.full_name,
        role: profile.role,
        createdAt: profile.created_at
      },
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
