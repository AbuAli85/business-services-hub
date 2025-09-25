import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function updateSession(req: NextRequest): Promise<NextResponse> {
  const res = NextResponse.next()
  const authHeader = req.headers.get('authorization')

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            res.cookies.set({ name, value, ...options })
          } catch {}
        },
        remove(name: string, options: any) {
          try {
            res.cookies.set({ name, value: '', ...options })
          } catch {}
        },
      },
    }
  )

  // If there's a Bearer token, try to set the session
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    console.log('🔍 updateSession: Setting session from Bearer token')
    
    try {
      await supabase.auth.setSession({
        access_token: token,
        refresh_token: ''
      })
      console.log('✅ updateSession: Session set from Bearer token')
    } catch (sessionError) {
      console.log('❌ updateSession: Failed to set session from Bearer token:', sessionError)
    }
  }

  // Touch session so the helper can refresh tokens/cookies if needed
  try { 
    const { data, error } = await supabase.auth.getUser()
    console.log('🔍 updateSession: Session check result:', {
      hasUser: !!data?.user,
      userId: data?.user?.id,
      error: error?.message,
      url: req.url,
      hasBearerToken: !!authHeader
    })
  } catch (middlewareError) {
    console.log('❌ updateSession: Session check failed:', middlewareError)
  }

  return res
}


