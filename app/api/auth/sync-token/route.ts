import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { access_token, refresh_token, expires_at, token_type } = body

    if (!access_token) {
      return NextResponse.json({ error: 'Access token required' }, { status: 400 })
    }

    // Create a server client to set the session
    const supabase = await createClient()

    // Set the session in Supabase (this will handle cookie management)
    const { error } = await supabase.auth.setSession({
      access_token,
      refresh_token: refresh_token || '',
    })

    if (error) {
      console.error('❌ Failed to set session in sync-token API:', error)
      return NextResponse.json({ error: 'Failed to sync token' }, { status: 500 })
    }

    console.log('✅ Token synchronized to cookies successfully via API')

    // Return success response
    const response = NextResponse.json({ success: true })

    // Set additional headers for CORS if needed
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type')

    return response

  } catch (error) {
    console.error('❌ Error in sync-token API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 200 })
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type')
  return response
}
