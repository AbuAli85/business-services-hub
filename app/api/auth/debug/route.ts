import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const state = requestUrl.searchParams.get('state')
    const error = requestUrl.searchParams.get('error')
    const errorDescription = requestUrl.searchParams.get('error_description')

    const debugInfo: {
      timestamp: string
      url: string
      searchParams: {
        code: string | null
        state: string | null
        error: string | null
        errorDescription: string | null
      }
      headers: {
        userAgent: string | null
        referer: string | null
        origin: string | null
        host: string | null
        accept: string | null
        acceptLanguage: string | null
      }
      environment: {
        nodeEnv: string | undefined
        hasSupabaseUrl: boolean
        hasSupabaseAnonKey: boolean
        supabaseUrl: string
        isProduction: boolean
      }
      exchangeResult?: {
        success: boolean
        hasUser?: boolean
        hasSession?: boolean
        userId?: string
        userEmail?: string
        error?: string
        errorCode?: string
        errorStatus?: number
        errorType?: string
      }
    } = {
      timestamp: new Date().toISOString(),
      url: request.url,
      searchParams: {
        code: code ? `${code.substring(0, 10)}...` : null,
        state,
        error,
        errorDescription
      },
      headers: {
        userAgent: request.headers.get('user-agent'),
        referer: request.headers.get('referer'),
        origin: request.headers.get('origin'),
        host: request.headers.get('host'),
        accept: request.headers.get('accept'),
        acceptLanguage: request.headers.get('accept-language')
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
        isProduction: process.env.NODE_ENV === 'production'
      }
    }

    console.log('🔍 OAuth Debug Info:', debugInfo)

    // If we have a code, try to exchange it
    if (code) {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        
        debugInfo.exchangeResult = {
          success: !exchangeError,
          hasUser: !!data?.user,
          hasSession: !!data?.session,
          userId: data?.user?.id,
          userEmail: data?.user?.email,
          error: exchangeError?.message,
          errorCode: exchangeError?.code,
          errorStatus: exchangeError?.status
        }

        console.log('🔍 Session Exchange Result:', debugInfo.exchangeResult)
      } catch (exchangeError) {
        debugInfo.exchangeResult = {
          success: false,
          error: exchangeError instanceof Error ? exchangeError.message : 'Unknown error',
          errorType: exchangeError?.constructor?.name
        }
        console.error('❌ Session exchange error:', exchangeError)
      }
    }

    return NextResponse.json(debugInfo)

  } catch (error) {
    console.error('❌ OAuth debug failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
