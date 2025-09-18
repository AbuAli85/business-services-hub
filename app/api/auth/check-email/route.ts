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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const supabase = createMiddlewareClient()

    // Check if email exists in profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', email.toLowerCase())
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is expected
      console.error('Error checking email in profiles:', profileError)
      return NextResponse.json(
        { error: 'Failed to check email existence' },
        { status: 500 }
      )
    }

    // If profile exists, email is already registered
    if (profile) {
      return NextResponse.json({ exists: true })
    }

    // Also check auth.users table for additional security
    try {
      const { data: authUser, error: authError } = await supabase
        .from('auth.users')
        .select('email')
        .eq('email', email.toLowerCase())
        .single()

      if (authError && authError.code !== 'PGRST116') {
        console.error('Error checking email in auth.users:', authError)
        // Don't fail the request, just log the error
      }

      if (authUser) {
        return NextResponse.json({ exists: true })
      }
    } catch (error) {
      // If we can't check auth.users, that's okay - we already checked profiles
      console.warn('Could not check auth.users table:', error)
    }

    return NextResponse.json({ exists: false })

  } catch (error) {
    console.error('Error in check-email API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
