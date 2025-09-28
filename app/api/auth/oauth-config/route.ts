import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Check OAuth configuration
    const config = {
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      supabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      nodeEnv: process.env.NODE_ENV,
      url: request.url,
      origin: request.headers.get('origin'),
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer'),
      host: request.headers.get('host'),
      // OAuth provider configurations
      googleClientId: !!process.env.GOOGLE_CLIENT_ID,
      googleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      githubClientId: !!process.env.GITHUB_CLIENT_ID,
      githubClientSecret: !!process.env.GITHUB_CLIENT_SECRET,
      // Cookie settings
      cookieSecure: process.env.NODE_ENV === 'production',
      cookieSameSite: 'lax'
    }

    console.log('🔍 OAuth Configuration Check:', config)

    return NextResponse.json({
      success: true,
      config,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ OAuth config check failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
