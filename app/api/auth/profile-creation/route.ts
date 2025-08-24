import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, record, old_record } = body

    // Log the webhook for debugging
    console.log('Profile creation webhook received:', { type, record, old_record })

    // Only process user creation events
    if (type !== 'INSERT' || !record || record.schema !== 'auth' || record.table !== 'users') {
      return NextResponse.json(
        { message: 'Ignored non-user-creation event' },
        { status: 200 }
      )
    }

    const supabase = await getSupabaseClient()
    const userId = record.id
    const userEmail = record.email
    const userMetadata = record.raw_user_meta_data || {}

    // Extract user information from metadata
    const fullName = userMetadata.full_name || ''
    const phone = userMetadata.phone || ''
    const role = userMetadata.role || 'client'

    // Call the profile creation function
    const { data, error } = await supabase.rpc('create_user_profile', {
      user_id: userId,
      user_email: userEmail,
      user_role: role,
      full_name: fullName,
      phone: phone
    })

    if (error) {
      console.error('Profile creation error:', error)
      
      // Log the failed attempt in the webhook tracking table
      await supabase
        .from('profile_creation_webhooks')
        .insert({
          user_id: userId,
          user_email: userEmail,
          user_role: role,
          full_name: fullName,
          phone: phone,
          status: 'failed',
          error_message: error.message
        })

      return NextResponse.json(
        { error: 'Failed to create profile', details: error.message },
        { status: 500 }
      )
    }

    // Log successful profile creation
    console.log('Profile created successfully:', data)

    // Log the successful attempt in the webhook tracking table
    await supabase
      .from('profile_creation_webhooks')
      .insert({
        user_id: userId,
        user_email: userEmail,
        user_role: role,
        full_name: fullName,
        phone: phone,
        status: 'completed',
        processed_at: new Date().toISOString()
      })

    return NextResponse.json({
      success: true,
      message: 'Profile created successfully',
      profile_id: userId
    })

  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET method for testing the endpoint
export async function GET() {
  return NextResponse.json({
    message: 'Profile creation webhook endpoint ready',
    instructions: [
      'Configure Supabase webhook to call this endpoint on auth.users INSERT events',
      'Webhook URL: POST /api/auth/profile-creation',
      'Event: INSERT on auth.users table'
    ]
  })
}
