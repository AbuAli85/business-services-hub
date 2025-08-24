import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create Supabase client with service role for admin operations
function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables not configured')
  }
  
  return createClient(supabaseUrl, supabaseKey)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, user_role, full_name, phone, email } = body

    // Validate required fields
    if (!user_id) {
      return NextResponse.json(
        { error: 'Missing required field: user_id' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdminClient()

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user_id)
      .single()

    if (existingProfile) {
      return NextResponse.json({
        success: false,
        message: 'Profile already exists',
        user_id
      })
    }

    // Create new profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .insert({
        id: user_id,
        role: user_role || 'client',
        full_name: full_name || '',
        phone: phone || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Profile creation error:', error)
      return NextResponse.json({
        success: false,
        message: 'Failed to create profile',
        error: error.message,
        user_id
      }, { status: 500 })
    }

    // Log the webhook request for tracking
    await supabase
      .from('profile_creation_webhooks')
      .insert({
        user_id,
        user_email: email,
        user_role,
        full_name,
        phone,
        status: 'completed',
        processed_at: new Date().toISOString()
      })

    return NextResponse.json({
      success: true,
      message: 'Profile created successfully',
      profile_id: profile.id,
      user_id
    })

  } catch (error) {
    console.error('Profile creation webhook error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET endpoint for testing and monitoring
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const user_id = searchParams.get('user_id')

    if (!user_id) {
      return NextResponse.json({
        error: 'Missing user_id parameter'
      }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient()

    // Get profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user_id)
      .single()

    if (error) {
      return NextResponse.json({
        success: false,
        message: 'Profile not found',
        error: error.message
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      profile
    })

  } catch (error) {
    console.error('Profile retrieval error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
