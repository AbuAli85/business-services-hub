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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

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

    // Email is not registered
    return NextResponse.json({ exists: false })

  } catch (error) {
    console.error('Error in check-email API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
