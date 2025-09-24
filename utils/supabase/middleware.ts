import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function updateSession(req: NextRequest): Promise<NextResponse> {
  const res = NextResponse.next()

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

  // Touch session so the helper can refresh tokens/cookies if needed
  try { await supabase.auth.getUser() } catch {}

  return res
}


