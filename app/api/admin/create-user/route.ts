import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const admin = getSupabaseAdminClient()
    const body = await req.json()
    
    const { email, password, full_name, phone, company_name, role } = body

    // Validate required fields
    if (!email || !password || !full_name || !phone || !company_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create user via admin API (bypasses captcha)
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name,
        role: role || 'client',
        phone,
        company_name
      }
    })

    if (authError) {
      console.error('Admin user creation error:', authError)
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Check if profile was created automatically
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (profileError) {
      console.log('Profile not created automatically, creating manually...')
      
      // Create profile manually
      const { data: newProfile, error: newProfileError } = await admin
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: authData.user.email,
          full_name,
          role: role || 'client',
          phone,
          company_name,
          verification_status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (newProfileError) {
        console.error('Manual profile creation failed:', newProfileError)
        return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true, 
        user: {
          id: authData.user.id,
          email: authData.user.email,
          full_name,
          role: role || 'client',
          verification_status: 'pending'
        }
      })
    }

    return NextResponse.json({ 
      success: true, 
      user: {
        id: authData.user.id,
        email: authData.user.email,
        full_name: profile.full_name,
        role: profile.role,
        verification_status: profile.verification_status
      }
    })

  } catch (error: any) {
    console.error('Admin create user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
